# ⚡ Guía Rápida de Despliegue Seguro

Esta es una guía rápida para implementar todas las mejoras de seguridad y despliegue.

## 🎯 Checklist de 15 Minutos

### Paso 1: Configurar Dominio (2 min)
```bash
# En tu proveedor de DNS, crear registro A:
tu-dominio.com → 212.56.46.172

# Esperar propagación DNS (1-5 minutos)
dig tu-dominio.com
```

### Paso 2: Actualizar GitHub Secrets (3 min)
```bash
# Ir a: Settings → Secrets and Variables → Actions
# Agregar o actualizar estos 9 secretos:
```

| Secret | Valor Ejemplo |
|--------|---------------|
| VPS_HOST | `tu-dominio.com` |
| VPS_USERNAME | `root` |
| VPS_SSH_KEY | `-----BEGIN RSA PRIVATE KEY-----...` |
| DB_PASSWORD | `$(openssl rand -base64 32)` |
| JWT_SECRET | `$(openssl rand -base64 64)` |
| GEMINI_API_KEY | `tu-api-key-de-gemini` |
| REDIS_PASSWORD | `$(openssl rand -base64 32)` |
| CORS_ORIGIN | `https://tu-dominio.com` |
| VITE_API_URL | `https://tu-dominio.com` |

**Generar contraseñas seguras:**
```bash
# DB_PASSWORD
openssl rand -base64 32

# JWT_SECRET
openssl rand -base64 64

# REDIS_PASSWORD
openssl rand -base64 32
```

### Paso 3: Instalar SSL en el VPS (5 min)
```bash
# Copiar script al VPS
scp setup-ssl.sh root@tu-dominio.com:/root/

# Conectar y ejecutar
ssh root@tu-dominio.com
chmod +x /root/setup-ssl.sh
./setup-ssl.sh

# Seguir las instrucciones:
# - Dominio: tu-dominio.com
# - Email: tu@email.com
```

### Paso 4: Configurar Backups (3 min)
```bash
# Copiar scripts
scp backup-database.sh restore-database.sh root@tu-dominio.com:/root/

# SSH al servidor
ssh root@tu-dominio.com
chmod +x /root/*.sh

# Configurar backup diario
crontab -e
# Agregar esta línea:
0 2 * * * /root/backup-database.sh >> /var/log/gemini-mail-backup.log 2>&1
```

### Paso 5: Configurar Monitoreo (2 min)
```bash
# Copiar script
scp monitoring.sh root@tu-dominio.com:/root/

# Configurar
ssh root@tu-dominio.com
chmod +x /root/monitoring.sh

# Probar
./monitoring.sh

# Opcional: Agregar a cron para ejecutar cada 5 min
crontab -e
# Agregar:
*/5 * * * * /root/monitoring.sh >> /var/log/gemini-mail-monitor.log 2>&1
```

### Paso 6: Desplegar (1 min)
```bash
# En tu máquina local, commit y push
git add .
git commit -m "feat: Mejoras de seguridad y despliegue"
git push origin claude/improve-deployment-Sfz9s

# Merge a main para disparar deploy
git checkout main
git merge claude/improve-deployment-Sfz9s
git push origin main
```

---

## ✅ Verificación Post-Despliegue (2 min)

### 1. Verificar SSL
```bash
curl -I https://tu-dominio.com
# Debe responder con: HTTP/2 200
```

### 2. Verificar API
```bash
curl https://tu-dominio.com/api/health
# Debe responder: {"status":"ok","timestamp":"..."}
```

### 3. Verificar Servicios
```bash
ssh root@tu-dominio.com
cd /root/gemini-mail
docker-compose ps
# Todos los servicios deben estar "healthy"
```

### 4. Verificar en el Navegador
```
https://tu-dominio.com
```
Deberías ver la aplicación Gemini Mail funcionando con certificado SSL válido (candado verde).

---

## 🔒 Mejoras de Seguridad Implementadas

- ✅ **HTTPS/SSL**: Certificado Let's Encrypt con renovación automática
- ✅ **Redis Autenticación**: Contraseña requerida para acceder a Redis
- ✅ **Rate Limiting**: Máximo 100 requests/minuto por IP en API
- ✅ **Puertos Protegidos**: Backend y Frontend solo accesibles vía Nginx
- ✅ **Headers de Seguridad**: HSTS, X-Frame-Options, CSP, etc.
- ✅ **Healthchecks**: Monitoreo automático de servicios
- ✅ **Firewall**: UFW configurado (solo puertos 22, 80, 443)
- ✅ **Backups Automáticos**: Backups diarios con retención de 30 días

---

## 📊 Comandos Útiles

### Ver Logs en Tiempo Real
```bash
ssh root@tu-dominio.com
cd /root/gemini-mail
docker-compose logs -f
```

### Reiniciar Servicios
```bash
docker-compose restart backend
docker-compose restart frontend
```

### Ver Estado de Servicios
```bash
./monitoring.sh
```

### Backup Manual
```bash
./backup-database.sh
```

### Listar Backups
```bash
ls -lh /root/gemini-mail-backups/
```

### Verificar Renovación SSL
```bash
certbot renew --dry-run
```

---

## 🆘 Problemas Comunes

### Error: "502 Bad Gateway"
```bash
# Verificar que backend está corriendo
docker ps | grep backend

# Ver logs
docker logs gemini-mail-backend

# Reiniciar
docker-compose restart backend
```

### Error: "Connection Refused"
```bash
# Verificar firewall
ufw status

# Verificar puertos
netstat -tulpn | grep -E '80|443|8098|8099'
```

### Error: SSL no funciona
```bash
# Verificar DNS
dig tu-dominio.com

# Revisar logs de certbot
journalctl -u certbot

# Reintentar obtención de certificado
certbot --nginx -d tu-dominio.com
```

---

## 📈 Próximos Pasos Recomendados

1. **Configurar Tests Automatizados** (ver DEPLOYMENT_IMPROVEMENTS.md)
2. **Implementar Fail2Ban** para protección contra fuerza bruta
3. **Configurar Backup Remoto** (Google Drive, S3, etc.)
4. **Integrar Monitoring Avanzado** (Prometheus + Grafana)
5. **Configurar CDN** (Cloudflare) para mejor rendimiento

---

## 📞 Soporte

Si encuentras problemas, revisa:
1. **DEPLOYMENT_IMPROVEMENTS.md** - Guía detallada con solución de problemas
2. **DEPLOYMENT.md** - Documentación original de despliegue
3. **Logs del sistema**: `/var/log/gemini-mail-*.log`

---

**¡Tu aplicación Gemini Mail ahora está desplegada de forma segura! 🎉**
