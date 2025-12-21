# Gemini Mail Desktop

Aplicación de escritorio para Gemini Mail construida con Electron.

## Requisitos

- Node.js 20+
- npm

## Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

## Construcción

### Windows
```bash
# Construir para Windows (requiere Windows o Wine)
npm run build:win
```

El instalador se generará en `release/` con los siguientes formatos:
- `Gemini Mail Setup x.x.x.exe` - Instalador NSIS para x64
- `Gemini Mail Setup x.x.x-ia32.exe` - Instalador NSIS para 32-bit

### Linux
```bash
# Construir para Linux
npm run build:linux
```

Los paquetes se generarán en `release/` con los siguientes formatos:
- `gemini-mail-x.x.x.AppImage` - AppImage portable
- `gemini-mail_x.x.x_amd64.deb` - Paquete Debian/Ubuntu
- `gemini-mail-x.x.x.x86_64.rpm` - Paquete Red Hat/Fedora

### Todas las plataformas
```bash
npm run build:all
```

## Instalación

### Windows
1. Descarga el instalador `.exe`
2. Ejecuta el instalador
3. Sigue las instrucciones del asistente de instalación
4. Gemini Mail se instalará en `C:\Program Files\Gemini Mail`

Compatibilidad:
- Windows 11
- Windows 10
- Windows Server 2019+

### Linux

#### Debian/Ubuntu
```bash
sudo dpkg -i gemini-mail_*.deb
```

#### Fedora/RHEL
```bash
sudo rpm -i gemini-mail-*.rpm
```

#### AppImage (Portable)
```bash
chmod +x gemini-mail-*.AppImage
./gemini-mail-*.AppImage
```

## Características

- Cliente de correo completo
- Soporte para Gmail, Outlook y servidores personalizados
- Integración con Gemini AI para redacción
- Temas personalizables (Gmail y Outlook)
- Actualizaciones automáticas
