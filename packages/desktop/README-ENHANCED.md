# Gemini Mail Desktop - Versión Mejorada

Aplicación de escritorio multiplataforma para Gemini Mail con backend local integrado.

## 🚀 Características Mejoradas

### Backend Local Integrado
- El backend de Express se ejecuta automáticamente al iniciar la aplicación
- Puerto configurado: 3001
- Gestión automática del proceso del backend

### Sistema de Bandeja (Tray)
- Icono en la bandeja del sistema (Windows/Linux)
- Minimizar a bandeja en lugar de cerrar
- Menú contextual con acciones rápidas
- Click en el icono para mostrar la ventana

### Notificaciones Nativas
- Notificaciones del sistema para nuevos emails
- Click en la notificación para abrir la app
- Configurable desde ajustes

### Almacenamiento Persistente
- Configuración guardada con electron-store
- Dimensiones de ventana persistentes
- Preferencias de usuario
- Tema seleccionado

### Instancia Única
- Solo se puede ejecutar una instancia a la vez
- Al intentar abrir otra, se enfoca la ventana existente

### Menús Mejorados
- Menús específicos para cada plataforma (Windows/Linux/macOS)
- Atajos de teclado personalizados
- Opciones de zoom y vista

### Comunicación IPC Segura
- Preload script para seguridad
- Context isolation habilitado
- APIs expuestas de forma segura al renderer

## 🛠️ Compilación

### Desarrollo
```bash
npm run dev
```

### Producción

#### Windows
```bash
npm run build:win
```
Genera:
- `release/Gemini Mail Setup x.x.x.exe` (instalador NSIS)
- Instalador para x64 y x86

#### Linux
```bash
npm run build:linux
```
Genera:
- `release/GeminiMail-x.x.x.AppImage` (portable)
- `release/gemini-mail_x.x.x_amd64.deb` (Debian/Ubuntu)
- `release/gemini-mail-x.x.x.x86_64.rpm` (Fedora/RHEL)

#### Todas las plataformas
```bash
npm run build:all
```

## 📦 Estructura de Archivos

```
packages/desktop/
├── src/
│   ├── main-enhanced.ts     # Proceso principal mejorado
│   ├── preload.ts           # Preload script para IPC
│   └── main.ts              # Proceso principal original
├── build/
│   ├── icon.png             # Icono Linux
│   └── icon.ico             # Icono Windows
├── release/                 # Binarios compilados
└── package.json
```

## 🔧 Configuración

### Variables de Entorno

```bash
NODE_ENV=production    # Modo producción
```

### Configuración de Firma (Opcional)

Para producción, crear `android/gradle.properties`:

```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=****
MYAPP_RELEASE_KEY_PASSWORD=****
```

## 🎨 Características del Usuario

### Atajos de Teclado

| Acción | Windows/Linux | macOS |
|--------|---------------|-------|
| Nuevo mensaje | Ctrl+N | Cmd+N |
| Actualizar correos | Ctrl+R | Cmd+R |
| Salir | Ctrl+Q | Cmd+Q |
| DevTools | Ctrl+Shift+I | Cmd+Option+I |
| Zoom In | Ctrl++ | Cmd++ |
| Zoom Out | Ctrl+- | Cmd+- |
| Zoom Reset | Ctrl+0 | Cmd+0 |

### Almacenamiento de Configuración

La configuración se guarda en:
- **Windows**: `%APPDATA%/gemini-mail/config.json`
- **Linux**: `~/.config/gemini-mail/config.json`
- **macOS**: `~/Library/Application Support/gemini-mail/config.json`

### Notificaciones

Las notificaciones se pueden configurar desde la aplicación:
```javascript
window.electron.setConfig('notifications', true);
```

## 🔐 Seguridad

- **Context Isolation**: Habilitado
- **Node Integration**: Deshabilitado en renderer
- **Web Security**: Habilitado
- **Preload Script**: Comunicación segura via IPC
- **Single Instance**: Previene múltiples instancias

## 🚀 Auto-Actualización (Futuro)

Se puede integrar `electron-updater` para actualizaciones automáticas:

```typescript
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();
```

## 📝 Logs

Los logs del backend se muestran en la consola de Electron:
```bash
Backend: Server started on port 3001
```

## 🐛 Troubleshooting

### La app no abre el backend
- Verificar que el backend esté compilado en `packages/backend/dist`
- Verificar permisos de ejecución

### Notificaciones no aparecen
- Verificar permisos del sistema
- Habilitar notificaciones en configuración

### Error de puerto ocupado
- Cambiar el puerto en `main-enhanced.ts` (default: 3001)

## 📄 Licencia

MIT License - Ver LICENSE en la raíz del proyecto
