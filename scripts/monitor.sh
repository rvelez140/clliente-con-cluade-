#!/bin/bash

# Script de monitoreo de servicios
# Usage: ./scripts/monitor.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Gemini Mail - Monitor de Servicios   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}\n"

# Función para verificar salud de un servicio
check_service_health() {
    local service=$1
    local compose_file=$2

    if docker-compose -f "$compose_file" ps "$service" 2>/dev/null | grep -q "Up"; then
        if docker-compose -f "$compose_file" ps "$service" | grep -q "healthy"; then
            echo -e "${GREEN}✓${NC} $service: Saludable"
            return 0
        else
            echo -e "${YELLOW}⚠${NC}  $service: Corriendo pero no saludable"
            return 1
        fi
    else
        echo -e "${RED}✗${NC} $service: No está corriendo"
        return 2
    fi
}

# Función para obtener uso de recursos
get_resource_usage() {
    local container=$1
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" "$container" 2>/dev/null | tail -n 1
}

# Verificar servicios de infraestructura
echo -e "${BLUE}=== Infraestructura ===${NC}"
check_service_health "postgres" "docker-compose.infrastructure.yml"
POSTGRES_STATUS=$?
check_service_health "redis" "docker-compose.infrastructure.yml"
REDIS_STATUS=$?

# Verificar servicios de aplicación
echo -e "\n${BLUE}=== Aplicación ===${NC}"
check_service_health "backend" "docker-compose.app.yml"
BACKEND_STATUS=$?
check_service_health "frontend" "docker-compose.app.yml"
FRONTEND_STATUS=$?

# Verificar Nginx si existe
if [ -f "docker-compose.nginx.yml" ]; then
    echo -e "\n${BLUE}=== Reverse Proxy ===${NC}"
    check_service_health "nginx" "docker-compose.nginx.yml"
    NGINX_STATUS=$?
fi

# Mostrar uso de recursos
echo -e "\n${BLUE}=== Uso de Recursos ===${NC}"
echo -e "${YELLOW}Container\t\t\tCPU\tMemoria\t\tRed${NC}"
get_resource_usage "gemini-mail-db"
get_resource_usage "gemini-mail-redis"
get_resource_usage "gemini-mail-backend"
get_resource_usage "gemini-mail-frontend"
[ -f "docker-compose.nginx.yml" ] && get_resource_usage "gemini-mail-nginx"

# Verificar espacio en disco
echo -e "\n${BLUE}=== Espacio en Disco ===${NC}"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo -e "${RED}✗${NC} Uso de disco: ${DISK_USAGE}% (crítico)"
elif [ "$DISK_USAGE" -gt 60 ]; then
    echo -e "${YELLOW}⚠${NC}  Uso de disco: ${DISK_USAGE}% (advertencia)"
else
    echo -e "${GREEN}✓${NC} Uso de disco: ${DISK_USAGE}%"
fi

# Verificar volúmenes
echo -e "\n${BLUE}=== Volúmenes de Docker ===${NC}"
docker volume ls --format "{{.Name}}" | grep gemini-mail | while read volume; do
    SIZE=$(docker system df -v | grep "$volume" | awk '{print $3}')
    echo -e "  $volume: ${SIZE:-N/A}"
done

# Verificar logs recientes
echo -e "\n${BLUE}=== Errores Recientes (últimos 5 min) ===${NC}"
ERROR_COUNT=$(docker-compose -f docker-compose.app.yml logs --since 5m 2>&1 | grep -i error | wc -l)
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC}  Se encontraron $ERROR_COUNT errores en los últimos 5 minutos"
    echo "  Ver detalles: docker-compose -f docker-compose.app.yml logs --since 5m | grep -i error"
else
    echo -e "${GREEN}✓${NC} No se encontraron errores recientes"
fi

# Verificar backups
echo -e "\n${BLUE}=== Backups de Base de Datos ===${NC}"
if [ -d "./backups" ]; then
    BACKUP_COUNT=$(ls -1 ./backups/gemini_mail_*.sql.gz 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 0 ]; then
        LATEST_BACKUP=$(ls -t ./backups/gemini_mail_*.sql.gz 2>/dev/null | head -n 1)
        BACKUP_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$LATEST_BACKUP" 2>/dev/null || stat -c "%y" "$LATEST_BACKUP" 2>/dev/null | cut -d. -f1)
        echo -e "${GREEN}✓${NC} Backups disponibles: $BACKUP_COUNT"
        echo -e "  Último backup: $BACKUP_DATE"
    else
        echo -e "${YELLOW}⚠${NC}  No se encontraron backups"
    fi
else
    echo -e "${YELLOW}⚠${NC}  Directorio de backups no existe"
fi

# Verificar conectividad de red
echo -e "\n${BLUE}=== Conectividad ===${NC}"
if docker network inspect gemini-mail-network >/dev/null 2>&1; then
    CONNECTED_CONTAINERS=$(docker network inspect gemini-mail-network --format '{{len .Containers}}')
    echo -e "${GREEN}✓${NC} Red gemini-mail-network: $CONNECTED_CONTAINERS contenedores conectados"
else
    echo -e "${RED}✗${NC} Red gemini-mail-network no existe"
fi

# Resumen general
echo -e "\n${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Resumen de Estado             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"

TOTAL_ISSUES=0
[ "$POSTGRES_STATUS" -ne 0 ] && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
[ "$REDIS_STATUS" -ne 0 ] && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
[ "$BACKEND_STATUS" -ne 0 ] && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
[ "$FRONTEND_STATUS" -ne 0 ] && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
[ -n "$NGINX_STATUS" ] && [ "$NGINX_STATUS" -ne 0 ] && TOTAL_ISSUES=$((TOTAL_ISSUES + 1))

if [ "$TOTAL_ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✓ Todos los servicios están operando correctamente${NC}"
else
    echo -e "${YELLOW}⚠ Se detectaron $TOTAL_ISSUES problemas${NC}"
    echo -e "  Ejecute: docker-compose -f docker-compose.app.yml logs -f para más detalles"
fi

echo ""
