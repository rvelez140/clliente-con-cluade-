#!/bin/bash

# Script para configurar los secretos de GitHub Actions
# Asegúrate de tener gh CLI instalado y autenticado antes de ejecutar este script

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Valores generados (puedes modificarlos si lo deseas)
VPS_HOST="212.56.46.172"
VPS_USERNAME="root"
DB_PASSWORD="5Av34LAl+jd1R+mMyAIrZHZq1PgkfjshWD/DDAb0PAA="
JWT_SECRET="N8GRgoccPxUOhEmfIHvpvxpikghFc06QXR3+rT+6JQY="

# SSH Key (debes pegar aquí la clave privada SSH completa)
VPS_SSH_KEY="-----BEGIN OPENSSH PRIVATE KEY-----
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
-----END OPENSSH PRIVATE KEY-----"

# GEMINI_API_KEY - debes pegar tu API key de Google Gemini aquí
# Si no tienes una, obtenerla en: https://makersuite.google.com/app/apikey
GEMINI_API_KEY="${GEMINI_API_KEY:-YOUR_GEMINI_API_KEY_HERE}"

echo -e "${YELLOW}=== Configurador de Secretos de GitHub Actions ===${NC}\n"

# Verificar que gh CLI está instalado
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: gh CLI no está instalado${NC}"
    echo "Instala gh CLI desde: https://cli.github.com/"
    exit 1
fi

# Verificar autenticación
echo "Verificando autenticación con GitHub..."
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}No estás autenticado con GitHub${NC}"
    echo "Ejecuta: gh auth login"
    echo "Y sigue las instrucciones para autenticarte"
    exit 1
fi

echo -e "${GREEN}✓ Autenticación verificada${NC}\n"

# Verificar GEMINI_API_KEY
if [ "$GEMINI_API_KEY" = "YOUR_GEMINI_API_KEY_HERE" ]; then
    echo -e "${YELLOW}⚠ ADVERTENCIA: GEMINI_API_KEY no está configurado${NC}"
    read -p "Ingresa tu GEMINI_API_KEY (o presiona Enter para omitir): " input_key
    if [ ! -z "$input_key" ]; then
        GEMINI_API_KEY="$input_key"
    else
        echo -e "${RED}Saltando configuración de GEMINI_API_KEY${NC}"
        echo "Deberás configurarlo manualmente después"
    fi
fi

# Obtener el repositorio actual
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
if [ -z "$REPO" ]; then
    echo -e "${RED}Error: No se pudo detectar el repositorio${NC}"
    echo "Asegúrate de estar en un directorio de repositorio de GitHub"
    exit 1
fi

echo -e "Configurando secretos para el repositorio: ${GREEN}$REPO${NC}\n"

# Función para configurar un secreto
set_secret() {
    local secret_name=$1
    local secret_value=$2

    echo -n "Configurando $secret_name... "
    if echo "$secret_value" | gh secret set "$secret_name" -R "$REPO"; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗ Error${NC}"
        return 1
    fi
}

# Configurar todos los secretos
echo "Configurando secretos:"
set_secret "VPS_HOST" "$VPS_HOST"
set_secret "VPS_USERNAME" "$VPS_USERNAME"
set_secret "VPS_SSH_KEY" "$VPS_SSH_KEY"
set_secret "DB_PASSWORD" "$DB_PASSWORD"
set_secret "JWT_SECRET" "$JWT_SECRET"

if [ "$GEMINI_API_KEY" != "YOUR_GEMINI_API_KEY_HERE" ]; then
    set_secret "GEMINI_API_KEY" "$GEMINI_API_KEY"
fi

echo -e "\n${GREEN}=== Configuración completada ===${NC}"
echo -e "\nPuedes verificar los secretos en:"
echo "https://github.com/$REPO/settings/secrets/actions"

echo -e "\n${YELLOW}Próximos pasos:${NC}"
echo "1. Configura el firewall en tu VPS:"
echo "   ufw allow 8099/tcp"
echo "   ufw allow 8098/tcp"
echo ""
echo "2. El workflow de GitHub Actions se ejecutará automáticamente"
echo "   cuando hagas push a las ramas configuradas"
echo ""
echo "3. Una vez desplegado, accede a:"
echo "   Frontend: http://212.56.46.172:8099"
echo "   Backend:  http://212.56.46.172:8098"
