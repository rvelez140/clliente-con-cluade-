#!/bin/bash

# Script de despliegue automatizado para VPS
# Este script configura y despliega Gemini Mail en un VPS

set -e  # Detener en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_step() {
    echo -e "\n${BLUE}==>${NC} $1\n"
}

# Banner
echo -e "${GREEN}"
cat << "EOF"
  ____                _       _   __  __       _ _
 / ___| ___ _ __ ___ (_)_ __ (_) |  \/  | __ _(_) |
| |  _ / _ \ '_ ` _ \| | '_ \| | | |\/| |/ _` | | |
| |_| |  __/ | | | | | | | | | | | |  | | (_| | | |
 \____|\___|_| |_| |_|_|_| |_|_| |_|  |_|\__,_|_|_|

      Despliegue Automatizado en VPS
EOF
echo -e "${NC}"

# Verificar que estamos ejecutando como root o con sudo
if [ "$EUID" -ne 0 ]; then
    print_error "Este script debe ejecutarse como root o con sudo"
    exit 1
fi

# Verificar que existe archivo .env
if [ ! -f .env ]; then
    print_error "No se encontró el archivo .env"
    print_message "Por favor copia .env.example a .env y configura las variables necesarias"
    exit 1
fi

# Cargar variables de entorno
source .env

# Verificar variables críticas
print_step "Verificando variables de entorno críticas"
REQUIRED_VARS=(
    "DB_PASSWORD"
    "REDIS_PASSWORD"
    "JWT_SECRET"
    "GEMINI_API_KEY"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    print_error "Faltan las siguientes variables de entorno en .env:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

print_message "✓ Todas las variables críticas están configuradas"

# Verificar Docker
print_step "Verificando Docker"
if ! command -v docker &> /dev/null; then
    print_warning "Docker no está instalado. Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    print_message "✓ Docker instalado correctamente"
else
    print_message "✓ Docker ya está instalado"
fi

# Verificar Docker Compose
print_step "Verificando Docker Compose"
if ! command -v docker-compose &> /dev/null; then
    print_warning "Docker Compose no está instalado. Instalando..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    print_message "✓ Docker Compose instalado correctamente"
else
    print_message "✓ Docker Compose ya está instalado"
fi

# Crear directorios necesarios
print_step "Creando directorios necesarios"
mkdir -p uploads logs backups
chmod 755 uploads logs backups
print_message "✓ Directorios creados"

# Configurar firewall básico (opcional)
print_step "Configuración de firewall (opcional)"
if command -v ufw &> /dev/null; then
    read -p "¿Deseas configurar el firewall UFW? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ufw allow 22/tcp    # SSH
        ufw allow 80/tcp    # HTTP
        ufw allow 443/tcp   # HTTPS
        ufw --force enable
        print_message "✓ Firewall configurado"
    fi
else
    print_warning "UFW no está instalado. Saltando configuración de firewall."
fi

# Detener servicios anteriores si existen
print_step "Deteniendo servicios anteriores"
if docker-compose ps | grep -q "Up"; then
    print_message "Deteniendo contenedores existentes..."
    docker-compose down
fi

# Construir y levantar servicios
print_step "Construyendo y levantando servicios"
print_message "Esto puede tomar varios minutos..."

# Usar docker-compose.yml para desarrollo o docker-compose.prod.yml para producción
if [ -f docker-compose.prod.yml ] && [ "${USE_PRODUCTION:-false}" = "true" ]; then
    print_message "Usando configuración de producción"
    docker-compose -f docker-compose.prod.yml up -d --build
else
    print_message "Usando configuración de desarrollo"
    docker-compose up -d --build
fi

# Esperar a que los servicios estén listos
print_step "Esperando a que los servicios estén listos"
print_message "Esperando a PostgreSQL..."
timeout=60
counter=0
until docker exec gemini-mail-db pg_isready -U gemini_user -d gemini_mail > /dev/null 2>&1 || [ $counter -eq $timeout ]; do
    sleep 1
    counter=$((counter + 1))
    echo -n "."
done
echo

if [ $counter -eq $timeout ]; then
    print_error "PostgreSQL no se inició correctamente"
    docker-compose logs postgres
    exit 1
fi
print_message "✓ PostgreSQL está listo"

print_message "Esperando a Redis..."
counter=0
until docker exec gemini-mail-redis redis-cli ping > /dev/null 2>&1 || [ $counter -eq $timeout ]; do
    sleep 1
    counter=$((counter + 1))
    echo -n "."
done
echo

if [ $counter -eq $timeout ]; then
    print_error "Redis no se inició correctamente"
    docker-compose logs redis
    exit 1
fi
print_message "✓ Redis está listo"

print_message "Esperando al Backend..."
counter=0
until curl -f http://localhost:3000/api/health > /dev/null 2>&1 || [ $counter -eq $timeout ]; do
    sleep 2
    counter=$((counter + 2))
    echo -n "."
done
echo

if [ $counter -ge $timeout ]; then
    print_warning "El backend tardó en responder. Verificando logs..."
    docker-compose logs --tail=50 backend
fi
print_message "✓ Backend está listo"

# Verificar estado de los servicios
print_step "Verificando estado de los servicios"
docker-compose ps

# Mostrar logs recientes
print_step "Logs recientes"
docker-compose logs --tail=20

# Información final
print_step "¡Despliegue completado!"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓${NC} PostgreSQL: Listo y ejecutándose"
echo -e "${GREEN}✓${NC} Redis: Listo y ejecutándose"
echo -e "${GREEN}✓${NC} Backend API: http://localhost:3000"
echo -e "${GREEN}✓${NC} Frontend: http://localhost:80"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
print_message "Comandos útiles:"
echo "  - Ver logs:              docker-compose logs -f"
echo "  - Ver logs del backend:  docker-compose logs -f backend"
echo "  - Ver logs de postgres:  docker-compose logs -f postgres"
echo "  - Reiniciar servicios:   docker-compose restart"
echo "  - Detener servicios:     docker-compose down"
echo "  - Backup de BD:          docker exec gemini-mail-db pg_dump -U gemini_user gemini_mail > backup.sql"
echo
print_warning "IMPORTANTE: Configura un proxy reverso (nginx/caddy) para HTTPS en producción"
print_warning "IMPORTANTE: Configura backups automáticos de la base de datos"
echo
