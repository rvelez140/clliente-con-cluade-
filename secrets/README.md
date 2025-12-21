# 🔐 Secrets Directory

Este directorio contiene los secretos sensibles de la aplicación.

## ⚠️ IMPORTANTE

**NUNCA** subas estos archivos a Git. Este directorio ya está configurado en `.gitignore`.

## 📝 Archivos Requeridos

Ejecuta `../scripts/setup-secrets.sh` para crear todos los secretos necesarios:

### Obligatorios:
- `db_password.txt` - Contraseña de PostgreSQL
- `redis_password.txt` - Contraseña de Redis
- `jwt_secret.txt` - Secreto para tokens JWT
- `gemini_api_key.txt` - API Key de Gemini AI

### Opcionales:
- `gmail_client_secret.txt` - OAuth2 Gmail
- `microsoft_client_secret.txt` - OAuth2 Microsoft

## 🔒 Seguridad

- Permisos: `chmod 600 *.txt` (solo lectura para el propietario)
- Directorio: `chmod 700 .` (acceso completo solo para el propietario)
- **Hacer backup** de estos archivos en un lugar seguro
- En producción, considera usar un gestor de secretos (Vault, AWS Secrets Manager, etc.)

## 📖 Uso

Los secretos se leen automáticamente desde:
1. Variables de entorno terminadas en `_FILE` (ej: `DB_PASSWORD_FILE=/run/secrets/db_password`)
2. Archivos en `/run/secrets/` (Docker secrets)
3. Variables de entorno directas (fallback para desarrollo)

Ver `packages/backend/src/config/secrets.ts` para más detalles.
