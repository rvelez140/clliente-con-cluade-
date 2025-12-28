# 🚀 Setup Rápido - Mejoras del Sistema de Correos

## Prerequisitos

- Node.js 18+
- PostgreSQL 14+
- Redis 6+ (para rate limiting y colas)

## Instalación

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y configura:

#### Generar clave de encriptación:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado en `PASSWORD_ENCRYPTION_KEY`.

### 3. Instalar Redis

#### macOS:
```bash
brew install redis
brew services start redis
```

#### Ubuntu/Debian:
```bash
sudo apt install redis-server
sudo systemctl start redis
```

#### Docker:
```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

### 4. Crear base de datos

```bash
# Ejecutar script de inicialización
psql -U postgres -d gemini_mail -f src/scripts/init-db.sql
```

### 5. Iniciar servidor

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

## Verificación

### Verificar Redis:
```bash
redis-cli ping
# Debe responder: PONG
```

### Verificar base de datos:
```bash
psql -U postgres -d gemini_mail -c "\dt"
# Debe mostrar todas las tablas incluyendo:
# - scheduled_emails
# - scheduled_email_history
# - email_templates
# - email_metrics
```

### Verificar logs:
```bash
ls -la logs/
# Debe mostrar:
# - combined.log
# - error.log
# - email.log
# - scheduler.log
# - http.log
```

## Nuevas Funcionalidades

### 1. Plantillas de Email
```bash
POST /api/templates
GET /api/templates
GET /api/templates/:id
PUT /api/templates/:id
DELETE /api/templates/:id
```

### 2. Métricas
```bash
GET /api/metrics
GET /api/metrics/daily
GET /api/metrics/monthly
```

### 3. Cola de Emails
```bash
GET /api/queue/stats
POST /api/queue/clean
```

### 4. WebSocket
Conectar en el frontend:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:4000');
socket.emit('authenticate', { userId: '...' });
socket.on('notification', (data) => {
  console.log('Notificación:', data);
});
```

## Troubleshooting

### Redis no conecta:
```bash
# Verificar que está corriendo
redis-cli ping

# Si no responde, iniciar Redis
redis-server
```

### Error de encriptación:
```bash
# Verificar que PASSWORD_ENCRYPTION_KEY está configurada
echo $PASSWORD_ENCRYPTION_KEY

# Si está vacía, generarla:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Logs no aparecen:
```bash
# Crear directorio de logs
mkdir -p logs

# Verificar permisos
chmod 755 logs
```

## Documentación Completa

Ver: `/MEJORAS_IMPLEMENTADAS.md` para documentación detallada de todas las mejoras.

## Soporte

Para problemas o preguntas, revisar:
1. Logs en `logs/error.log`
2. Redis logs: `redis-cli monitor`
3. PostgreSQL logs
