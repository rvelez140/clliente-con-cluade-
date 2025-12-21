#!/bin/bash

# Script de backup automático de la base de datos
# Puedes programar este script con cron para backups periódicos

set -e

# Configuración
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME="gemini-mail-db"
DB_NAME="gemini_mail"
DB_USER="gemini_user"
BACKUP_FILE="${BACKUP_DIR}/gemini_mail_${DATE}.sql"
RETENTION_DAYS=7  # Mantener backups de los últimos 7 días

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Crear directorio de backups si no existe
mkdir -p "${BACKUP_DIR}"

# Verificar que el contenedor está corriendo
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    print_error "El contenedor ${CONTAINER_NAME} no está corriendo"
    exit 1
fi

print_message "Iniciando backup de la base de datos..."

# Crear backup
if docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" "${DB_NAME}" > "${BACKUP_FILE}"; then
    # Comprimir backup
    gzip "${BACKUP_FILE}"
    BACKUP_FILE="${BACKUP_FILE}.gz"

    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    print_message "✓ Backup creado exitosamente: ${BACKUP_FILE} (${BACKUP_SIZE})"

    # Limpiar backups antiguos
    print_message "Limpiando backups antiguos (más de ${RETENTION_DAYS} días)..."
    find "${BACKUP_DIR}" -name "gemini_mail_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

    # Mostrar backups disponibles
    print_message "Backups disponibles:"
    ls -lh "${BACKUP_DIR}"/gemini_mail_*.sql.gz 2>/dev/null || print_message "No hay backups disponibles"
else
    print_error "Error al crear el backup"
    rm -f "${BACKUP_FILE}"
    exit 1
fi

print_message "✓ Proceso de backup completado"
