# Cómo Verificar el Despliegue en VPS

## Opción 1: Verificar desde GitHub Actions (Recomendado) 🎯

### Paso 1: Ver el Workflow de Despliegue
1. Ve a tu repositorio en GitHub
2. Click en la pestaña **Actions**
3. Busca el workflow "Deploy to VPS"
4. Click en la ejecución más reciente

### Paso 2: Revisar los Logs
Verás dos jobs:
- **build-and-push**: Construcción y publicación de imágenes
- **deploy**: Despliegue al VPS

Click en **deploy** para ver los logs del despliegue.

### Paso 3: Buscar Confirmación Exitosa
Al final de los logs deberías ver:
```
docker-compose ps
```
Y una tabla mostrando los contenedores corriendo:
```
NAME                  STATUS          PORTS
gemini-mail-backend   Up 2 minutes    0.0.0.0:3000->3000/tcp
gemini-mail-frontend  Up 2 minutes    0.0.0.0:80->80/tcp
gemini-mail-db        Up 2 minutes    5432/tcp
```

**✅ Si ves esto = Despliegue exitoso**

---

## Opción 2: Conectarse al VPS por SSH 🖥️

### Conectarse al VPS
```bash
ssh usuario@tu-vps-ip
# Ejemplo: ssh root@192.168.1.100
```

### Ver el Estado de los Contenedores
```bash
cd /root/gemini-mail
docker-compose ps
```

**Salida esperada:**
```
NAME                       STATUS          PORTS
gemini-mail-backend-1      Up 5 minutes    0.0.0.0:3000->3000/tcp
gemini-mail-frontend-1     Up 5 minutes    0.0.0.0:80->80/tcp
gemini-mail-db-1           Up 5 minutes    5432/tcp
```

### Ver Logs en Tiempo Real
```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs solo del backend
docker-compose logs -f backend

# Ver logs solo del frontend
docker-compose logs -f frontend

# Ver últimas 50 líneas del backend
docker-compose logs --tail=50 backend
```

Para salir de los logs: presiona `Ctrl + C`

### Verificar que los Contenedores Están Corriendo
```bash
# Listar todos los contenedores
docker ps

# Ver uso de recursos
docker stats
```

---

## Opción 3: Probar la Aplicación desde el Navegador 🌐

### Acceder al Frontend
```
http://tu-vps-ip
# O si tienes dominio configurado:
http://tu-dominio.com
```

### Acceder al Backend (API)
```
http://tu-vps-ip:3000/health
# O endpoint de salud si existe
```

---

## Opción 4: Verificar las Imágenes Publicadas 📦

### Ver Imágenes en GitHub Container Registry
1. Ve a tu repositorio en GitHub
2. Click en **Packages** (en el menú lateral derecho)
3. Deberías ver dos paquetes:
   - `clliente-con-cluade-/backend`
   - `clliente-con-cluade-/frontend`
4. Click en cada uno para ver las versiones publicadas

---

## Comandos Útiles en el VPS

### Ver qué Imágenes se Están Usando
```bash
cd /root/gemini-mail
cat .env
```
Verás algo como:
```
BACKEND_IMAGE=ghcr.io/usuario/repo/backend:main
FRONTEND_IMAGE=ghcr.io/usuario/repo/frontend:main
```

### Forzar Recreación de Contenedores
```bash
cd /root/gemini-mail
docker-compose down
docker-compose pull
docker-compose up -d
```

### Limpiar Imágenes Antiguas
```bash
docker image prune -af
```

### Ver Espacio en Disco
```bash
df -h
docker system df
```

---

## Troubleshooting 🔧

### Los contenedores no están corriendo
```bash
# Ver por qué fallaron
docker-compose logs

# Reintentar el despliegue
docker-compose up -d
```

### Error de conexión a la base de datos
```bash
# Verificar que la DB está corriendo
docker-compose ps db

# Ver logs de la base de datos
docker-compose logs db

# Reiniciar solo la base de datos
docker-compose restart db
```

### Error 502 Bad Gateway (Frontend no puede conectar al Backend)
```bash
# Verificar que el backend está corriendo
docker-compose ps backend

# Ver logs del backend
docker-compose logs backend

# Reiniciar el backend
docker-compose restart backend
```

### Las imágenes no se actualizan
```bash
# Forzar descarga de nuevas imágenes
docker-compose pull

# Recrear contenedores con nuevas imágenes
docker-compose up -d --force-recreate
```

---

## Checklist de Verificación Post-Despliegue ✅

Después de cada despliegue, verifica:

- [ ] GitHub Actions muestra el workflow como exitoso (✅ verde)
- [ ] Los contenedores están corriendo (`docker-compose ps`)
- [ ] No hay errores en los logs (`docker-compose logs`)
- [ ] El frontend carga en el navegador
- [ ] El backend responde (probar un endpoint de API)
- [ ] La base de datos está accesible
- [ ] No hay errores en la consola del navegador

---

## Monitoreo Continuo 📈

### Ver Logs en Tiempo Real (Recomendado para desarrollo)
```bash
ssh usuario@vps-ip
cd /root/gemini-mail
docker-compose logs -f --tail=100
```

Esto te mostrará:
- Requests HTTP al backend
- Errores de la aplicación
- Consultas a la base de datos
- Mensajes de log personalizados

### Automatizar Verificación
Puedes usar `curl` para verificar automáticamente:

```bash
# Verificar que el frontend responde
curl -I http://tu-vps-ip

# Verificar que el backend responde
curl -I http://tu-vps-ip:3000

# Script de verificación completo
#!/bin/bash
echo "Verificando frontend..."
curl -f http://tu-vps-ip > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend FAIL"

echo "Verificando backend..."
curl -f http://tu-vps-ip:3000 > /dev/null && echo "✅ Backend OK" || echo "❌ Backend FAIL"
```

---

## Información Adicional

### Archivos Importantes en el VPS
```
/root/gemini-mail/
├── docker-compose.yml    # Configuración de servicios
├── .env                  # Variables de entorno (secretos)
└── (contenedores Docker)
```

### Puertos Expuestos
- **80**: Frontend (Nginx)
- **3000**: Backend (Node.js API)
- **5432**: PostgreSQL (solo interno, no expuesto)

### Ubicación de Logs
Los logs de Docker se almacenan en:
```bash
/var/lib/docker/containers/
```

Pero es más fácil acceder a ellos con:
```bash
docker-compose logs
```
