import { z } from 'zod';

/**
 * Validador personalizado para emails
 */
const emailValidator = z.string().email('Email inválido').min(5, 'Email muy corto');

/**
 * Validador para array de emails
 */
const emailArrayValidator = z.array(emailValidator).min(1, 'Debe proporcionar al menos un destinatario');

/**
 * Schema para agregar una cuenta de correo
 */
export const addAccountSchema = z.object({
  provider: z.enum(['gmail', 'outlook', 'yahoo', 'protonmail', 'custom']),
  email: emailValidator,
  password: z.string().min(1, 'La contraseña es requerida'),
  imapHost: z.string().optional(),
  imapPort: z.number().int().min(1).max(65535).optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
}).refine(
  (data) => {
    // Si el proveedor es custom, debe proporcionar configuración IMAP/SMTP
    if (data.provider === 'custom') {
      return !!(data.imapHost && data.imapPort && data.smtpHost && data.smtpPort);
    }
    return true;
  },
  {
    message: 'Para proveedores personalizados debe proporcionar configuración IMAP y SMTP',
    path: ['provider']
  }
);

/**
 * Schema para enviar un correo
 */
export const sendEmailSchema = z.object({
  to: emailArrayValidator,
  subject: z.string().min(1, 'El asunto es requerido').max(500, 'Asunto demasiado largo'),
  body: z.string().min(1, 'El cuerpo del mensaje es requerido'),
  cc: z.array(emailValidator).optional(),
  bcc: z.array(emailValidator).optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(),
    contentType: z.string().optional()
  })).optional()
});

/**
 * Schema para crear correo programado
 */
export const createScheduledEmailSchema = z.object({
  accountId: z.string().uuid('ID de cuenta inválido'),
  toAddresses: emailArrayValidator,
  ccAddresses: z.array(emailValidator).optional(),
  bccAddresses: z.array(emailValidator).optional(),
  subject: z.string().max(500, 'Asunto demasiado largo').optional(),
  body: z.string().optional(),
  htmlBody: z.string().optional(),
  scheduledAt: z.string().datetime('Fecha de programación inválida').or(z.date()),
  timezone: z.string().default('UTC'),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
  recurrenceEndDate: z.string().datetime().or(z.date()).optional(),
  aiGenerated: z.boolean().default(false),
  aiPrompt: z.string().optional(),
  aiTone: z.enum(['formal', 'casual', 'friendly', 'professional']).optional(),
  useVoice: z.boolean().default(false),
  voiceLang: z.string().default('es-ES')
}).refine(
  (data) => {
    // Validar que scheduledAt sea en el futuro
    const scheduledDate = new Date(data.scheduledAt);
    return scheduledDate > new Date();
  },
  {
    message: 'La fecha de programación debe ser en el futuro',
    path: ['scheduledAt']
  }
).refine(
  (data) => {
    // Si aiGenerated es true, debe tener aiPrompt
    if (data.aiGenerated) {
      return !!(data.aiPrompt && data.aiPrompt.trim().length > 0);
    }
    return true;
  },
  {
    message: 'Debe proporcionar un prompt cuando aiGenerated es verdadero',
    path: ['aiPrompt']
  }
).refine(
  (data) => {
    // Si NO es aiGenerated, debe tener subject y body
    if (!data.aiGenerated) {
      return !!(data.subject && data.body);
    }
    return true;
  },
  {
    message: 'Debe proporcionar asunto y cuerpo cuando no usa generación de IA',
    path: ['body']
  }
).refine(
  (data) => {
    // Si tiene recurrenceEndDate, debe ser después de scheduledAt
    if (data.recurrenceEndDate) {
      const scheduledDate = new Date(data.scheduledAt);
      const endDate = new Date(data.recurrenceEndDate);
      return endDate > scheduledDate;
    }
    return true;
  },
  {
    message: 'La fecha de fin de recurrencia debe ser después de la fecha de programación',
    path: ['recurrenceEndDate']
  }
);

/**
 * Schema para actualizar correo programado
 */
export const updateScheduledEmailSchema = z.object({
  toAddresses: emailArrayValidator.optional(),
  ccAddresses: z.array(emailValidator).optional(),
  bccAddresses: z.array(emailValidator).optional(),
  subject: z.string().max(500).optional(),
  body: z.string().optional(),
  scheduledAt: z.string().datetime().or(z.date()).optional(),
  status: z.enum(['pending', 'sent', 'failed', 'cancelled']).optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).optional()
}).refine(
  (data) => {
    // Si actualiza scheduledAt, debe ser en el futuro
    if (data.scheduledAt) {
      const scheduledDate = new Date(data.scheduledAt);
      return scheduledDate > new Date();
    }
    return true;
  },
  {
    message: 'La fecha de programación debe ser en el futuro',
    path: ['scheduledAt']
  }
);

/**
 * Schema para generar email con IA
 */
export const generateEmailAISchema = z.object({
  prompt: z.string().min(10, 'El prompt debe tener al menos 10 caracteres'),
  tone: z.enum(['formal', 'casual', 'friendly', 'professional']).default('professional'),
  context: z.string().optional()
});

/**
 * Schema para resumir email
 */
export const summarizeEmailSchema = z.object({
  emailBody: z.string().min(10, 'El cuerpo del email es demasiado corto para resumir')
});

/**
 * Schema para fetch de emails
 */
export const fetchEmailsQuerySchema = z.object({
  folder: z.string().default('INBOX'),
  limit: z.string().optional().default('50').transform(Number).pipe(z.number().int().min(1).max(200))
});

/**
 * Schema para plantilla de email
 */
export const emailTemplateSchema = z.object({
  name: z.string().min(1, 'El nombre de la plantilla es requerido').max(255),
  description: z.string().optional(),
  category: z.string().optional(),
  subject: z.string().min(1, 'El asunto es requerido'),
  body: z.string().min(1, 'El cuerpo es requerido'),
  variables: z.array(z.string()).default([])
});

/**
 * Tipo TypeScript inferido del schema
 */
export type AddAccountInput = z.infer<typeof addAccountSchema>;
export type SendEmailInput = z.infer<typeof sendEmailSchema>;
export type CreateScheduledEmailInput = z.infer<typeof createScheduledEmailSchema>;
export type UpdateScheduledEmailInput = z.infer<typeof updateScheduledEmailSchema>;
export type GenerateEmailAIInput = z.infer<typeof generateEmailAISchema>;
export type SummarizeEmailInput = z.infer<typeof summarizeEmailSchema>;
export type FetchEmailsQuery = z.infer<typeof fetchEmailsQuerySchema>;
export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;
