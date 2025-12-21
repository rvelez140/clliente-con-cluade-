#!/bin/bash

# Script para configurar secretos de forma segura
# Usage: ./scripts/setup-secrets.sh

set -e

SECRETS_DIR="./secrets"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Gemini Mail - Configuración de Secretos ===${NC}\n"

# Crear directorio de secretos si no existe
if [ ! -d "$SECRETS_DIR" ]; then
    mkdir -p "$SECRETS_DIR"
    chmod 700 "$SECRETS_DIR"
    echo -e "${GREEN}✓${NC} Directorio de secretos creado"
fi

# Función para generar contraseña segura
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Función para crear secreto
create_secret() {
    local secret_name=$1
    local secret_file="${SECRETS_DIR}/${secret_name}.txt"
    local prompt_message=$2
    local auto_generate=${3:-false}

    if [ -f "$secret_file" ]; then
        echo -e "${YELLOW}⚠${NC}  $secret_name ya existe. ¿Desea sobrescribirlo? (y/N): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}⊘${NC}  Saltando $secret_name"
            return
        fi
    fi

    if [ "$auto_generate" = true ]; then
        echo -e "${YELLOW}?${NC}  ¿Desea generar automáticamente $secret_name? (Y/n): "
        read -r response
        if [[ ! "$response" =~ ^[Nn]$ ]]; then
            local generated_value=$(generate_password)
            echo "$generated_value" > "$secret_file"
            chmod 600 "$secret_file"
            echo -e "${GREEN}✓${NC} $secret_name generado automáticamente"
            return
        fi
    fi

    echo -e "${YELLOW}?${NC}  $prompt_message"
    read -r secret_value

    if [ -z "$secret_value" ]; then
        echo -e "${RED}✗${NC} Valor vacío. Saltando $secret_name"
        return
    fi

    echo "$secret_value" > "$secret_file"
    chmod 600 "$secret_file"
    echo -e "${GREEN}✓${NC} $secret_name guardado"
}

# Crear todos los secretos necesarios
echo -e "${GREEN}Configurando secretos de base de datos...${NC}"
create_secret "db_password" "Ingrese la contraseña de PostgreSQL:" true

echo -e "\n${GREEN}Configurando secretos de Redis...${NC}"
create_secret "redis_password" "Ingrese la contraseña de Redis:" true

echo -e "\n${GREEN}Configurando secretos de JWT...${NC}"
create_secret "jwt_secret" "Ingrese el secreto JWT:" true

echo -e "\n${GREEN}Configurando API keys...${NC}"
create_secret "gemini_api_key" "Ingrese su Gemini API key:" false

echo -e "\n${GREEN}Configurando OAuth2 (opcional - presione Enter para saltar)...${NC}"
create_secret "gmail_client_secret" "Ingrese Gmail Client Secret (opcional):" false
create_secret "microsoft_client_secret" "Ingrese Microsoft Client Secret (opcional):" false

# Crear archivo .gitignore para secretos si no existe
if [ ! -f "${SECRETS_DIR}/.gitignore" ]; then
    echo "*" > "${SECRETS_DIR}/.gitignore"
    echo "!.gitignore" >> "${SECRETS_DIR}/.gitignore"
    echo -e "${GREEN}✓${NC} .gitignore creado en el directorio de secretos"
fi

# Verificar permisos
echo -e "\n${GREEN}Verificando permisos...${NC}"
chmod 700 "$SECRETS_DIR"
chmod 600 "$SECRETS_DIR"/*.txt 2>/dev/null || true

# Mostrar resumen
echo -e "\n${GREEN}=== Resumen de Secretos ===${NC}"
for file in "$SECRETS_DIR"/*.txt; do
    if [ -f "$file" ]; then
        filename=$(basename "$file" .txt)
        filesize=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        if [ "$filesize" -gt 0 ]; then
            echo -e "${GREEN}✓${NC} $filename (${filesize} bytes)"
        else
            echo -e "${YELLOW}⚠${NC}  $filename (vacío)"
        fi
    fi
done

echo -e "\n${GREEN}=== Configuración Completada ===${NC}"
echo -e "${YELLOW}IMPORTANTE:${NC}"
echo "1. Los secretos están guardados en: $SECRETS_DIR"
echo "2. NUNCA commites estos archivos a Git"
echo "3. Haz backup de estos secretos en un lugar seguro"
echo "4. En producción, considera usar un gestor de secretos (Vault, AWS Secrets Manager, etc.)"
echo ""
echo -e "${GREEN}Próximos pasos:${NC}"
echo "1. Ejecutar: docker-compose -f docker-compose.infrastructure.yml up -d"
echo "2. Ejecutar: docker-compose -f docker-compose.app.yml up -d"
