#!/bin/bash
# Script de monitoreo para Gemini Mail
# Verifica el estado de los servicios y envía alertas si es necesario

set -e

# Configuración
COMPOSE_DIR="/root/gemini-mail"
LOG_FILE="/var/log/gemini-mail-monitor.log"
ALERT_EMAIL=""  # Opcional: configurar email para alertas

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Función de verificación de servicio
check_service() {
    local service_name=$1
    local container_name=$2

    if docker ps --filter "name=$container_name" --filter "status=running" | grep -q "$container_name"; then
        echo -e "${GREEN}✅ $service_name: Running${NC}"
        log "✅ $service_name: Running"
        return 0
    else
        echo -e "${RED}❌ $service_name: Stopped${NC}"
        log "❌ $service_name: Stopped"
        return 1
    fi
}

# Función de verificación de healthcheck
check_health() {
    local service_name=$1
    local container_name=$2

    health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no-healthcheck")

    if [ "$health_status" = "healthy" ]; then
        echo -e "${GREEN}✅ $service_name Health: Healthy${NC}"
        return 0
    elif [ "$health_status" = "no-healthcheck" ]; then
        echo -e "${YELLOW}⚠️  $service_name: No healthcheck configured${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name Health: $health_status${NC}"
        log "❌ $service_name Health: $health_status"
        return 1
    fi
}

# Función de verificación de espacio en disco
check_disk_space() {
    local threshold=90
    local usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

    if [ "$usage" -lt "$threshold" ]; then
        echo -e "${GREEN}✅ Disk Space: ${usage}% used${NC}"
    else
        echo -e "${RED}❌ Disk Space: ${usage}% used (threshold: ${threshold}%)${NC}"
        log "❌ WARNING: Disk space usage is high: ${usage}%"
    fi
}

# Función de verificación de memoria
check_memory() {
    local mem_info=$(free -h | awk 'NR==2{printf "Used: %s / %s (%.2f%%)", $3, $2, $3*100/$2}')
    echo -e "${GREEN}💾 Memory: $mem_info${NC}"
}

# Función de verificación de endpoints
check_endpoint() {
    local url=$1
    local name=$2

    if curl -f -s -o /dev/null "$url"; then
        echo -e "${GREEN}✅ $name: Accessible${NC}"
        return 0
    else
        echo -e "${RED}❌ $name: Not accessible${NC}"
        log "❌ $name endpoint not accessible: $url"
        return 1
    fi
}

# Inicio del monitoreo
echo "========================================="
echo "   Gemini Mail System Monitoring"
echo "========================================="
log "Inicio de monitoreo del sistema"

cd "$COMPOSE_DIR" 2>/dev/null || {
    echo -e "${RED}❌ Error: No se puede acceder a $COMPOSE_DIR${NC}"
    exit 1
}

echo ""
echo "🐳 Docker Services:"
check_service "PostgreSQL" "gemini-mail-db"
check_service "Redis" "gemini-mail-redis"
check_service "Backend" "gemini-mail-backend"
check_service "Frontend" "gemini-mail-frontend"

echo ""
echo "❤️  Health Checks:"
check_health "PostgreSQL" "gemini-mail-db"
check_health "Redis" "gemini-mail-redis"
check_health "Backend" "gemini-mail-backend"
check_health "Frontend" "gemini-mail-frontend"

echo ""
echo "🌐 Endpoints:"
check_endpoint "http://localhost:8098/api/health" "Backend API"
check_endpoint "http://localhost:8099" "Frontend"

echo ""
echo "💻 System Resources:"
check_disk_space
check_memory

echo ""
echo "📊 Container Stats:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
    gemini-mail-db gemini-mail-redis gemini-mail-backend gemini-mail-frontend 2>/dev/null || true

echo ""
echo "📝 Recent Logs (últimas 5 líneas por servicio):"
echo ""
echo "--- Backend ---"
docker logs --tail 5 gemini-mail-backend 2>&1 || true
echo ""
echo "--- Frontend ---"
docker logs --tail 5 gemini-mail-frontend 2>&1 || true

echo ""
echo "========================================="
echo "Monitoreo completado: $(date)"
echo "========================================="

log "Monitoreo completado exitosamente"
