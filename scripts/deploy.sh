#!/bin/bash

# Script de deployment para VPS
# Usage: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Gemini Mail - Deployment Script     ║${NC}"
echo -e "${GREEN}║        Entorno: ${ENVIRONMENT}              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}\n"

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.infrastructure.yml" ]; then
    echo -e "${RED}✗${NC} Error: No se encontró docker-compose.infrastructure.yml"
    echo "Asegúrate de ejecutar este script desde el directorio raíz del proyecto"
    exit 1
fi

# Función para verificar si un servicio está corriendo
is_service_running() {
    docker-compose -f "$1" ps --services --filter "status=running" | grep -q "$2"
}

# Función para esperar que un servicio esté saludable
wait_for_healthy() {
    local service=$1
    local compose_file=$2
    local max_attempts=30
    local attempt=0

    echo -e "${YELLOW}⏳${NC} Esperando a que $service esté saludable..."

    while [ $attempt -lt $max_attempts ]; do
        if docker-compose -f "$compose_file" ps "$service" | grep -q "healthy"; then
            echo -e "${GREEN}✓${NC} $service está saludable"
            return 0
        fi

        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done

    echo -e "\n${RED}✗${NC} Timeout esperando a que $service esté saludable"
    return 1
}

# Paso 1: Verificar secretos
echo -e "\n${BLUE}[1/6]${NC} Verificando secretos..."
if [ ! -d "./secrets" ] || [ -z "$(ls -A ./secrets/*.txt 2>/dev/null)" ]; then
    echo -e "${YELLOW}⚠${NC}  No se encontraron secretos configurados"
    echo -e "${YELLOW}?${NC}  ¿Desea ejecutar el script de configuración de secretos? (Y/n): "
    read -r response
    if [[ ! "$response" =~ ^[Nn]$ ]]; then
        ./scripts/setup-secrets.sh
    else
        echo -e "${RED}✗${NC} Deployment cancelado. Configure los secretos primero."
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} Secretos encontrados"
fi

# Paso 2: Crear red de Docker si no existe
echo -e "\n${BLUE}[2/6]${NC} Configurando red de Docker..."
if ! docker network inspect gemini-mail-network >/dev/null 2>&1; then
    docker network create gemini-mail-network
    echo -e "${GREEN}✓${NC} Red gemini-mail-network creada"
else
    echo -e "${GREEN}✓${NC} Red gemini-mail-network ya existe"
fi

# Paso 3: Desplegar infraestructura (DB + Redis)
echo -e "\n${BLUE}[3/6]${NC} Desplegando infraestructura (PostgreSQL + Redis)..."

if is_service_running "docker-compose.infrastructure.yml" "postgres"; then
    echo -e "${YELLOW}⚠${NC}  La infraestructura ya está corriendo"
    echo -e "${YELLOW}?${NC}  ¿Desea reiniciarla? (y/N): "
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        docker-compose -f docker-compose.infrastructure.yml down
        docker-compose -f docker-compose.infrastructure.yml up -d
    fi
else
    docker-compose -f docker-compose.infrastructure.yml up -d
fi

wait_for_healthy "postgres" "docker-compose.infrastructure.yml"
wait_for_healthy "redis" "docker-compose.infrastructure.yml"

# Paso 4: Construir y desplegar aplicación
echo -e "\n${BLUE}[4/6]${NC} Construyendo y desplegando aplicación..."

# Pull latest code si estamos en Git
if [ -d ".git" ]; then
    echo -e "${YELLOW}⏳${NC} Actualizando código desde Git..."
    git pull origin main || echo -e "${YELLOW}⚠${NC}  No se pudo actualizar desde Git"
fi

# Build y deploy
docker-compose -f docker-compose.app.yml build --no-cache
docker-compose -f docker-compose.app.yml down
docker-compose -f docker-compose.app.yml up -d

wait_for_healthy "backend" "docker-compose.app.yml"
wait_for_healthy "frontend" "docker-compose.app.yml"

# Paso 5: Configurar Nginx (si no está corriendo)
echo -e "\n${BLUE}[5/6]${NC} Configurando Nginx..."

if [ -f "docker-compose.nginx.yml" ]; then
    if is_service_running "docker-compose.nginx.yml" "nginx"; then
        echo -e "${GREEN}✓${NC} Nginx ya está corriendo"
        echo -e "${YELLOW}?${NC}  ¿Desea recargar la configuración? (y/N): "
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            docker-compose -f docker-compose.nginx.yml exec nginx nginx -s reload
            echo -e "${GREEN}✓${NC} Configuración de Nginx recargada"
        fi
    else
        echo -e "${YELLOW}⚠${NC}  Nginx no está configurado"
        echo -e "${YELLOW}?${NC}  ¿Desea desplegar Nginx ahora? (y/N): "
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            docker-compose -f docker-compose.nginx.yml up -d
            echo -e "${GREEN}✓${NC} Nginx desplegado"
        fi
    fi
fi

# Paso 6: Verificar estado
echo -e "\n${BLUE}[6/6]${NC} Verificando estado de los servicios..."

echo -e "\n${GREEN}=== Estado de Infraestructura ===${NC}"
docker-compose -f docker-compose.infrastructure.yml ps

echo -e "\n${GREEN}=== Estado de Aplicación ===${NC}"
docker-compose -f docker-compose.app.yml ps

if [ -f "docker-compose.nginx.yml" ] && is_service_running "docker-compose.nginx.yml" "nginx"; then
    echo -e "\n${GREEN}=== Estado de Nginx ===${NC}"
    docker-compose -f docker-compose.nginx.yml ps
fi

# Resumen final
echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✓ Deployment Completado            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}\n"

echo -e "${GREEN}Servicios desplegados:${NC}"
echo -e "  ${GREEN}✓${NC} PostgreSQL: puerto 5432"
echo -e "  ${GREEN}✓${NC} Redis: puerto 6379"
echo -e "  ${GREEN}✓${NC} Backend: http://localhost:3000"
echo -e "  ${GREEN}✓${NC} Frontend: http://localhost:8080"

if [ -f "docker-compose.nginx.yml" ] && is_service_running "docker-compose.nginx.yml" "nginx"; then
    echo -e "  ${GREEN}✓${NC} Nginx: http://localhost (puerto 80/443)"
fi

echo -e "\n${YELLOW}Comandos útiles:${NC}"
echo "  Ver logs: docker-compose -f docker-compose.app.yml logs -f"
echo "  Reiniciar: docker-compose -f docker-compose.app.yml restart"
echo "  Detener: docker-compose -f docker-compose.app.yml down"
echo "  Backup DB: docker exec gemini-mail-db-backup sh /backup-db.sh"

echo -e "\n${GREEN}✓${NC} Todo listo para usar!"
