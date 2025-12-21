#!/bin/bash
# Script para restaurar backup de PostgreSQL
# Ejecutar en el VPS cuando sea necesario

set -e

BACKUP_DIR="/root/gemini-mail-backups"

echo "🔄 Restauración de Base de Datos Gemini Mail"
echo "============================================"

# Listar backups disponibles
echo ""
echo "📋 Backups disponibles:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || {
    echo "❌ No se encontraron backups en $BACKUP_DIR"
    exit 1
}

echo ""
read -p "Ingresa el nombre completo del archivo de backup: " BACKUP_FILE

# Verificar que el archivo existe
if [ ! -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    echo "❌ Error: El archivo ${BACKUP_FILE} no existe"
    exit 1
fi

# Advertencia
echo ""
echo "⚠️  ADVERTENCIA: Esta operación eliminará todos los datos actuales"
read -p "¿Estás seguro de continuar? (escribe 'SI' para confirmar): " CONFIRM

if [ "$CONFIRM" != "SI" ]; then
    echo "❌ Operación cancelada"
    exit 0
fi

echo ""
echo "🛑 Deteniendo servicios..."
cd /root/gemini-mail
docker-compose down backend frontend

echo ""
echo "🗄️  Restaurando backup: ${BACKUP_FILE}..."

# Restaurar desde el backup
gunzip -c "${BACKUP_DIR}/${BACKUP_FILE}" | docker exec -i gemini-mail-db psql -U gemini_user -d gemini_mail

echo ""
echo "🚀 Reiniciando servicios..."
docker-compose up -d

echo ""
echo "✅ Restauración completada exitosamente"
echo ""
echo "🔍 Verificando estado de los servicios..."
sleep 5
docker-compose ps
