#!/bin/bash

# Script de backup automático de PostgreSQL
# Este script se ejecuta dentro del contenedor postgres-backup

set -e

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-gemini_mail}"
DB_USER="${POSTGRES_USER:-gemini_user}"
BACKUP_DIR="/backups"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

# Leer contraseña desde secret
if [ -f "/run/secrets/db_password" ]; then
    export PGPASSWORD=$(cat /run/secrets/db_password)
elif [ -n "$PGPASSWORD_FILE" ] && [ -f "$PGPASSWORD_FILE" ]; then
    export PGPASSWORD=$(cat "$PGPASSWORD_FILE")
fi

# Crear directorio de backup si no existe
mkdir -p "$BACKUP_DIR"

# Nombre del archivo de backup con timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/gemini_mail_${TIMESTAMP}.sql.gz"
BACKUP_LOG="${BACKUP_DIR}/backup.log"

echo "$(date '+%Y-%m-%d %H:%M:%S') - Iniciando backup de $DB_NAME" | tee -a "$BACKUP_LOG"

# Realizar backup
if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --verbose | gzip > "$BACKUP_FILE" 2>> "$BACKUP_LOG"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup completado: $BACKUP_FILE ($BACKUP_SIZE)" | tee -a "$BACKUP_LOG"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Backup falló" | tee -a "$BACKUP_LOG"
    exit 1
fi

# Eliminar backups antiguos
echo "$(date '+%Y-%m-%d %H:%M:%S') - Eliminando backups antiguos (más de $RETENTION_DAYS días)" | tee -a "$BACKUP_LOG"
find "$BACKUP_DIR" -name "gemini_mail_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# Mostrar backups disponibles
echo "$(date '+%Y-%m-%d %H:%M:%S') - Backups disponibles:" | tee -a "$BACKUP_LOG"
ls -lh "$BACKUP_DIR"/gemini_mail_*.sql.gz 2>/dev/null | tee -a "$BACKUP_LOG" || echo "No hay backups disponibles"

echo "$(date '+%Y-%m-%d %H:%M:%S') - Proceso de backup finalizado" | tee -a "$BACKUP_LOG"
