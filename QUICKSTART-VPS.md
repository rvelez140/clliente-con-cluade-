# 🚀 Inicio Rápido - Despliegue en VPS

Guía de inicio rápido para desplegar Gemini Mail en un VPS en menos de 5 minutos.

## Pre-requisitos

- VPS con Ubuntu 20.04+ (2GB RAM mínimo)
- Acceso SSH como root o sudo
- Dominio configurado (opcional)

## Instalación en 3 Pasos

### 1️⃣ Clonar y Configurar

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/gemini-mail.git
cd gemini-mail

# Copiar y editar variables de entorno
cp .env.example .env
nano .env
```

**Variables mínimas requeridas** en `.env`:
```bash
DB_PASSWORD=cambia_esta_contraseña_por_una_segura
REDIS_PASSWORD=cambia_esta_contraseña_redis_segura
JWT_SECRET=usa_openssl_rand_hex_32_para_generar_esto
GEMINI_API_KEY=tu_api_key_de_google_gemini
```

### 2️⃣ Desplegar

```bash
# Ejecutar script de despliegue automatizado
sudo ./deploy-vps.sh
```

El script instalará automáticamente:
- ✅ Docker & Docker Compose
- ✅ PostgreSQL 16
- ✅ Redis 7
- ✅ Backend API
- ✅ Frontend React

### 3️⃣ Acceder

```bash
# Aplicación lista en:
http://tu-servidor-ip          # Frontend
http://tu-servidor-ip:3000/api # Backend API
```

## 🔒 Configurar HTTPS (Recomendado)

```bash
# Instalar nginx y certbot
sudo apt install nginx certbot python3-certbot-nginx -y

# Copiar configuración de nginx
sudo cp nginx.conf.example /etc/nginx/sites-available/gemini-mail

# Editar con tu dominio
sudo nano /etc/nginx/sites-available/gemini-mail
# Reemplaza 'tu-dominio.com' con tu dominio real

# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/gemini-mail /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

## 📦 Backups Automáticos

```bash
# Programar backup diario a las 2 AM
sudo crontab -e

# Agregar esta línea:
0 2 * * * /ruta/completa/a/gemini-mail/backup-db.sh >> /var/log/gemini-backup.log 2>&1
```

## 🛠️ Comandos Útiles

```bash
# Ver estado
docker-compose ps

# Ver logs
docker-compose logs -f

# Reiniciar
docker-compose restart

# Detener
docker-compose down

# Actualizar
git pull && docker-compose up -d --build
```

## 📖 Documentación Completa

Para más detalles, consulta [DEPLOY.md](DEPLOY.md)

## ⚡ Troubleshooting

**Error al conectar a PostgreSQL:**
```bash
docker-compose logs postgres
docker-compose restart postgres
```

**Error al conectar a Redis:**
```bash
docker-compose logs redis
docker-compose restart redis
```

**Ver todos los logs:**
```bash
docker-compose logs
```

## 🆘 Soporte

¿Problemas? Abre un issue en GitHub o consulta la documentación completa.

---

**¡Listo!** 🎉 Tu aplicación Gemini Mail está desplegada y lista para usar.
