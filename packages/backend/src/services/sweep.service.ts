import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import cron from 'node-cron';

export interface SweepRule {
  id: string;
  user_id: string;
  sender_address: string;
  sweep_type: 'keep_latest' | 'keep_latest_delete_rest' | 'delete_older_than_10d' | 'always_delete' | 'always_move';
  target_folder?: string;
  emails_processed: number;
  last_sweep_at?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SweepResult {
  sender_address: string;
  emails_affected: number;
  action_taken: string;
}

class SweepService {
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    this.startSweepProcessor();
  }

  private startSweepProcessor(): void {
    // Ejecutar sweep automático cada hora
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.executeScheduledSweeps();
    });
    logger.info('Sweep processor started');
  }

  async getSweepRules(userId: string): Promise<SweepRule[]> {
    const result = await pool.query(
      'SELECT * FROM sweep_rules WHERE user_id = $1 ORDER BY sender_address ASC',
      [userId]
    );
    return result.rows;
  }

  async getSweepRule(userId: string, ruleId: string): Promise<SweepRule | null> {
    const result = await pool.query(
      'SELECT * FROM sweep_rules WHERE id = $1 AND user_id = $2',
      [ruleId, userId]
    );
    return result.rows[0] || null;
  }

  async createSweepRule(
    userId: string,
    senderAddress: string,
    sweepType: SweepRule['sweep_type'],
    targetFolder?: string
  ): Promise<SweepRule> {
    const id = uuidv4();

    const result = await pool.query(`
      INSERT INTO sweep_rules (id, user_id, sender_address, sweep_type, target_folder)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, sender_address) DO UPDATE SET
        sweep_type = EXCLUDED.sweep_type,
        target_folder = EXCLUDED.target_folder,
        is_active = TRUE,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [id, userId, senderAddress.toLowerCase(), sweepType, targetFolder]);

    logger.info(`Sweep rule created for ${senderAddress}: ${sweepType}`);
    return result.rows[0];
  }

  async deleteSweepRule(userId: string, ruleId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM sweep_rules WHERE id = $1 AND user_id = $2',
      [ruleId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async sweepNow(userId: string, senderAddress: string, sweepType: SweepRule['sweep_type'], targetFolder?: string): Promise<SweepResult> {
    let emailsAffected = 0;
    let actionTaken = '';

    // Obtener emails del remitente
    const emails = await pool.query(`
      SELECT e.id, e.received_at FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1 AND LOWER(e.from_address) = LOWER($2) AND e.folder = 'INBOX'
      ORDER BY e.received_at DESC
    `, [userId, senderAddress]);

    if (emails.rows.length === 0) {
      return {
        sender_address: senderAddress,
        emails_affected: 0,
        action_taken: 'no_emails_found'
      };
    }

    switch (sweepType) {
      case 'keep_latest':
        // Mantener solo el más reciente, mover el resto a Archive
        if (emails.rows.length > 1) {
          const idsToArchive = emails.rows.slice(1).map(e => e.id);
          await pool.query(`
            UPDATE emails SET folder = 'Archive'
            WHERE id = ANY($1)
          `, [idsToArchive]);
          emailsAffected = idsToArchive.length;
          actionTaken = 'archived';
        }
        break;

      case 'keep_latest_delete_rest':
        // Mantener solo el más reciente, eliminar el resto
        if (emails.rows.length > 1) {
          const idsToDelete = emails.rows.slice(1).map(e => e.id);
          await pool.query(`
            UPDATE emails SET folder = 'TRASH'
            WHERE id = ANY($1)
          `, [idsToDelete]);
          emailsAffected = idsToDelete.length;
          actionTaken = 'deleted';
        }
        break;

      case 'delete_older_than_10d':
        // Eliminar emails mayores a 10 días
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

        const oldEmails = emails.rows.filter(e => new Date(e.received_at) < tenDaysAgo);
        if (oldEmails.length > 0) {
          const idsToDelete = oldEmails.map(e => e.id);
          await pool.query(`
            UPDATE emails SET folder = 'TRASH'
            WHERE id = ANY($1)
          `, [idsToDelete]);
          emailsAffected = idsToDelete.length;
          actionTaken = 'deleted_old';
        }
        break;

      case 'always_delete':
        // Eliminar todos los emails de este remitente
        const allIds = emails.rows.map(e => e.id);
        await pool.query(`
          UPDATE emails SET folder = 'TRASH'
          WHERE id = ANY($1)
        `, [allIds]);
        emailsAffected = allIds.length;
        actionTaken = 'deleted_all';
        break;

      case 'always_move':
        // Mover todos a la carpeta especificada
        if (targetFolder) {
          const allIds = emails.rows.map(e => e.id);
          await pool.query(`
            UPDATE emails SET folder = $1
            WHERE id = ANY($2)
          `, [targetFolder, allIds]);
          emailsAffected = allIds.length;
          actionTaken = `moved_to_${targetFolder}`;
        }
        break;
    }

    // Registrar en historial
    await this.recordSweepHistory(userId, null, senderAddress, sweepType, emailsAffected, actionTaken);

    return {
      sender_address: senderAddress,
      emails_affected: emailsAffected,
      action_taken: actionTaken
    };
  }

  async executeSweepRule(userId: string, ruleId: string): Promise<SweepResult> {
    const rule = await this.getSweepRule(userId, ruleId);
    if (!rule) {
      throw new Error('Sweep rule not found');
    }

    const result = await this.sweepNow(userId, rule.sender_address, rule.sweep_type, rule.target_folder);

    // Actualizar estadísticas de la regla
    await pool.query(`
      UPDATE sweep_rules
      SET emails_processed = emails_processed + $1, last_sweep_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [result.emails_affected, ruleId]);

    return result;
  }

  private async executeScheduledSweeps(): Promise<void> {
    logger.info('Executing scheduled sweeps...');

    const rules = await pool.query(`
      SELECT sr.*, ea.user_id
      FROM sweep_rules sr
      INNER JOIN email_accounts ea ON TRUE
      WHERE sr.is_active = TRUE
    `);

    for (const rule of rules.rows) {
      try {
        await this.executeSweepRule(rule.user_id, rule.id);
      } catch (error) {
        logger.error(`Error executing sweep rule ${rule.id}:`, error);
      }
    }

    logger.info('Scheduled sweeps completed');
  }

  private async recordSweepHistory(
    userId: string,
    ruleId: string | null,
    senderAddress: string,
    sweepType: string,
    emailsAffected: number,
    actionTaken: string
  ): Promise<void> {
    await pool.query(`
      INSERT INTO sweep_history (user_id, sweep_rule_id, sender_address, sweep_type, emails_affected, action_taken)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, ruleId, senderAddress, sweepType, emailsAffected, actionTaken]);
  }

  async getSweepHistory(userId: string, limit: number = 50): Promise<any[]> {
    const result = await pool.query(`
      SELECT * FROM sweep_history
      WHERE user_id = $1
      ORDER BY executed_at DESC
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  }

  async getSweepSuggestions(userId: string): Promise<any[]> {
    // Sugerir sweep para remitentes frecuentes que no están en reglas
    const result = await pool.query(`
      SELECT e.from_address, COUNT(*) as email_count
      FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1
        AND e.folder = 'INBOX'
        AND e.from_address NOT IN (
          SELECT sender_address FROM sweep_rules WHERE user_id = $1
        )
      GROUP BY e.from_address
      HAVING COUNT(*) >= 5
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `, [userId]);

    return result.rows.map(row => ({
      sender_address: row.from_address,
      email_count: parseInt(row.email_count),
      suggested_action: parseInt(row.email_count) > 20 ? 'keep_latest' : 'delete_older_than_10d'
    }));
  }

  async getStats(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_rules,
        SUM(emails_processed) as total_emails_processed,
        COUNT(CASE WHEN is_active THEN 1 END) as active_rules
      FROM sweep_rules
      WHERE user_id = $1
    `, [userId]);

    const recentHistory = await pool.query(`
      SELECT SUM(emails_affected) as emails_swept_last_week
      FROM sweep_history
      WHERE user_id = $1 AND executed_at >= NOW() - INTERVAL '7 days'
    `, [userId]);

    return {
      ...result.rows[0],
      emails_swept_last_week: recentHistory.rows[0]?.emails_swept_last_week || 0
    };
  }

  stopProcessor(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Sweep processor stopped');
    }
  }
}

export const sweepService = new SweepService();
