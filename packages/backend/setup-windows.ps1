#############################################
# Gemini Mail - Windows Installation Script
# Version 4.0.0
# Supports: Windows 10/11, Windows Server 2019+
#############################################

#Requires -RunAsAdministrator
#Requires -Version 5.1

param(
    [switch]$SkipNodeJs,
    [switch]$SkipPostgres,
    [switch]$SkipRedis,
    [switch]$DevMode,
    [string]$InstallPath = "$env:USERPROFILE\GeminiMail"
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Warning { Write-Host "[WARNING] $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "[ERROR] $args" -ForegroundColor Red }

# Banner
function Show-Banner {
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "║     Gemini Mail - Windows Installation     ║" -ForegroundColor Magenta
    Write-Host "║              Version 4.0.0                 ║" -ForegroundColor Magenta
    Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Magenta
    Write-Host ""
}

# Check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check if a command exists
function Test-Command {
    param([string]$Command)
    return $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Install Chocolatey package manager
function Install-Chocolatey {
    if (-not (Test-Command "choco")) {
        Write-Info "Installing Chocolatey package manager..."
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

        # Refresh environment
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

        Write-Success "Chocolatey installed successfully"
    } else {
        Write-Info "Chocolatey is already installed"
    }
}

# Install Node.js
function Install-NodeJs {
    if ($SkipNodeJs) {
        Write-Info "Skipping Node.js installation..."
        return
    }

    $nodeVersion = $null
    if (Test-Command "node") {
        $nodeVersion = (node -v).Replace("v", "").Split(".")[0]
    }

    if ($nodeVersion -ge 20) {
        Write-Info "Node.js v$(node -v) is already installed"
    } else {
        Write-Info "Installing Node.js 20 LTS..."
        choco install nodejs-lts -y --force

        # Refresh environment
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

        Write-Success "Node.js installed successfully"
    }

    # Install global packages
    Write-Info "Installing global npm packages..."
    npm install -g pm2 typescript tsx windows-build-tools 2>$null
}

# Install PostgreSQL
function Install-PostgreSQL {
    if ($SkipPostgres) {
        Write-Info "Skipping PostgreSQL installation..."
        return
    }

    if (Test-Command "psql") {
        Write-Info "PostgreSQL is already installed"
    } else {
        Write-Info "Installing PostgreSQL 16..."
        choco install postgresql16 -y --params '/Password:postgres'

        # Refresh environment
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

        Write-Success "PostgreSQL installed successfully"
    }

    # Wait for service to start
    Start-Sleep -Seconds 5

    # Configure PostgreSQL
    Write-Info "Configuring PostgreSQL..."

    $pgPassword = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "changeme123" }

    $env:PGPASSWORD = "postgres"

    try {
        psql -U postgres -c "CREATE USER gemini_user WITH PASSWORD '$pgPassword';" 2>$null
        psql -U postgres -c "CREATE DATABASE gemini_mail OWNER gemini_user;" 2>$null
        psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE gemini_mail TO gemini_user;" 2>$null
        psql -U postgres -d gemini_mail -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" 2>$null
        psql -U postgres -d gemini_mail -c "CREATE EXTENSION IF NOT EXISTS unaccent;" 2>$null
        Write-Success "PostgreSQL configured successfully"
    } catch {
        Write-Warning "PostgreSQL configuration may require manual setup"
    }
}

# Install Redis
function Install-Redis {
    if ($SkipRedis) {
        Write-Info "Skipping Redis installation..."
        return
    }

    $redisService = Get-Service -Name "Redis" -ErrorAction SilentlyContinue

    if ($redisService) {
        Write-Info "Redis is already installed"
    } else {
        Write-Info "Installing Redis..."

        # Download Redis for Windows
        $redisUrl = "https://github.com/microsoftarchive/redis/releases/download/win-3.2.100/Redis-x64-3.2.100.msi"
        $redisInstaller = "$env:TEMP\Redis-x64.msi"

        Invoke-WebRequest -Uri $redisUrl -OutFile $redisInstaller -UseBasicParsing

        # Install Redis
        Start-Process msiexec.exe -ArgumentList "/i `"$redisInstaller`" /quiet" -Wait

        Write-Success "Redis installed successfully"
    }

    # Start Redis service
    $redisService = Get-Service -Name "Redis" -ErrorAction SilentlyContinue
    if ($redisService) {
        if ($redisService.Status -ne "Running") {
            Start-Service -Name "Redis"
        }
        Set-Service -Name "Redis" -StartupType Automatic
    }
}

# Install Git
function Install-Git {
    if (-not (Test-Command "git")) {
        Write-Info "Installing Git..."
        choco install git -y

        # Refresh environment
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

        Write-Success "Git installed successfully"
    } else {
        Write-Info "Git is already installed"
    }
}

# Generate environment file
function New-EnvironmentFile {
    $envPath = Join-Path $InstallPath ".env"

    if (Test-Path $envPath) {
        Write-Warning ".env file already exists. Skipping..."
        return
    }

    Write-Info "Generating environment configuration..."

    # Generate random secrets
    $jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
    $encryptionKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
    $dbPassword = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "changeme123" }

    $envContent = @"
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gemini_mail
DB_USER=gemini_user
DB_PASSWORD=$dbPassword

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=$jwtSecret

# API Keys (fill in your own)
GEMINI_API_KEY=
PERPLEXITY_API_KEY=
GOOGLE_API_KEY=
GITHUB_TOKEN=

# OAuth (fill in your own)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Server
NODE_ENV=production
PORT=3000

# Email settings
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

# Encryption
PASSWORD_ENCRYPTION_KEY=$encryptionKey
"@

    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force

    Write-Success "Environment file created at $envPath"
    Write-Warning "Please edit .env with your API keys"
}

# Install application
function Install-Application {
    Write-Info "Installing Gemini Mail application..."

    Push-Location $InstallPath

    # Install dependencies
    npm install

    # Build frontend
    Push-Location "packages\frontend"
    npm run build
    Pop-Location

    # Build backend
    Push-Location "packages\backend"
    npm run build
    Pop-Location

    Pop-Location

    Write-Success "Application installed successfully"
}

# Create Windows Task for auto-start
function New-StartupTask {
    Write-Info "Creating startup task..."

    $taskName = "GeminiMail"
    $taskPath = Join-Path $InstallPath "packages\backend"

    # Create the action
    $action = New-ScheduledTaskAction -Execute "npm" -Argument "start" -WorkingDirectory $taskPath

    # Create the trigger (at startup)
    $trigger = New-ScheduledTaskTrigger -AtStartup

    # Create the principal (run as current user)
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U -RunLevel Limited

    # Create settings
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

    # Register the task
    try {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force
        Write-Success "Startup task created successfully"
    } catch {
        Write-Warning "Could not create startup task. You can start manually with: npm start"
    }
}

# Configure Windows Firewall
function Set-FirewallRules {
    Write-Info "Configuring Windows Firewall..."

    # Remove existing rules
    Remove-NetFirewallRule -DisplayName "Gemini Mail*" -ErrorAction SilentlyContinue

    # Add new rules
    New-NetFirewallRule -DisplayName "Gemini Mail - Backend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Any
    New-NetFirewallRule -DisplayName "Gemini Mail - Frontend" -Direction Inbound -Protocol TCP -LocalPort 80,443 -Action Allow -Profile Any

    Write-Success "Firewall configured successfully"
}

# Create desktop shortcut
function New-DesktopShortcut {
    Write-Info "Creating desktop shortcut..."

    $shortcutPath = [Environment]::GetFolderPath("Desktop") + "\Gemini Mail.lnk"
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = "http://localhost:3000"
    $shortcut.Description = "Gemini Mail Client"
    $shortcut.IconLocation = "$InstallPath\packages\frontend\public\favicon.ico"
    $shortcut.Save()

    Write-Success "Desktop shortcut created"
}

# Main installation
function Main {
    Show-Banner

    if (-not (Test-Administrator)) {
        Write-Error "This script must be run as Administrator"
        exit 1
    }

    Write-Info "Starting installation..."
    Write-Info "Install path: $InstallPath"

    # Create install directory
    if (-not (Test-Path $InstallPath)) {
        New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    }

    Install-Chocolatey
    Install-Git
    Install-NodeJs
    Install-PostgreSQL
    Install-Redis
    New-EnvironmentFile
    Install-Application
    Set-FirewallRules
    New-StartupTask
    New-DesktopShortcut

    Write-Host ""
    Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║         Installation Complete!             ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""

    Write-Success "Gemini Mail has been installed successfully!"
    Write-Host ""
    Write-Info "Next steps:"
    Write-Host "  1. Edit .env file with your API keys at: $InstallPath\.env"
    Write-Host "  2. Start the application: cd $InstallPath\packages\backend && npm start"
    Write-Host "  3. Access the application at http://localhost:3000"
    Write-Host ""
    Write-Info "Useful commands:"
    Write-Host "  npm start           - Start the backend server"
    Write-Host "  npm run dev         - Start in development mode"
    Write-Host "  pm2 status          - Check PM2 process status"
    Write-Host "  pm2 logs            - View application logs"
    Write-Host ""
}

Main
