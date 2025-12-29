-- =====================================================
-- GEMINI MAIL - GMAIL COMPETITION UPGRADE
-- Todas las funcionalidades para competir con Gmail
-- =====================================================

-- =====================================================
-- 1. SISTEMA DE ETIQUETAS/LABELS PERSONALIZADAS
-- =====================================================
CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#4285f4',
  text_color VARCHAR(7) DEFAULT '#ffffff',
  icon VARCHAR(50),
  is_system BOOLEAN DEFAULT FALSE,
  parent_id UUID REFERENCES labels(id) ON DELETE SET NULL,
  visibility VARCHAR(20) DEFAULT 'show' CHECK (visibility IN ('show', 'hide', 'show_if_unread')),
  order_position INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS email_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  label_id UUID REFERENCES labels(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(email_id, label_id)
);

-- =====================================================
-- 2. FILTROS Y REGLAS DE CORREO AUTOMÁTICAS
-- =====================================================
CREATE TABLE IF NOT EXISTS email_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  -- Condiciones (OR entre grupos, AND dentro del grupo)
  conditions JSONB NOT NULL DEFAULT '[]',
  -- Ejemplo: [{"field": "from", "operator": "contains", "value": "@empresa.com"}, {"field": "subject", "operator": "matches", "value": "factura*"}]
  match_type VARCHAR(10) DEFAULT 'all' CHECK (match_type IN ('all', 'any')),
  -- Acciones a ejecutar
  actions JSONB NOT NULL DEFAULT '[]',
  -- Ejemplo: [{"type": "apply_label", "value": "uuid-label"}, {"type": "mark_read"}, {"type": "archive"}]
  stop_processing BOOLEAN DEFAULT FALSE,
  apply_to_existing BOOLEAN DEFAULT FALSE,
  match_count INTEGER DEFAULT 0,
  last_matched_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historial de ejecución de filtros
CREATE TABLE IF NOT EXISTS filter_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_id UUID REFERENCES email_filters(id) ON DELETE CASCADE,
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  actions_executed JSONB,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. LIBRETA DE CONTACTOS COMPLETA
-- =====================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  -- Información principal
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  nickname VARCHAR(100),
  -- Foto
  photo_url TEXT,
  photo_data BYTEA,
  -- Información adicional
  company VARCHAR(255),
  job_title VARCHAR(255),
  department VARCHAR(255),
  -- Teléfonos (array de objetos)
  phones JSONB DEFAULT '[]',
  -- Ejemplo: [{"type": "mobile", "number": "+34612345678", "primary": true}]
  -- Direcciones
  addresses JSONB DEFAULT '[]',
  -- Ejemplo: [{"type": "home", "street": "", "city": "", "country": "", "postal_code": ""}]
  -- Redes sociales y sitios web
  websites JSONB DEFAULT '[]',
  social_profiles JSONB DEFAULT '[]',
  -- Fechas importantes
  birthday DATE,
  anniversary DATE,
  -- Notas y campos personalizados
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  -- Metadatos
  source VARCHAR(50) DEFAULT 'manual',
  external_id VARCHAR(255),
  is_starred BOOLEAN DEFAULT FALSE,
  interaction_count INTEGER DEFAULT 0,
  last_contacted_at TIMESTAMP,
  last_email_received_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, email)
);

CREATE TABLE IF NOT EXISTS contact_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#4285f4',
  description TEXT,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS contact_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  group_id UUID REFERENCES contact_groups(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(contact_id, group_id)
);

-- =====================================================
-- 4. FUNCIÓN SNOOZE PARA CORREOS
-- =====================================================
CREATE TABLE IF NOT EXISTS snoozed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  snoozed_until TIMESTAMP WITH TIME ZONE NOT NULL,
  original_folder VARCHAR(100),
  snooze_type VARCHAR(20) DEFAULT 'custom' CHECK (snooze_type IN ('later_today', 'tomorrow', 'this_weekend', 'next_week', 'custom')),
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(email_id)
);

-- =====================================================
-- 5. UNDO SEND (DESHACER ENVÍO)
-- =====================================================
CREATE TABLE IF NOT EXISTS pending_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  to_addresses JSONB NOT NULL,
  cc_addresses JSONB,
  bcc_addresses JSONB,
  subject TEXT,
  body TEXT,
  html_body TEXT,
  attachments JSONB,
  -- Undo configuration
  send_at TIMESTAMP WITH TIME ZONE NOT NULL,
  undo_period_seconds INTEGER DEFAULT 30,
  can_undo_until TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
  -- Tracking
  cancelled_at TIMESTAMP,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 6. MODO CONFIDENCIAL (AUTO-DESTRUCCIÓN)
-- =====================================================
CREATE TABLE IF NOT EXISTS confidential_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  -- Configuración de confidencialidad
  expires_at TIMESTAMP WITH TIME ZONE,
  require_passcode BOOLEAN DEFAULT FALSE,
  passcode_hash VARCHAR(255),
  passcode_hint TEXT,
  -- Restricciones
  prevent_forwarding BOOLEAN DEFAULT TRUE,
  prevent_copy BOOLEAN DEFAULT TRUE,
  prevent_download BOOLEAN DEFAULT TRUE,
  prevent_print BOOLEAN DEFAULT TRUE,
  -- SMS verification
  require_sms_verification BOOLEAN DEFAULT FALSE,
  recipient_phone VARCHAR(20),
  sms_code_hash VARCHAR(255),
  sms_verified BOOLEAN DEFAULT FALSE,
  -- Tracking
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Log de accesos a emails confidenciales
CREATE TABLE IF NOT EXISTS confidential_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confidential_email_id UUID REFERENCES confidential_emails(id) ON DELETE CASCADE,
  accessed_by_email VARCHAR(255),
  accessed_from_ip VARCHAR(45),
  user_agent TEXT,
  access_granted BOOLEAN,
  failure_reason TEXT,
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 7. CONFIRMACIÓN DE LECTURA
-- =====================================================
CREATE TABLE IF NOT EXISTS read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  -- Estado
  requested BOOLEAN DEFAULT TRUE,
  read_at TIMESTAMP,
  read_from_ip VARCHAR(45),
  read_user_agent TEXT,
  read_device_type VARCHAR(50),
  -- Tracking pixel
  tracking_pixel_id UUID UNIQUE DEFAULT gen_random_uuid(),
  pixel_loaded_count INTEGER DEFAULT 0,
  -- Notificación
  sender_notified BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 8. NUDGES (RECORDATORIOS DE SEGUIMIENTO)
-- =====================================================
CREATE TABLE IF NOT EXISTS nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  nudge_type VARCHAR(30) NOT NULL CHECK (nudge_type IN ('follow_up', 'reply_needed', 'no_response', 'important_unread', 'suggested')),
  -- Mensaje del nudge
  title VARCHAR(255) NOT NULL,
  description TEXT,
  -- Configuración
  priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  show_after TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  -- Estado
  is_dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMP,
  is_actioned BOOLEAN DEFAULT FALSE,
  actioned_at TIMESTAMP,
  action_taken VARCHAR(50),
  -- IA
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_confidence FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 9. SISTEMA DE TAREAS INTEGRADO
-- =====================================================
CREATE TABLE IF NOT EXISTS task_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#4285f4',
  is_default BOOLEAN DEFAULT FALSE,
  order_position INTEGER DEFAULT 0,
  task_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  list_id UUID REFERENCES task_lists(id) ON DELETE CASCADE,
  email_id UUID REFERENCES emails(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  -- Contenido
  title VARCHAR(500) NOT NULL,
  notes TEXT,
  -- Fechas
  due_date DATE,
  due_time TIME,
  reminder_at TIMESTAMP WITH TIME ZONE,
  -- Estado
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMP,
  -- Organización
  priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  order_position INTEGER DEFAULT 0,
  -- Recurrencia
  recurrence JSONB,
  -- Ejemplo: {"type": "weekly", "interval": 1, "days": ["mon", "wed", "fri"]}
  -- Metadatos
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 10. CALENDARIO INTEGRADO
-- =====================================================
CREATE TABLE IF NOT EXISTS calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) DEFAULT '#4285f4',
  description TEXT,
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_primary BOOLEAN DEFAULT FALSE,
  is_visible BOOLEAN DEFAULT TRUE,
  -- Sincronización externa
  external_id VARCHAR(255),
  external_provider VARCHAR(50),
  sync_token TEXT,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email_id UUID REFERENCES emails(id) ON DELETE SET NULL,
  -- Información del evento
  title VARCHAR(500) NOT NULL,
  description TEXT,
  location TEXT,
  -- Video conferencia
  video_conference_url TEXT,
  video_conference_provider VARCHAR(50),
  -- Fechas
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  timezone VARCHAR(50) DEFAULT 'UTC',
  -- Recurrencia
  recurrence_rule TEXT,
  recurrence_id UUID,
  original_start_time TIMESTAMP WITH TIME ZONE,
  -- Estado
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
  -- Visibilidad
  visibility VARCHAR(20) DEFAULT 'default' CHECK (visibility IN ('default', 'public', 'private', 'confidential')),
  -- Recordatorios
  reminders JSONB DEFAULT '[]',
  -- Ejemplo: [{"method": "email", "minutes": 30}, {"method": "popup", "minutes": 10}]
  -- Organizador y asistentes
  organizer_email VARCHAR(255),
  organizer_name VARCHAR(255),
  -- Metadatos
  external_id VARCHAR(255),
  ical_uid VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  response_status VARCHAR(20) DEFAULT 'needs_action' CHECK (response_status IN ('needs_action', 'accepted', 'declined', 'tentative')),
  is_organizer BOOLEAN DEFAULT FALSE,
  is_optional BOOLEAN DEFAULT FALSE,
  comment TEXT,
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 11. BÚSQUEDA AVANZADA CON OPERADORES
-- =====================================================
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  query TEXT NOT NULL,
  -- Búsqueda estructurada
  parsed_query JSONB,
  -- Ejemplo: {"from": "john@", "subject": "meeting", "has": ["attachment"], "after": "2024-01-01"}
  description TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historial de búsquedas
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  result_count INTEGER,
  search_duration_ms INTEGER,
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 12. MODO OFFLINE COMPLETO
-- =====================================================
CREATE TABLE IF NOT EXISTS offline_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  -- Estado de sincronización
  last_sync_at TIMESTAMP,
  sync_token TEXT,
  -- Configuración offline
  offline_days INTEGER DEFAULT 30,
  offline_folders JSONB DEFAULT '["INBOX", "Sent", "Drafts"]',
  max_offline_size_mb INTEGER DEFAULT 500,
  current_offline_size_mb INTEGER DEFAULT 0,
  -- Estado
  sync_status VARCHAR(20) DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error')),
  last_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, account_id)
);

-- Cola de acciones offline
CREATE TABLE IF NOT EXISTS offline_actions_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  -- Tipos: send_email, move_email, delete_email, mark_read, mark_starred, etc.
  action_data JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

-- =====================================================
-- 13. ATAJOS DE TECLADO PERSONALIZADOS
-- =====================================================
CREATE TABLE IF NOT EXISTS keyboard_shortcuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action_id VARCHAR(100) NOT NULL,
  -- Ejemplo: compose_email, archive, delete, reply, forward, etc.
  key_combination VARCHAR(100) NOT NULL,
  -- Ejemplo: "ctrl+shift+c", "g then i", "j"
  is_enabled BOOLEAN DEFAULT TRUE,
  is_custom BOOLEAN DEFAULT FALSE,
  description TEXT,
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, action_id)
);

-- =====================================================
-- 14. INTEGRACIÓN CON ALMACENAMIENTO EN LA NUBE
-- =====================================================
CREATE TABLE IF NOT EXISTS cloud_storage_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('google_drive', 'dropbox', 'onedrive', 'box', 'icloud')),
  -- Tokens
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  -- Información de cuenta
  account_email VARCHAR(255),
  account_name VARCHAR(255),
  storage_quota_bytes BIGINT,
  storage_used_bytes BIGINT,
  -- Estado
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, provider)
);

CREATE TABLE IF NOT EXISTS cloud_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES cloud_storage_connections(id) ON DELETE SET NULL,
  -- Información del archivo
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  -- Referencias
  cloud_file_id VARCHAR(255),
  cloud_file_url TEXT,
  download_url TEXT,
  thumbnail_url TEXT,
  -- Estado
  upload_status VARCHAR(20) DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploading', 'completed', 'failed')),
  uploaded_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 15. IMPORTACIÓN/EXPORTACIÓN DE CORREOS
-- =====================================================
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  -- Tipo de importación
  import_type VARCHAR(50) NOT NULL CHECK (import_type IN ('mbox', 'eml', 'pst', 'imap_migration', 'gmail_takeout')),
  source_description TEXT,
  -- Progreso
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  total_items INTEGER,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  -- Archivos
  source_file_path TEXT,
  log_file_path TEXT,
  -- Tiempos
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  -- Tipo de exportación
  export_type VARCHAR(50) NOT NULL CHECK (export_type IN ('mbox', 'eml', 'pdf', 'html', 'json')),
  -- Filtros
  filters JSONB,
  -- Ejemplo: {"folders": ["INBOX"], "date_from": "2024-01-01", "date_to": "2024-12-31"}
  -- Progreso
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_items INTEGER,
  processed_items INTEGER DEFAULT 0,
  -- Archivo resultante
  output_file_path TEXT,
  output_file_size BIGINT,
  download_url TEXT,
  download_expires_at TIMESTAMP,
  -- Tiempos
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 16. SMART COMPOSE Y AUTOCOMPLETADO
-- =====================================================
CREATE TABLE IF NOT EXISTS writing_suggestions_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  context_hash VARCHAR(64) NOT NULL,
  input_text TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  confidence FLOAT,
  accepted BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days'
);

CREATE TABLE IF NOT EXISTS user_writing_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pattern_type VARCHAR(50) NOT NULL,
  -- Tipos: greeting, closing, phrase, correction
  pattern_text TEXT NOT NULL,
  replacement_text TEXT,
  frequency INTEGER DEFAULT 1,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, pattern_type, pattern_text)
);

-- =====================================================
-- 17. VACATION RESPONDER AVANZADO
-- =====================================================
CREATE TABLE IF NOT EXISTS vacation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT FALSE,
  -- Configuración
  subject TEXT NOT NULL DEFAULT 'Fuera de la oficina',
  message TEXT NOT NULL,
  html_message TEXT,
  -- Fechas
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  -- Opciones
  only_contacts BOOLEAN DEFAULT FALSE,
  only_domain BOOLEAN DEFAULT FALSE,
  allowed_domains TEXT[],
  exclude_addresses TEXT[],
  -- Límites
  max_per_sender INTEGER DEFAULT 1,
  reply_interval_hours INTEGER DEFAULT 24,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, account_id)
);

CREATE TABLE IF NOT EXISTS vacation_responses_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacation_id UUID REFERENCES vacation_settings(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(vacation_id, recipient_email, sent_at::date)
);

-- =====================================================
-- 18. EMAIL THREADS Y CONVERSACIONES
-- =====================================================
CREATE TABLE IF NOT EXISTS email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  -- Identificación
  thread_id VARCHAR(255) NOT NULL,
  subject_normalized VARCHAR(500),
  -- Participantes
  participants JSONB DEFAULT '[]',
  -- Estadísticas
  message_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  -- Fechas
  first_message_at TIMESTAMP,
  last_message_at TIMESTAMP,
  -- Estado
  is_starred BOOLEAN DEFAULT FALSE,
  is_important BOOLEAN DEFAULT FALSE,
  is_muted BOOLEAN DEFAULT FALSE,
  -- Labels
  labels JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account_id, thread_id)
);

-- Añadir referencia de thread a emails
ALTER TABLE emails ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES email_threads(id) ON DELETE SET NULL;

-- =====================================================
-- 19. ANALYTICS Y PRODUCTIVIDAD
-- =====================================================
CREATE TABLE IF NOT EXISTS email_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  analytics_date DATE NOT NULL,
  -- Métricas de emails
  emails_received INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  emails_read INTEGER DEFAULT 0,
  emails_archived INTEGER DEFAULT 0,
  emails_deleted INTEGER DEFAULT 0,
  -- Tiempo
  avg_response_time_minutes INTEGER,
  inbox_zero_achieved BOOLEAN DEFAULT FALSE,
  inbox_zero_time TIME,
  -- Productividad
  busiest_hour INTEGER,
  most_active_sender VARCHAR(255),
  most_active_domain VARCHAR(255),
  -- Categorización
  work_emails INTEGER DEFAULT 0,
  personal_emails INTEGER DEFAULT 0,
  promotional_emails INTEGER DEFAULT 0,
  social_emails INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, analytics_date)
);

-- =====================================================
-- 20. SECURITY Y 2FA PARA EMAILS SENSIBLES
-- =====================================================
CREATE TABLE IF NOT EXISTS sensitive_email_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  -- Tipos: forward_sensitive, download_attachment, print, export
  requires_2fa BOOLEAN DEFAULT TRUE,
  two_fa_verified BOOLEAN DEFAULT FALSE,
  two_fa_method VARCHAR(20),
  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_id VARCHAR(255),
  -- Estado
  approved BOOLEAN,
  approved_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Labels
CREATE INDEX IF NOT EXISTS idx_labels_user_id ON labels(user_id);
CREATE INDEX IF NOT EXISTS idx_email_labels_email_id ON email_labels(email_id);
CREATE INDEX IF NOT EXISTS idx_email_labels_label_id ON email_labels(label_id);

-- Filters
CREATE INDEX IF NOT EXISTS idx_email_filters_user_id ON email_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_email_filters_active ON email_filters(is_active);
CREATE INDEX IF NOT EXISTS idx_filter_execution_log_filter_id ON filter_execution_log(filter_id);

-- Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
CREATE INDEX IF NOT EXISTS idx_contact_groups_user_id ON contact_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_group_members_contact_id ON contact_group_members(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_group_members_group_id ON contact_group_members(group_id);

-- Snooze
CREATE INDEX IF NOT EXISTS idx_snoozed_emails_user_id ON snoozed_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_snoozed_emails_snoozed_until ON snoozed_emails(snoozed_until);

-- Pending emails (undo send)
CREATE INDEX IF NOT EXISTS idx_pending_emails_user_id ON pending_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_emails_status ON pending_emails(status);
CREATE INDEX IF NOT EXISTS idx_pending_emails_send_at ON pending_emails(send_at);

-- Confidential emails
CREATE INDEX IF NOT EXISTS idx_confidential_emails_email_id ON confidential_emails(email_id);
CREATE INDEX IF NOT EXISTS idx_confidential_emails_expires_at ON confidential_emails(expires_at);

-- Read receipts
CREATE INDEX IF NOT EXISTS idx_read_receipts_email_id ON read_receipts(email_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_tracking_pixel_id ON read_receipts(tracking_pixel_id);

-- Nudges
CREATE INDEX IF NOT EXISTS idx_nudges_user_id ON nudges(user_id);
CREATE INDEX IF NOT EXISTS idx_nudges_show_after ON nudges(show_after);
CREATE INDEX IF NOT EXISTS idx_nudges_dismissed ON nudges(is_dismissed);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_task_lists_user_id ON task_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Calendar
CREATE INDEX IF NOT EXISTS idx_calendars_user_id ON calendars(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar_id ON calendar_events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);

-- Search
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_searched_at ON search_history(searched_at);

-- Offline
CREATE INDEX IF NOT EXISTS idx_offline_sync_state_user_id ON offline_sync_state(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_actions_queue_user_id ON offline_actions_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_actions_queue_status ON offline_actions_queue(status);

-- Cloud storage
CREATE INDEX IF NOT EXISTS idx_cloud_storage_connections_user_id ON cloud_storage_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_attachments_email_id ON cloud_attachments(email_id);

-- Import/Export
CREATE INDEX IF NOT EXISTS idx_import_jobs_user_id ON import_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id ON export_jobs(user_id);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_email_analytics_user_id ON email_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_email_analytics_date ON email_analytics(analytics_date);

-- Threads
CREATE INDEX IF NOT EXISTS idx_email_threads_user_id ON email_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_account_id ON email_threads(account_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_last_message ON email_threads(last_message_at);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);

-- Vacation
CREATE INDEX IF NOT EXISTS idx_vacation_settings_user_id ON vacation_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_vacation_responses_vacation_id ON vacation_responses_sent(vacation_id);

-- Writing suggestions
CREATE INDEX IF NOT EXISTS idx_writing_suggestions_user_id ON writing_suggestions_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_writing_suggestions_context ON writing_suggestions_cache(context_hash);

-- Full text search en emails (PostgreSQL)
CREATE INDEX IF NOT EXISTS idx_emails_fulltext ON emails USING gin(to_tsvector('spanish', coalesce(subject, '') || ' ' || coalesce(body, '')));

-- =====================================================
-- FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas con updated_at
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
        EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END
$$;

-- Función para actualizar contadores de labels
CREATE OR REPLACE FUNCTION update_label_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE labels SET
            message_count = message_count + 1,
            unread_count = unread_count + (
                SELECT CASE WHEN NOT is_read THEN 1 ELSE 0 END
                FROM emails WHERE id = NEW.email_id
            )
        WHERE id = NEW.label_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE labels SET
            message_count = GREATEST(message_count - 1, 0),
            unread_count = GREATEST(unread_count - (
                SELECT CASE WHEN NOT is_read THEN 1 ELSE 0 END
                FROM emails WHERE id = OLD.email_id
            ), 0)
        WHERE id = OLD.label_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_label_counts
AFTER INSERT OR DELETE ON email_labels
FOR EACH ROW EXECUTE FUNCTION update_label_counts();

-- Función para actualizar contadores de grupos de contactos
CREATE OR REPLACE FUNCTION update_contact_group_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE contact_groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE contact_groups SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.group_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_contact_group_counts
AFTER INSERT OR DELETE ON contact_group_members
FOR EACH ROW EXECUTE FUNCTION update_contact_group_counts();

-- Función para actualizar contadores de listas de tareas
CREATE OR REPLACE FUNCTION update_task_list_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE task_lists SET task_count = task_count + 1 WHERE id = NEW.list_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE task_lists SET
            task_count = GREATEST(task_count - 1, 0),
            completed_count = GREATEST(completed_count - CASE WHEN OLD.status = 'completed' THEN 1 ELSE 0 END, 0)
        WHERE id = OLD.list_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
            UPDATE task_lists SET completed_count = completed_count + 1 WHERE id = NEW.list_id;
        ELSIF OLD.status = 'completed' AND NEW.status != 'completed' THEN
            UPDATE task_lists SET completed_count = GREATEST(completed_count - 1, 0) WHERE id = NEW.list_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_task_list_counts
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_task_list_counts();

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Atajos de teclado por defecto
INSERT INTO keyboard_shortcuts (id, user_id, action_id, key_combination, is_enabled, is_custom, description, category)
SELECT
    gen_random_uuid(),
    NULL,
    action_id,
    key_combination,
    TRUE,
    FALSE,
    description,
    category
FROM (VALUES
    ('compose_email', 'c', 'Redactar nuevo correo', 'compose'),
    ('reply', 'r', 'Responder', 'compose'),
    ('reply_all', 'a', 'Responder a todos', 'compose'),
    ('forward', 'f', 'Reenviar', 'compose'),
    ('send_email', 'ctrl+enter', 'Enviar correo', 'compose'),
    ('discard_draft', 'ctrl+shift+d', 'Descartar borrador', 'compose'),
    ('archive', 'e', 'Archivar', 'actions'),
    ('delete', '#', 'Eliminar', 'actions'),
    ('mark_read', 'shift+i', 'Marcar como leído', 'actions'),
    ('mark_unread', 'shift+u', 'Marcar como no leído', 'actions'),
    ('star', 's', 'Destacar/Quitar destacado', 'actions'),
    ('snooze', 'b', 'Posponer', 'actions'),
    ('mute', 'm', 'Silenciar conversación', 'actions'),
    ('move_to', 'v', 'Mover a...', 'actions'),
    ('label', 'l', 'Aplicar etiqueta', 'actions'),
    ('spam', '!', 'Marcar como spam', 'actions'),
    ('undo', 'z', 'Deshacer última acción', 'actions'),
    ('search', '/', 'Buscar', 'navigation'),
    ('go_inbox', 'g then i', 'Ir a Recibidos', 'navigation'),
    ('go_starred', 'g then s', 'Ir a Destacados', 'navigation'),
    ('go_sent', 'g then t', 'Ir a Enviados', 'navigation'),
    ('go_drafts', 'g then d', 'Ir a Borradores', 'navigation'),
    ('go_all', 'g then a', 'Ir a Todos', 'navigation'),
    ('go_contacts', 'g then c', 'Ir a Contactos', 'navigation'),
    ('go_tasks', 'g then k', 'Ir a Tareas', 'navigation'),
    ('next_email', 'j', 'Siguiente correo', 'navigation'),
    ('prev_email', 'k', 'Correo anterior', 'navigation'),
    ('open_email', 'o', 'Abrir correo', 'navigation'),
    ('back_to_list', 'u', 'Volver a la lista', 'navigation'),
    ('expand_all', ';', 'Expandir toda la conversación', 'view'),
    ('collapse_all', ':', 'Colapsar conversación', 'view'),
    ('select_all', '*+a', 'Seleccionar todos', 'selection'),
    ('select_none', '*+n', 'Deseleccionar todos', 'selection'),
    ('select_read', '*+r', 'Seleccionar leídos', 'selection'),
    ('select_unread', '*+u', 'Seleccionar no leídos', 'selection'),
    ('select_starred', '*+s', 'Seleccionar destacados', 'selection'),
    ('keyboard_shortcuts', '?', 'Mostrar atajos de teclado', 'help'),
    ('open_settings', 'g then s then s', 'Abrir configuración', 'settings')
) AS shortcuts(action_id, key_combination, description, category)
WHERE NOT EXISTS (
    SELECT 1 FROM keyboard_shortcuts WHERE user_id IS NULL AND action_id = shortcuts.action_id
);

COMMIT;
