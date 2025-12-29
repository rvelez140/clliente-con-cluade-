import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import cron from 'node-cron';
import { DateTime } from 'luxon';

export interface SnoozedEmail {
  id: string;
  email_id: string;
  user_id: string;
  snoozed_until: Date;
  original_folder: string;
  snooze_type: 'later_today' | 'tomorrow' | 'this_weekend' | 'next_week' | 'custom';
  reminder_sent: boolean;
  created_at: Date;
}

export interface SnoozeOptions {
  type: 'later_today' | 'tomorrow' | 'this_weekend' | 'next_week' | 'custom';
  customDateTime?: string;
  timezone?: string;
}

class SnoozeService {
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    this.startSnoozeProcessor();
  }

  private startSnoozeProcessor(): void {
    // Procesar emails pospuestos cada minuto
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.processSnoozedEmails();
    });
    logger.info('Snooze processor started');
  }

  async snoozeEmail(
    userId: string,
    emailId: string,
    options: SnoozeOptions
  ): Promise<SnoozedEmail> {
    const timezone = options.timezone || 'UTC';
    const now = DateTime.now().setZone(timezone);
    let snoozedUntil: DateTime;

    switch (options.type) {
      case 'later_today':
        // 4 horas después o las 18:00, lo que sea más tarde
        const laterToday = now.plus({ hours: 4 });
        const sixPM = now.set({ hour: 18, minute: 0, second: 0 });
        snoozedUntil = laterToday > sixPM ? laterToday : sixPM;
        break;

      case 'tomorrow':
        // Mañana a las 8:00
        snoozedUntil = now.plus({ days: 1 }).set({ hour: 8, minute: 0, second: 0 });
        break;

      case 'this_weekend':
        // Sábado a las 9:00
        const daysUntilSaturday = (6 - now.weekday + 7) % 7 || 7;
        snoozedUntil = now.plus({ days: daysUntilSaturday }).set({ hour: 9, minute: 0, second: 0 });
        break;

      case 'next_week':
        // Lunes a las 8:00
        const daysUntilMonday = (1 - now.weekday + 7) % 7 || 7;
        snoozedUntil = now.plus({ days: daysUntilMonday }).set({ hour: 8, minute: 0, second: 0 });
        break;

      case 'custom':
        if (!options.customDateTime) {
          throw new Error('Custom date/time is required for custom snooze type');
        }
        snoozedUntil = DateTime.fromISO(options.customDateTime, { zone: timezone });
        if (!snoozedUntil.isValid) {
          throw new Error('Invalid custom date/time');
        }
        break;

      default:
        throw new Error(`Invalid snooze type: ${options.type}`);
    }

    // Obtener carpeta original del email
    const emailResult = await pool.query('SELECT folder FROM emails WHERE id = $1', [emailId]);
    if (!emailResult.rows[0]) {
      throw new Error('Email not found');
    }
    const originalFolder = emailResult.rows[0].folder;

    // Verificar si ya está pospuesto
    const existing = await pool.query('SELECT id FROM snoozed_emails WHERE email_id = $1', [emailId]);

    let snoozeId: string;
    if (existing.rows[0]) {
      // Actualizar snooze existente
      snoozeId = existing.rows[0].id;
      await pool.query(`
        UPDATE snoozed_emails
        SET snoozed_until = $1, snooze_type = $2, reminder_sent = FALSE
        WHERE id = $3
      `, [snoozedUntil.toJSDate(), options.type, snoozeId]);
    } else {
      // Crear nuevo snooze
      snoozeId = uuidv4();
      await pool.query(`
        INSERT INTO snoozed_emails (id, email_id, user_id, snoozed_until, original_folder, snooze_type)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [snoozeId, emailId, userId, snoozedUntil.toJSDate(), originalFolder, options.type]);
    }

    // Mover email a carpeta SNOOZED
    await pool.query("UPDATE emails SET folder = 'SNOOZED' WHERE id = $1", [emailId]);

    logger.info(`Email ${emailId} snoozed until ${snoozedUntil.toISO()} for user ${userId}`);

    const result = await pool.query('SELECT * FROM snoozed_emails WHERE id = $1', [snoozeId]);
    return result.rows[0];
  }

  async unsnoozeEmail(userId: string, emailId: string): Promise<boolean> {
    const snoozed = await pool.query(
      'SELECT * FROM snoozed_emails WHERE email_id = $1 AND user_id = $2',
      [emailId, userId]
    );

    if (!snoozed.rows[0]) {
      return false;
    }

    const originalFolder = snoozed.rows[0].original_folder || 'INBOX';

    // Restaurar email a carpeta original
    await pool.query('UPDATE emails SET folder = $1 WHERE id = $2', [originalFolder, emailId]);

    // Eliminar registro de snooze
    await pool.query('DELETE FROM snoozed_emails WHERE email_id = $1', [emailId]);

    logger.info(`Email ${emailId} unsnoozed for user ${userId}`);
    return true;
  }

  async getSnoozedEmails(userId: string): Promise<any[]> {
    const result = await pool.query(`
      SELECT se.*, e.subject, e.from_address, e.received_at
      FROM snoozed_emails se
      INNER JOIN emails e ON se.email_id = e.id
      WHERE se.user_id = $1
      ORDER BY se.snoozed_until ASC
    `, [userId]);
    return result.rows;
  }

  async getUpcomingSnoozes(userId: string, hours: number = 24): Promise<any[]> {
    const result = await pool.query(`
      SELECT se.*, e.subject, e.from_address
      FROM snoozed_emails se
      INNER JOIN emails e ON se.email_id = e.id
      WHERE se.user_id = $1
        AND se.snoozed_until <= NOW() + INTERVAL '${hours} hours'
        AND se.snoozed_until > NOW()
      ORDER BY se.snoozed_until ASC
    `, [userId]);
    return result.rows;
  }

  private async processSnoozedEmails(): Promise<void> {
    const now = new Date();

    // Obtener emails cuyo snooze ha expirado
    const expired = await pool.query(`
      SELECT se.*, e.id as email_id
      FROM snoozed_emails se
      INNER JOIN emails e ON se.email_id = e.id
      WHERE se.snoozed_until <= $1 AND se.reminder_sent = FALSE
    `, [now]);

    for (const snoozed of expired.rows) {
      try {
        // Mover email de vuelta a INBOX
        await pool.query("UPDATE emails SET folder = 'INBOX', is_read = FALSE WHERE id = $1", [snoozed.email_id]);

        // Marcar como procesado
        await pool.query('UPDATE snoozed_emails SET reminder_sent = TRUE WHERE id = $1', [snoozed.id]);

        // TODO: Enviar notificación al usuario
        logger.info(`Snoozed email ${snoozed.email_id} returned to inbox`);
      } catch (error) {
        logger.error(`Error processing snoozed email ${snoozed.id}:`, error);
      }
    }

    // Limpiar registros antiguos (más de 7 días después de expirar)
    await pool.query(`
      DELETE FROM snoozed_emails
      WHERE reminder_sent = TRUE AND snoozed_until < NOW() - INTERVAL '7 days'
    `);
  }

  async rescheduleSnooze(userId: string, emailId: string, newDateTime: string, timezone: string = 'UTC'): Promise<SnoozedEmail> {
    return this.snoozeEmail(userId, emailId, {
      type: 'custom',
      customDateTime: newDateTime,
      timezone
    });
  }

  async getSnoozeStats(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_snoozed,
        COUNT(CASE WHEN snoozed_until > NOW() THEN 1 END) as currently_snoozed,
        COUNT(CASE WHEN snooze_type = 'later_today' THEN 1 END) as later_today_count,
        COUNT(CASE WHEN snooze_type = 'tomorrow' THEN 1 END) as tomorrow_count,
        COUNT(CASE WHEN snooze_type = 'this_weekend' THEN 1 END) as weekend_count,
        COUNT(CASE WHEN snooze_type = 'next_week' THEN 1 END) as next_week_count,
        COUNT(CASE WHEN snooze_type = 'custom' THEN 1 END) as custom_count
      FROM snoozed_emails
      WHERE user_id = $1
    `, [userId]);

    return result.rows[0];
  }

  stopProcessor(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Snooze processor stopped');
    }
  }
}

export const snoozeService = new SnoozeService();
