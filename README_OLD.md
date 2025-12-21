# Gemini Mail

Cliente de correo electrónico multiplataforma con integración de IA, temas personalizables y soporte para múltiples proveedores.

## Características

### Plataformas Soportadas
- **Web**: Aplicación web moderna construida con React
- **Desktop**: Aplicaciones nativas para Windows 11/10/Server y Linux
- **Mobile**: Aplicaciones para Android e iOS

### Funcionalidades Principales

#### Gestión de Correo
- Soporte para Gmail, Outlook y servidores auto-alojados (IMAP/SMTP)
- Enviar, recibir y organizar correos
- Carpetas personalizadas (Inbox, Enviados, Borradores, Basura)
- Marcar correos como leídos/no leídos
- Favoritos con estrellas
- Adjuntar archivos

#### Integración con Gemini AI
- **Generar correos**: Crea correos desde un simple prompt
- **Mejorar borradores**: Perfecciona la redacción y gramática
- **Sugerir respuestas**: Obtén respuestas inteligentes automáticas
- **Resumir correos**: Resúmenes concisos de correos largos
- **Tonos ajustables**: Formal, casual, amigable, profesional
- **Longitud variable**: Corto, medio, largo

#### Temas Personalizables
- **Tema Gmail**: Inspirado en el diseño de Gmail
- **Tema Outlook**: Inspirado en el diseño de Outlook
- Cambio de tema en tiempo real
- Diseño responsive

## Arquitectura

### Stack Tecnológico

#### Backend
- Node.js + Express + TypeScript
- PostgreSQL (base de datos)
- Redis (caché)
- IMAP/SMTP (protocolos de correo)
- Gemini AI API
- JWT (autenticación)

#### Frontend Web
- React 18
- TypeScript
- Material-UI (componentes)
- Vite (build tool)
- Axios (HTTP client)
- Zustand (state management)

#### Desktop
- Electron
- Electron Builder (empaquetado)
- Soporte para Windows y Linux

#### Mobile
- React Native
- React Navigation
- React Native Paper
- TypeScript

#### DevOps
- Docker + Docker Compose
- PostgreSQL containerizado
- Redis containerizado

## Instalación y Uso

### Requisitos Previos
- Node.js 20+
- Docker y Docker Compose (para desarrollo)
- PostgreSQL 16+ (si no usas Docker)
- Redis 7+ (si no usas Docker)

### Configuración Inicial

1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/gemini-mail.git
cd gemini-mail
```

2. Copiar y configurar variables de entorno:
```bash
cp .env.example .env
```

Edita `.env` y configura:
- `DB_PASSWORD`: Contraseña de PostgreSQL
- `JWT_SECRET`: Clave secreta para JWT
- `GEMINI_API_KEY`: Tu API key de Gemini AI

3. Instalar dependencias:
```bash
npm install
```

### Desarrollo con Docker

1. Iniciar todos los servicios:
```bash
docker-compose up -d
```

2. Inicializar la base de datos:
```bash
docker exec -i gemini-mail-db psql -U gemini_user -d gemini_mail < packages/backend/src/scripts/init-db.sql
```

3. La aplicación estará disponible en:
- Frontend: http://localhost
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Desarrollo Local (sin Docker)

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

### Aplicación Desktop

#### Desarrollo
```bash
cd packages/desktop
npm install
npm run dev
```

#### Construcción

**Windows:**
```bash
npm run build:win
```
Genera instalador en `packages/desktop/release/`

**Linux:**
```bash
npm run build:linux
```
Genera AppImage, .deb y .rpm en `packages/desktop/release/`

### Aplicación Móvil

#### Desarrollo

**Android:**
```bash
cd packages/mobile
npm install
npm run android
```

**iOS:**
```bash
cd packages/mobile
npm install
cd ios && pod install && cd ..
npm run ios
```

#### Construcción

**Android:**
```bash
npm run build:android
```

**iOS:**
Abrir en Xcode y seguir el proceso de distribución.

## Uso de la Aplicación

### Primera Configuración

1. Crear una cuenta o iniciar sesión
2. Agregar una cuenta de correo:
   - **Gmail**: Email y contraseña de aplicación
   - **Outlook**: Email y contraseña
   - **Custom**: Configurar servidores IMAP/SMTP

### Funciones de Gemini AI

#### Generar un correo
1. Click en "New message"
2. Escribe el asunto
3. Click en "AI Assistant" → "Generate from subject"
4. Gemini generará el contenido basado en el asunto

#### Mejorar un borrador
1. Escribe tu borrador
2. Click en "AI Assistant" → "Improve draft"
3. Gemini mejorará la redacción

#### Sugerir respuesta
1. Abre un correo recibido
2. Click en "Reply"
3. Click en "Suggest Reply"
4. Gemini generará una respuesta apropiada

### Cambiar Tema

1. Click en el icono de usuario
2. Selecciona "Tema Gmail" o "Tema Outlook"
3. El tema se aplicará inmediatamente

## Estructura del Proyecto

```
gemini-mail/
├── packages/
│   ├── backend/          # API Node.js + Express
│   │   ├── src/
│   │   │   ├── config/   # Configuración
│   │   │   ├── controllers/
│   │   │   ├── services/ # Lógica de negocio
│   │   │   ├── routes/   # Rutas API
│   │   │   ├── middleware/
│   │   │   └── types/
│   │   └── Dockerfile
│   ├── frontend/         # React Web App
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── contexts/
│   │   │   ├── services/
│   │   │   └── types/
│   │   └── Dockerfile
│   ├── desktop/          # Electron App
│   │   └── src/
│   └── mobile/           # React Native App
│       └── src/
├── docker-compose.yml
├── .env.example
└── README.md
```

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual

### Correos
- `GET /api/email/accounts` - Listar cuentas
- `POST /api/email/accounts` - Agregar cuenta
- `GET /api/email/accounts/:id/emails` - Listar correos
- `GET /api/email/accounts/:id/fetch` - Sincronizar correos
- `POST /api/email/accounts/:id/send` - Enviar correo

### Gemini AI
- `POST /api/gemini/generate` - Generar contenido
- `POST /api/gemini/improve` - Mejorar borrador
- `POST /api/gemini/summarize` - Resumir correo
- `POST /api/gemini/suggest-reply` - Sugerir respuesta

## Configuración de Cuentas de Correo

### Gmail
1. Habilita "Acceso de aplicaciones menos seguras" o usa contraseña de aplicación
2. IMAP: imap.gmail.com:993
3. SMTP: smtp.gmail.com:587

### Outlook
1. IMAP: outlook.office365.com:993
2. SMTP: smtp.office365.com:587

### Servidor Personalizado
Configura tus propios servidores IMAP y SMTP

## Seguridad

- Autenticación con JWT
- Contraseñas hasheadas con bcrypt
- HTTPS en producción
- Variables de entorno para secretos
- Validación de entrada

## Licencia

MIT

## Soporte

Para reportar problemas o solicitar características, abre un issue en GitHub.

## Créditos

- Desarrollado con ❤️ usando Gemini AI
- Diseño inspirado en Gmail y Outlook
- Iconos de Material Icons
