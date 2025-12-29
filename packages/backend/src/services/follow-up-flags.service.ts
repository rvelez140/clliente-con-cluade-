import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import cron from 'node-cron';

export interface FollowUpFlag {
  id: string;
  email_id: string;
  user_id: string;
  flag_type: 'follow_up' | 'for_your_information' | 'forward' | 'no_response_needed' |
             'read' | 'reply' | 'reply_all' | 'review' | 'custom';
  custom_text?: string;
  start_date?: Date;
  due_date?: Date;
  reminder_date?: Date;
  reminder_time?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'waiting' | 'deferred';
  completed_at?: Date;
  assigned_to_email?: string;
  assigned_to_name?: string;
  priority: 'low' | 'normal' | 'high';
  created_at: Date;
  updated_at: Date;
}

export interface CreateFlagInput {
  emailId: string;
  flagType?: FollowUpFlag['flag_type'];
  customText?: string;
  startDate?: string;
  dueDate?: string;
  reminderDate?: string;
  reminderTime?: string;
  assignedToEmail?: string;
  assignedToName?: string;
  priority?: 'low' | 'normal' | 'high';
}

class FollowUpFlagsService {
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    this.startReminderProcessor();
  }

  private startReminderProcessor(): void {
    // Procesar recordatorios cada minuto
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.processReminders();
    });
    logger.info('Follow-up flags reminder processor started');
  }

  async createFlag(userId: string, input: CreateFlagInput): Promise<FollowUpFlag> {
    const id = uuidv4();

    const result = await pool.query(`
      INSERT INTO follow_up_flags (
        id, email_id, user_id, flag_type, custom_text,
        start_date, due_date, reminder_date, reminder_time,
        assigned_to_email, assigned_to_name, priority
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (email_id) DO UPDATE SET
        flag_type = EXCLUDED.flag_type,
        custom_text = EXCLUDED.custom_text,
        start_date = EXCLUDED.start_date,
        due_date = EXCLUDED.due_date,
        reminder_date = EXCLUDED.reminder_date,
        reminder_time = EXCLUDED.reminder_time,
        assigned_to_email = EXCLUDED.assigned_to_email,
        assigned_to_name = EXCLUDED.assigned_to_name,
        priority = EXCLUDED.priority,
        status = 'not_started',
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      id,
      input.emailId,
      userId,
      input.flagType || 'follow_up',
      input.customText,
      input.startDate,
      input.dueDate,
      input.reminderDate,
      input.reminderTime,
      input.assignedToEmail,
      input.assignedToName,
      input.priority || 'normal'
    ]);

    logger.info(`Follow-up flag created for email ${input.emailId}`);
    return result.rows[0];
  }

  async getFlag(userId: string, emailId: string): Promise<FollowUpFlag | null> {
    const result = await pool.query(
      'SELECT * FROM follow_up_flags WHERE email_id = $1 AND user_id = $2',
      [emailId, userId]
    );
    return result.rows[0] || null;
  }

  async getFlagById(userId: string, flagId: string): Promise<FollowUpFlag | null> {
    const result = await pool.query(
      'SELECT * FROM follow_up_flags WHERE id = $1 AND user_id = $2',
      [flagId, userId]
    );
    return result.rows[0] || null;
  }

  async getUserFlags(
    userId: string,
    options: {
      status?: FollowUpFlag['status'] | FollowUpFlag['status'][];
      priority?: FollowUpFlag['priority'];
      overdueOnly?: boolean;
      dueTodayOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ flags: any[]; total: number }> {
    const { status, priority, overdueOnly, dueTodayOnly, limit = 50, offset = 0 } = options;

    const conditions: string[] = ['f.user_id = $1'];
    const params: any[] = [userId];
    let paramCount = 2;

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(`f.status = ANY($${paramCount++})`);
        params.push(status);
      } else {
        conditions.push(`f.status = $${paramCount++}`);
        params.push(status);
      }
    }

    if (priority) {
      conditions.push(`f.priority = $${paramCount++}`);
      params.push(priority);
    }

    if (overdueOnly) {
      conditions.push(`f.due_date < CURRENT_DATE AND f.status != 'completed'`);
    }

    if (dueTodayOnly) {
      conditions.push(`f.due_date = CURRENT_DATE`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM follow_up_flags f WHERE ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await pool.query(`
      SELECT f.*, e.subject, e.from_address, e.received_at
      FROM follow_up_flags f
      INNER JOIN emails e ON f.email_id = e.id
      WHERE ${whereClause}
      ORDER BY
        CASE f.priority WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
        f.due_date ASC NULLS LAST,
        e.received_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `, params);

    return {
      flags: result.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }

  async updateFlag(
    userId: string,
    flagId: string,
    updates: Partial<CreateFlagInput> & { status?: FollowUpFlag['status'] }
  ): Promise<FollowUpFlag | null> {
    const flag = await this.getFlagById(userId, flagId);
    if (!flag) return null;

    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.flagType !== undefined) {
      setClause.push(`flag_type = $${paramCount++}`);
      values.push(updates.flagType);
    }
    if (updates.customText !== undefined) {
      setClause.push(`custom_text = $${paramCount++}`);
      values.push(updates.customText);
    }
    if (updates.startDate !== undefined) {
      setClause.push(`start_date = $${paramCount++}`);
      values.push(updates.startDate);
    }
    if (updates.dueDate !== undefined) {
      setClause.push(`due_date = $${paramCount++}`);
      values.push(updates.dueDate);
    }
    if (updates.reminderDate !== undefined) {
      setClause.push(`reminder_date = $${paramCount++}`);
      values.push(updates.reminderDate);
    }
    if (updates.reminderTime !== undefined) {
      setClause.push(`reminder_time = $${paramCount++}`);
      values.push(updates.reminderTime);
    }
    if (updates.assignedToEmail !== undefined) {
      setClause.push(`assigned_to_email = $${paramCount++}`);
      values.push(updates.assignedToEmail);
    }
    if (updates.assignedToName !== undefined) {
      setClause.push(`assigned_to_name = $${paramCount++}`);
      values.push(updates.assignedToName);
    }
    if (updates.priority !== undefined) {
      setClause.push(`priority = $${paramCount++}`);
      values.push(updates.priority);
    }
    if (updates.status !== undefined) {
      setClause.push(`status = $${paramCount++}`);
      values.push(updates.status);
      if (updates.status === 'completed') {
        setClause.push(`completed_at = CURRENT_TIMESTAMP`);
      }
    }

    if (setClause.length === 0) return flag;

    values.push(flagId, userId);
    const result = await pool.query(`
      UPDATE follow_up_flags SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount++} AND user_id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0] || null;
  }

  async completeFlag(userId: string, flagId: string): Promise<FollowUpFlag | null> {
    return this.updateFlag(userId, flagId, { status: 'completed' });
  }

  async clearFlag(userId: string, emailId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM follow_up_flags WHERE email_id = $1 AND user_id = $2',
      [emailId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async quickFlag(
    userId: string,
    emailId: string,
    quickType: 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'no_date'
  ): Promise<FollowUpFlag> {
    let dueDate: Date | null = null;
    const today = new Date();

    switch (quickType) {
      case 'today':
        dueDate = today;
        break;
      case 'tomorrow':
        dueDate = new Date(today.setDate(today.getDate() + 1));
        break;
      case 'this_week':
        const daysUntilFriday = 5 - today.getDay();
        dueDate = new Date(today.setDate(today.getDate() + (daysUntilFriday > 0 ? daysUntilFriday : 0)));
        break;
      case 'next_week':
        const daysUntilNextMonday = (8 - today.getDay()) % 7 || 7;
        dueDate = new Date(today.setDate(today.getDate() + daysUntilNextMonday));
        break;
      case 'no_date':
        dueDate = null;
        break;
    }

    return this.createFlag(userId, {
      emailId,
      flagType: 'follow_up',
      dueDate: dueDate?.toISOString().split('T')[0]
    });
  }

  async getOverdueFlags(userId: string): Promise<any[]> {
    const result = await pool.query(`
      SELECT f.*, e.subject, e.from_address
      FROM follow_up_flags f
      INNER JOIN emails e ON f.email_id = e.id
      WHERE f.user_id = $1
        AND f.due_date < CURRENT_DATE
        AND f.status NOT IN ('completed', 'deferred')
      ORDER BY f.due_date ASC
    `, [userId]);

    return result.rows;
  }

  async getDueTodayFlags(userId: string): Promise<any[]> {
    const result = await pool.query(`
      SELECT f.*, e.subject, e.from_address
      FROM follow_up_flags f
      INNER JOIN emails e ON f.email_id = e.id
      WHERE f.user_id = $1
        AND f.due_date = CURRENT_DATE
        AND f.status != 'completed'
      ORDER BY f.priority DESC
    `, [userId]);

    return result.rows;
  }

  private async processReminders(): Promise<void> {
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5);
    const currentDate = now.toISOString().split('T')[0];

    const dueReminders = await pool.query(`
      SELECT f.*, e.subject, u.email as user_email
      FROM follow_up_flags f
      INNER JOIN emails e ON f.email_id = e.id
      INNER JOIN users u ON f.user_id = u.id
      WHERE f.reminder_date = $1
        AND (f.reminder_time IS NULL OR f.reminder_time <= $2)
        AND f.status NOT IN ('completed', 'deferred')
    `, [currentDate, currentTime]);

    for (const flag of dueReminders.rows) {
      try {
        // TODO: Enviar notificación
        logger.info(`Reminder for flag ${flag.id}: "${flag.subject}" due on ${flag.due_date}`);
      } catch (error) {
        logger.error(`Error processing reminder for flag ${flag.id}:`, error);
      }
    }
  }

  async getStats(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_flags,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'not_started' THEN 1 END) as not_started,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN due_date < CURRENT_DATE AND status != 'completed' THEN 1 END) as overdue,
        COUNT(CASE WHEN due_date = CURRENT_DATE THEN 1 END) as due_today,
        COUNT(CASE WHEN priority = 'high' AND status != 'completed' THEN 1 END) as high_priority
      FROM follow_up_flags
      WHERE user_id = $1
    `, [userId]);

    return result.rows[0];
  }

  stopProcessor(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Follow-up flags reminder processor stopped');
    }
  }
}

export const followUpFlagsService = new FollowUpFlagsService();
