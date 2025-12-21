# Gemini Mail

Cliente de correo electrónico multiplataforma de próxima generación con IA avanzada, encriptación end-to-end, y soporte universal para proveedores de correo.

---

## 🚀 Características Principales

### 📧 Protocolos de Correo Estándar
- **IMAP/SMTP Completo**: Compatible con cualquier servidor autoalojado
  - Postfix, Dovecot, Mail-in-a-Box, iRedMail
  - Zimbra, Kerio, Exchange (IMAP habilitado)
  - Cualquier servidor estándar IMAP/SMTP
- **Autenticación Flexible**:
  - ✅ OAuth2 para Gmail y Microsoft/Outlook
  - ✅ Credenciales tradicionales (usuario/contraseña)
  - ✅ Contraseñas de aplicación
  - ✅ Soporte para 2FA

### 🔌 Integraciones API Opcionales
- **Gmail API**: Funcionalidades avanzadas de Google Workspace
  - Búsqueda con operadores de Gmail
  - Etiquetas y filtros nativos
  - Integración con Google Drive
- **Microsoft Graph API**: Integración empresarial con Office 365
  - Correo, calendario y contactos
  - Políticas de seguridad corporativas
  - Teams y SharePoint

### 🤖 IA Avanzada con Gemini

#### Generación de Contenido
- 📝 Crear correos desde prompts simples
- ✨ Mejorar borradores existentes
- 💬 Sugerir respuestas contextuales
- 📄 Resumir correos largos y threads

#### Clasificación Inteligente
- 🏷️ Categorización automática (personal, trabajo, finanzas, social, etc.)
- ⚡ Detección de prioridad (urgente, alto, medio, bajo)
- 🎯 Etiquetado semántico
- 📁 Organización por carpetas sugeridas

#### Búsqueda Inteligente
- 🔍 Búsqueda en lenguaje natural
- 🌐 Expansión semántica de consultas
- 🎯 Filtros inteligentes contextuales
- 🔗 Búsqueda por similitud

#### Seguridad con IA
- 🛡️ Detección de spam avanzada
- 🎣 Identificación de phishing
- ⚠️ Análisis de riesgo en tiempo real
- 🚨 Alertas de seguridad

#### Asistencia Inteligente
- ✅ Extracción automática de tareas
- ⚡ Respuestas rápidas sugeridas
- 📅 Detección de fechas y eventos
- 🎨 Tonos ajustables (formal, casual, amigable, profesional)

### 🔐 Encriptación End-to-End

#### OpenPGP/GPG Completo
- 🔑 Generación de pares de claves (RSA 4096 bits)
- 🔒 Encriptación de emails completos
- ✍️ Firma digital de mensajes
- ✅ Verificación de firmas
- 🔄 Gestión completa de claves

#### Seguridad
- 🛡️ Claves privadas nunca salen del cliente
- 🔐 Certificados de revocación
- 🔄 Cambio seguro de contraseñas
- 📤 Import/export de claves públicas

### 📱 Multi-Plataforma

- 🌐 **Web**: Aplicación moderna con React
- 💻 **Desktop**: Windows, Linux (Electron)
- 📱 **Mobile**: Android e iOS (React Native)

### 👥 Gestión Multi-Cuenta

- ⚡ Sincronización paralela de múltiples cuentas
- 📬 Vista unificada de todas las bandejas
- 🔍 Búsqueda global en todas las cuentas
- 🔄 Switching rápido entre cuentas
- 🎨 Configuración independiente por cuenta

### 🎨 Personalización

- **Tema Gmail**: Diseño inspirado en Gmail
- **Tema Outlook**: Diseño inspirado en Outlook
- 🌓 Cambio de tema en tiempo real
- 📱 Diseño responsive

---

## 🏗️ Arquitectura

Ver [ARCHITECTURE.md](ARCHITECTURE.md) para documentación completa de la arquitectura.

### Stack Tecnológico

#### Backend
- Node.js + Express + TypeScript
- PostgreSQL + Redis
- IMAP/SMTP (imap, nodemailer)
- Gmail API (googleapis)
- Microsoft Graph API
- Gemini AI
- OpenPGP (openpgp)

#### Frontend
- React 18 + TypeScript
- Material-UI + Vite
- Zustand (state management)

#### Desktop
- Electron + Electron Builder

#### Mobile
- React Native + React Navigation

---

## 📦 Instalación

### Requisitos Previos
- Node.js 20+
- Docker y Docker Compose (recomendado)
- PostgreSQL 16+ (si no usas Docker)
- Redis 7+ (si no usas Docker)

### Configuración Rápida con Docker

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/gemini-mail.git
cd gemini-mail

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 3. Iniciar servicios
docker-compose up -d

# 4. Inicializar base de datos
docker exec -i gemini-mail-db psql -U gemini_user -d gemini_mail < packages/backend/src/scripts/init-db.sql

# 5. Acceder a la aplicación
# Web: http://localhost
# API: http://localhost:3000
```

### Configuración Manual

#### Backend
```bash
cd packages/backend
npm install
npm run dev
```

#### Frontend
```bash
cd packages/frontend
npm install
npm run dev
```

#### Desktop
```bash
cd packages/desktop
npm install
npm run dev

# Build para producción
npm run build:win    # Windows
npm run build:linux  # Linux
```

#### Mobile
```bash
cd packages/mobile
npm install

# Android
npm run android

# iOS
cd ios && pod install && cd ..
npm run ios
```

---

## ⚙️ Configuración

### Variables de Entorno Esenciales

```bash
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gemini_mail
DB_USER=gemini_user
DB_PASSWORD=tu_password_seguro

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Seguridad
JWT_SECRET=tu_clave_secreta_jwt

# IA
GEMINI_API_KEY=tu_api_key_de_gemini
```

### Configuración OAuth2 (Opcional)

Para habilitar las integraciones API:

#### Gmail API
1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear proyecto y habilitar Gmail API
3. Crear credenciales OAuth2
4. Configurar:
```bash
GMAIL_CLIENT_ID=tu_client_id
GMAIL_CLIENT_SECRET=tu_client_secret
GMAIL_REDIRECT_URI=http://localhost:3000/api/oauth/gmail/callback
```

#### Microsoft Graph API
1. Ir a [Azure Portal](https://portal.azure.com/)
2. Registrar aplicación
3. Configurar permisos Mail.ReadWrite, Mail.Send
4. Configurar:
```bash
MICROSOFT_CLIENT_ID=tu_client_id
MICROSOFT_CLIENT_SECRET=tu_client_secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/oauth/microsoft/callback
```

---

## 📚 Uso

### Agregar Cuenta de Correo

#### Opción 1: IMAP/SMTP (Cualquier proveedor)
1. Click en "Agregar cuenta"
2. Seleccionar "Servidor personalizado"
3. Ingresar:
   - Email
   - Contraseña
   - Servidor IMAP (ej: mail.tudominio.com:993)
   - Servidor SMTP (ej: mail.tudominio.com:587)
4. Guardar

#### Opción 2: OAuth2 (Gmail/Outlook)
1. Click en "Agregar cuenta"
2. Seleccionar "Gmail" o "Outlook"
3. Click en "Conectar con OAuth"
4. Autorizar en Google/Microsoft
5. ¡Listo!

### Funciones de IA

#### Generar Email
```
1. Click "Nuevo mensaje"
2. Escribir asunto: "Solicitar reunión con equipo"
3. Click "AI Assistant" → "Generate from subject"
4. IA genera email completo
```

#### Búsqueda Inteligente
```
Buscar: "facturas del último mes"
→ IA encuentra todos los correos de:
  - Categoría: finanzas
  - Contiene: factura, invoice, pago
  - Fecha: últimos 30 días
```

#### Detectar Spam/Phishing
```
Correo recibido →
  IA analiza automáticamente:
  - ✅ No es spam
  - ⚠️ Posible phishing (85% confianza)
  - Razones: "Sender domain mismatch", "Urgency language"
  - Riesgo: Alto
```

### Encriptación PGP

#### Generar Claves
```
1. Ir a Configuración → Seguridad
2. Click "Generar par de claves PGP"
3. Ingresar:
   - Nombre
   - Email
   - Contraseña (passphrase)
4. Guardar clave pública y privada
```

#### Enviar Email Encriptado
```
1. Componer email
2. Click "Encrypt" 🔒
3. Sistema busca clave pública del destinatario
4. Encripta y firma automáticamente
5. Enviar
```

---

## 🛣️ API Endpoints

### Autenticación
```http
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
```

### OAuth2
```http
GET    /api/oauth/gmail/auth-url
GET    /api/oauth/gmail/callback
GET    /api/oauth/microsoft/auth-url
GET    /api/oauth/microsoft/callback
```

### Correos
```http
GET    /api/email/accounts
POST   /api/email/accounts
GET    /api/email/accounts/:id/emails
POST   /api/email/accounts/:id/send
```

### IA
```http
POST   /api/ai/classify
POST   /api/ai/detect-spam
POST   /api/ai/search
POST   /api/ai/suggest-replies
```

### Encriptación
```http
POST   /api/encryption/generate-keypair
POST   /api/encryption/encrypt-email
POST   /api/encryption/decrypt-email
```

Ver [ARCHITECTURE.md](ARCHITECTURE.md) para documentación completa de la API.

---

## 🔒 Seguridad

- ✅ JWT con tokens de acceso y refresh
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Tokens OAuth2 encriptados en BD
- ✅ Claves privadas PGP nunca salen del cliente
- ✅ HTTPS obligatorio en producción
- ✅ TLS para IMAP/SMTP
- ✅ Validación y sanitización de entrada
- ✅ Rate limiting
- ✅ CORS configurado

---

## 📈 Rendimiento

- ⚡ Sincronización paralela de cuentas
- 💾 Caché inteligente con Redis
- 🔄 Procesamiento asíncrono de IA
- 📦 Paginación y lazy loading
- 🗜️ Compresión HTTP
- 🏊 Connection pooling

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---

## 🙏 Agradecimientos

- Powered by [Gemini AI](https://deepmind.google/technologies/gemini/)
- Diseño inspirado en Gmail y Outlook
- Iconos de [Material Icons](https://fonts.google.com/icons)

---

## 📞 Soporte

- 📧 Email: support@gemini-mail.com
- 🐛 Issues: [GitHub Issues](https://github.com/tu-usuario/gemini-mail/issues)
- 📖 Docs: [Wiki](https://github.com/tu-usuario/gemini-mail/wiki)

---

**¡Disfruta de Gemini Mail!** 🚀✨
