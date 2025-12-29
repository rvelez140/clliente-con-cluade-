import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import cron from 'node-cron';
import nodemailer from 'nodemailer';

export interface PendingEmail {
  id: string;
  user_id: string;
  account_id: string;
  to_addresses: string[];
  cc_addresses?: string[];
  bcc_addresses?: string[];
  subject: string;
  body: string;
  html_body?: string;
  attachments?: any[];
  send_at: Date;
  undo_period_seconds: number;
  can_undo_until: Date;
  status: 'pending' | 'sent' | 'cancelled';
  created_at: Date;
}

export interface SendEmailInput {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  attachments?: any[];
  undoPeriodSeconds?: number;
}

class UndoSendService {
  private cronJob: cron.ScheduledTask | null = null;
  private defaultUndoPeriod = 30; // segundos

  constructor() {
    this.startEmailProcessor();
  }

  private startEmailProcessor(): void {
    // Procesar emails pendientes cada 5 segundos
    this.cronJob = cron.schedule('*/5 * * * * *', async () => {
      await this.processPendingEmails();
    });
    logger.info('Undo send processor started');
  }

  async queueEmail(
    userId: string,
    accountId: string,
    input: SendEmailInput
  ): Promise<PendingEmail> {
    const id = uuidv4();
    const undoPeriod = input.undoPeriodSeconds ?? this.defaultUndoPeriod;
    const now = new Date();
    const sendAt = new Date(now.getTime() + undoPeriod * 1000);
    const canUndoUntil = sendAt;

    const result = await pool.query(`
      INSERT INTO pending_emails (
        id, user_id, account_id, to_addresses, cc_addresses, bcc_addresses,
        subject, body, html_body, attachments, send_at, undo_period_seconds, can_undo_until
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      id,
      userId,
      accountId,
      JSON.stringify(input.to),
      input.cc ? JSON.stringify(input.cc) : null,
      input.bcc ? JSON.stringify(input.bcc) : null,
      input.subject,
      input.body,
      input.htmlBody,
      input.attachments ? JSON.stringify(input.attachments) : null,
      sendAt,
      undoPeriod,
      canUndoUntil
    ]);

    logger.info(`Email queued with undo period of ${undoPeriod}s: ${id}`);
    return result.rows[0];
  }

  async undoSend(userId: string, pendingEmailId: string): Promise<boolean> {
    const now = new Date();

    const result = await pool.query(`
      UPDATE pending_emails
      SET status = 'cancelled', cancelled_at = $1
      WHERE id = $2 AND user_id = $3 AND status = 'pending' AND can_undo_until > $1
      RETURNING *
    `, [now, pendingEmailId, userId]);

    if (result.rowCount && result.rowCount > 0) {
      logger.info(`Email send undone: ${pendingEmailId}`);
      return true;
    }

    return false;
  }

  async getPendingEmails(userId: string): Promise<PendingEmail[]> {
    const result = await pool.query(`
      SELECT * FROM pending_emails
      WHERE user_id = $1 AND status = 'pending'
      ORDER BY send_at ASC
    `, [userId]);
    return result.rows;
  }

  async getPendingEmail(userId: string, pendingEmailId: string): Promise<PendingEmail | null> {
    const result = await pool.query(
      'SELECT * FROM pending_emails WHERE id = $1 AND user_id = $2',
      [pendingEmailId, userId]
    );
    return result.rows[0] || null;
  }

  async getRecentlySent(userId: string, limit: number = 10): Promise<PendingEmail[]> {
    const result = await pool.query(`
      SELECT * FROM pending_emails
      WHERE user_id = $1 AND status = 'sent'
      ORDER BY sent_at DESC
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  }

  async getTimeRemaining(userId: string, pendingEmailId: string): Promise<number> {
    const email = await this.getPendingEmail(userId, pendingEmailId);
    if (!email || email.status !== 'pending') {
      return 0;
    }

    const now = new Date().getTime();
    const canUndoUntil = new Date(email.can_undo_until).getTime();
    const remaining = Math.max(0, Math.floor((canUndoUntil - now) / 1000));

    return remaining;
  }

  async sendImmediately(userId: string, pendingEmailId: string): Promise<boolean> {
    const email = await this.getPendingEmail(userId, pendingEmailId);
    if (!email || email.status !== 'pending') {
      return false;
    }

    await this.sendEmail(email);
    return true;
  }

  private async processPendingEmails(): Promise<void> {
    const now = new Date();

    // Obtener emails listos para enviar
    const pending = await pool.query(`
      SELECT pe.*, ea.email as sender_email, ea.smtp_host, ea.smtp_port, ea.password as smtp_password
      FROM pending_emails pe
      INNER JOIN email_accounts ea ON pe.account_id = ea.id
      WHERE pe.status = 'pending' AND pe.send_at <= $1
    `, [now]);

    for (const email of pending.rows) {
      try {
        await this.sendEmail(email);
      } catch (error) {
        logger.error(`Error sending pending email ${email.id}:`, error);
      }
    }
  }

  private async sendEmail(email: any): Promise<void> {
    try {
      // Configurar transporte SMTP
      const transporter = nodemailer.createTransport({
        host: email.smtp_host,
        port: email.smtp_port,
        secure: email.smtp_port === 465,
        auth: {
          user: email.sender_email,
          pass: email.smtp_password
        }
      });

      // Preparar destinatarios
      const toAddresses = typeof email.to_addresses === 'string'
        ? JSON.parse(email.to_addresses)
        : email.to_addresses;
      const ccAddresses = email.cc_addresses
        ? (typeof email.cc_addresses === 'string' ? JSON.parse(email.cc_addresses) : email.cc_addresses)
        : undefined;
      const bccAddresses = email.bcc_addresses
        ? (typeof email.bcc_addresses === 'string' ? JSON.parse(email.bcc_addresses) : email.bcc_addresses)
        : undefined;

      // Enviar email
      await transporter.sendMail({
        from: email.sender_email,
        to: toAddresses.join(', '),
        cc: ccAddresses?.join(', '),
        bcc: bccAddresses?.join(', '),
        subject: email.subject,
        text: email.body,
        html: email.html_body
      });

      // Actualizar estado
      await pool.query(`
        UPDATE pending_emails
        SET status = 'sent', sent_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [email.id]);

      logger.info(`Pending email sent successfully: ${email.id}`);
    } catch (error) {
      logger.error(`Failed to send email ${email.id}:`, error);
      throw error;
    }
  }

  async updateUndoPeriod(userId: string, pendingEmailId: string, newPeriodSeconds: number): Promise<PendingEmail | null> {
    const email = await this.getPendingEmail(userId, pendingEmailId);
    if (!email || email.status !== 'pending') {
      return null;
    }

    const now = new Date();
    const newSendAt = new Date(email.created_at.getTime() + newPeriodSeconds * 1000);

    // Solo permitir extender, no acortar
    if (newSendAt < now) {
      return null;
    }

    const result = await pool.query(`
      UPDATE pending_emails
      SET send_at = $1, undo_period_seconds = $2, can_undo_until = $1
      WHERE id = $3 AND user_id = $4 AND status = 'pending'
      RETURNING *
    `, [newSendAt, newPeriodSeconds, pendingEmailId, userId]);

    return result.rows[0] || null;
  }

  async getUserSettings(userId: string): Promise<{ defaultUndoPeriod: number }> {
    const result = await pool.query(`
      SELECT COALESCE(
        (SELECT (settings->>'undo_send_period')::int FROM user_settings WHERE user_id = $1),
        30
      ) as default_undo_period
    `, [userId]);

    return {
      defaultUndoPeriod: result.rows[0]?.default_undo_period || 30
    };
  }

  async setDefaultUndoPeriod(userId: string, seconds: number): Promise<void> {
    if (seconds < 5 || seconds > 120) {
      throw new Error('Undo period must be between 5 and 120 seconds');
    }

    await pool.query(`
      INSERT INTO user_settings (user_id, settings)
      VALUES ($1, jsonb_build_object('undo_send_period', $2))
      ON CONFLICT (user_id)
      DO UPDATE SET settings = user_settings.settings || jsonb_build_object('undo_send_period', $2)
    `, [userId, seconds]);
  }

  stopProcessor(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Undo send processor stopped');
    }
  }
}

export const undoSendService = new UndoSendService();
