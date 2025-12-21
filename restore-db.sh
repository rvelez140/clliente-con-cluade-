#!/bin/bash

# Script para restaurar la base de datos desde un backup

set -e

# Configuración
CONTAINER_NAME="gemini-mail-db"
DB_NAME="gemini_mail"
DB_USER="gemini_user"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Verificar que se pasó un archivo como argumento
if [ $# -eq 0 ]; then
    print_error "Uso: $0 <archivo_backup.sql.gz>"
    echo "Backups disponibles:"
    ls -lh ./backups/gemini_mail_*.sql.gz 2>/dev/null || echo "No hay backups disponibles"
    exit 1
fi

BACKUP_FILE=$1

# Verificar que el archivo existe
if [ ! -f "${BACKUP_FILE}" ]; then
    print_error "El archivo ${BACKUP_FILE} no existe"
    exit 1
fi

# Verificar que el contenedor está corriendo
if ! docker ps | grep -q "${CONTAINER_NAME}"; then
    print_error "El contenedor ${CONTAINER_NAME} no está corriendo"
    exit 1
fi

print_warning "⚠️  ADVERTENCIA: Esta operación sobrescribirá la base de datos actual"
read -p "¿Estás seguro de que deseas continuar? (escribe 'SI' para confirmar): " -r
echo

if [ "$REPLY" != "SI" ]; then
    print_message "Operación cancelada"
    exit 0
fi

print_message "Restaurando base de datos desde ${BACKUP_FILE}..."

# Crear un backup de seguridad antes de restaurar
SAFETY_BACKUP="./backups/before_restore_$(date +%Y%m%d_%H%M%S).sql"
print_message "Creando backup de seguridad..."
docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" "${DB_NAME}" > "${SAFETY_BACKUP}"
gzip "${SAFETY_BACKUP}"
print_message "✓ Backup de seguridad creado: ${SAFETY_BACKUP}.gz"

# Descomprimir si es necesario
TEMP_FILE="${BACKUP_FILE}"
if [[ "${BACKUP_FILE}" == *.gz ]]; then
    TEMP_FILE="${BACKUP_FILE%.gz}"
    gunzip -c "${BACKUP_FILE}" > "${TEMP_FILE}"
fi

# Restaurar la base de datos
print_message "Restaurando base de datos..."
if docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" < "${TEMP_FILE}"; then
    print_message "✓ Base de datos restaurada exitosamente"

    # Limpiar archivo temporal si se descomprimió
    if [[ "${BACKUP_FILE}" == *.gz ]]; then
        rm -f "${TEMP_FILE}"
    fi
else
    print_error "Error al restaurar la base de datos"
    print_warning "Puedes restaurar el backup de seguridad con:"
    print_warning "$0 ${SAFETY_BACKUP}.gz"
    exit 1
fi

print_message "✓ Proceso de restauración completado"
