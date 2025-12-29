#!/bin/bash

#############################################
# Gemini Mail - Linux Installation Script
# Version 4.0.0
# Supports: Ubuntu 20.04+, Debian 11+, Fedora 38+, Arch Linux
#############################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
    elif [ -f /etc/lsb-release ]; then
        . /etc/lsb-release
        DISTRO=$DISTRIB_ID
        VERSION=$DISTRIB_RELEASE
    else
        DISTRO=$(uname -s)
        VERSION=$(uname -r)
    fi

    echo "$DISTRO"
}

# Check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        log_warning "Running as root. Creating a dedicated user is recommended for production."
    fi
}

# Install dependencies based on distribution
install_dependencies() {
    local distro=$(detect_distro)

    log_info "Detected distribution: $distro"

    case $distro in
        ubuntu|debian|pop)
            log_info "Installing dependencies for Debian/Ubuntu..."
            sudo apt-get update
            sudo apt-get install -y \
                curl \
                wget \
                git \
                build-essential \
                postgresql \
                postgresql-contrib \
                redis-server \
                nginx \
                certbot \
                python3-certbot-nginx \
                ufw \
                fail2ban
            ;;
        fedora|rhel|centos|rocky|almalinux)
            log_info "Installing dependencies for Fedora/RHEL..."
            sudo dnf install -y \
                curl \
                wget \
                git \
                gcc-c++ \
                make \
                postgresql-server \
                postgresql-contrib \
                redis \
                nginx \
                certbot \
                python3-certbot-nginx \
                firewalld \
                fail2ban

            # Initialize PostgreSQL
            sudo postgresql-setup --initdb || true
            ;;
        arch|manjaro)
            log_info "Installing dependencies for Arch Linux..."
            sudo pacman -Syu --noconfirm \
                curl \
                wget \
                git \
                base-devel \
                postgresql \
                redis \
                nginx \
                certbot \
                certbot-nginx \
                ufw \
                fail2ban
            ;;
        *)
            log_error "Unsupported distribution: $distro"
            log_info "Please install manually: Node.js 20+, PostgreSQL 15+, Redis 7+, Nginx"
            exit 1
            ;;
    esac
}

# Install Node.js
install_nodejs() {
    log_info "Installing Node.js 20 LTS..."

    if command -v node &> /dev/null; then
        local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$node_version" -ge 20 ]; then
            log_success "Node.js $(node -v) is already installed"
            return
        fi
    fi

    # Install using NodeSource
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

    local distro=$(detect_distro)
    case $distro in
        ubuntu|debian|pop)
            sudo apt-get install -y nodejs
            ;;
        fedora|rhel|centos|rocky|almalinux)
            sudo dnf install -y nodejs
            ;;
        arch|manjaro)
            sudo pacman -S --noconfirm nodejs npm
            ;;
    esac

    # Install global packages
    sudo npm install -g pm2 typescript tsx

    log_success "Node.js $(node -v) installed successfully"
}

# Setup PostgreSQL
setup_postgresql() {
    log_info "Setting up PostgreSQL..."

    local distro=$(detect_distro)

    # Start and enable PostgreSQL
    sudo systemctl start postgresql
    sudo systemctl enable postgresql

    # Create database and user
    sudo -u postgres psql -c "CREATE USER gemini_user WITH PASSWORD '${DB_PASSWORD:-changeme123}';" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE gemini_mail OWNER gemini_user;" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gemini_mail TO gemini_user;" 2>/dev/null || true

    # Apply extensions
    sudo -u postgres psql -d gemini_mail -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" 2>/dev/null || true
    sudo -u postgres psql -d gemini_mail -c "CREATE EXTENSION IF NOT EXISTS unaccent;" 2>/dev/null || true

    log_success "PostgreSQL configured successfully"
}

# Setup Redis
setup_redis() {
    log_info "Setting up Redis..."

    sudo systemctl start redis redis-server 2>/dev/null || sudo systemctl start redis
    sudo systemctl enable redis redis-server 2>/dev/null || sudo systemctl enable redis

    # Configure Redis for production
    if [ -f /etc/redis/redis.conf ]; then
        sudo sed -i 's/^# maxmemory .*/maxmemory 256mb/' /etc/redis/redis.conf
        sudo sed -i 's/^# maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
    fi

    sudo systemctl restart redis redis-server 2>/dev/null || sudo systemctl restart redis

    log_success "Redis configured successfully"
}

# Setup Nginx
setup_nginx() {
    log_info "Setting up Nginx..."

    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/gemini-mail > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # API
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Timeouts for long requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket for real-time updates
    location /socket.io {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # File uploads
    client_max_body_size 50M;
}
EOF

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/gemini-mail /etc/nginx/sites-enabled/ 2>/dev/null || true
    sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

    # Test and restart
    sudo nginx -t && sudo systemctl restart nginx
    sudo systemctl enable nginx

    log_success "Nginx configured successfully"
}

# Setup firewall
setup_firewall() {
    log_info "Setting up firewall..."

    local distro=$(detect_distro)

    case $distro in
        ubuntu|debian|pop|arch|manjaro)
            sudo ufw --force reset
            sudo ufw default deny incoming
            sudo ufw default allow outgoing
            sudo ufw allow ssh
            sudo ufw allow 80/tcp
            sudo ufw allow 443/tcp
            sudo ufw --force enable
            ;;
        fedora|rhel|centos|rocky|almalinux)
            sudo systemctl start firewalld
            sudo systemctl enable firewalld
            sudo firewall-cmd --permanent --add-service=ssh
            sudo firewall-cmd --permanent --add-service=http
            sudo firewall-cmd --permanent --add-service=https
            sudo firewall-cmd --reload
            ;;
    esac

    log_success "Firewall configured successfully"
}

# Setup fail2ban
setup_fail2ban() {
    log_info "Setting up Fail2ban..."

    sudo systemctl start fail2ban
    sudo systemctl enable fail2ban

    # Create jail configuration
    sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
EOF

    sudo systemctl restart fail2ban

    log_success "Fail2ban configured successfully"
}

# Setup PM2 for process management
setup_pm2() {
    log_info "Setting up PM2..."

    # Create PM2 ecosystem file
    cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [
    {
      name: 'gemini-mail-backend',
      script: 'npm',
      args: 'start',
      cwd: './packages/backend',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_file: '.env'
    },
    {
      name: 'gemini-mail-frontend',
      script: 'npm',
      args: 'run preview',
      cwd: './packages/frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 5173
      }
    }
  ]
};
EOF

    # Setup PM2 startup
    pm2 startup systemd -u $USER --hp $HOME || true

    log_success "PM2 configured successfully"
}

# Generate environment file
generate_env() {
    log_info "Generating environment configuration..."

    if [ ! -f .env ]; then
        cat > .env <<EOF
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gemini_mail
DB_USER=gemini_user
DB_PASSWORD=${DB_PASSWORD:-$(openssl rand -hex 16)}

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=$(openssl rand -hex 32)

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
PASSWORD_ENCRYPTION_KEY=$(openssl rand -hex 32)
EOF

        chmod 600 .env
        log_success "Environment file created. Please edit .env with your API keys."
    else
        log_warning ".env file already exists. Skipping..."
    fi
}

# Install application
install_app() {
    log_info "Installing Gemini Mail application..."

    # Install dependencies
    npm install

    # Build frontend
    cd packages/frontend
    npm run build
    cd ../..

    # Build backend
    cd packages/backend
    npm run build
    cd ../..

    # Run database migrations
    cd packages/backend
    npm run db:migrate || true
    cd ../..

    log_success "Application installed successfully"
}

# Create systemd service
create_systemd_service() {
    log_info "Creating systemd service..."

    sudo tee /etc/systemd/system/gemini-mail.service > /dev/null <<EOF
[Unit]
Description=Gemini Mail Application
After=network.target postgresql.service redis.service

[Service]
Type=forking
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(which pm2) start ecosystem.config.js
ExecReload=$(which pm2) reload all
ExecStop=$(which pm2) stop all
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable gemini-mail

    log_success "Systemd service created"
}

# Main installation
main() {
    echo ""
    echo "╔════════════════════════════════════════════╗"
    echo "║     Gemini Mail - Linux Installation       ║"
    echo "║              Version 4.0.0                 ║"
    echo "╚════════════════════════════════════════════╝"
    echo ""

    check_root

    log_info "Starting installation..."

    install_dependencies
    install_nodejs
    setup_postgresql
    setup_redis
    setup_nginx
    setup_firewall
    setup_fail2ban
    generate_env
    install_app
    setup_pm2
    create_systemd_service

    echo ""
    echo "╔════════════════════════════════════════════╗"
    echo "║         Installation Complete!             ║"
    echo "╚════════════════════════════════════════════╝"
    echo ""
    log_success "Gemini Mail has been installed successfully!"
    echo ""
    log_info "Next steps:"
    echo "  1. Edit .env file with your API keys"
    echo "  2. Start the application: pm2 start ecosystem.config.js"
    echo "  3. Setup SSL: sudo certbot --nginx -d yourdomain.com"
    echo "  4. Access the application at http://localhost"
    echo ""
    log_info "Useful commands:"
    echo "  pm2 status          - Check application status"
    echo "  pm2 logs            - View application logs"
    echo "  pm2 restart all     - Restart all services"
    echo "  sudo systemctl status gemini-mail - Check service status"
    echo ""
}

main "$@"
