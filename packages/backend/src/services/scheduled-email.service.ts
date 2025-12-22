import { query } from '../config/database';
import { EmailService } from './email.service';
import { GeminiService } from './gemini.service';
import { UnifiedEmailService } from './unified-email.service';

export interface ScheduledEmail {
  id?: number;
  userId: number;
  accountId: string;
  toAddresses: string[];
  ccAddresses?: string[];
  bccAddresses?: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  scheduledAt: Date;
  timezone?: string;
  status?: 'pending' | 'sent' | 'failed' | 'cancelled';
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  recurrenceEndDate?: Date;
  aiGenerated?: boolean;
  aiPrompt?: string;
  aiTone?: string;
  useVoice?: boolean;
  voiceLang?: string;
  errorMessage?: string;
  sentAt?: Date;
}

type ValidTone = 'formal' | 'casual' | 'friendly' | 'professional';

export class ScheduledEmailService {
  private emailService: EmailService;
  private geminiService: GeminiService;
  private unifiedEmailService: UnifiedEmailService;

  constructor() {
    this.emailService = new EmailService();
    this.geminiService = new GeminiService();
    this.unifiedEmailService = new UnifiedEmailService();
  }

  private validateTone(tone?: string): ValidTone {
    const validTones: ValidTone[] = ['formal', 'casual', 'friendly', 'professional'];
    if (tone && validTones.includes(tone as ValidTone)) {
      return tone as ValidTone;
    }
    return 'professional';
  }

  async createScheduledEmail(email: ScheduledEmail): Promise<number> {
    try {
      let finalBody = email.body;
      let finalSubject = email.subject;

      // Si se debe generar con IA
      if (email.aiGenerated && email.aiPrompt) {
        const aiResult = await this.geminiService.generateEmailContent({
          prompt: email.aiPrompt,
          context: email.body || '',
          tone: this.validateTone(email.aiTone),
          length: 'medium',
        });
        finalBody = aiResult.text;

        // Si no hay asunto, generar uno
        if (!email.subject || email.subject.trim() === '') {
          const subjectResult = await this.geminiService.generateEmailContent({
            prompt: `Genera solo un asunto conciso y profesional para este correo: ${aiResult.text.substring(0, 200)}`,
            tone: this.validateTone(email.aiTone),
            length: 'short',
          });
          finalSubject = subjectResult.text.replace(/^(Asunto:|Subject:)/i, '').trim();
        }
      }

      const result = await query(
        `INSERT INTO scheduled_emails (
          user_id, account_id, to_addresses, cc_addresses, bcc_addresses,
          subject, body, html_body, scheduled_at, timezone, status,
          recurrence, recurrence_end_date, ai_generated, ai_prompt, ai_tone,
          use_voice, voice_lang
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING id`,
        [
          email.userId,
          email.accountId,
          email.toAddresses,
          email.ccAddresses || null,
          email.bccAddresses || null,
          finalSubject,
          finalBody,
          email.htmlBody || null,
          email.scheduledAt,
          email.timezone || 'UTC',
          'pending',
          email.recurrence || 'none',
          email.recurrenceEndDate || null,
          email.aiGenerated || false,
          email.aiPrompt || null,
          email.aiTone || null,
          email.useVoice || false,
          email.voiceLang || 'es-ES',
        ]
      );

      return result.rows[0].id;
    } catch (error) {
      console.error('Error creando correo programado:', error);
      throw error;
    }
  }

  async getScheduledEmails(userId: number): Promise<ScheduledEmail[]> {
    try {
      const result = await query(
        `SELECT * FROM scheduled_emails
         WHERE user_id = $1
         ORDER BY scheduled_at ASC`,
        [userId]
      );

      return result.rows.map(this.mapRowToScheduledEmail);
    } catch (error) {
      console.error('Error obteniendo correos programados:', error);
      throw error;
    }
  }

  async getScheduledEmailById(id: number, userId: number): Promise<ScheduledEmail | null> {
    try {
      const result = await query(
        `SELECT * FROM scheduled_emails WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToScheduledEmail(result.rows[0]);
    } catch (error) {
      console.error('Error obteniendo correo programado:', error);
      throw error;
    }
  }

  async updateScheduledEmail(id: number, userId: number, updates: Partial<ScheduledEmail>): Promise<boolean> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.toAddresses !== undefined) {
        fields.push(`to_addresses = $${paramIndex++}`);
        values.push(updates.toAddresses);
      }
      if (updates.ccAddresses !== undefined) {
        fields.push(`cc_addresses = $${paramIndex++}`);
        values.push(updates.ccAddresses);
      }
      if (updates.bccAddresses !== undefined) {
        fields.push(`bcc_addresses = $${paramIndex++}`);
        values.push(updates.bccAddresses);
      }
      if (updates.subject !== undefined) {
        fields.push(`subject = $${paramIndex++}`);
        values.push(updates.subject);
      }
      if (updates.body !== undefined) {
        fields.push(`body = $${paramIndex++}`);
        values.push(updates.body);
      }
      if (updates.scheduledAt !== undefined) {
        fields.push(`scheduled_at = $${paramIndex++}`);
        values.push(updates.scheduledAt);
      }
      if (updates.status !== undefined) {
        fields.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      if (updates.recurrence !== undefined) {
        fields.push(`recurrence = $${paramIndex++}`);
        values.push(updates.recurrence);
      }

      if (fields.length === 0) {
        return false;
      }

      values.push(id, userId);

      const result = await query(
        `UPDATE scheduled_emails
         SET ${fields.join(', ')}
         WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}`,
        values
      );

      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Error actualizando correo programado:', error);
      throw error;
    }
  }

  async deleteScheduledEmail(id: number, userId: number): Promise<boolean> {
    try {
      const result = await query(
        `DELETE FROM scheduled_emails WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Error eliminando correo programado:', error);
      throw error;
    }
  }

  async getPendingEmails(): Promise<ScheduledEmail[]> {
    try {
      const result = await query(
        `SELECT * FROM scheduled_emails
         WHERE status = 'pending'
         AND scheduled_at <= NOW()
         ORDER BY scheduled_at ASC`
      );

      return result.rows.map(this.mapRowToScheduledEmail);
    } catch (error) {
      console.error('Error obteniendo correos pendientes:', error);
      throw error;
    }
  }

  async sendScheduledEmail(scheduledEmail: ScheduledEmail): Promise<void> {
    try {
      // Obtener información de la cuenta
      const accountResult = await query(
        `SELECT * FROM email_accounts WHERE id = $1`,
        [scheduledEmail.accountId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Cuenta de correo no encontrada');
      }

      const account = accountResult.rows[0];

      // Enviar el correo usando el servicio unificado
      await this.unifiedEmailService.sendEmail(
        account,
        scheduledEmail.toAddresses,
        scheduledEmail.subject,
        scheduledEmail.body,
        scheduledEmail.ccAddresses,
        scheduledEmail.bccAddresses
      );

      // Actualizar estado a enviado
      await query(
        `UPDATE scheduled_emails
         SET status = 'sent', sent_at = NOW()
         WHERE id = $1`,
        [scheduledEmail.id]
      );

      // Registrar en historial
      await query(
        `INSERT INTO scheduled_email_history (scheduled_email_id, sent_at, status)
         VALUES ($1, NOW(), 'sent')`,
        [scheduledEmail.id]
      );

      // Si tiene recurrencia, crear el siguiente correo
      if (scheduledEmail.recurrence && scheduledEmail.recurrence !== 'none') {
        await this.createRecurringEmail(scheduledEmail);
      }
    } catch (error) {
      console.error('Error enviando correo programado:', error);

      // Actualizar estado a fallido
      await query(
        `UPDATE scheduled_emails
         SET status = 'failed', error_message = $1
         WHERE id = $2`,
        [error instanceof Error ? error.message : 'Error desconocido', scheduledEmail.id]
      );

      // Registrar en historial
      await query(
        `INSERT INTO scheduled_email_history (scheduled_email_id, sent_at, status, error_message)
         VALUES ($1, NOW(), 'failed', $2)`,
        [scheduledEmail.id, error instanceof Error ? error.message : 'Error desconocido']
      );

      throw error;
    }
  }

  private async createRecurringEmail(originalEmail: ScheduledEmail): Promise<void> {
    const nextScheduledAt = this.calculateNextScheduledDate(
      originalEmail.scheduledAt,
      originalEmail.recurrence!
    );

    // Si hay fecha de fin de recurrencia y ya pasó, no crear más
    if (originalEmail.recurrenceEndDate && nextScheduledAt > originalEmail.recurrenceEndDate) {
      return;
    }

    await this.createScheduledEmail({
      ...originalEmail,
      scheduledAt: nextScheduledAt,
      status: 'pending',
    });
  }

  private calculateNextScheduledDate(currentDate: Date, recurrence: string): Date {
    const next = new Date(currentDate);

    switch (recurrence) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
    }

    return next;
  }

  async generateEmailWithAI(prompt: string, tone?: string, context?: string): Promise<{ subject: string; body: string }> {
    try {
      // Generar el cuerpo del correo
      const bodyResult = await this.geminiService.generateEmailContent({
        prompt,
        context,
        tone: this.validateTone(tone),
        length: 'medium',
      });

      // Generar el asunto
      const subjectResult = await this.geminiService.generateEmailContent({
        prompt: `Genera solo un asunto conciso y profesional (máximo 10 palabras) para este correo: ${bodyResult.text.substring(0, 200)}`,
        tone: this.validateTone(tone),
        length: 'short',
      });

      return {
        subject: subjectResult.text.replace(/^(Asunto:|Subject:)/i, '').trim(),
        body: bodyResult.text,
      };
    } catch (error) {
      console.error('Error generando correo con IA:', error);
      throw error;
    }
  }

  async summarizeEmail(emailBody: string): Promise<string> {
    return await this.geminiService.summarizeEmail(emailBody);
  }

  private mapRowToScheduledEmail(row: any): ScheduledEmail {
    return {
      id: row.id,
      userId: row.user_id,
      accountId: row.account_id,
      toAddresses: row.to_addresses,
      ccAddresses: row.cc_addresses,
      bccAddresses: row.bcc_addresses,
      subject: row.subject,
      body: row.body,
      htmlBody: row.html_body,
      scheduledAt: row.scheduled_at,
      timezone: row.timezone,
      status: row.status,
      recurrence: row.recurrence,
      recurrenceEndDate: row.recurrence_end_date,
      aiGenerated: row.ai_generated,
      aiPrompt: row.ai_prompt,
      aiTone: row.ai_tone,
      useVoice: row.use_voice,
      voiceLang: row.voice_lang,
      errorMessage: row.error_message,
      sentAt: row.sent_at,
    };
  }
}

export default new ScheduledEmailService();
