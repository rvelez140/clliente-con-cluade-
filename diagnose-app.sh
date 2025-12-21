#!/bin/bash

# Script de diagnóstico para verificar el estado de la aplicación

echo "========================================="
echo "DIAGNÓSTICO DE APLICACIÓN GEMINI MAIL"
echo "========================================="
echo ""

# 1. Verificar contenedores de Docker
echo "1. ESTADO DE CONTENEDORES DOCKER:"
echo "---------------------------------"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# 2. Verificar configuración de nginx
echo "2. CONFIGURACIÓN DE NGINX:"
echo "---------------------------------"
echo "Archivos en /etc/nginx/sites-enabled:"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "No se puede acceder a /etc/nginx/sites-enabled"
echo ""
echo "Nginx está corriendo:"
systemctl status nginx --no-pager | head -3
echo ""

# 3. Verificar que los puertos estén escuchando
echo "3. PUERTOS EN ESCUCHA:"
echo "---------------------------------"
echo "Puerto 8098 (Backend):"
netstat -tlnp 2>/dev/null | grep 8098 || ss -tlnp 2>/dev/null | grep 8098 || echo "Puerto 8098 NO está escuchando"
echo "Puerto 8099 (Frontend):"
netstat -tlnp 2>/dev/null | grep 8099 || ss -tlnp 2>/dev/null | grep 8099 || echo "Puerto 8099 NO está escuchando"
echo "Puerto 80 (HTTP):"
netstat -tlnp 2>/dev/null | grep :80 || ss -tlnp 2>/dev/null | grep :80 || echo "Puerto 80 NO está escuchando"
echo ""

# 4. Verificar logs de contenedores
echo "4. ÚLTIMAS LÍNEAS DE LOGS:"
echo "---------------------------------"
echo "Backend logs:"
docker logs gemini-mail-backend --tail 10 2>/dev/null || echo "No se pueden obtener logs del backend"
echo ""
echo "Frontend logs:"
docker logs gemini-mail-frontend --tail 10 2>/dev/null || echo "No se pueden obtener logs del frontend"
echo ""

# 5. Test de conectividad local
echo "5. TEST DE CONECTIVIDAD:"
echo "---------------------------------"
echo "Backend (localhost:8098):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:8098/api/health 2>/dev/null || echo "No se puede conectar al backend"
echo "Frontend (localhost:8099):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:8099 2>/dev/null || echo "No se puede conectar al frontend"
echo ""

# 6. Verificar archivo .env
echo "6. ARCHIVO .ENV:"
echo "---------------------------------"
if [ -f .env ]; then
    echo ".env existe ✓"
    echo "Variables configuradas (sin valores sensibles):"
    grep -E "^[A-Z_]+" .env | cut -d= -f1
else
    echo ".env NO EXISTE ✗"
fi
echo ""

echo "========================================="
echo "FIN DEL DIAGNÓSTICO"
echo "========================================="
