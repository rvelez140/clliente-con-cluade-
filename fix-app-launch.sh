#!/bin/bash

# Script de solución rápida para levantar la aplicación correctamente

set -e

echo "========================================="
echo "SOLUCIONANDO DESPLIEGUE DE APLICACIÓN"
echo "========================================="
echo ""

# Verificar que estemos en el directorio correcto
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: No se encontró docker-compose.prod.yml"
    echo "Asegúrate de estar en el directorio del proyecto"
    exit 1
fi

# Verificar que exista .env
if [ ! -f ".env" ]; then
    echo "⚠️  Advertencia: No existe archivo .env"
    echo "Creando .env desde .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✓ Archivo .env creado. Por favor, edita .env con tus valores reales."
        read -p "Presiona Enter después de editar .env..."
    else
        echo "❌ No se encontró .env.example"
        exit 1
    fi
fi

# Paso 1: Detener contenedores actuales
echo "1. Deteniendo contenedores existentes..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
echo "✓ Contenedores detenidos"
echo ""

# Paso 2: Levantar los contenedores
echo "2. Levantando contenedores de la aplicación..."
docker-compose -f docker-compose.prod.yml up -d
echo "✓ Contenedores iniciados"
echo ""

# Paso 3: Esperar a que los servicios estén listos
echo "3. Esperando a que los servicios estén listos..."
sleep 10

# Verificar estado de contenedores
echo "4. Verificando estado de contenedores..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Paso 5: Configurar nginx (si tiene permisos)
echo "5. Configurando nginx..."
if [ -w /etc/nginx/sites-available ]; then
    # Copiar configuración
    cp nginx-ssl.conf /etc/nginx/sites-available/gemini-mail

    # Crear symlink si no existe
    if [ ! -L /etc/nginx/sites-enabled/gemini-mail ]; then
        ln -sf /etc/nginx/sites-available/gemini-mail /etc/nginx/sites-enabled/gemini-mail
    fi

    # Eliminar configuración por defecto si existe
    if [ -L /etc/nginx/sites-enabled/default ]; then
        rm /etc/nginx/sites-enabled/default
    fi

    # Test de configuración de nginx
    nginx -t

    # Recargar nginx
    systemctl reload nginx
    echo "✓ Nginx configurado correctamente"
else
    echo "⚠️  No tienes permisos para configurar nginx automáticamente."
    echo "Ejecuta los siguientes comandos manualmente como root:"
    echo ""
    echo "  sudo cp nginx-ssl.conf /etc/nginx/sites-available/gemini-mail"
    echo "  sudo ln -sf /etc/nginx/sites-available/gemini-mail /etc/nginx/sites-enabled/gemini-mail"
    echo "  sudo rm /etc/nginx/sites-enabled/default"
    echo "  sudo nginx -t"
    echo "  sudo systemctl reload nginx"
    echo ""
fi

echo ""
echo "========================================="
echo "✓ PROCESO COMPLETADO"
echo "========================================="
echo ""
echo "Verifica que todo esté funcionando:"
echo "  - Backend:  http://localhost:8098/api/health"
echo "  - Frontend: http://localhost:8099"
echo ""
echo "Si nginx está configurado, tu aplicación debería estar disponible en tu dominio."
