#!/bin/bash
# Script de backup automático para PostgreSQL
# Debe ejecutarse en el VPS, configurado con cron

set -e

# Configuración
BACKUP_DIR="/root/gemini-mail-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="gemini_mail_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo "🗄️  Iniciando backup de base de datos..."
echo "📅 Timestamp: $TIMESTAMP"

# Realizar backup con compresión
docker exec gemini-mail-db pg_dump -U gemini_user -d gemini_mail | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

# Verificar que el backup se creó correctamente
if [ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    echo "✅ Backup completado: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
    echo "❌ Error: El backup no se creó correctamente"
    exit 1
fi

# Eliminar backups antiguos (más de RETENTION_DAYS días)
echo "🧹 Eliminando backups antiguos (más de ${RETENTION_DAYS} días)..."
find "$BACKUP_DIR" -name "gemini_mail_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

# Contar backups restantes
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "gemini_mail_backup_*.sql.gz" -type f | wc -l)
echo "📊 Backups disponibles: ${BACKUP_COUNT}"

# Opcional: Sincronizar con almacenamiento remoto (descomentar para usar)
# echo "☁️  Sincronizando con almacenamiento remoto..."
# rclone copy "${BACKUP_DIR}/${BACKUP_FILE}" remote:gemini-mail-backups/

echo "✨ Proceso de backup completado exitosamente"

# Mostrar espacio en disco usado por backups
echo "💾 Espacio usado por backups:"
du -sh "$BACKUP_DIR"
