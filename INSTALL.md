# Guía de Instalación Detallada

## Requisitos del Sistema

### Para Desarrollo
- Node.js 20 o superior
- npm 10 o superior
- Docker Desktop (opcional pero recomendado)
- Git

### Para Producción (Docker)
- Docker 24+
- Docker Compose 2.0+
- 2GB RAM mínimo
- 10GB espacio en disco

### Para Desktop
- **Windows**: Windows 10/11 o Windows Server 2019+
- **Linux**: Ubuntu 20.04+, Fedora 36+, o equivalente

### Para Mobile
- **Android**: Android Studio, SDK 28+
- **iOS**: macOS, Xcode 14+

## Instalación Paso a Paso

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/gemini-mail.git
cd gemini-mail
```

### 2. Configurar Variables de Entorno

```bash
cp .env.example .env
```

Edita el archivo `.env`:

```env
# Base de datos
DB_PASSWORD=una_contraseña_segura_aqui

# JWT
JWT_SECRET=un_secret_muy_seguro_de_al_menos_32_caracteres

# Gemini AI - Obtén tu API key en https://ai.google.dev/
GEMINI_API_KEY=tu_api_key_de_gemini_aqui

# Frontend
VITE_API_URL=http://localhost:3000
```

### 3. Instalación con Docker (Recomendado)

#### Paso 1: Construir las imágenes
```bash
docker-compose build
```

#### Paso 2: Iniciar los servicios
```bash
docker-compose up -d
```

#### Paso 3: Inicializar la base de datos
```bash
# Esperar 10 segundos para que PostgreSQL esté listo
sleep 10

# Ejecutar el script de inicialización
docker exec -i gemini-mail-db psql -U gemini_user -d gemini_mail < packages/backend/src/scripts/init-db.sql
```

#### Paso 4: Verificar que todo funciona
```bash
# Ver logs
docker-compose logs -f

# Verificar servicios
docker-compose ps
```

La aplicación estará disponible en:
- Frontend: http://localhost
- Backend: http://localhost:3000
- Base de datos: localhost:5432

### 4. Instalación Manual (sin Docker)

#### Paso 1: Instalar PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Descarga e instala desde https://www.postgresql.org/download/windows/

#### Paso 2: Crear base de datos
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE gemini_mail;
CREATE USER gemini_user WITH PASSWORD 'tu_contraseña';
GRANT ALL PRIVILEGES ON DATABASE gemini_mail TO gemini_user;
\q
```

#### Paso 3: Inicializar schema
```bash
psql -U gemini_user -d gemini_mail < packages/backend/src/scripts/init-db.sql
```

#### Paso 4: Instalar Redis

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

**Windows:**
Usar Windows Subsystem for Linux o Docker

#### Paso 5: Instalar dependencias

**Backend:**
```bash
cd packages/backend
npm install
```

**Frontend:**
```bash
cd packages/frontend
npm install
```

#### Paso 6: Iniciar servicios

Terminal 1 (Backend):
```bash
cd packages/backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd packages/frontend
npm run dev
```

### 5. Instalación Desktop

#### Windows

1. Instalar dependencias:
```bash
cd packages/desktop
npm install
```

2. Para desarrollo:
```bash
npm run dev
```

3. Para construir instalador:
```bash
npm run build:win
```

El instalador se creará en `packages/desktop/release/Gemini Mail Setup x.x.x.exe`

4. Ejecutar el instalador y seguir el asistente

#### Linux

1. Instalar dependencias:
```bash
cd packages/desktop
npm install
```

2. Construir paquetes:
```bash
npm run build:linux
```

3. Instalar el paquete generado:

**Ubuntu/Debian:**
```bash
sudo dpkg -i release/gemini-mail_*.deb
```

**Fedora/RHEL:**
```bash
sudo rpm -i release/gemini-mail-*.rpm
```

**AppImage (Portable):**
```bash
chmod +x release/gemini-mail-*.AppImage
./release/gemini-mail-*.AppImage
```

### 6. Instalación Mobile

#### Android

1. Instalar Android Studio y configurar SDK

2. Instalar dependencias:
```bash
cd packages/mobile
npm install
```

3. Para desarrollo:
```bash
npm run android
```

4. Para construir APK:
```bash
npm run build:android
```

El APK se generará en `packages/mobile/android/app/build/outputs/apk/release/`

5. Instalar en dispositivo:
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

#### iOS

1. Instalar Xcode desde App Store (solo macOS)

2. Instalar dependencias:
```bash
cd packages/mobile
npm install
cd ios && pod install && cd ..
```

3. Para desarrollo:
```bash
npm run ios
```

4. Para distribución:
- Abrir `ios/GeminiMail.xcworkspace` en Xcode
- Product → Archive
- Distribuir vía TestFlight o App Store

## Solución de Problemas

### Docker

**Error: "Cannot connect to the Docker daemon"**
```bash
# Linux
sudo systemctl start docker

# Windows/Mac
Iniciar Docker Desktop
```

**Error de permisos en Linux**
```bash
sudo usermod -aG docker $USER
# Cerrar sesión y volver a iniciar
```

### Backend

**Error: "Connection refused" a PostgreSQL**
- Verificar que PostgreSQL esté ejecutándose
- Verificar las credenciales en `.env`
- Verificar que el puerto 5432 esté disponible

**Error: "Redis connection failed"**
- Verificar que Redis esté ejecutándose
- En Windows, usar Docker para Redis

### Frontend

**Error: "Cannot connect to API"**
- Verificar que el backend esté ejecutándose
- Verificar `VITE_API_URL` en `.env`

### Desktop

**Error de construcción en Windows**
- Instalar Visual Studio Build Tools
- Instalar Windows SDK

**Error en Linux**
```bash
# Instalar dependencias
sudo apt install -y libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libappindicator3-1 libsecret-1-0
```

### Mobile

**Error "SDK not found" en Android**
- Configurar `ANDROID_HOME` en variables de entorno
- Instalar SDKs necesarios desde Android Studio

**Error de pods en iOS**
```bash
cd ios
pod deintegrate
pod install
cd ..
```

## Verificación de Instalación

### Verificar Backend
```bash
curl http://localhost:3000/api/health
# Debería retornar: {"status":"ok","timestamp":"..."}
```

### Verificar Base de Datos
```bash
docker exec -it gemini-mail-db psql -U gemini_user -d gemini_mail -c "\dt"
# Debería mostrar las tablas: users, email_accounts, emails, user_settings
```

### Verificar Redis
```bash
docker exec -it gemini-mail-redis redis-cli ping
# Debería retornar: PONG
```

## Próximos Pasos

1. Crear una cuenta en http://localhost
2. Agregar una cuenta de correo
3. Obtener una API key de Gemini en https://ai.google.dev/
4. Configurar la API key en `.env`
5. Probar las funciones de IA

## Soporte

Si encuentras problemas:
1. Revisa los logs: `docker-compose logs`
2. Verifica la configuración en `.env`
3. Consulta la documentación de cada paquete
4. Abre un issue en GitHub
