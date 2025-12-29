# Gemini Mail v4.0.0 - Nuevas Funcionalidades

## Resumen de Actualizaciones

Esta versión incluye mejoras significativas en productividad, inteligencia artificial y compatibilidad multiplataforma.

---

## 1. Integración con Perplexity Search

### Descripción
Motor de búsqueda inteligente integrado que permite realizar búsquedas en internet directamente desde el cliente de correo.

### Características
- **Búsqueda en tiempo real**: Consulta información actualizada mientras redactas correos
- **Tipos de búsqueda**: Web general, académica, noticias
- **Respuestas IA**: Obtén respuestas resumidas además de resultados
- **Autocompletado**: Sugerencias de búsqueda en tiempo real
- **Búsqueda contextual**: Busca información relacionada con el contenido del email

### Uso
```typescript
// API Endpoint
POST /api/search/search
{
  "query": "últimas tendencias en desarrollo web",
  "searchType": "web",
  "maxResults": 10,
  "language": "es",
  "includeAnswers": true
}
```

### Configuración
```env
PERPLEXITY_API_KEY=tu_api_key_aquí
ENABLE_PERPLEXITY_SEARCH=true
```

---

## 2. Portapapeles Inteligente para Enlaces

### Descripción
Cuando pegas enlaces de servicios en la nube (Google Drive, Dropbox, OneDrive, GitHub, Notion), el sistema extrae automáticamente los metadatos y muestra el nombre del archivo en lugar de la URL larga.

### Servicios Soportados
| Servicio | Características |
|----------|-----------------|
| Google Drive | Nombre de archivo, tipo, tamaño, fecha de modificación |
| Dropbox | Nombre de archivo, tipo |
| OneDrive/SharePoint | Nombre de archivo, tipo |
| GitHub | Nombre de archivo, repositorio, rama |
| Notion | Título de página |
| Enlaces genéricos | Título de página, favicon |

### Ejemplo
**Antes (URL pegada):**
```
https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view
```

**Después (enlace inteligente):**
```
📁 Informe Trimestral Q4 2024.pdf (2.5 MB)
```

### API
```typescript
// Extraer metadatos de un enlace
POST /api/search/link-metadata
{ "url": "https://drive.google.com/..." }

// Procesar múltiples enlaces del portapapeles
POST /api/search/process-clipboard
{ "text": "Revisa estos archivos: https://drive.google.com/... y https://github.com/..." }
```

---

## 3. Detector de Adjuntos Olvidados

### Descripción
Sistema inteligente que detecta cuando mencionas un archivo adjunto en tu correo pero olvidaste adjuntarlo.

### Características
- **Detección bilingüe**: Español e inglés
- **Alta precisión**: Analiza el contexto para evitar falsos positivos
- **Ventana emergente**: Alerta amigable antes de enviar
- **Sugerencias**: Recomienda nombres de archivo basados en el contexto

### Palabras Clave Detectadas (ejemplos)
**Español:**
- "te adjunto", "adjunto aquí", "encontrarás adjunto"
- "archivo", "documento", "factura", "informe"
- "imagen", "foto", "captura", "screenshot"

**Inglés:**
- "please find attached", "I have attached"
- "see attached", "enclosed"
- "file", "document", "invoice", "report"

### API
```typescript
// Verificar antes de enviar
POST /api/attachment/preflight
{
  "subject": "Factura mensual",
  "body": "Te adjunto la factura del mes de diciembre",
  "attachments": []
}

// Respuesta
{
  "canSend": false,
  "warning": {
    "type": "missing_attachment",
    "message": "¡Falta el archivo adjunto!",
    "details": "Mencionaste \"adjunto\" pero no hay archivos adjuntos. ¿Olvidaste adjuntar el archivo?"
  }
}
```

---

## 4. Sistema de Firmas Optimizado

### Descripción
Editor completo de firmas de correo con plantillas profesionales y generación asistida por IA.

### Plantillas Disponibles
1. **Profesional Moderno** - Diseño limpio con foto y redes sociales
2. **Minimalista** - Solo información esencial
3. **Corporativo Completo** - Logo, banner, departamento y dirección
4. **Creativo** - Diseño colorido con gradientes
5. **Personal Casual** - Estilo amigable y cercano

### Características
- **Personalización completa**: Colores, fuentes, iconos
- **Redes sociales**: LinkedIn, Twitter, GitHub, Instagram
- **Imagen de perfil**: Soporte para fotos circulares o cuadradas
- **Logo de empresa**: Integración de branding corporativo
- **Link de reunión**: Botón para agendar citas (Calendly, Meet)
- **Generación con IA**: Describe tu firma ideal y la IA la crea

### API
```typescript
// Generar firma
POST /api/signature/generate
{
  "data": {
    "name": "Juan García",
    "title": "Director de Tecnología",
    "company": "TechCorp",
    "email": "juan@techcorp.com",
    "phone": "+1 555-123-4567",
    "linkedin": "juangarcia",
    "slogan": "Innovando el futuro"
  },
  "templateId": "professional-modern",
  "style": {
    "primaryColor": "#1a73e8",
    "fontFamily": "Arial, sans-serif"
  }
}

// Generar con IA
POST /api/signature/generate-ai
{
  "description": "Firma profesional y moderna para un desarrollador freelance, colores azul y verde, incluir GitHub y LinkedIn",
  "data": {
    "name": "Ana López",
    "email": "ana@dev.com"
  }
}
```

---

## 5. Optimizaciones de Plataforma

### Android
- **SDK 34** con soporte para Android 14
- **Flavors de producto**: Play Store, F-Droid, Amazon
- **Split APKs** por arquitectura (arm64, x86)
- **Biometría** para autenticación segura
- **Work Manager** para sincronización en segundo plano
- **Deep Links** para abrir correos desde otras apps

### Linux
Script de instalación automatizado:
```bash
chmod +x setup-linux.sh
./setup-linux.sh
```
- Soporte para Ubuntu, Debian, Fedora, Arch Linux
- Configuración automática de PostgreSQL, Redis, Nginx
- Fail2ban y firewall configurados
- Servicio systemd para auto-inicio
- PM2 para gestión de procesos

### Windows
Script PowerShell:
```powershell
.\setup-windows.ps1
```
- Instalación automática via Chocolatey
- Configuración de PostgreSQL y Redis
- Firewall de Windows configurado
- Tarea programada para auto-inicio
- Acceso directo en escritorio

### Docker
Mejoras en docker-compose:
- **Worker separado** para tareas en segundo plano
- **Límites de recursos** configurados
- **Backups automáticos** (perfil opcional)
- **Logging estructurado** con rotación
- **Healthchecks** mejorados

```bash
# Iniciar todos los servicios
docker-compose up -d

# Incluir servicio de backup
docker-compose --profile backup up -d

# Ver logs
docker-compose logs -f backend
```

---

## 6. Variables de Entorno Nuevas

```env
# Búsqueda Perplexity
PERPLEXITY_API_KEY=
ENABLE_PERPLEXITY_SEARCH=true

# Smart Links
GOOGLE_API_KEY=
GITHUB_TOKEN=
ENABLE_SMART_LINKS=true

# Detector de Adjuntos
ENABLE_ATTACHMENT_DETECTOR=true

# Firmas Avanzadas
ENABLE_ADVANCED_SIGNATURES=true

# JWT
JWT_EXPIRES_IN=7d

# Encryption
PASSWORD_ENCRYPTION_KEY=
```

---

## 7. Nuevos Endpoints API

### Búsqueda
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/search/search` | Búsqueda en internet |
| GET | `/api/search/autocomplete` | Sugerencias de búsqueda |
| POST | `/api/search/link-metadata` | Metadatos de enlace |
| POST | `/api/search/process-clipboard` | Procesar portapapeles |
| POST | `/api/search/contextual-search` | Búsqueda basada en email |

### Adjuntos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/attachment/check` | Detectar adjuntos mencionados |
| POST | `/api/attachment/preflight` | Verificación pre-envío |
| POST | `/api/attachment/expected-types` | Tipos de archivo esperados |
| POST | `/api/attachment/suggestions` | Sugerencias de nombres |

### Firmas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/signature/generate` | Generar firma |
| POST | `/api/signature/generate-ai` | Generar con IA |
| GET | `/api/signature/templates` | Listar plantillas |
| POST | `/api/signature/preview` | Vista previa HTML |
| POST | `/api/signature/validate` | Validar HTML |
| POST | `/api/signature/optimize` | Optimizar para email |

---

## 8. Componentes Frontend Nuevos

### EmailComposerEnhanced
Compositor de correo mejorado con todas las nuevas funcionalidades:
- Portapapeles inteligente
- Detector de adjuntos
- Barra de búsqueda integrada
- Gestión de firma
- Traducción con IA

### SmartLinkPreview
Previsualización de enlaces con metadatos:
- Icono del servicio
- Nombre del archivo
- Tamaño
- Tipo de archivo

### AttachmentWarningDialog
Diálogo de advertencia para adjuntos olvidados:
- Mensaje claro
- Opción de agregar adjunto
- Opción de enviar de todos modos

### SearchBar
Barra de búsqueda con:
- Autocompletado
- Historial de búsquedas
- Filtros por tipo
- Respuestas IA

### SignatureEditor
Editor completo de firmas:
- Formulario de datos
- Selector de plantilla
- Personalización de estilo
- Vista previa en tiempo real
- Generación con IA

---

## Migración desde v3.x

1. **Actualizar dependencias:**
   ```bash
   npm install
   ```

2. **Actualizar variables de entorno:**
   ```bash
   cp .env .env.backup
   # Agregar nuevas variables de NEW_FEATURES_V4.md
   ```

3. **Reconstruir contenedores Docker:**
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

4. **Ejecutar migraciones:**
   ```bash
   npm run db:migrate
   ```

---

## Soporte

Para reportar problemas o solicitar funcionalidades:
- GitHub Issues: [Enlace al repositorio]
- Email: soporte@geminimail.app
