#!/bin/bash

# Script para configurar certificados SSL con Let's Encrypt
# Usage: ./scripts/setup-ssl.sh your-domain.com your-email@example.com

set -e

DOMAIN=$1
EMAIL=$2

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo -e "${RED}✗${NC} Error: Faltan argumentos"
    echo "Usage: $0 <domain> <email>"
    echo "Ejemplo: $0 mail.example.com admin@example.com"
    exit 1
fi

echo -e "${GREEN}=== Configuración de SSL para $DOMAIN ===${NC}\n"

# Crear directorios necesarios
mkdir -p ./certbot/conf ./certbot/www ./certbot/logs

# Paso 1: Obtener certificado inicial
echo -e "${YELLOW}[1/3]${NC} Obteniendo certificado inicial..."

# Iniciar Nginx en modo HTTP solo para la validación
docker-compose -f docker-compose.nginx.yml up -d nginx

# Solicitar certificado
docker run --rm \
    -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
    -v "$(pwd)/certbot/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d "$DOMAIN"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Certificado obtenido exitosamente"
else
    echo -e "${RED}✗${NC} Error al obtener certificado"
    exit 1
fi

# Paso 2: Actualizar configuración de Nginx
echo -e "\n${YELLOW}[2/3]${NC} Actualizando configuración de Nginx..."

# Reemplazar dominio en nginx.conf
sed -i.bak "s/your-domain.com/$DOMAIN/g" ./nginx/nginx.conf
echo -e "${GREEN}✓${NC} Configuración actualizada (backup en nginx.conf.bak)"

# Paso 3: Reiniciar Nginx con SSL
echo -e "\n${YELLOW}[3/3]${NC} Reiniciando Nginx con SSL..."

docker-compose -f docker-compose.nginx.yml down
docker-compose -f docker-compose.nginx.yml up -d

# Verificar que Nginx esté corriendo
sleep 5
if docker-compose -f docker-compose.nginx.yml ps nginx | grep -q "Up"; then
    echo -e "${GREEN}✓${NC} Nginx corriendo con SSL"
else
    echo -e "${RED}✗${NC} Error al iniciar Nginx"
    exit 1
fi

# Resumen
echo -e "\n${GREEN}=== Configuración SSL Completada ===${NC}"
echo -e "Dominio: $DOMAIN"
echo -e "Certificado: /certbot/conf/live/$DOMAIN/fullchain.pem"
echo -e "Clave privada: /certbot/conf/live/$DOMAIN/privkey.pem"
echo ""
echo -e "${YELLOW}Notas importantes:${NC}"
echo "1. El certificado se renovará automáticamente cada 12 horas"
echo "2. Asegúrate de que el puerto 80 y 443 estén abiertos en tu firewall"
echo "3. El dominio $DOMAIN debe apuntar a la IP de este servidor"
echo ""
echo -e "${GREEN}✓${NC} Puedes acceder a tu aplicación en: https://$DOMAIN"
