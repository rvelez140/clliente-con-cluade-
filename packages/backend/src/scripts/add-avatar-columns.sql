-- Agregar columnas de configuración de avatar a user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS avatar_type VARCHAR(20) DEFAULT 'gravatar',
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS avatar_background_color VARCHAR(20);

-- Agregar comentarios para documentar las columnas
COMMENT ON COLUMN user_settings.avatar_type IS 'Tipo de avatar: gravatar, initials o custom';
COMMENT ON COLUMN user_settings.avatar_url IS 'URL del avatar personalizado (solo para tipo custom)';
COMMENT ON COLUMN user_settings.avatar_background_color IS 'Color de fondo para avatar de iniciales (formato hex o hsl)';

-- Agregar columnas para información de remitente en emails
ALTER TABLE emails
ADD COLUMN IF NOT EXISTS from_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS from_avatar TEXT;

-- Agregar comentarios
COMMENT ON COLUMN emails.from_name IS 'Nombre del remitente extraído del campo from';
COMMENT ON COLUMN emails.from_avatar IS 'URL del avatar del remitente (generado automáticamente)';
