# 🚀 Instalación Automática

Este proyecto incluye scripts de instalación completamente automática para **Linux, macOS y Windows**.

## Instalación en Un Solo Comando

### 📦 Instalación Completa Automática

#### Linux / macOS:
```bash
npm install && npm run setup:linux
```

#### Windows PowerShell:
```powershell
npm install
npm run setup:windows
```

Esto instalará automáticamente:
- ✅ Todas las dependencias de Node.js
- ✅ Redis (caché y colas)
- ✅ Configuración de PostgreSQL
- ✅ Generación automática de claves de seguridad
- ✅ Creación del archivo .env
- ✅ Migraciones de base de datos
- ✅ Verificación completa del sistema

---

## 📋 Requisitos Previos

Solo necesitas tener instalado:
- **Node.js 18+** ([Descargar](https://nodejs.org/))
- **PostgreSQL** (opcional - el script puede instalarlo)
- **Redis** (opcional - el script puede instalarlo)

---

## 🎯 Métodos de Instalación

### Método 1: Instalación Completamente Automática (Recomendado)

```bash
# Clonar repositorio
git clone <repo-url>
cd packages/backend

# Instalar dependencias
npm install

# Ejecutar instalador automático
npm run setup:linux     # Linux/macOS
npm run setup:windows   # Windows
```

El instalador te guiará paso a paso y configurará todo automáticamente.

### Método 2: Scripts NPM Individuales

```bash
# 1. Instalar dependencias
npm install

# 2. Generar archivo .env interactivo
npm run generate:env

# 3. Migrar base de datos
npm run db:migrate

# 4. Verificar instalación
npm run verify
```

### Método 3: Instalación Manual

```bash
# 1. Copiar configuración
cp .env.example .env

# 2. Generar clave de encriptación
npm run generate:key
# Copiar el resultado en .env como PASSWORD_ENCRYPTION_KEY

# 3. Editar .env con tus credenciales
nano .env

# 4. Crear base de datos
createdb gemini_mail

# 5. Ejecutar migraciones
npm run db:migrate

# 6. Verificar
npm run verify
```

---

## 🔧 Scripts Disponibles

### Instalación y Configuración
```bash
npm run setup              # Verificación post-instalación
npm run setup:linux        # Instalador para Linux/macOS
npm run setup:windows      # Instalador para Windows
npm run verify             # Verificar que todo funcione
npm run generate:env       # Generar .env interactivo
npm run generate:key       # Generar clave de encriptación
```

### Base de Datos
```bash
npm run db:migrate         # Ejecutar migraciones
npm run db:reset           # Reset completo de BD
```

### Desarrollo
```bash
npm run dev                # Iniciar en desarrollo
npm run build              # Compilar TypeScript
npm start                  # Iniciar en producción
```

### Logs
```bash
npm run logs:tail          # Ver logs en tiempo real
npm run logs:clean         # Limpiar logs antiguos
```

### Redis
```bash
npm run redis:start        # Iniciar Redis
npm run redis:cli          # Cliente Redis CLI
```

### Testing
```bash
npm test                   # Ejecutar tests
npm run test:watch         # Tests en modo watch
npm run test:ci            # Tests para CI/CD
```

---

## ✅ Verificación de Instalación

Después de instalar, verifica que todo funcione:

```bash
npm run verify
```

Este comando verifica:
- ✅ Node.js versión correcta (18+)
- ✅ Dependencias instaladas
- ✅ Archivo .env configurado
- ✅ Redis conectado
- ✅ PostgreSQL conectado
- ✅ Tablas de BD creadas
- ✅ Archivos críticos presentes

Si todo está ✅ verde, estás listo para comenzar.

---

## 🔐 Variables de Entorno Requeridas

El instalador automático genera estas claves:

### Generadas Automáticamente ✅
- `PASSWORD_ENCRYPTION_KEY` - Encriptación AES-256
- `JWT_SECRET` - Autenticación JWT

### Debes Configurar Manualmente
- `DATABASE_URL` - Conexión PostgreSQL
- `GEMINI_API_KEY` - API de Google Gemini

### Opcionales
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Gmail API
- `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` - Outlook API
- `REDIS_URL` - Si Redis no está en localhost

---

## 🐳 Instalación con Docker (Alternativa)

Si prefieres usar Docker para Redis y PostgreSQL:

```bash
# Iniciar servicios
docker-compose up -d

# Instalar dependencias y ejecutar migraciones
npm install
npm run db:migrate

# Verificar
npm run verify

# Iniciar servidor
npm run dev
```

---

## 🚨 Solución de Problemas

### Redis no conecta
```bash
# Verificar si Redis está corriendo
redis-cli ping

# Iniciar Redis
npm run redis:start

# O con Docker
docker run -d -p 6379:6379 redis:alpine
```

### PostgreSQL error
```bash
# Verificar conexión
psql -U postgres -c "SELECT version();"

# Crear base de datos manualmente
createdb gemini_mail

# Ejecutar migraciones
npm run db:migrate
```

### Errores de permisos en Linux/macOS
```bash
chmod +x setup.sh
chmod +x scripts/*.js
```

### Verificar logs
```bash
# Ver logs en tiempo real
npm run logs:tail

# Ver errores
cat logs/error.log

# Ver logs del scheduler
cat logs/scheduler.log
```

---

## 📊 Estado del Sistema

Después de instalar, puedes verificar el estado en cualquier momento:

```bash
# Verificación completa
npm run verify

# Ver estadísticas de la cola
npm run queue:stats

# Ver logs
npm run logs:tail
```

---

## 🎓 Primeros Pasos Después de Instalar

1. **Verificar instalación:**
   ```bash
   npm run verify
   ```

2. **Iniciar en desarrollo:**
   ```bash
   npm run dev
   ```

3. **Probar endpoint de salud:**
   ```bash
   curl http://localhost:4000/health
   ```

4. **Ver logs:**
   ```bash
   npm run logs:tail
   ```

5. **Revisar documentación completa:**
   - `MEJORAS_IMPLEMENTADAS.md` - Todas las funcionalidades
   - `README_SETUP.md` - Guía de configuración detallada

---

## 📚 Documentación Adicional

- **Mejoras Implementadas:** [MEJORAS_IMPLEMENTADAS.md](./MEJORAS_IMPLEMENTADAS.md)
- **Setup Detallado:** [README_SETUP.md](./README_SETUP.md)
- **API Docs:** [docs/API.md](./docs/API.md) (próximamente)

---

## 💡 Tips

- Usa `npm run verify` frecuentemente para asegurar que todo funciona
- Los logs se encuentran en el directorio `logs/`
- Redis y PostgreSQL deben estar corriendo antes de iniciar el servidor
- El instalador es idempotente - puedes ejecutarlo múltiples veces sin problemas

---

## 🆘 Soporte

Si encuentras problemas:
1. Ejecuta `npm run verify` para diagnóstico
2. Revisa `logs/error.log`
3. Consulta la documentación en `MEJORAS_IMPLEMENTADAS.md`
4. Abre un issue en GitHub

---

**¡Listo! Tu sistema de correos con IA está configurado y funcionando. 🎉**
