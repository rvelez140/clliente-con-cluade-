# Arquitectura de Gemini Mail

## Visión General

Gemini Mail es un cliente de correo electrónico de próxima generación que combina protocolos estándar (IMAP/SMTP) con integraciones API modernas, potenciado por IA avanzada y seguridad end-to-end.

## Principios de Arquitectura

### 1. Protocolos Estándar Primero
- **IMAP/SMTP** como base fundamental
- Compatible con cualquier servidor de correo autoalojado
- Sin dependencia de APIs propietarias para funcionalidad básica

### 2. Integraciones API Opcionales
- **Gmail API** y **Microsoft Graph API** como mejoras opcionales
- Activadas mediante OAuth2 cuando el usuario lo desee
- Funcionalidades adicionales sin sacrificar compatibilidad

### 3. IA como Capa de Mejora
- Clasificación y organización automática
- Detección de amenazas en tiempo real
- Búsqueda inteligente y asistencia contextual

### 4. Seguridad y Privacidad
- Encriptación end-to-end opcional (PGP/GPG)
- Almacenamiento local de claves privadas
- Sin acceso del servidor a contenido encriptado

## Stack Tecnológico

### Backend
- **Node.js** + **Express** + **TypeScript**: API REST
- **PostgreSQL**: Base de datos relacional
- **Redis**: Caché y gestión de sesiones
- **IMAP/SMTP**: Protocolos de correo estándar
  - `imap`: Cliente IMAP
  - `nodemailer`: Cliente SMTP
- **Google APIs**: Integración con Gmail API
  - `googleapis`: SDK oficial de Google
- **Microsoft Graph**: Integración con Outlook/Office 365
  - `@microsoft/microsoft-graph-client`: SDK oficial de Microsoft
- **Gemini AI**: Capacidades de IA
  - `@google/generative-ai`: SDK oficial de Gemini
- **OpenPGP**: Encriptación end-to-end
  - `openpgp`: Implementación completa de PGP/GPG
- **JWT**: Autenticación y autorización

### Frontend Web
- **React 18**: Framework UI
- **TypeScript**: Type safety
- **Material-UI**: Componentes UI
- **Vite**: Build tool
- **Axios**: Cliente HTTP
- **Zustand**: State management

### Desktop
- **Electron**: Framework de aplicaciones nativas
- **Electron Builder**: Empaquetado y distribución

### Mobile
- **React Native**: Framework móvil
- **React Navigation**: Navegación
- **React Native Paper**: Componentes UI

## Arquitectura de Servicios

### Servicio Unificado de Email (`unified-email.service.ts`)

Coordina todos los servicios y decide automáticamente qué implementación usar:

```typescript
fetchEmails(account) {
  if (account.hasOAuth2Tokens) {
    return fetchViaAPI(account);  // Gmail API o Graph API
  } else {
    return fetchViaIMAP(account); // IMAP estándar
  }
}
```

**Características**:
- Gestión multi-cuenta en paralelo
- Sincronización automática
- Enriquecimiento con IA
- Búsqueda global

### Autenticación OAuth2 (`oauth.service.ts`)

Gestiona la autenticación con proveedores externos:

**Gmail OAuth2**:
- Scopes: `gmail.readonly`, `gmail.send`, `gmail.modify`
- Flujo: Authorization Code Grant
- Refresh token automático

**Microsoft OAuth2**:
- Scopes: `Mail.ReadWrite`, `Mail.Send`, `offline_access`
- Endpoint: `login.microsoftonline.com`
- Refresh token automático

### Gmail API Service (`gmail-api.service.ts`)

Integración completa con Gmail API:

**Funcionalidades**:
- Fetch emails con formato completo
- Envío de correos con adjuntos
- Marcado de leídos/no leídos
- Favoritos (starred)
- Búsqueda avanzada con operadores de Gmail
- Gestión de etiquetas

### Microsoft Graph Service (`microsoft-graph.service.ts`)

Integración completa con Microsoft Graph API:

**Funcionalidades**:
- Fetch emails de carpetas específicas
- Envío de correos
- Marcado y flags
- Búsqueda en toda la cuenta
- Gestión de adjuntos
- Mover entre carpetas
- Eliminación

### IA Classifier Service (`ai-classifier.service.ts`)

Clasificación y análisis inteligente de correos:

**Clasificación Automática**:
```typescript
{
  category: 'work' | 'personal' | 'finance' | 'social' | 'promotions' | 'spam' | 'important',
  confidence: 0.95,
  suggestedFolder: 'Work/Projects',
  tags: ['urgent', 'deadline']
}
```

**Detección de Spam y Phishing**:
```typescript
{
  isSpam: boolean,
  isPhishing: boolean,
  confidence: 0.98,
  reasons: ['Suspicious sender', 'Phishing keywords'],
  riskLevel: 'high'
}
```

**Análisis de Prioridad**:
```typescript
{
  priority: 'urgent' | 'high' | 'medium' | 'low',
  score: 85,
  reasons: ['Deadline mentioned', 'Important sender']
}
```

**Extracción de Información**:
- Action items y tareas
- Fechas y deadlines
- Respuestas rápidas sugeridas

### Smart Search Service (`smart-search.service.ts`)

Búsqueda inteligente con procesamiento de lenguaje natural:

**Parseo de Consultas**:
```
"facturas del último mes" →
{
  category: 'finance',
  keywords: ['factura', 'pago', 'invoice'],
  dateRange: { last30Days }
}
```

**Búsqueda Semántica**:
- Expansión de sinónimos
- Búsqueda por similitud
- Ranking por relevancia
- Snippets contextuales

**Sugerencias Inteligentes**:
- Filtros automáticos
- Refinamiento de búsqueda
- Correos similares

### Encryption Service (`encryption.service.ts`)

Encriptación end-to-end con OpenPGP:

**Gestión de Claves**:
- Generación de pares de claves (RSA 4096 bits)
- Importación/exportación de claves públicas
- Cambio seguro de contraseña
- Certificados de revocación

**Operaciones de Encriptación**:
```typescript
// Encriptar email completo
encryptEmail({
  subject: "Confidencial",
  body: "Mensaje secreto",
  attachments: [...]
}, recipientPublicKey, senderPrivateKey, passphrase)

// Desencriptar
decryptEmail(encryptedEmail, recipientPrivateKey, passphrase)
→ { subject, body, attachments, verified: true }
```

**Firma Digital**:
- Firma de mensajes
- Verificación de firmas
- Cadena de confianza

## API Endpoints

### Autenticación
```
POST   /api/auth/register          - Registrar usuario
POST   /api/auth/login             - Iniciar sesión
GET    /api/auth/me                - Usuario actual
```

### OAuth2
```
GET    /api/oauth/gmail/auth-url           - URL de autorización Gmail
GET    /api/oauth/gmail/callback           - Callback OAuth Gmail
GET    /api/oauth/microsoft/auth-url       - URL de autorización Microsoft
GET    /api/oauth/microsoft/callback       - Callback OAuth Microsoft
```

### Correos
```
GET    /api/email/accounts                 - Listar cuentas
POST   /api/email/accounts                 - Agregar cuenta
GET    /api/email/accounts/:id/emails      - Listar correos
GET    /api/email/accounts/:id/fetch       - Sincronizar
POST   /api/email/accounts/:id/send        - Enviar correo
```

### IA
```
POST   /api/ai/classify                    - Clasificar email
POST   /api/ai/classify-batch              - Clasificar lote
POST   /api/ai/detect-spam                 - Detectar spam/phishing
POST   /api/ai/calculate-priority          - Calcular prioridad
POST   /api/ai/extract-actions             - Extraer tareas
POST   /api/ai/suggest-replies             - Sugerir respuestas
POST   /api/ai/search                      - Búsqueda inteligente
POST   /api/ai/parse-query                 - Parsear consulta
POST   /api/ai/find-similar                - Correos similares
```

### Encriptación
```
POST   /api/encryption/generate-keypair    - Generar par de claves
POST   /api/encryption/encrypt              - Encriptar mensaje
POST   /api/encryption/decrypt              - Desencriptar mensaje
POST   /api/encryption/sign                 - Firmar mensaje
POST   /api/encryption/verify               - Verificar firma
POST   /api/encryption/encrypt-email        - Encriptar email completo
POST   /api/encryption/decrypt-email        - Desencriptar email completo
POST   /api/encryption/export-public-key    - Exportar clave pública
POST   /api/encryption/import-public-key    - Importar clave pública
POST   /api/encryption/change-passphrase    - Cambiar contraseña
```

### Gemini AI (Legacy)
```
POST   /api/gemini/generate                - Generar contenido
POST   /api/gemini/improve                 - Mejorar borrador
POST   /api/gemini/summarize               - Resumir correo
POST   /api/gemini/suggest-reply           - Sugerir respuesta
```

## Flujos de Trabajo

### 1. Agregar Cuenta de Correo

#### Opción A: IMAP/SMTP (Tradicional)
```
Usuario → Ingresar credenciales (email, password, servers)
       → Backend valida conexión IMAP/SMTP
       → Guarda configuración encriptada
       → Listo para usar
```

#### Opción B: OAuth2 (Gmail/Outlook)
```
Usuario → Click "Connect with Gmail"
       → Backend genera URL de autorización
       → Usuario autoriza en Google/Microsoft
       → Callback recibe authorization code
       → Backend intercambia por access + refresh tokens
       → Guarda tokens encriptados
       → Listo para usar API
```

### 2. Recibir Correos

```
Sincronización →
  Para cada cuenta en paralelo:
    Si tiene OAuth2 tokens:
      Usar Gmail API / Graph API
    Sino:
      Usar IMAP

    Fetch emails →
    Para cada email:
      Clasificar con IA (categoría, prioridad)
      Detectar spam/phishing
      Extraer action items
      Guardar metadatos enriquecidos
```

### 3. Búsqueda Inteligente

```
Usuario → "facturas del banco del último mes"
       → AI parsea consulta:
         - category: 'finance'
         - keywords: ['factura', 'banco', 'pago']
         - dateRange: { last30Days }
       → Busca en todas las cuentas
       → Calcula relevancia semántica
       → Rankea resultados
       → Genera snippets contextuales
       → Retorna top 50 resultados
```

### 4. Enviar Email Encriptado

```
Usuario → Compone email
       → Selecciona "Encrypt"
       → Sistema busca clave pública del destinatario
       → Encripta contenido completo (subject + body + attachments)
       → Firma con clave privada del remitente
       → Envía email encriptado via SMTP/API

Destinatario → Recibe email encriptado
             → Sistema detecta encriptación
             → Solicita passphrase
             → Desencripta contenido
             → Verifica firma
             → Muestra email + badge "Verified"
```

## Seguridad

### Autenticación
- JWT con tokens de acceso y refresh
- Contraseñas hasheadas con bcrypt (salt rounds: 12)
- Sesiones con expiración configurable

### Almacenamiento
- Contraseñas IMAP/SMTP encriptadas en BD
- Tokens OAuth2 encriptados en BD
- Claves privadas PGP nunca salen del cliente
- Variables sensibles en variables de entorno

### Comunicación
- HTTPS obligatorio en producción
- TLS para IMAP/SMTP
- OAuth2 con PKCE cuando esté disponible

### Validación
- Validación de entrada en todos los endpoints
- Sanitización de HTML en emails
- Rate limiting en endpoints sensibles
- CORS configurado apropiadamente

## Escalabilidad

### Caché
- Redis para sesiones de usuario
- Caché de emails recientes (15 minutos)
- Caché de clasificaciones de IA (1 hora)

### Procesamiento Asíncrono
- Sincronización de cuentas en background
- Clasificación de IA por lotes
- Procesamiento paralelo de múltiples cuentas

### Optimizaciones
- Paginación en listados de emails
- Lazy loading de adjuntos
- Compresión de respuestas HTTP
- Connection pooling para BD y Redis

## Configuración

### Variables de Entorno Requeridas
```bash
# Base de datos
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

# Redis
REDIS_HOST, REDIS_PORT

# Seguridad
JWT_SECRET

# IA
GEMINI_API_KEY
```

### Variables Opcionales
```bash
# Gmail API
GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI

# Microsoft Graph API
MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI

# SMTP personalizado
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
```

## Roadmap

### Fase 1: Fundamentos ✅
- [x] IMAP/SMTP básico
- [x] OAuth2 para Gmail y Outlook
- [x] APIs de Gmail y Microsoft Graph
- [x] IA para clasificación y spam
- [x] Búsqueda inteligente
- [x] Encriptación PGP/GPG
- [x] Multi-cuenta

### Fase 2: Mejoras (Próximamente)
- [ ] WebSockets para sincronización en tiempo real
- [ ] Notificaciones push
- [ ] Calendario integrado (CalDAV)
- [ ] Contactos sincronizados (CardDAV)
- [ ] Firma S/MIME
- [ ] Plugins y extensiones

### Fase 3: Empresarial (Futuro)
- [ ] Active Directory / LDAP
- [ ] Políticas de retención
- [ ] Auditoría y compliance
- [ ] API para integraciones
- [ ] Deployment on-premise
- [ ] SSO (SAML, OpenID Connect)

## Contribuir

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para guías de contribución.

## Licencia

MIT License - Ver [LICENSE](LICENSE) para detalles.
