#!/bin/bash

##############################################################################
# Script de Instalación Automática - Sistema de Correos con IA
# Compatible con: macOS, Ubuntu/Debian, CentOS/RHEL
##############################################################################

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_message() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Función para detectar sistema operativo
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ -f /etc/debian_version ]]; then
        OS="debian"
    elif [[ -f /etc/redhat-release ]]; then
        OS="redhat"
    else
        OS="unknown"
    fi
    print_message "Sistema operativo detectado: $OS"
}

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Banner
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   🚀 Instalador Automático - Sistema de Correos con IA       ║"
echo "║                                                               ║"
echo "║   Este script instalará:                                      ║"
echo "║   • Node.js y dependencias                                    ║"
echo "║   • Redis (cache y colas)                                     ║"
echo "║   • PostgreSQL (base de datos)                                ║"
echo "║   • Configuración automática                                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Detectar OS
detect_os

# 1. Verificar Node.js
print_message "Verificando Node.js..."
if command_exists node; then
    NODE_VERSION=$(node -v)
    print_success "Node.js ya instalado: $NODE_VERSION"
else
    print_error "Node.js no encontrado"
    print_message "Por favor instala Node.js 18+ desde: https://nodejs.org/"
    exit 1
fi

# 2. Instalar dependencias npm
print_message "Instalando dependencias de Node.js..."
npm install
print_success "Dependencias de Node.js instaladas"

# 3. Instalar Redis
print_message "Verificando Redis..."
if command_exists redis-server; then
    print_success "Redis ya instalado"
else
    print_warning "Redis no encontrado. Instalando..."

    case $OS in
        macos)
            if command_exists brew; then
                brew install redis
                brew services start redis
            else
                print_error "Homebrew no encontrado. Instala desde: https://brew.sh/"
                exit 1
            fi
            ;;
        debian)
            sudo apt-get update
            sudo apt-get install -y redis-server
            sudo systemctl start redis-server
            sudo systemctl enable redis-server
            ;;
        redhat)
            sudo yum install -y redis
            sudo systemctl start redis
            sudo systemctl enable redis
            ;;
        *)
            print_error "Sistema operativo no soportado para instalación automática de Redis"
            print_message "Por favor instala Redis manualmente: https://redis.io/download"
            exit 1
            ;;
    esac

    print_success "Redis instalado y en ejecución"
fi

# Verificar conexión a Redis
print_message "Verificando conexión a Redis..."
if redis-cli ping > /dev/null 2>&1; then
    print_success "Redis funcionando correctamente"
else
    print_warning "Redis no responde. Intentando iniciar..."

    case $OS in
        macos)
            brew services restart redis
            ;;
        debian|redhat)
            sudo systemctl restart redis
            ;;
    esac

    sleep 2

    if redis-cli ping > /dev/null 2>&1; then
        print_success "Redis iniciado correctamente"
    else
        print_error "No se pudo conectar a Redis"
        exit 1
    fi
fi

# 4. Verificar PostgreSQL
print_message "Verificando PostgreSQL..."
if command_exists psql; then
    print_success "PostgreSQL encontrado"
else
    print_warning "PostgreSQL no encontrado"
    read -p "¿Deseas instalar PostgreSQL? (s/n): " install_pg

    if [[ $install_pg == "s" || $install_pg == "S" ]]; then
        case $OS in
            macos)
                brew install postgresql@14
                brew services start postgresql@14
                ;;
            debian)
                sudo apt-get update
                sudo apt-get install -y postgresql postgresql-contrib
                sudo systemctl start postgresql
                sudo systemctl enable postgresql
                ;;
            redhat)
                sudo yum install -y postgresql-server postgresql-contrib
                sudo postgresql-setup initdb
                sudo systemctl start postgresql
                sudo systemctl enable postgresql
                ;;
        esac
        print_success "PostgreSQL instalado"
    else
        print_warning "PostgreSQL es requerido. Instálalo manualmente."
    fi
fi

# 5. Configurar variables de entorno
print_message "Configurando variables de entorno..."

if [ ! -f .env ]; then
    cp .env.example .env
    print_success "Archivo .env creado desde .env.example"

    # Generar PASSWORD_ENCRYPTION_KEY
    ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

    # Generar JWT_SECRET
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

    # Actualizar .env
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/PASSWORD_ENCRYPTION_KEY=/PASSWORD_ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
        sed -i '' "s/JWT_SECRET=your_jwt_secret_key_here/JWT_SECRET=$JWT_SECRET/" .env
    else
        # Linux
        sed -i "s/PASSWORD_ENCRYPTION_KEY=/PASSWORD_ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
        sed -i "s/JWT_SECRET=your_jwt_secret_key_here/JWT_SECRET=$JWT_SECRET/" .env
    fi

    print_success "Claves de seguridad generadas automáticamente"
    print_warning "IMPORTANTE: Edita .env y configura:"
    echo "  - DATABASE_URL (PostgreSQL)"
    echo "  - GEMINI_API_KEY"
    echo "  - GOOGLE_CLIENT_ID/SECRET (opcional)"
    echo "  - MICROSOFT_CLIENT_ID/SECRET (opcional)"
else
    print_warning ".env ya existe, no se sobrescribirá"
fi

# 6. Configurar base de datos
print_message "¿Deseas configurar la base de datos ahora? (s/n): "
read setup_db

if [[ $setup_db == "s" || $setup_db == "S" ]]; then
    print_message "Configurando base de datos..."

    # Preguntar credenciales
    read -p "Usuario de PostgreSQL [postgres]: " DB_USER
    DB_USER=${DB_USER:-postgres}

    read -p "Nombre de la base de datos [gemini_mail]: " DB_NAME
    DB_NAME=${DB_NAME:-gemini_mail}

    read -p "Host de PostgreSQL [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}

    read -p "Puerto de PostgreSQL [5432]: " DB_PORT
    DB_PORT=${DB_PORT:-5432}

    # Crear base de datos
    print_message "Creando base de datos $DB_NAME..."

    if psql -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        print_warning "Base de datos $DB_NAME ya existe"
    else
        createdb -U $DB_USER $DB_NAME 2>/dev/null || \
        psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || \
        sudo -u postgres createdb $DB_NAME

        print_success "Base de datos $DB_NAME creada"
    fi

    # Ejecutar migraciones
    print_message "Ejecutando migraciones..."

    psql -U $DB_USER -d $DB_NAME -f src/scripts/init-db.sql 2>/dev/null || \
    sudo -u postgres psql -d $DB_NAME -f src/scripts/init-db.sql

    if [ $? -eq 0 ]; then
        print_success "Migraciones ejecutadas correctamente"

        # Actualizar DATABASE_URL en .env
        DB_URL="postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=$DB_URL|" .env
        else
            sed -i "s|DATABASE_URL=.*|DATABASE_URL=$DB_URL|" .env
        fi

        print_success "DATABASE_URL actualizado en .env"
    else
        print_error "Error ejecutando migraciones"
        print_message "Ejecuta manualmente: psql -U $DB_USER -d $DB_NAME -f src/scripts/init-db.sql"
    fi
fi

# 7. Crear directorio de logs
print_message "Creando directorio de logs..."
mkdir -p logs
chmod 755 logs
print_success "Directorio de logs creado"

# 8. Verificar instalación
print_message "Verificando instalación..."

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                  ✓ Verificación del Sistema                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Verificar Node.js
if command_exists node; then
    echo "✓ Node.js: $(node -v)"
else
    echo "✗ Node.js: No encontrado"
fi

# Verificar npm
if command_exists npm; then
    echo "✓ npm: $(npm -v)"
else
    echo "✗ npm: No encontrado"
fi

# Verificar Redis
if redis-cli ping > /dev/null 2>&1; then
    REDIS_VERSION=$(redis-cli --version | awk '{print $2}')
    echo "✓ Redis: $REDIS_VERSION (funcionando)"
else
    echo "✗ Redis: No responde"
fi

# Verificar PostgreSQL
if command_exists psql; then
    PG_VERSION=$(psql --version | awk '{print $3}')
    echo "✓ PostgreSQL: $PG_VERSION"
else
    echo "✗ PostgreSQL: No encontrado"
fi

# Verificar .env
if [ -f .env ]; then
    echo "✓ Archivo .env: Configurado"
else
    echo "✗ Archivo .env: No encontrado"
fi

# Verificar directorio de logs
if [ -d logs ]; then
    echo "✓ Directorio logs: Creado"
else
    echo "✗ Directorio logs: No encontrado"
fi

# 9. Instrucciones finales
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                 🎉 Instalación Completada                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
print_success "Sistema instalado correctamente"
echo ""
echo "Próximos pasos:"
echo ""
echo "1. Edita el archivo .env y configura:"
echo "   - GEMINI_API_KEY (requerido para IA)"
echo "   - GOOGLE_CLIENT_ID/SECRET (opcional para Gmail API)"
echo "   - MICROSOFT_CLIENT_ID/SECRET (opcional para Outlook API)"
echo ""
echo "2. Inicia el servidor en modo desarrollo:"
echo "   npm run dev"
echo ""
echo "3. O compila y ejecuta en producción:"
echo "   npm run build"
echo "   npm start"
echo ""
echo "4. Revisa los logs en el directorio: logs/"
echo ""
echo "5. Documentación completa en: MEJORAS_IMPLEMENTADAS.md"
echo ""
print_message "Para verificar que todo funciona correctamente:"
echo "   npm run verify"
echo ""
