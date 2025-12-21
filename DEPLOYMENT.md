# Guía de Despliegue - Gemini Mail

Esta guía te ayudará a desplegar la aplicación Gemini Mail en tu VPS usando GitHub Actions.

## Requisitos Previos

- Un VPS con Docker y Docker Compose instalados
- Acceso SSH al VPS
- Una cuenta de GitHub con este repositorio

## Configuración de Secretos en GitHub

Para configurar los secretos necesarios en GitHub:

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Secrets and variables** → **Actions**
4. Click en **New repository secret** para cada uno de los siguientes secretos:

### Secretos Requeridos

| Nombre del Secreto | Descripción | Ejemplo |
|-------------------|-------------|---------|
| `VPS_HOST` | Dirección IP de tu VPS | `212.56.46.172` |
| `VPS_USERNAME` | Usuario SSH del VPS | `root` |
| `VPS_SSH_KEY` | Clave privada SSH para acceder al VPS | Ver sección abajo |
| `DB_PASSWORD` | Contraseña segura para PostgreSQL | `my_secure_password_123` |
| `JWT_SECRET` | Clave secreta para JWT | `random_string_very_secure_123` |
| `GEMINI_API_KEY` | API Key de Google Gemini | `AIzaSy...` |

### Cómo obtener la clave SSH

La clave SSH privada ya fue generada en tu VPS. Para agregarla a GitHub:

1. Copia el contenido completo de la clave privada que te proporcionaste (desde `-----BEGIN OPENSSH PRIVATE KEY-----` hasta `-----END OPENSSH PRIVATE KEY-----`)
2. Pégala como valor del secreto `VPS_SSH_KEY`

**IMPORTANTE:** La clave privada debe incluir todo el contenido, incluyendo las líneas de inicio y fin.

## Configuración del VPS

### 1. Instalar Docker (si no está instalado)

```bash
# Actualizar el sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
apt install docker-compose-plugin -y
```

### 2. Configurar el Firewall

```bash
# Permitir SSH
ufw allow 22/tcp

# Permitir HTTP
ufw allow 80/tcp

# Permitir el puerto del backend (opcional, para acceso directo)
ufw allow 3000/tcp

# Habilitar el firewall
ufw --force enable
```

### 3. Verificar acceso SSH

Asegúrate de que puedes conectarte al VPS usando la clave SSH:

```bash
ssh -i ~/.ssh/id_rsa root@212.56.46.172
```

## Proceso de Despliegue

El despliegue se ejecuta automáticamente cuando:

1. Haces push a la rama `main`
2. Haces push a la rama `claude/docker-vps-deployment-OmAKA`
3. Ejecutas manualmente el workflow desde GitHub Actions

### Flujo del Despliegue

1. **Build y Push de Imágenes**
   - Se construyen las imágenes de backend y frontend
   - Se suben a GitHub Container Registry (ghcr.io)
   - Se etiquetan con el nombre de la rama

2. **Despliegue en VPS**
   - Se conecta al VPS via SSH
   - Descarga el archivo `docker-compose.prod.yml`
   - Crea el archivo `.env` con los secretos
   - Descarga las imágenes Docker
   - Detiene contenedores antiguos
   - Inicia los nuevos contenedores

## Verificación del Despliegue

Una vez completado el despliegue:

1. **Verificar servicios en el VPS:**

```bash
ssh root@212.56.46.172
cd /root/gemini-mail
docker-compose ps
```

2. **Ver logs:**

```bash
# Todos los servicios
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Solo frontend
docker-compose logs -f frontend
```

3. **Acceder a la aplicación:**

- Frontend: http://212.56.46.172
- Backend API: http://212.56.46.172:3000

## Solución de Problemas

### Los contenedores no inician

```bash
# Ver logs detallados
docker-compose logs -f

# Verificar que las imágenes se descargaron
docker images | grep gemini-mail
```

### Error de conexión a la base de datos

```bash
# Verificar que PostgreSQL está corriendo
docker-compose ps postgres

# Ver logs de PostgreSQL
docker-compose logs postgres
```

### Reiniciar servicios

```bash
cd /root/gemini-mail
docker-compose restart
```

### Despliegue manual

Si necesitas desplegar manualmente:

```bash
ssh root@212.56.46.172
cd /root/gemini-mail

# Descargar últimas imágenes
docker-compose pull

# Reiniciar servicios
docker-compose up -d

# Ver estado
docker-compose ps
```

## Mantenimiento

### Actualizar la aplicación

La aplicación se actualiza automáticamente cuando haces push a las ramas configuradas. Para forzar una actualización:

1. Ve a GitHub Actions en tu repositorio
2. Selecciona el workflow "Deploy to VPS"
3. Click en "Run workflow"
4. Selecciona la rama y confirma

### Respaldos

Se recomienda hacer respaldos regulares de:

- Base de datos PostgreSQL
- Volumen de Redis
- Archivos subidos (volumen uploads-data)

```bash
# Backup de la base de datos
docker exec gemini-mail-db pg_dump -U gemini_user gemini_mail > backup-$(date +%Y%m%d).sql

# Backup de volúmenes
docker run --rm -v gemini-mail_postgres-data:/data -v $(pwd):/backup ubuntu tar czf /backup/postgres-backup-$(date +%Y%m%d).tar.gz /data
```

## Seguridad

- Cambia las contraseñas por defecto en los secretos de GitHub
- Mantén tu clave SSH privada segura y nunca la compartas
- Considera usar un certificado SSL/TLS (Let's Encrypt) para HTTPS
- Revisa regularmente los logs para detectar actividad inusual

## Notas Adicionales

- El workflow usa GitHub Container Registry, que es privado por defecto para repositorios privados
- Las imágenes se construyen con multi-stage builds para optimizar el tamaño
- Los contenedores se reinician automáticamente si fallan (`restart: unless-stopped`)
