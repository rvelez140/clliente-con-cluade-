# 🚀 Guía de Mejoras para Despliegue Exitoso - Gemini Mail

Esta guía documenta todas las mejoras implementadas para asegurar un despliegue seguro y exitoso de Gemini Mail en producción.

## 📋 Índice

1. [Resumen de Mejoras](#resumen-de-mejoras)
2. [Seguridad](#seguridad)
3. [Configuración SSL/HTTPS](#configuración-sslhttps)
4. [Backups y Recuperación](#backups-y-recuperación)
5. [Monitoreo](#monitoreo)
6. [Variables de Entorno Actualizadas](#variables-de-entorno-actualizadas)
7. [Pasos de Implementación](#pasos-de-implementación)
8. [Verificación Post-Despliegue](#verificación-post-despliegue)

---

## 🎯 Resumen de Mejoras

### Mejoras Implementadas ✅

1. **Seguridad Mejorada**
   - ✅ Autenticación Redis con contraseña
   - ✅ Healthchecks en todos los servicios
   - ✅ Rate limiting en endpoints públicos
   - ✅ Puertos bind a localhost (127.0.0.1)
   - ✅ Configuración SSL/HTTPS con Let's Encrypt
   - ✅ Headers de seguridad HTTP

2. **Infraestructura**
   - ✅ Nginx como reverse proxy con SSL
   - ✅ Backup automático de PostgreSQL
   - ✅ Script de monitoreo de servicios
   - ✅ Logs persistentes en volúmenes

3. **CI/CD**
   - ✅ Variables de entorno actualizadas
   - ✅ Soporte para dominio personalizado
   - ✅ Healthchecks en docker-compose

### Mejoras Pendientes 🔧

1. **Testing**
   - ⏳ Tests unitarios para backend (Jest)
   - ⏳ Tests unitarios para frontend (Vitest)
   - ⏳ Tests de integración
   - ⏳ Tests E2E (Cypress/Playwright)

2. **Observabilidad**
   - ⏳ Integración con Prometheus/Grafana
   - ⏳ Alertas automatizadas
   - ⏳ Dashboard de métricas

3. **Escalabilidad**
   - ⏳ Configuración de clúster
   - ⏳ Balanceo de carga
   - ⏳ CDN para archivos estáticos

---

## 🔐 Seguridad

### Cambios Realizados

#### 1. Autenticación Redis
**Antes:**
```yaml
redis:
  command: redis-server --appendonly yes
```

**Después:**
```yaml
redis:
  command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
  environment:
    REDIS_PASSWORD: ${REDIS_PASSWORD}
```

#### 2. Binding de Puertos a Localhost
**Antes:**
```yaml
backend:
  ports:
    - "8098:3000"  # Accesible desde cualquier IP
```

**Después:**
```yaml
backend:
  ports:
    - "127.0.0.1:8098:3000"  # Solo accesible localmente
```

#### 3. Healthchecks Agregados
```yaml
backend:
  healthcheck:
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

#### 4. Headers de Seguridad HTTP
El archivo `nginx-ssl.conf` incluye:
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Content-Security-Policy "..." always;
```

---

## 🔒 Configuración SSL/HTTPS

### Archivos Creados

1. **`nginx-ssl.conf`**: Configuración Nginx con SSL
2. **`setup-ssl.sh`**: Script automatizado de instalación SSL

### Instalación SSL

#### Paso 1: Preparar el Dominio
```bash
# Configurar tu dominio para apuntar al VPS
# Registro A: tu-dominio.com -> 212.56.46.172
```

#### Paso 2: Ejecutar Script en el VPS
```bash
# Copiar el script al VPS
scp setup-ssl.sh root@212.56.46.172:/root/

# Conectar al VPS
ssh root@212.56.46.172

# Dar permisos de ejecución
chmod +x /root/setup-ssl.sh

# Ejecutar
./setup-ssl.sh
```

#### Paso 3: Seguir las Instrucciones
El script te pedirá:
- Nombre del dominio (ej: mail.tudominio.com)
- Email para Let's Encrypt

#### Paso 4: Actualizar Variables de Entorno

**En GitHub Secrets:**
```
VPS_HOST: tu-dominio.com
CORS_ORIGIN: https://tu-dominio.com
VITE_API_URL: https://tu-dominio.com
```

### Renovación Automática

Let's Encrypt configura renovación automática vía `certbot.timer`:
```bash
# Verificar estado
systemctl status certbot.timer

# Probar renovación manualmente
certbot renew --dry-run
```

---

## 💾 Backups y Recuperación

### Scripts Creados

1. **`backup-database.sh`**: Backup automático de PostgreSQL
2. **`restore-database.sh`**: Restauración desde backup

### Configurar Backups Automáticos

#### Paso 1: Copiar Scripts al VPS
```bash
scp backup-database.sh restore-database.sh root@212.56.46.172:/root/
ssh root@212.56.46.172
chmod +x /root/backup-database.sh /root/restore-database.sh
```

#### Paso 2: Configurar Cron
```bash
# Editar crontab
crontab -e

# Agregar backup diario a las 2 AM
0 2 * * * /root/backup-database.sh >> /var/log/gemini-mail-backup.log 2>&1

# Agregar backup semanal adicional los domingos a las 3 AM
0 3 * * 0 /root/backup-database.sh >> /var/log/gemini-mail-backup.log 2>&1
```

### Política de Retención

- **Retención local**: 30 días
- **Backups automáticos**: Diarios + Semanales
- **Ubicación**: `/root/gemini-mail-backups/`

### Restaurar desde Backup

```bash
# Listar backups disponibles
ls -lh /root/gemini-mail-backups/

# Restaurar
./restore-database.sh
# Seguir las instrucciones del script
```

---

## 📊 Monitoreo

### Script de Monitoreo

**Archivo:** `monitoring.sh`

### Instalación

```bash
# Copiar al VPS
scp monitoring.sh root@212.56.46.172:/root/
ssh root@212.56.46.172
chmod +x /root/monitoring.sh
```

### Uso

#### Monitoreo Manual
```bash
./monitoring.sh
```

#### Monitoreo Automático (Cron)
```bash
crontab -e

# Ejecutar cada 5 minutos
*/5 * * * * /root/monitoring.sh >> /var/log/gemini-mail-monitor.log 2>&1
```

### Qué Monitorea

- ✅ Estado de contenedores Docker
- ✅ Healthchecks de servicios
- ✅ Endpoints HTTP (frontend y backend)
- ✅ Uso de CPU y memoria
- ✅ Espacio en disco
- ✅ Logs recientes

---

## 🔧 Variables de Entorno Actualizadas

### Nuevas Variables Requeridas

#### GitHub Secrets (agregar en Settings → Secrets)

```bash
# Seguridad
REDIS_PASSWORD=tu-contraseña-redis-segura

# Dominio y CORS
CORS_ORIGIN=https://tu-dominio.com
VITE_API_URL=https://tu-dominio.com
```

### Archivo .env en el VPS

El workflow de deploy ahora crea automáticamente:
```bash
DB_PASSWORD=***
JWT_SECRET=***
GEMINI_API_KEY=***
REDIS_PASSWORD=***
CORS_ORIGIN=https://tu-dominio.com
VITE_API_URL=https://tu-dominio.com
BACKEND_IMAGE=ghcr.io/...
FRONTEND_IMAGE=ghcr.io/...
```

---

## 🚀 Pasos de Implementación

### 1. Configurar Secretos de GitHub

```bash
# Ir a: Settings → Secrets and Variables → Actions
# Agregar/actualizar:
VPS_HOST=tu-dominio.com
REDIS_PASSWORD=genera_una_contraseña_segura_aquí
CORS_ORIGIN=https://tu-dominio.com
VITE_API_URL=https://tu-dominio.com
```

### 2. Configurar Dominio

```bash
# En tu proveedor de DNS, crear registro A:
tu-dominio.com → 212.56.46.172
```

### 3. Instalar SSL en el VPS

```bash
# Copiar y ejecutar script
scp setup-ssl.sh root@212.56.46.172:/root/
ssh root@212.56.46.172
./setup-ssl.sh
```

### 4. Configurar Backups

```bash
# Copiar scripts
scp backup-database.sh restore-database.sh root@212.56.46.172:/root/

# Configurar cron
ssh root@212.56.46.172
chmod +x /root/*.sh
crontab -e
# Agregar líneas de backup
```

### 5. Configurar Monitoreo

```bash
scp monitoring.sh root@212.56.46.172:/root/
ssh root@212.56.46.172
chmod +x /root/monitoring.sh
crontab -e
# Agregar línea de monitoreo
```

### 6. Desplegar

```bash
# Push a la rama main
git add .
git commit -m "feat: Mejoras de seguridad y despliegue"
git push origin main

# El workflow deploy.yml se ejecutará automáticamente
```

---

## ✅ Verificación Post-Despliegue

### 1. Verificar SSL
```bash
# Debe redirigir a HTTPS
curl -I http://tu-dominio.com

# Debe responder con certificado válido
curl -I https://tu-dominio.com
```

### 2. Verificar Servicios
```bash
ssh root@212.56.46.172
cd /root/gemini-mail
docker-compose ps

# Todos deben estar "healthy"
```

### 3. Verificar Endpoints
```bash
# Frontend
curl https://tu-dominio.com

# Backend API
curl https://tu-dominio.com/api/health

# Debe responder: {"status":"ok","timestamp":"..."}
```

### 4. Verificar Rate Limiting
```bash
# Intentar múltiples requests rápidos
for i in {1..110}; do curl -I https://tu-dominio.com/api/health 2>&1 | grep HTTP; done

# Después de ~100 requests, deberías ver: 503 Service Temporarily Unavailable
```

### 5. Verificar Logs
```bash
# Ver logs recientes
docker-compose logs -f --tail=50

# Verificar archivo de monitoreo
tail -f /var/log/gemini-mail-monitor.log
```

### 6. Verificar Backups
```bash
# Ejecutar backup manual
./backup-database.sh

# Verificar que se creó
ls -lh /root/gemini-mail-backups/
```

---

## 🔥 Firewall y Seguridad del VPS

### Configuración Recomendada

```bash
# SSH al VPS
ssh root@212.56.46.172

# Configurar UFW (ya incluido en setup-ssl.sh)
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (redirige a HTTPS)
ufw allow 443/tcp   # HTTPS
ufw deny 8098       # Bloquear acceso directo al backend
ufw deny 8099       # Bloquear acceso directo al frontend
ufw status verbose
```

### Fail2Ban (Protección contra Fuerza Bruta)

```bash
# Instalar fail2ban
apt install -y fail2ban

# Configurar para Nginx
cat > /etc/fail2ban/jail.local << EOF
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/gemini-mail-error.log

[nginx-noscript]
enabled = true
port = http,https
logpath = /var/log/nginx/gemini-mail-access.log

[nginx-badbots]
enabled = true
port = http,https
logpath = /var/log/nginx/gemini-mail-access.log
EOF

# Reiniciar
systemctl restart fail2ban
systemctl enable fail2ban
```

---

## 📈 Próximos Pasos (Recomendados)

### 1. Implementar Tests Automatizados

**Backend (Jest):**
```bash
cd packages/backend
npm install --save-dev jest ts-jest @types/jest supertest @types/supertest
npx ts-jest config:init
```

**Frontend (Vitest):**
```bash
cd packages/frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

### 2. Configurar Monitoring Avanzado

**Opción 1: Uptime Kuma (Simple)**
```bash
docker run -d --restart=always -p 3001:3001 -v uptime-kuma:/app/data --name uptime-kuma louislam/uptime-kuma:1
```

**Opción 2: Prometheus + Grafana (Avanzado)**
- Prometheus para métricas
- Grafana para visualización
- Alertmanager para notificaciones

### 3. CDN y Caché

**Cloudflare (Gratis):**
1. Agregar dominio a Cloudflare
2. Actualizar nameservers
3. Habilitar proxy (nube naranja)
4. Configurar reglas de caché

### 4. Backup Remoto

**Configurar rclone:**
```bash
# Instalar rclone
curl https://rclone.org/install.sh | sudo bash

# Configurar (ej: Google Drive, S3, Dropbox)
rclone config

# Modificar backup-database.sh para incluir:
# rclone copy "${BACKUP_DIR}/${BACKUP_FILE}" remote:gemini-mail-backups/
```

---

## 🆘 Solución de Problemas

### Problema: Certificado SSL no se obtiene

**Solución:**
```bash
# Verificar DNS
dig tu-dominio.com

# Verificar puertos abiertos
telnet tu-dominio.com 80
telnet tu-dominio.com 443

# Revisar logs de certbot
journalctl -u certbot.timer
```

### Problema: Servicios no inician después del despliegue

**Solución:**
```bash
# Ver logs de docker-compose
docker-compose logs -f

# Revisar variables de entorno
cat .env

# Verificar healthchecks
docker inspect gemini-mail-backend | grep -A 10 Health
```

### Problema: 502 Bad Gateway

**Solución:**
```bash
# Verificar que backend está corriendo
docker ps | grep backend

# Revisar logs de nginx
tail -f /var/log/nginx/gemini-mail-error.log

# Probar conexión directa al backend
curl http://localhost:8098/api/health
```

---

## 📚 Referencias

- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx Security Best Practices](https://nginx.org/en/docs/http/ngx_http_core_module.html)
- [PostgreSQL Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)

---

## 📝 Checklist de Despliegue

Usa este checklist para asegurar que todos los pasos se completaron:

- [ ] Dominio configurado con DNS
- [ ] Secretos de GitHub actualizados
- [ ] SSL instalado y funcionando
- [ ] Puertos bind a localhost
- [ ] Redis con autenticación
- [ ] Healthchecks funcionando
- [ ] Rate limiting configurado
- [ ] Backups automáticos configurados
- [ ] Monitoreo configurado
- [ ] Firewall configurado
- [ ] Fail2Ban instalado (opcional)
- [ ] Endpoints verificados (HTTPS)
- [ ] Logs funcionando correctamente

---

**Última actualización:** 2025-12-21
**Versión:** 1.0
