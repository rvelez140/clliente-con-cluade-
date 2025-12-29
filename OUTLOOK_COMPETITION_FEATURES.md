# Outlook Competition Features - Gemini Mail

Este documento describe todas las funcionalidades implementadas para competir con Microsoft Outlook.

## 📋 Tabla de Contenidos

1. [Focused Inbox (Bandeja Prioritaria)](#1-focused-inbox)
2. [Quick Steps (Acciones Rápidas)](#2-quick-steps)
3. [Sweep (Limpiar)](#3-sweep)
4. [Mentions (@Menciones)](#4-mentions)
5. [Voting Buttons (Botones de Votación)](#5-voting-buttons)
6. [Follow-up Flags (Marcas de Seguimiento)](#6-follow-up-flags)
7. [Categories (Categorías)](#7-categories)
8. [Quick Parts (Bloques de Construcción)](#8-quick-parts)
9. [Resources (Recursos/Salas)](#9-resources)
10. [Dictation (Dictado)](#10-dictation)
11. [Immersive Reader (Lector Inmersivo)](#11-immersive-reader)

---

## 1. Focused Inbox

Separa automáticamente los correos importantes de los menos relevantes usando IA.

### Características
- Clasificación automática con Gemini AI
- Entrenamiento personalizado por usuario
- Categorías: Focused (Prioritario) y Other (Otros)
- Configuración ajustable

### API Endpoints

```
GET  /api/outlook/focused-inbox?type=focused|other
POST /api/outlook/focused-inbox/train
GET  /api/outlook/focused-inbox/settings
PUT  /api/outlook/focused-inbox/settings
```

### Ejemplo de Uso

```javascript
// Obtener bandeja prioritaria
const response = await fetch('/api/outlook/focused-inbox?type=focused');
const { emails, total } = await response.json();

// Entrenar clasificación
await fetch('/api/outlook/focused-inbox/train', {
  method: 'POST',
  body: JSON.stringify({
    emailId: 'email-123',
    isFocused: true
  })
});
```

---

## 2. Quick Steps

Automatiza tareas repetitivas con un solo clic.

### Acciones Disponibles
- `move` - Mover a carpeta
- `copy` - Copiar a carpeta
- `delete` - Eliminar
- `mark_read` / `mark_unread` - Marcar como leído/no leído
- `flag` - Agregar marca de seguimiento
- `categorize` - Asignar categoría
- `forward` - Reenviar
- `reply` - Responder con plantilla

### API Endpoints

```
GET    /api/outlook/quick-steps
POST   /api/outlook/quick-steps
POST   /api/outlook/quick-steps/:id/execute
PUT    /api/outlook/quick-steps/:id
DELETE /api/outlook/quick-steps/:id
```

### Ejemplo

```javascript
// Crear Quick Step
await fetch('/api/outlook/quick-steps', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Archivar y Marcar',
    description: 'Mueve a archivo y marca como leído',
    actions: [
      { type: 'move', params: { folderId: 'archive' } },
      { type: 'mark_read' }
    ],
    shortcutKey: 'CTRL+SHIFT+1'
  })
});

// Ejecutar en múltiples emails
await fetch('/api/outlook/quick-steps/qs-123/execute', {
  method: 'POST',
  body: JSON.stringify({
    emailIds: ['email-1', 'email-2', 'email-3']
  })
});
```

---

## 3. Sweep

Limpia tu bandeja eliminando o moviendo mensajes de un remitente específico.

### Tipos de Acciones
- `delete_all` - Eliminar todos los mensajes del remitente
- `keep_latest` - Mantener solo el más reciente
- `keep_latest_10` - Mantener los últimos 10
- `move_older_than_10_days` - Mover mensajes antiguos
- `always_delete` - Siempre eliminar futuros mensajes
- `always_move` - Siempre mover a carpeta

### API Endpoints

```
GET    /api/outlook/sweep/rules
POST   /api/outlook/sweep/rules
POST   /api/outlook/sweep/execute
DELETE /api/outlook/sweep/rules/:id
```

### Ejemplo

```javascript
// Ejecutar sweep
await fetch('/api/outlook/sweep/execute', {
  method: 'POST',
  body: JSON.stringify({
    sender: 'newsletter@example.com',
    action: 'keep_latest'
  })
});

// Crear regla permanente
await fetch('/api/outlook/sweep/rules', {
  method: 'POST',
  body: JSON.stringify({
    senderEmail: 'spam@example.com',
    action: 'always_delete'
  })
});
```

---

## 4. Mentions

Menciona a compañeros de trabajo con @ en el cuerpo del email.

### Características
- Detección automática de @menciones
- Sugerencias de contactos
- Notificaciones para mencionados
- Panel de menciones recibidas

### API Endpoints

```
GET  /api/outlook/mentions
GET  /api/outlook/mentions/suggestions?query=john
GET  /api/outlook/mentions/stats
POST /api/outlook/mentions/:id/read
POST /api/outlook/mentions/read-all
```

### Ejemplo

```javascript
// Obtener sugerencias mientras escribe
const suggestions = await fetch(
  '/api/outlook/mentions/suggestions?query=mar'
).then(r => r.json());

// Resultado: [
//   { email: 'maria@company.com', name: 'María García', displayText: 'María García (maria@company.com)' }
// ]

// Obtener menciones no leídas
const mentions = await fetch('/api/outlook/mentions?unreadOnly=true');
```

---

## 5. Voting Buttons

Agrega botones de votación a tus emails para recopilar respuestas rápidas.

### Tipos de Encuesta
- `yes_no` - Sí/No
- `approve_reject` - Aprobar/Rechazar
- `single` - Selección única personalizada
- `multiple` - Selección múltiple
- `custom` - Opciones personalizadas

### API Endpoints

```
GET  /api/outlook/polls
POST /api/outlook/polls
GET  /api/outlook/polls/:id
GET  /api/outlook/polls/:id/results
POST /api/outlook/polls/:id/vote
POST /api/outlook/polls/:id/close
```

### Ejemplo

```javascript
// Crear encuesta
const poll = await fetch('/api/outlook/polls', {
  method: 'POST',
  body: JSON.stringify({
    emailId: 'email-123',
    pollType: 'custom',
    options: ['Lunes', 'Martes', 'Miércoles'],
    allowChangeVote: true,
    showResultsBeforeClose: false,
    expiresAt: '2024-12-31T23:59:59Z'
  })
}).then(r => r.json());

// Votar
await fetch(`/api/outlook/polls/${poll.id}/vote`, {
  method: 'POST',
  body: JSON.stringify({
    respondentEmail: 'user@company.com',
    selectedOptions: ['Martes'],
    comment: 'Preferiblemente por la mañana'
  })
});

// Ver resultados
const results = await fetch(`/api/outlook/polls/${poll.id}/results`);
```

---

## 6. Follow-up Flags

Marca emails para seguimiento con fechas de vencimiento y recordatorios.

### Tipos de Marca
- `follow_up` - Seguimiento
- `for_your_information` - Para su información
- `forward` - Reenviar
- `no_response_needed` - No requiere respuesta
- `read` - Leer
- `reply` - Responder
- `reply_all` - Responder a todos
- `review` - Revisar
- `custom` - Personalizado

### Estados
- `not_started` - No iniciado
- `in_progress` - En progreso
- `completed` - Completado
- `waiting` - Esperando
- `deferred` - Aplazado

### API Endpoints

```
GET  /api/outlook/flags
GET  /api/outlook/flags/stats
POST /api/outlook/flags
POST /api/outlook/flags/quick
PUT  /api/outlook/flags/:id
POST /api/outlook/flags/:id/complete
DELETE /api/outlook/flags/email/:emailId
```

### Ejemplo

```javascript
// Marcar rápidamente
await fetch('/api/outlook/flags/quick', {
  method: 'POST',
  body: JSON.stringify({
    emailId: 'email-123',
    quickType: 'today' // 'today', 'tomorrow', 'this_week', 'next_week', 'no_date'
  })
});

// Crear marca personalizada
await fetch('/api/outlook/flags', {
  method: 'POST',
  body: JSON.stringify({
    emailId: 'email-123',
    flagType: 'follow_up',
    dueDate: '2024-12-15',
    reminderDate: '2024-12-14',
    reminderTime: '09:00',
    priority: 'high'
  })
});

// Obtener atrasados
const overdue = await fetch('/api/outlook/flags?overdueOnly=true');
```

---

## 7. Categories

Organiza emails con categorías de colores personalizables.

### Colores Predefinidos
24 colores incluyendo: red, orange, yellow, green, blue, purple, pink, teal, olive, steel, gray, black, y variantes oscuras.

### API Endpoints

```
GET    /api/outlook/categories
GET    /api/outlook/categories/colors
POST   /api/outlook/categories
PUT    /api/outlook/categories/:id
DELETE /api/outlook/categories/:id
GET    /api/outlook/categories/:id/emails
POST   /api/outlook/categories/assign
DELETE /api/outlook/categories/:id/emails/:emailId
```

### Ejemplo

```javascript
// Crear categoría
await fetch('/api/outlook/categories', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Proyectos Urgentes',
    color: '#E74C3C',
    shortcutKey: 'CTRL+F7'
  })
});

// Asignar a email
await fetch('/api/outlook/categories/assign', {
  method: 'POST',
  body: JSON.stringify({
    emailId: 'email-123',
    categoryId: 'cat-456'
  })
});

// Ver emails por categoría
const emails = await fetch('/api/outlook/categories/cat-456/emails');
```

---

## 8. Quick Parts

Guarda bloques de texto reutilizables y AutoText para inserción rápida.

### Tipos de Contenido
- `text` - Texto plano
- `html` - HTML formateado
- `signature` - Firma
- `auto_text` - Texto automático

### Galerías
- `general` - General
- `mail` - Correo
- `text_box` - Cuadro de texto
- `custom` - Personalizado

### API Endpoints

```
GET  /api/outlook/quick-parts
POST /api/outlook/quick-parts
PUT  /api/outlook/quick-parts/:id
DELETE /api/outlook/quick-parts/:id
POST /api/outlook/quick-parts/:id/use
GET  /api/outlook/quick-parts/export
POST /api/outlook/quick-parts/import

GET  /api/outlook/auto-text
POST /api/outlook/auto-text
POST /api/outlook/auto-text/expand
```

### Ejemplo

```javascript
// Crear Quick Part
await fetch('/api/outlook/quick-parts', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Saludo Formal',
    content: '<p>Estimado/a,</p><p>Espero que este mensaje le encuentre bien.</p>',
    contentType: 'html',
    category: 'Saludos',
    shortcut: 'sf1'
  })
});

// Crear AutoText
await fetch('/api/outlook/auto-text', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Mi Teléfono',
    triggerText: 'mitel',
    replacementContent: '+1 (555) 123-4567'
  })
});

// Expandir AutoText en texto
const { expanded } = await fetch('/api/outlook/auto-text/expand', {
  method: 'POST',
  body: JSON.stringify({
    text: 'Llámame a mitel cuando puedas'
  })
}).then(r => r.json());
// Resultado: 'Llámame a +1 (555) 123-4567 cuando puedas'
```

---

## 9. Resources

Gestiona y reserva salas de reuniones, equipos y otros recursos.

### Tipos de Recursos
- `room` - Sala de reuniones
- `equipment` - Equipo (proyector, etc.)
- `vehicle` - Vehículo
- `other` - Otro

### API Endpoints

```
GET  /api/outlook/resources
POST /api/outlook/resources
GET  /api/outlook/resources/:id
GET  /api/outlook/resources/:id/availability
POST /api/outlook/resources/find-available

GET    /api/outlook/bookings
POST   /api/outlook/bookings
DELETE /api/outlook/bookings/:id
```

### Ejemplo

```javascript
// Buscar salas disponibles
const rooms = await fetch('/api/outlook/resources/find-available', {
  method: 'POST',
  body: JSON.stringify({
    startTime: '2024-12-15T10:00:00Z',
    endTime: '2024-12-15T11:00:00Z',
    resourceType: 'room',
    minCapacity: 10,
    amenities: ['projector', 'whiteboard']
  })
}).then(r => r.json());

// Reservar sala
await fetch('/api/outlook/bookings', {
  method: 'POST',
  body: JSON.stringify({
    resourceId: 'room-456',
    title: 'Reunión de equipo',
    startTime: '2024-12-15T10:00:00Z',
    endTime: '2024-12-15T11:00:00Z',
    attendeesCount: 8,
    notes: 'Necesitamos café'
  })
});

// Ver disponibilidad
const availability = await fetch(
  '/api/outlook/resources/room-456/availability?date=2024-12-15'
);
```

---

## 10. Dictation

Dicta emails usando reconocimiento de voz con comandos de voz.

### Comandos de Voz Soportados (EN/ES)
- `new paragraph` / `nuevo párrafo`
- `new line` / `nueva línea`
- `period` / `punto`
- `comma` / `coma`
- `question mark` / `signo de interrogación`
- `delete last word` / `borrar última palabra`
- `stop dictation` / `detener dictado`
- `pause` / `pausar`
- Y muchos más...

### Idiomas Soportados
15 idiomas incluyendo: Inglés (US/UK), Español (ES/MX), Francés, Alemán, Italiano, Portugués, Chino, Japonés, Coreano, Árabe, Hindi, Ruso.

### API Endpoints

```
POST /api/outlook/dictation/start
POST /api/outlook/dictation/:id/append
POST /api/outlook/dictation/:id/pause
POST /api/outlook/dictation/:id/resume
POST /api/outlook/dictation/:id/complete
GET  /api/outlook/dictation/history
GET  /api/outlook/dictation/commands
GET  /api/outlook/dictation/languages
GET  /api/outlook/dictation/stats
```

### Ejemplo

```javascript
// Iniciar sesión de dictado
const session = await fetch('/api/outlook/dictation/start', {
  method: 'POST',
  body: JSON.stringify({ language: 'es-ES' })
}).then(r => r.json());

// Agregar texto (desde Web Speech API del navegador)
await fetch(`/api/outlook/dictation/${session.id}/append`, {
  method: 'POST',
  body: JSON.stringify({
    text: 'Hola punto Esto es una prueba punto nuevo párrafo'
  })
});
// Resultado procesado: "Hola. Esto es una prueba.\n\n"

// Completar y formatear con IA
const final = await fetch(`/api/outlook/dictation/${session.id}/complete`, {
  method: 'POST'
}).then(r => r.json());
```

---

## 11. Immersive Reader

Mejora la accesibilidad y comprensión de lectura.

### Características
- **Tamaño de texto**: small, medium, large, extra_large
- **Espaciado**: compact, normal, wide, extra_wide
- **Fuentes**: Default, OpenDyslexic, Comic Sans, Arial, Calibri
- **Temas**: light, dark, sepia, high_contrast
- **Enfoque de línea**: 1, 3 o 5 líneas
- **Sílabas**: División silábica automática
- **Partes del discurso**: Resaltado de sustantivos, verbos, adjetivos, adverbios
- **Traducción**: 12 idiomas
- **Text-to-Speech**: Lectura en voz alta

### API Endpoints

```
GET  /api/outlook/immersive-reader/settings
PUT  /api/outlook/immersive-reader/settings
GET  /api/outlook/immersive-reader/options
POST /api/outlook/immersive-reader/process
POST /api/outlook/immersive-reader/translate
POST /api/outlook/immersive-reader/speech
POST /api/outlook/immersive-reader/:id/complete
GET  /api/outlook/immersive-reader/stats
```

### Ejemplo

```javascript
// Configurar preferencias
await fetch('/api/outlook/immersive-reader/settings', {
  method: 'PUT',
  body: JSON.stringify({
    textSize: 'large',
    fontFamily: 'opendyslexic',
    pageTheme: 'sepia',
    lineFocus: 'three_lines',
    showSyllables: true,
    highlightVerbs: true,
    enableReadAloud: true,
    readAloudSpeed: 0.8
  })
});

// Procesar texto para lectura
const { processedContent, readingTimeMinutes } = await fetch(
  '/api/outlook/immersive-reader/process',
  {
    method: 'POST',
    body: JSON.stringify({
      text: 'El contenido del email aquí...',
      emailId: 'email-123'
    })
  }
).then(r => r.json());

// Traducir
const { translated } = await fetch('/api/outlook/immersive-reader/translate', {
  method: 'POST',
  body: JSON.stringify({
    text: 'Hello, how are you?',
    targetLanguage: 'es',
    sourceLanguage: 'en'
  })
}).then(r => r.json());
// Resultado: "Hola, ¿cómo estás?"
```

---

## 📊 Comparación con Outlook

| Funcionalidad | Microsoft Outlook | Gemini Mail |
|--------------|-------------------|-------------|
| Focused Inbox | ✅ | ✅ (con Gemini AI) |
| Quick Steps | ✅ | ✅ |
| Sweep | ✅ | ✅ |
| @Mentions | ✅ | ✅ |
| Voting Buttons | ✅ | ✅ |
| Follow-up Flags | ✅ | ✅ |
| Categories | ✅ | ✅ |
| Quick Parts | ✅ | ✅ |
| Resources/Rooms | ✅ | ✅ |
| Dictation | ✅ | ✅ (15 idiomas) |
| Immersive Reader | ✅ | ✅ |
| AI Integration | Copilot | Gemini 2.0 |

## 🔧 Configuración de Base de Datos

Ejecutar el script SQL:
```bash
psql -U postgres -d gemini_mail -f packages/backend/src/scripts/outlook-competition-upgrade.sql
```

## 📁 Estructura de Archivos

```
packages/backend/src/
├── services/
│   ├── focused-inbox.service.ts
│   ├── quick-steps.service.ts
│   ├── sweep.service.ts
│   ├── mentions.service.ts
│   ├── voting.service.ts
│   ├── follow-up-flags.service.ts
│   ├── outlook-categories.service.ts
│   ├── quick-parts.service.ts
│   ├── resources.service.ts
│   ├── dictation.service.ts
│   └── immersive-reader.service.ts
├── controllers/
│   └── outlook-features.controller.ts
├── routes/
│   └── outlook-features.routes.ts
└── scripts/
    └── outlook-competition-upgrade.sql
```

## 🚀 Próximos Pasos

1. Implementar frontend para cada funcionalidad
2. Agregar WebSocket para notificaciones en tiempo real
3. Integrar con calendarios externos (Google Calendar, iCal)
4. Implementar sincronización offline
5. Añadir tests unitarios y de integración

---

**Gemini Mail v3.0** - Compitiendo con Gmail Y Outlook 🚀
