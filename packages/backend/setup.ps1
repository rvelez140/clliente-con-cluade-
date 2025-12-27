# Script de Instalación Automática para Windows
# Sistema de Correos con IA

##############################################################################
# Ejecutar con: PowerShell -ExecutionPolicy Bypass -File setup.ps1
##############################################################################

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🚀 Instalador Automático - Sistema de Correos con IA       ║" -ForegroundColor Cyan
Write-Host "║                        Windows Edition                        ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Función para verificar si un comando existe
function Test-Command {
    param($Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Función para mensajes
function Write-Success {
    param($Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param($Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning-Custom {
    param($Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Info {
    param($Message)
    Write-Host "==> $Message" -ForegroundColor Blue
}

# 1. Verificar Node.js
Write-Info "Verificando Node.js..."
if (Test-Command node) {
    $nodeVersion = node -v
    Write-Success "Node.js instalado: $nodeVersion"
} else {
    Write-Error-Custom "Node.js no encontrado"
    Write-Host "Descarga e instala Node.js 18+ desde: https://nodejs.org/"
    exit 1
}

# 2. Verificar npm
Write-Info "Verificando npm..."
if (Test-Command npm) {
    $npmVersion = npm -v
    Write-Success "npm instalado: $npmVersion"
} else {
    Write-Error-Custom "npm no encontrado"
    exit 1
}

# 3. Instalar dependencias
Write-Info "Instalando dependencias de Node.js..."
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Success "Dependencias instaladas correctamente"
} else {
    Write-Error-Custom "Error instalando dependencias"
    exit 1
}

# 4. Verificar/Instalar Redis
Write-Info "Verificando Redis..."
if (Test-Command redis-server) {
    Write-Success "Redis ya instalado"
} else {
    Write-Warning-Custom "Redis no encontrado"
    Write-Host ""
    Write-Host "Para instalar Redis en Windows:"
    Write-Host "1. Usando WSL2 (recomendado):"
    Write-Host "   wsl --install"
    Write-Host "   wsl -d Ubuntu -e sudo apt-get install redis-server"
    Write-Host ""
    Write-Host "2. O descarga Memurai (fork de Redis para Windows):"
    Write-Host "   https://www.memurai.com/get-memurai"
    Write-Host ""
    Write-Host "3. O usa Docker:"
    Write-Host "   docker run -d -p 6379:6379 redis:alpine"
    Write-Host ""

    $installRedis = Read-Host "¿Quieres instalar Redis con Docker ahora? (S/N)"
    if ($installRedis -eq "S" -or $installRedis -eq "s") {
        if (Test-Command docker) {
            Write-Info "Instalando Redis con Docker..."
            docker run -d -p 6379:6379 --name redis-gemini-mail redis:alpine
            Start-Sleep -Seconds 3
            Write-Success "Redis iniciado en Docker"
        } else {
            Write-Error-Custom "Docker no encontrado. Instala Docker Desktop desde: https://www.docker.com/products/docker-desktop"
        }
    }
}

# 5. Verificar PostgreSQL
Write-Info "Verificando PostgreSQL..."
if (Test-Command psql) {
    Write-Success "PostgreSQL encontrado"
} else {
    Write-Warning-Custom "PostgreSQL no encontrado"
    Write-Host ""
    Write-Host "Para instalar PostgreSQL:"
    Write-Host "1. Descarga desde: https://www.postgresql.org/download/windows/"
    Write-Host "2. O usa Docker:"
    Write-Host "   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:14"
    Write-Host ""

    $installPg = Read-Host "¿Quieres instalar PostgreSQL con Docker ahora? (S/N)"
    if ($installPg -eq "S" -or $installPg -eq "s") {
        if (Test-Command docker) {
            Write-Info "Instalando PostgreSQL con Docker..."
            docker run -d -p 5432:5432 --name postgres-gemini-mail -e POSTGRES_PASSWORD=postgres postgres:14
            Start-Sleep -Seconds 5
            Write-Success "PostgreSQL iniciado en Docker"
        } else {
            Write-Error-Custom "Docker no encontrado"
        }
    }
}

# 6. Configurar .env
Write-Info "Configurando variables de entorno..."
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Success "Archivo .env creado"

    # Generar claves
    $encryptionKey = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    $jwtSecret = node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

    # Leer .env
    $envContent = Get-Content .env -Raw

    # Reemplazar valores
    $envContent = $envContent -replace 'PASSWORD_ENCRYPTION_KEY=', "PASSWORD_ENCRYPTION_KEY=$encryptionKey"
    $envContent = $envContent -replace 'JWT_SECRET=your_jwt_secret_key_here', "JWT_SECRET=$jwtSecret"

    # Guardar .env
    Set-Content -Path .env -Value $envContent

    Write-Success "Claves de seguridad generadas"
    Write-Warning-Custom "IMPORTANTE: Edita .env y configura:"
    Write-Host "  - DATABASE_URL"
    Write-Host "  - GEMINI_API_KEY"
    Write-Host "  - GOOGLE/MICROSOFT credentials (opcional)"
} else {
    Write-Warning-Custom ".env ya existe, no se modificará"
}

# 7. Configurar base de datos
Write-Host ""
$setupDb = Read-Host "¿Deseas configurar la base de datos ahora? (S/N)"
if ($setupDb -eq "S" -or $setupDb -eq "s") {
    Write-Info "Configurando base de datos..."

    $dbUser = Read-Host "Usuario de PostgreSQL [postgres]"
    if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "postgres" }

    $dbName = Read-Host "Nombre de la base de datos [gemini_mail]"
    if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "gemini_mail" }

    $dbHost = Read-Host "Host [localhost]"
    if ([string]::IsNullOrWhiteSpace($dbHost)) { $dbHost = "localhost" }

    $dbPort = Read-Host "Puerto [5432]"
    if ([string]::IsNullOrWhiteSpace($dbPort)) { $dbPort = "5432" }

    # Crear base de datos
    Write-Info "Creando base de datos..."
    $env:PGPASSWORD = Read-Host "Contraseña de PostgreSQL" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($env:PGPASSWORD)
    $PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    $env:PGPASSWORD = $PlainPassword

    psql -U $dbUser -h $dbHost -p $dbPort -c "CREATE DATABASE $dbName;" 2>$null

    # Ejecutar migraciones
    Write-Info "Ejecutando migraciones..."
    psql -U $dbUser -h $dbHost -p $dbPort -d $dbName -f src/scripts/init-db.sql

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Base de datos configurada"

        # Actualizar .env
        $dbUrl = "postgresql://${dbUser}:${PlainPassword}@${dbHost}:${dbPort}/${dbName}"
        $envContent = Get-Content .env -Raw
        $envContent = $envContent -replace 'DATABASE_URL=.*', "DATABASE_URL=$dbUrl"
        Set-Content -Path .env -Value $envContent

        Write-Success "DATABASE_URL actualizado en .env"
    } else {
        Write-Error-Custom "Error configurando base de datos"
    }

    Remove-Variable -Name PGPASSWORD -Scope Env
}

# 8. Crear directorio de logs
Write-Info "Creando directorio de logs..."
if (-not (Test-Path logs)) {
    New-Item -ItemType Directory -Path logs | Out-Null
    Write-Success "Directorio de logs creado"
}

# 9. Verificación
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                  ✓ Verificación del Sistema                  ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if (Test-Command node) {
    $nodeV = node -v
    Write-Host "✓ Node.js: $nodeV" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js: No encontrado" -ForegroundColor Red
}

if (Test-Command npm) {
    $npmV = npm -v
    Write-Host "✓ npm: $npmV" -ForegroundColor Green
} else {
    Write-Host "✗ npm: No encontrado" -ForegroundColor Red
}

if (Test-Path .env) {
    Write-Host "✓ Archivo .env: Configurado" -ForegroundColor Green
} else {
    Write-Host "✗ Archivo .env: No encontrado" -ForegroundColor Red
}

if (Test-Path logs) {
    Write-Host "✓ Directorio logs: Creado" -ForegroundColor Green
} else {
    Write-Host "✗ Directorio logs: No encontrado" -ForegroundColor Red
}

# 10. Instrucciones finales
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                 🎉 Instalación Completada                     ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Edita .env y configura las API keys requeridas"
Write-Host ""
Write-Host "2. Inicia el servidor:"
Write-Host "   npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. O en producción:"
Write-Host "   npm run build" -ForegroundColor Yellow
Write-Host "   npm start" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Verifica la instalación:"
Write-Host "   npm run verify" -ForegroundColor Yellow
Write-Host ""
Write-Host "Documentación: MEJORAS_IMPLEMENTADAS.md" -ForegroundColor Cyan
Write-Host ""
