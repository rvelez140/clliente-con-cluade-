# Correos Programados con Gemini AI

## Características

Este módulo permite programar correos electrónicos con las siguientes funcionalidades:

### 1. Programación de Correos
- **Fecha y hora específica**: Programa el envío de correos para una fecha y hora específica
- **Recurrencia**: Configura correos recurrentes (diarios, semanales, mensuales)
- **Fecha de fin de recurrencia**: Establece cuándo debe detenerse la recurrencia

### 2. Integración con Gemini AI
- **Generación automática**: Gemini puede redactar el correo completo basándose en un prompt
- **Resumen de correos**: Resume el contenido de correos largos
- **Sugerencias de tono**: Elige entre formal, profesional, amigable o casual
- **Ajuste de longitud**: Correos cortos, medianos o largos

### 3. Texto a Voz
- **Lectura automática**: Opción para que el correo se lea con voz al enviarse
- **Múltiples idiomas**: Soporte para español (España y México), inglés (EE.UU. y Reino Unido)
- **Previsualización**: Prueba la voz antes de programar el envío

## Uso

### Backend

#### Migración de Base de Datos
Ejecuta la migración para crear las tablas necesarias:
```bash
psql -U gemini_user -d gemini_mail -f packages/backend/migrations/003_scheduled_emails.sql
```

#### Servicio de Programación
El servicio `EmailSchedulerService` se inicia automáticamente con el servidor y verifica cada minuto si hay correos programados pendientes de envío.

#### Endpoints API

**Crear correo programado:**
```http
POST /api/scheduled-emails
Authorization: Bearer {token}
Content-Type: application/json

{
  "accountId": "cuenta-id",
  "toAddresses": ["destinatario@ejemplo.com"],
  "subject": "Asunto del correo",
  "body": "Contenido del correo",
  "scheduledAt": "2025-12-25T10:00:00Z",
  "recurrence": "daily",
  "aiGenerated": true,
  "aiPrompt": "Redacta un correo profesional sobre la reunión",
  "aiTone": "professional",
  "useVoice": true,
  "voiceLang": "es-ES"
}
```

**Listar correos programados:**
```http
GET /api/scheduled-emails
Authorization: Bearer {token}
```

**Generar correo con IA:**
```http
POST /api/scheduled-emails/ai/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "prompt": "Redacta un correo informando sobre el nuevo producto",
  "tone": "professional",
  "context": "Contexto adicional..."
}
```

**Resumir correo:**
```http
POST /api/scheduled-emails/ai/summarize
Authorization: Bearer {token}
Content-Type: application/json

{
  "emailBody": "Contenido largo del correo..."
}
```

### Frontend

#### Componentes

**ScheduledEmailComposer**: Diálogo para crear y configurar correos programados
- Destinatarios (Para, CC, BCC)
- Fecha y hora de envío
- Recurrencia (diaria, semanal, mensual)
- Asistente de IA con Gemini
- Opciones de voz

**ScheduledEmailList**: Lista de correos programados con su estado
- Muestra todos los correos programados
- Estados: pendiente, enviado, fallido, cancelado
- Opción para editar o eliminar correos pendientes

#### Integración en la App

```tsx
import ScheduledEmailComposer from './components/ScheduledEmailComposer';
import ScheduledEmailList from './components/ScheduledEmailList';

// En tu componente principal
<ScheduledEmailComposer
  open={scheduledComposerOpen}
  onClose={() => setScheduledComposerOpen(false)}
  accountId={accountId}
/>

<ScheduledEmailList />
```

## Configuración

### Variables de Entorno

**Backend:**
```env
GEMINI_API_KEY=tu-api-key-de-gemini
GOOGLE_APPLICATION_CREDENTIALS=/ruta/a/credenciales.json  # Opcional para Text-to-Speech
```

### Dependencias

**Backend:**
- `node-cron`: Para programación de tareas
- `@google-cloud/text-to-speech`: Para síntesis de voz (opcional)

**Frontend:**
- `@mui/x-date-pickers`: Para selectores de fecha/hora
- `date-fns`: Para manejo de fechas

## Base de Datos

### Tabla `scheduled_emails`
Almacena los correos programados con toda su configuración:
- `id`: ID único
- `user_id`: Usuario propietario
- `account_id`: Cuenta de correo a usar
- `to_addresses`, `cc_addresses`, `bcc_addresses`: Destinatarios
- `subject`, `body`: Contenido
- `scheduled_at`: Fecha/hora de envío
- `status`: Estado (pending, sent, failed, cancelled)
- `recurrence`: Tipo de recurrencia
- `ai_generated`, `ai_prompt`, `ai_tone`: Configuración de IA
- `use_voice`, `voice_lang`: Configuración de voz

### Tabla `scheduled_email_history`
Historial de envíos de correos programados para auditoría.

## Flujo de Trabajo

1. **Usuario programa un correo**:
   - Completa el formulario en `ScheduledEmailComposer`
   - Opcionalmente usa Gemini para generar el contenido
   - Configura fecha/hora y opciones

2. **Se guarda en la base de datos**:
   - El correo se almacena con estado "pending"
   - Si usa IA, se genera el contenido en ese momento

3. **Servicio de programación (cron)**:
   - Cada minuto verifica si hay correos para enviar
   - Envía los correos cuya fecha/hora ha llegado

4. **Envío del correo**:
   - Se usa el servicio de correo configurado
   - Si tiene recurrencia, crea el siguiente correo
   - Se actualiza el estado a "sent" o "failed"
   - Se registra en el historial

5. **Usuario ve el estado**:
   - En `ScheduledEmailList` puede ver todos sus correos
   - Ver estados, editar o eliminar pendientes

## Ejemplos de Uso

### Correo simple programado
```typescript
await scheduledEmailApi.create({
  accountId: "mi-cuenta",
  toAddresses: ["jefe@empresa.com"],
  subject: "Reporte semanal",
  body: "Adjunto el reporte de la semana...",
  scheduledAt: new Date(2025, 11, 25, 9, 0).toISOString()
});
```

### Correo generado con IA
```typescript
await scheduledEmailApi.create({
  accountId: "mi-cuenta",
  toAddresses: ["equipo@empresa.com"],
  subject: "",
  body: "",
  scheduledAt: new Date(2025, 11, 25, 14, 0).toISOString(),
  aiGenerated: true,
  aiPrompt: "Redacta un correo motivacional para el equipo sobre el próximo trimestre",
  aiTone: "friendly"
});
```

### Correo recurrente con voz
```typescript
await scheduledEmailApi.create({
  accountId: "mi-cuenta",
  toAddresses: ["recordatorio@ejemplo.com"],
  subject: "Recordatorio diario",
  body: "No olvides revisar el dashboard",
  scheduledAt: new Date(2025, 11, 21, 8, 0).toISOString(),
  recurrence: "daily",
  recurrenceEndDate: new Date(2025, 11, 31).toISOString(),
  useVoice: true,
  voiceLang: "es-ES"
});
```

## Notas

- El servicio de programación verifica cada minuto, por lo que la precisión es de ±1 minuto
- Los correos con IA se generan al momento de programarse, no al enviarse
- La funcionalidad de voz requiere configuración adicional de Google Cloud (opcional)
- Los correos fallidos se marcan como "failed" pero no se reenvían automáticamente
- Para correos recurrentes, cada instancia es independiente en la base de datos
