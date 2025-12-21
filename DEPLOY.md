# Guía de Despliegue en VPS

Esta guía te ayudará a desplegar Gemini Mail en un VPS (Virtual Private Server).

## Requisitos Previos

- VPS con Ubuntu 20.04 o superior (o cualquier distribución Linux compatible)
- Al menos 2GB de RAM
- 20GB de espacio en disco
- Acceso root o sudo
- Dominio configurado apuntando a tu VPS (opcional pero recomendado)

## Instalación Rápida

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/gemini-mail.git
cd gemini-mail
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
nano .env  # o usa tu editor preferido
```

Configura las siguientes variables **obligatorias**:

```bash
# Database - Cambia esta contraseña por una segura
DB_PASSWORD=tu_contraseña_segura_aqui

# Redis - Cambia esta contraseña por una segura
REDIS_PASSWORD=tu_contraseña_redis_segura

# JWT - Genera un secreto seguro (puedes usar: openssl rand -hex 32)
JWT_SECRET=tu_secreto_jwt_muy_seguro_y_largo

# Gemini AI - Tu API key de Google Gemini
GEMINI_API_KEY=tu_api_key_de_gemini
```

Variables **opcionales** para producción:

```bash
# Para producción con docker-compose.prod.yml
USE_PRODUCTION=true
CORS_ORIGIN=https://tu-dominio.com
BACKEND_IMAGE=ghcr.io/tu-usuario/tu-repo/backend:main
FRONTEND_IMAGE=ghcr.io/tu-usuario/tu-repo/frontend:main
```

### 3. Ejecutar el script de despliegue

```bash
sudo ./deploy-vps.sh
```

Este script automáticamente:
- ✅ Instala Docker y Docker Compose si no están instalados
- ✅ Verifica las variables de entorno
- ✅ Crea los directorios necesarios
- ✅ Configura el firewall (opcional)
- ✅ Construye y levanta todos los servicios
- ✅ Inicializa la base de datos PostgreSQL
- ✅ Configura Redis con persistencia
- ✅ Verifica que todos los servicios estén funcionando

### 4. Acceder a la aplicación

Una vez completado el despliegue:

- **Frontend**: http://tu-servidor-ip o http://localhost
- **Backend API**: http://tu-servidor-ip:3000/api
- **Health Check**: http://tu-servidor-ip:3000/api/health

## Configuración de Producción

### Configurar Nginx como Proxy Reverso

Para usar HTTPS y un dominio personalizado, configura Nginx:

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

Crea el archivo de configuración:

```bash
sudo nano /etc/nginx/sites-available/gemini-mail
```

Usa la configuración de `nginx.conf.example`:

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Habilita el sitio y obtén certificado SSL:

```bash
sudo ln -s /etc/nginx/sites-available/gemini-mail /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

### Configurar Backups Automáticos

Programa backups diarios con cron:

```bash
sudo crontab -e
```

Agrega esta línea para backup diario a las 2 AM:

```bash
0 2 * * * /ruta/completa/a/gemini-mail/backup-db.sh >> /var/log/gemini-mail-backup.log 2>&1
```

## Administración

### Comandos Útiles

```bash
# Ver estado de los servicios
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis

# Reiniciar un servicio
docker-compose restart backend

# Reiniciar todos los servicios
docker-compose restart

# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes (¡CUIDADO! Esto elimina los datos)
docker-compose down -v

# Actualizar los servicios
git pull
docker-compose up -d --build
```

### Backups y Restauración

#### Crear un backup manual

```bash
./backup-db.sh
```

Los backups se guardan en `./backups/` con el formato `gemini_mail_YYYYMMDD_HHMMSS.sql.gz`

#### Restaurar desde un backup

```bash
./restore-db.sh ./backups/gemini_mail_20240115_020000.sql.gz
```

⚠️ **ADVERTENCIA**: La restauración sobrescribirá la base de datos actual. Se creará un backup de seguridad automáticamente.

#### Listar backups disponibles

```bash
ls -lh ./backups/
```

### Monitoreo

#### Verificar salud de los servicios

```bash
# PostgreSQL
docker exec gemini-mail-db pg_isready -U gemini_user -d gemini_mail

# Redis
docker exec gemini-mail-redis redis-cli ping

# Backend
curl http://localhost:3000/api/health
```

#### Uso de recursos

```bash
# Ver uso de CPU y memoria
docker stats

# Espacio en disco
df -h
docker system df
```

## Solución de Problemas

### Los servicios no inician

```bash
# Ver logs de todos los servicios
docker-compose logs

# Verificar que los puertos no estén en uso
sudo netstat -tulpn | grep -E ':(80|3000|5432|6379)'
```

### Error de conexión a la base de datos

```bash
# Verificar que PostgreSQL está corriendo
docker-compose ps postgres

# Ver logs de PostgreSQL
docker-compose logs postgres

# Reiniciar PostgreSQL
docker-compose restart postgres
```

### Error de conexión a Redis

```bash
# Verificar que Redis está corriendo
docker-compose ps redis

# Ver logs de Redis
docker-compose logs redis

# Probar conexión
docker exec gemini-mail-redis redis-cli ping
```

### Limpiar y reiniciar todo

Si algo sale mal y quieres empezar de cero:

```bash
# ⚠️ ADVERTENCIA: Esto eliminará TODOS los datos
docker-compose down -v
docker system prune -a
./deploy-vps.sh
```

## Seguridad

### Checklist de Seguridad

- [ ] Cambiar todas las contraseñas por defecto en `.env`
- [ ] Usar contraseñas fuertes y únicas
- [ ] Configurar firewall (UFW o iptables)
- [ ] Configurar HTTPS con Let's Encrypt
- [ ] Mantener Docker y el sistema operativo actualizados
- [ ] Configurar backups automáticos
- [ ] Limitar acceso SSH (solo claves, no contraseñas)
- [ ] Configurar fail2ban
- [ ] Revisar logs regularmente

### Actualización del Sistema

```bash
# Actualizar sistema operativo
sudo apt update && sudo apt upgrade -y

# Actualizar Docker
sudo apt update && sudo apt install docker-ce docker-ce-cli containerd.io

# Actualizar la aplicación
cd /ruta/a/gemini-mail
git pull
docker-compose down
docker-compose up -d --build
```

## Escalabilidad

### Aumentar Recursos

Si necesitas más recursos, puedes modificar los límites en `docker-compose.yml`:

```yaml
services:
  postgres:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

### Separar Servicios

Para producción a gran escala, considera:

1. Base de datos PostgreSQL en servidor dedicado
2. Redis en servidor dedicado
3. Backend en múltiples instancias con load balancer
4. Frontend servido desde CDN

## Soporte

Si encuentras problemas:

1. Revisa los logs: `docker-compose logs -f`
2. Verifica la configuración de `.env`
3. Consulta la documentación en GitHub
4. Abre un issue en el repositorio

---

¿Necesitas ayuda? Abre un issue en: https://github.com/tu-usuario/gemini-mail/issues
