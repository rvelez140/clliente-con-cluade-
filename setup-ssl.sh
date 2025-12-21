#!/bin/bash
# Script para configurar SSL/HTTPS con Let's Encrypt en el VPS
# Ejecutar como root en el servidor VPS

set -e

echo "🔐 Configurando SSL/HTTPS para Gemini Mail"
echo "=========================================="

# Verificar si se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Este script debe ejecutarse como root"
    exit 1
fi

# Solicitar dominio
read -p "Ingresa tu dominio (ej: mail.tudominio.com): " DOMAIN
read -p "Ingresa tu email para Let's Encrypt: " EMAIL

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "❌ Dominio y email son requeridos"
    exit 1
fi

echo ""
echo "📦 Instalando Nginx y Certbot..."
apt update
apt install -y nginx certbot python3-certbot-nginx

echo ""
echo "🔧 Configurando Nginx..."

# Crear configuración temporal para obtener certificado
cat > /etc/nginx/sites-available/gemini-mail << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:8099;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /api {
        proxy_pass http://localhost:8098;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

# Activar sitio
ln -sf /etc/nginx/sites-available/gemini-mail /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
nginx -t

# Reiniciar Nginx
systemctl restart nginx
systemctl enable nginx

echo ""
echo "🔒 Obteniendo certificado SSL de Let's Encrypt..."
certbot --nginx -d $DOMAIN --email $EMAIL --agree-tos --non-interactive --redirect

echo ""
echo "📝 Actualizando configuración de Nginx con seguridad mejorada..."

# Crear configuración de rate limiting
cat > /etc/nginx/conf.d/rate-limit.conf << EOF
# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=100r/m;
limit_req_zone \$binary_remote_addr zone=auth_limit:10m rate=10r/m;
EOF

# Actualizar configuración principal
cat > /etc/nginx/sites-available/gemini-mail << EOF
# Redirigir HTTP a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# Configuración HTTPS principal
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # Certificados SSL (gestionados por Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Headers de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/gemini-mail-access.log;
    error_log /var/log/nginx/gemini-mail-error.log;

    # Límite de tamaño de archivos
    client_max_body_size 50M;

    # Frontend
    location / {
        proxy_pass http://localhost:8099;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # API Backend con rate limiting
    location /api {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://localhost:8098;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Rate limiting estricto para autenticación
    location ~ ^/api/(auth|login|register) {
        limit_req zone=auth_limit burst=5 nodelay;

        proxy_pass http://localhost:8098;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:8098;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
EOF

# Verificar configuración
nginx -t

# Reiniciar Nginx
systemctl restart nginx

echo ""
echo "⏰ Configurando renovación automática de certificados..."
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo "🔥 Configurando firewall..."
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw status

echo ""
echo "✅ Configuración SSL completada!"
echo ""
echo "📋 Resumen:"
echo "  - Dominio: $DOMAIN"
echo "  - SSL: Activo (Let's Encrypt)"
echo "  - Renovación automática: Habilitada"
echo "  - Rate limiting: Configurado"
echo "  - Firewall: Activo"
echo ""
echo "🌐 Tu aplicación está disponible en: https://$DOMAIN"
echo ""
echo "⚠️  IMPORTANTE: Actualiza las siguientes variables:"
echo "  1. En GitHub Secrets, actualiza VPS_HOST a: $DOMAIN"
echo "  2. En docker-compose.prod.yml, actualiza VITE_API_URL a: https://$DOMAIN"
echo ""
