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
- **Imágenes de fondo**: Soporte para imágenes de fondo personalizadas en las firmas
- **Estilos personalizables**: Control de padding, border-radius, color de fondo, tamaño y posición de imagen
- **Overlay automático**: Cuando se usa imagen de fondo, se agrega un overlay semitransparente para mejorar la legibilidad
- **Inserción automática**: Las firmas se agregan automáticamente al final de los correos enviados

#### Endpoints de API:

```
GET    /user-settings/signature              - Obtener firma del usuario
PUT    /user-settings/signature              - Actualizar firma del usuario
POST   /user-settings/signature/generate     - Generar firma HTML desde datos estructurados
POST   /user-settings/signature/sample       - Generar firma de ejemplo con imagen de fondo
POST   /user-settings/validate-image-url     - Validar URL de imagen
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

// Generar firma con imagen de fondo
POST /user-settings/signature/generate
{
  "name": "Juan Pérez",
  "title": "Desarrollador Senior",
  "company": "Mi Empresa",
  "phone": "+1 234 567 8900",
  "website": "https://miempresa.com",
  "backgroundImageUrl": "https://example.com/background.jpg",
  "backgroundSize": "cover",
  "backgroundPosition": "center",
  "backgroundColor": "#f8f9fa",
  "padding": "20px",
  "borderRadius": "8px"
}

// Generar firma de ejemplo
POST /user-settings/signature/sample
{
  "name": "María García",
  "title": "CEO",
  "company": "Tech Company",
  "backgroundImageUrl": "https://example.com/gradient.png"
}

// Validar URL de imagen
POST /user-settings/validate-image-url
{
  "url": "https://example.com/image.jpg"
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

## Imágenes de Fondo en Firmas

### Características

Las firmas ahora soportan imágenes de fondo personalizadas con las siguientes opciones:

#### Propiedades disponibles:

- **backgroundImageUrl**: URL de la imagen de fondo (HTTPS, HTTP o data URL)
- **backgroundColor**: Color de fondo sólido (hex, rgb, hsl)
- **backgroundSize**: Tamaño de la imagen (`cover`, `contain`, `auto`)
- **backgroundPosition**: Posición de la imagen (ej: `center`, `top left`)
- **backgroundRepeat**: Repetición de la imagen (`no-repeat`, `repeat`, `repeat-x`, `repeat-y`)
- **padding**: Espaciado interno (ej: `20px`, `15px 30px`)
- **borderRadius**: Radio de borde para esquinas redondeadas (ej: `8px`, `12px`)

#### Overlay automático

Cuando se configura una imagen de fondo, el sistema agrega automáticamente un overlay semitransparente blanco (85% opacidad) para mejorar la legibilidad del texto. Esto asegura que el contenido de la firma sea legible independientemente del fondo.

#### Validación de URLs

El sistema valida automáticamente las URLs de imágenes:
- Acepta protocolos: `http://`, `https://`, `data:image/`
- Valida extensiones: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.bmp`
- Data URLs deben comenzar con `data:image/`

### Ejemplo de uso completo

```javascript
// Firma con imagen de fondo
const signature = {
  name: "Ana Martínez",
  title: "Directora de Ventas",
  company: "Acme Corp",
  phone: "+34 600 123 456",
  website: "https://acme.com",
  includeAvatar: true,
  avatarUrl: "https://gravatar.com/avatar/...",
  backgroundImageUrl: "https://images.unsplash.com/photo-gradient",
  backgroundColor: "#f0f0f0", // Fallback si la imagen no carga
  backgroundSize: "cover",
  backgroundPosition: "center center",
  backgroundRepeat: "no-repeat",
  padding: "25px",
  borderRadius: "10px"
};
```

### Mejores prácticas

1. **Contraste**: Usa imágenes con suficiente contraste o colores suaves
2. **Tamaño**: Las imágenes deben ser ligeras (< 500KB) para carga rápida
3. **Formato**: Prefiere WebP o JPEG para fotografías, PNG para gráficos
4. **Posición**: `center` suele funcionar mejor para la mayoría de imágenes
5. **Fallback**: Siempre configura un `backgroundColor` como respaldo

## Próximas Mejoras

- [ ] Soporte para múltiples firmas (personal, profesional, etc.)
- [ ] Editor visual de firmas en el frontend
- [ ] Plantillas de firmas predefinidas con imágenes de fondo
- [ ] Subida de imágenes para avatares personalizados
- [ ] Galería de imágenes de fondo predefinidas
- [ ] Ajuste de opacidad del overlay
- [ ] Soporte para gradientes CSS como fondo
