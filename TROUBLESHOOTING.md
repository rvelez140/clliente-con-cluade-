# Guía de Solución de Problemas - Gemini Mail

## Problema: Se muestra la página por defecto de nginx en lugar de la aplicación

### Síntomas
- Al acceder a tu dominio, ves "Welcome to nginx!"
- La aplicación no carga

### Causas Comunes

1. **Los contenedores de Docker no están corriendo**
2. **Nginx está usando la configuración por defecto**
3. **Los puertos no están mapeados correctamente**
4. **El archivo .env no está configurado**

---

## Solución Rápida (Recomendado)

### Opción 1: Script Automático

En tu VPS, ejecuta el script de solución automática:

```bash
cd /ruta/a/tu/proyecto
./fix-app-launch.sh
```

Si no tienes permisos sudo, ejecuta:
```bash
sudo ./fix-app-launch.sh
```

### Opción 2: Diagnóstico Primero

Si quieres ver qué está pasando antes de arreglar:

```bash
cd /ruta/a/tu/proyecto
./diagnose-app.sh
```

---

## Solución Manual Paso a Paso

### 1. Verificar que los contenedores estén corriendo

```bash
cd /ruta/a/tu/proyecto
docker ps
```

**Deberías ver:**
- `gemini-mail-frontend`
- `gemini-mail-backend`
- `gemini-mail-db`
- `gemini-mail-redis`

**Si no están corriendo:**
```bash
# Levantar los contenedores
docker-compose -f docker-compose.prod.yml up -d

# Ver los logs si hay errores
docker-compose -f docker-compose.prod.yml logs -f
```

### 2. Verificar que el archivo .env existe

```bash
ls -la .env
```

**Si no existe:**
```bash
cp .env.example .env
nano .env  # Edita con tus valores reales
```

**Variables importantes a configurar:**
- `BACKEND_IMAGE` - Imagen del backend (ej: `ghcr.io/tu-usuario/gemini-mail-backend:latest`)
- `FRONTEND_IMAGE` - Imagen del frontend (ej: `ghcr.io/tu-usuario/gemini-mail-frontend:latest`)
- `DB_PASSWORD` - Contraseña segura para PostgreSQL
- `REDIS_PASSWORD` - Contraseña segura para Redis
- `JWT_SECRET` - Secret para JWT (genera uno aleatorio)
- `GEMINI_API_KEY` - Tu API key de Google Gemini
- `VITE_API_URL` - URL de tu dominio (ej: `https://tu-dominio.com`)
- `CORS_ORIGIN` - Mismo que VITE_API_URL

### 3. Verificar la configuración de nginx

**a) Verificar que la configuración existe:**
```bash
ls -la /etc/nginx/sites-available/gemini-mail
```

**Si no existe, copiarla:**
```bash
sudo cp nginx-ssl.conf /etc/nginx/sites-available/gemini-mail
```

**b) Habilitar la configuración:**
```bash
sudo ln -sf /etc/nginx/sites-available/gemini-mail /etc/nginx/sites-enabled/gemini-mail
```

**c) Eliminar la configuración por defecto:**
```bash
sudo rm /etc/nginx/sites-enabled/default
```

**d) Actualizar el dominio en la configuración:**
```bash
sudo nano /etc/nginx/sites-available/gemini-mail
```

Reemplaza `tu-dominio.com` con tu dominio real en:
- Línea 8: `server_name`
- Línea 18: `server_name`
- Líneas 21-22: Rutas de certificados SSL

**e) Verificar la configuración:**
```bash
sudo nginx -t
```

**f) Recargar nginx:**
```bash
sudo systemctl reload nginx
```

### 4. Verificar que los puertos estén escuchando

```bash
# Backend (puerto 8098)
curl http://localhost:8098/api/health

# Frontend (puerto 8099)
curl http://localhost:8099
```

Si alguno falla, verifica los logs del contenedor:
```bash
docker logs gemini-mail-backend
docker logs gemini-mail-frontend
```

### 5. Configurar SSL (si aún no lo hiciste)

```bash
./setup-ssl.sh
```

Este script configurará Let's Encrypt automáticamente.

---

## Verificación Final

Una vez completados los pasos, verifica:

1. **Contenedores corriendo:**
   ```bash
   docker ps | grep gemini-mail
   ```

2. **Nginx configurado:**
   ```bash
   sudo nginx -t
   curl -I http://localhost
   ```

3. **Aplicación accesible:**
   - Abre tu navegador
   - Ve a `http://tu-dominio.com`
   - Deberías ver tu aplicación, no la página de nginx

---

## Problemas Comunes Adicionales

### Error: "Connection refused" en backend o frontend

**Causa:** Los contenedores no están corriendo o tienen errores.

**Solución:**
```bash
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend
```

### Error: "upstream timed out"

**Causa:** Los servicios están tardando mucho en arrancar.

**Solución:**
```bash
# Espera 30 segundos y verifica de nuevo
sleep 30
docker ps
```

### Error: "permission denied" en volúmenes

**Causa:** Permisos incorrectos en directorios.

**Solución:**
```bash
sudo chown -R 1000:1000 ./uploads
```

### Los cambios en nginx no se aplican

**Solución:**
```bash
# Recargar nginx
sudo systemctl reload nginx

# Si no funciona, reiniciar
sudo systemctl restart nginx

# Verificar logs
sudo tail -f /var/log/nginx/error.log
```

---

## Logs Útiles

```bash
# Logs de Docker Compose
docker-compose -f docker-compose.prod.yml logs -f

# Logs del backend
docker logs -f gemini-mail-backend

# Logs del frontend
docker logs -f gemini-mail-frontend

# Logs de nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/gemini-mail-error.log

# Logs de PostgreSQL
docker logs gemini-mail-db

# Logs de Redis
docker logs gemini-mail-redis
```

---

## Comandos de Emergencia

### Reiniciar todo desde cero

```bash
# ADVERTENCIA: Esto eliminará los datos
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

### Reiniciar sin perder datos

```bash
docker-compose -f docker-compose.prod.yml restart
```

### Ver uso de recursos

```bash
docker stats
```

---

## Contacto y Soporte

Si después de seguir esta guía sigues teniendo problemas:

1. Ejecuta `./diagnose-app.sh` y guarda la salida
2. Verifica los logs de nginx y docker
3. Abre un issue en el repositorio con la información del diagnóstico
