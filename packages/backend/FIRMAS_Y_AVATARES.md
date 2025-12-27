# Firmas y Avatares en Correos

## Descripción

Se han agregado funcionalidades para gestionar firmas de correo electrónico y avatares de usuario en la aplicación.

## Funcionalidades Implementadas

### 1. Firmas de Correo

Las firmas de correo se agregan automáticamente al enviar correos electrónicos.

#### Características:
- **Firma HTML personalizada**: Los usuarios pueden configurar su firma en formato HTML
- **Generación automática de firmas**: Se puede generar una firma profesional a partir de datos estructurados (nombre, título, empresa, teléfono, sitio web)
- **Integración con avatares**: Las firmas pueden incluir avatares del usuario
- **Inserción automática**: Las firmas se agregan automáticamente al final de los correos enviados

#### Endpoints de API:

```
GET    /user-settings/signature              - Obtener firma del usuario
PUT    /user-settings/signature              - Actualizar firma del usuario
POST   /user-settings/signature/generate     - Generar firma HTML desde datos estructurados
```

#### Ejemplo de uso:

```javascript
// Actualizar firma
PUT /user-settings/signature
{
  "signature": "<div>Mi firma HTML personalizada</div>"
}

// Generar firma
POST /user-settings/signature/generate
{
  "name": "Juan Pérez",
  "title": "Desarrollador Senior",
  "company": "Mi Empresa",
  "phone": "+1 234 567 8900",
  "website": "https://miempresa.com",
  "includeAvatar": true
}
```

### 2. Avatares

Los avatares se generan automáticamente para cada correo recibido y se pueden configurar para el usuario.

#### Tipos de avatares soportados:
- **Gravatar**: Utiliza el servicio Gravatar basado en el email
- **Iniciales**: Genera un avatar SVG con las iniciales del nombre
- **Personalizado**: Permite usar una URL de imagen personalizada

#### Características:
- **Generación automática**: Los correos recibidos incluyen automáticamente el avatar del remitente
- **Colores consistentes**: Los avatares de iniciales usan colores generados consistentemente basados en el nombre
- **Caché integrado**: Los avatares Gravatar se cachean automáticamente por el navegador

#### Endpoints de API:

```
GET    /user-settings/avatar                 - Obtener configuración de avatar
PUT    /user-settings/avatar                 - Actualizar configuración de avatar
POST   /user-settings/avatar/preview         - Generar preview de avatar
```

#### Ejemplo de uso:

```javascript
// Configurar avatar de iniciales
PUT /user-settings/avatar
{
  "type": "initials",
  "backgroundColor": "#3498db"
}

// Configurar avatar personalizado
PUT /user-settings/avatar
{
  "type": "custom",
  "customUrl": "https://example.com/mi-avatar.png"
}

// Generar preview
POST /user-settings/avatar/preview
{
  "email": "usuario@example.com",
  "name": "Juan Pérez",
  "type": "initials",
  "size": 80
}
```

## Servicios Implementados

### EmailSignatureService

Ubicación: `src/services/email-signature.service.ts`

Métodos principales:
- `getUserSignature(userId)`: Obtiene la firma del usuario
- `generateSignatureHtml(signature)`: Genera HTML de firma desde datos estructurados
- `appendSignature(body, signature)`: Agrega firma al cuerpo del correo
- `updateUserSignature(userId, signature)`: Actualiza la firma del usuario

### AvatarService

Ubicación: `src/services/avatar.service.ts`

Métodos principales:
- `generateAvatarUrl(config)`: Genera URL de avatar según configuración
- `generateGravatarUrl(email, size)`: Genera URL de Gravatar
- `generateInitialsAvatar(name, size, backgroundColor)`: Genera avatar SVG con iniciales
- `getUserAvatarConfig(userId)`: Obtiene configuración de avatar del usuario
- `updateUserAvatarConfig(userId, type, customUrl, backgroundColor)`: Actualiza configuración

## Integración con Servicios Existentes

### UnifiedEmailService

El servicio unificado de correo ha sido actualizado para:

1. **Agregar firmas automáticamente** al enviar correos (parámetro `includeSignature`)
2. **Enriquecer correos con avatares** al recibirlos (método `enrichEmailsWithAvatars`)

### Cambios en EmailService y GmailApiService

Los servicios de correo ahora agregan firmas automáticamente cuando se envían correos a través del `UnifiedEmailService`.

## Migración de Base de Datos

Para usar las nuevas funcionalidades, ejecuta el script de migración:

```bash
psql -U tu_usuario -d tu_base_de_datos -f src/scripts/add-avatar-columns.sql
```

Esto agrega las siguientes columnas:

**Tabla `user_settings`:**
- `avatar_type`: VARCHAR(20) - Tipo de avatar (gravatar, initials, custom)
- `avatar_url`: TEXT - URL del avatar personalizado
- `avatar_background_color`: VARCHAR(20) - Color de fondo para avatares de iniciales

**Tabla `emails`:**
- `from_name`: VARCHAR(255) - Nombre del remitente
- `from_avatar`: TEXT - URL del avatar del remitente

## Tipos TypeScript Actualizados

### UserSettings
```typescript
interface UserSettings {
  // ... campos existentes
  avatarType?: 'gravatar' | 'initials' | 'custom';
  avatarUrl?: string;
  avatarBackgroundColor?: string;
}
```

### Email
```typescript
interface Email {
  // ... campos existentes
  fromName?: string;
  fromAvatar?: string;
}
```

## Seguridad

- **Escape de HTML**: Todo el contenido HTML es escapado para prevenir XSS
- **Validación de URLs**: Las URLs de avatares personalizados son validadas
- **Autenticación**: Todos los endpoints requieren autenticación

## Ejemplos de Uso en Frontend

### Mostrar avatar en lista de correos

```jsx
<img
  src={email.fromAvatar}
  alt={email.fromName}
  width={40}
  height={40}
  style={{ borderRadius: '50%' }}
/>
```

### Editor de firma con preview

```jsx
function SignatureEditor() {
  const [signature, setSignature] = useState('');

  const saveSignature = async () => {
    await fetch('/user-settings/signature', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature })
    });
  };

  return (
    <div>
      <textarea value={signature} onChange={e => setSignature(e.target.value)} />
      <div dangerouslySetInnerHTML={{ __html: signature }} />
      <button onClick={saveSignature}>Guardar</button>
    </div>
  );
}
```

## Testing

Se recomienda probar:

1. **Envío de correos con firma**: Verificar que la firma se agregue correctamente
2. **Recepción de correos con avatares**: Verificar que los avatares se generen automáticamente
3. **Configuración de avatares**: Probar los tres tipos de avatares
4. **Generación de firmas**: Probar la generación automática de firmas HTML

## Próximas Mejoras

- [ ] Soporte para múltiples firmas (personal, profesional, etc.)
- [ ] Editor visual de firmas en el frontend
- [ ] Plantillas de firmas predefinidas
- [ ] Subida de imágenes para avatares personalizados
- [ ] Soporte para firmas con imágenes embebidas
