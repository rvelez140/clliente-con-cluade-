#!/bin/bash

# Script para restaurar backup de PostgreSQL
# Usage: ./scripts/restore-db.sh <backup-file>

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup-file>"
    echo "Ejemplo: $0 ./backups/gemini_mail_20231215_120000.sql.gz"
    echo ""
    echo "Backups disponibles:"
    ls -lh ./backups/gemini_mail_*.sql.gz 2>/dev/null || echo "No hay backups disponibles"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Archivo de backup no encontrado: $BACKUP_FILE"
    exit 1
fi

# Leer configuración
source .env 2>/dev/null || true

DB_CONTAINER="${DB_CONTAINER:-gemini-mail-db}"
DB_NAME="${DB_NAME:-gemini_mail}"
DB_USER="${DB_USER:-gemini_user}"

echo "=== Restauración de Base de Datos ==="
echo "Backup: $BACKUP_FILE"
echo "Contenedor: $DB_CONTAINER"
echo "Base de datos: $DB_NAME"
echo ""
echo "⚠️  ADVERTENCIA: Esto sobrescribirá la base de datos actual."
echo "¿Desea continuar? (escriba 'yes' para confirmar): "
read -r confirmation

if [ "$confirmation" != "yes" ]; then
    echo "Operación cancelada."
    exit 0
fi

echo "Restaurando backup..."

# Copiar backup al contenedor si es necesario
BACKUP_NAME=$(basename "$BACKUP_FILE")
docker cp "$BACKUP_FILE" "$DB_CONTAINER:/tmp/$BACKUP_NAME"

# Restaurar
docker exec -i "$DB_CONTAINER" bash -c "
    export PGPASSWORD=\$(cat /run/secrets/db_password)

    # Desconectar usuarios activos
    psql -U $DB_USER -d postgres -c \"
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '$DB_NAME'
        AND pid <> pg_backend_pid();
    \"

    # Eliminar y recrear base de datos
    dropdb -U $DB_USER --if-exists $DB_NAME
    createdb -U $DB_USER $DB_NAME

    # Restaurar desde backup
    gunzip -c /tmp/$BACKUP_NAME | psql -U $DB_USER -d $DB_NAME

    # Limpiar archivo temporal
    rm /tmp/$BACKUP_NAME
"

echo ""
echo "✓ Restauración completada exitosamente"
echo "✓ Base de datos $DB_NAME restaurada desde $BACKUP_FILE"
