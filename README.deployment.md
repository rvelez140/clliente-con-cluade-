# 🚀 Quick Start - Despliegue Rápido

Guía rápida para desplegar Gemini Mail en tu VPS en 5 pasos.

Para documentación completa, ver [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## ⚡ Inicio Rápido (5 minutos)

### 1️⃣ Preparar VPS

```bash
# Instalar dependencias
sudo apt update && sudo apt install -y docker.io docker-compose git

# Clonar proyecto
cd /opt
sudo git clone https://github.com/tu-usuario/gemini-mail.git
cd gemini-mail
sudo chown -R $USER:$USER .
```

### 2️⃣ Configurar Secretos

```bash
# Ejecutar configuración de secretos
./scripts/setup-secrets.sh
```

Este script generará automáticamente contraseñas seguras para:
- PostgreSQL
- Redis
- JWT

Solo necesitas ingresar manualmente tu **Gemini API Key**.

### 3️⃣ Configurar Variables

```bash
# Crear archivo .env
cp .env.example .env
nano .env
```

Editar estas líneas:

```bash
# Cambiar por tu dominio
CORS_ORIGIN=https://tu-dominio.com

# Tu API key de Gemini ya se configuró en el paso anterior
```

### 4️⃣ Desplegar Todo

```bash
# Ejecutar script de deployment automático
./scripts/deploy.sh production
```

Este comando:
- ✅ Configura la red de Docker
- ✅ Despliega PostgreSQL y Redis
- ✅ Construye y despliega Backend y Frontend
- ✅ Configura health checks
- ✅ Verifica el estado

### 5️⃣ Configurar SSL (Opcional pero Recomendado)

```bash
# Configurar dominio y SSL
./scripts/setup-ssl.sh tu-dominio.com tu-email@example.com
```

---

## ✅ Verificación

```bash
# Ver estado de servicios
./scripts/monitor.sh

# Acceder a la aplicación
# Con SSL: https://tu-dominio.com
# Sin SSL: http://IP-de-tu-VPS:8080
```

---

## 📊 Arquitectura Desplegada

```
┌──────────────────────────────────────────┐
│     Internet (Puerto 80/443)             │
└─────────────────┬────────────────────────┘
                  │
          ┌───────▼────────┐
          │ Nginx + SSL    │ (Opcional)
          └───────┬────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
┌──────▼──────┐      ┌──────▼──────┐
│  Frontend   │      │   Backend   │
│  (Port 8080)│      │  (Port 3000)│
└─────────────┘      └──────┬──────┘
                            │
                   ┌────────┴────────┐
                   │                 │
            ┌──────▼──────┐   ┌─────▼──────┐
            │ PostgreSQL  │   │   Redis    │
            │ (Port 5432) │   │ (Port 6379)│
            └─────────────┘   └────────────┘
```

---

## 🔐 Seguridad

✅ **Secretos protegidos**: Contraseñas en archivos separados, no en `.env`
✅ **SSL/TLS**: Certificados automáticos de Let's Encrypt
✅ **Red privada**: Servicios comunicados por red interna de Docker
✅ **Firewall**: Configuración UFW automática
✅ **Rate limiting**: Nginx limita peticiones a la API
✅ **Backups automáticos**: DB respaldada diariamente

---

## 🛠️ Comandos Útiles

```bash
# Ver logs
docker-compose -f docker-compose.app.yml logs -f

# Reiniciar servicios
docker-compose -f docker-compose.app.yml restart

# Detener todo
docker-compose -f docker-compose.nginx.yml down
docker-compose -f docker-compose.app.yml down
docker-compose -f docker-compose.infrastructure.yml down

# Backup manual
docker exec gemini-mail-db-backup sh /backup-db.sh

# Monitorear sistema
./scripts/monitor.sh

# Restaurar backup
./scripts/restore-db.sh ./backups/gemini_mail_YYYYMMDD_HHMMSS.sql.gz
```

---

## 🔄 Actualizar Aplicación

```bash
# Backup automático + actualización
git pull origin main
./scripts/deploy.sh production
```

---

## 📂 Estructura de Archivos

```
gemini-mail/
├── docker-compose.infrastructure.yml  # DB + Redis
├── docker-compose.app.yml             # Backend + Frontend
├── docker-compose.nginx.yml           # Reverse proxy + SSL
├── .env                               # Variables públicas
├── secrets/                           # 🔒 Secretos (NUNCA en Git)
│   ├── db_password.txt
│   ├── redis_password.txt
│   ├── jwt_secret.txt
│   └── gemini_api_key.txt
├── scripts/
│   ├── deploy.sh                      # Deployment automático
│   ├── setup-secrets.sh               # Configurar secretos
│   ├── setup-ssl.sh                   # Configurar SSL
│   ├── monitor.sh                     # Monitoreo
│   ├── backup-db.sh                   # Backup DB
│   └── restore-db.sh                  # Restaurar DB
├── nginx/
│   └── nginx.conf                     # Configuración Nginx
├── backups/                           # Backups automáticos de DB
└── DEPLOYMENT.md                      # Documentación completa
```

---

## ❓ Problemas Comunes

### Backend no inicia

```bash
# Verificar secretos
ls -la ./secrets/
./scripts/setup-secrets.sh

# Ver logs
docker-compose -f docker-compose.app.yml logs backend
```

### Error 502 en Frontend

```bash
# Verificar backend
docker-compose -f docker-compose.app.yml ps backend

# Verificar salud
curl http://localhost:3000/api/health
```

### Base de datos no conecta

```bash
# Verificar infraestructura
docker-compose -f docker-compose.infrastructure.yml ps

# Reiniciar
docker-compose -f docker-compose.infrastructure.yml restart postgres
```

---

## 📞 Soporte

**Documentación completa**: [DEPLOYMENT.md](./DEPLOYMENT.md)

**Verificación del sistema**: `./scripts/monitor.sh`

---

## 🎯 Checklist Post-Despliegue

- [ ] Todos los servicios están corriendo: `./scripts/monitor.sh`
- [ ] Frontend accesible: `https://tu-dominio.com`
- [ ] Backend responde: `curl https://tu-dominio.com/api/health`
- [ ] SSL configurado correctamente
- [ ] Backups automáticos funcionando
- [ ] Firewall configurado: `sudo ufw status`
- [ ] Secretos guardados en lugar seguro

---

**✨ ¡Listo! Tu aplicación está en producción.**

Próximos pasos:
1. Crear tu primer usuario
2. Configurar OAuth2 (opcional)
3. Monitorear logs y rendimiento
4. Programar backups externos
