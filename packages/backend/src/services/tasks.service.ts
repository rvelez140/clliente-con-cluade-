import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import cron from 'node-cron';

export interface TaskList {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_default: boolean;
  order_position: number;
  task_count: number;
  completed_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Task {
  id: string;
  user_id: string;
  list_id: string;
  email_id?: string;
  parent_task_id?: string;
  title: string;
  notes?: string;
  due_date?: Date;
  due_time?: string;
  reminder_at?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completed_at?: Date;
  priority: 'low' | 'normal' | 'high';
  order_position: number;
  recurrence?: any;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export interface CreateTaskInput {
  title: string;
  listId?: string;
  emailId?: string;
  parentTaskId?: string;
  notes?: string;
  dueDate?: string;
  dueTime?: string;
  reminderAt?: string;
  priority?: 'low' | 'normal' | 'high';
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    days?: string[];
    endDate?: string;
  };
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  listId?: string;
  notes?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  reminderAt?: string | null;
  status?: Task['status'];
  priority?: 'low' | 'normal' | 'high';
  orderPosition?: number;
  recurrence?: any;
  tags?: string[];
}

class TasksService {
  private reminderJob: cron.ScheduledTask | null = null;

  constructor() {
    this.startReminderProcessor();
  }

  private startReminderProcessor(): void {
    // Procesar recordatorios cada minuto
    this.reminderJob = cron.schedule('* * * * *', async () => {
      await this.processReminders();
    });
    logger.info('Task reminder processor started');
  }

  // ==================== TASK LISTS ====================

  async getLists(userId: string): Promise<TaskList[]> {
    const result = await pool.query(
      'SELECT * FROM task_lists WHERE user_id = $1 ORDER BY is_default DESC, order_position ASC',
      [userId]
    );
    return result.rows;
  }

  async getList(userId: string, listId: string): Promise<TaskList | null> {
    const result = await pool.query(
      'SELECT * FROM task_lists WHERE id = $1 AND user_id = $2',
      [listId, userId]
    );
    return result.rows[0] || null;
  }

  async createList(
    userId: string,
    name: string,
    color?: string,
    isDefault?: boolean
  ): Promise<TaskList> {
    const id = uuidv4();

    // Si es la lista por defecto, quitar el flag de otras
    if (isDefault) {
      await pool.query(
        'UPDATE task_lists SET is_default = FALSE WHERE user_id = $1',
        [userId]
      );
    }

    const posResult = await pool.query(
      'SELECT COALESCE(MAX(order_position), 0) + 1 as next_pos FROM task_lists WHERE user_id = $1',
      [userId]
    );

    const result = await pool.query(`
      INSERT INTO task_lists (id, user_id, name, color, is_default, order_position)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, userId, name, color || '#4285f4', isDefault || false, posResult.rows[0].next_pos]);

    logger.info(`Task list created: ${name} for user ${userId}`);
    return result.rows[0];
  }

  async updateList(
    userId: string,
    listId: string,
    updates: { name?: string; color?: string; isDefault?: boolean }
  ): Promise<TaskList | null> {
    if (updates.isDefault) {
      await pool.query(
        'UPDATE task_lists SET is_default = FALSE WHERE user_id = $1',
        [userId]
      );
    }

    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.color !== undefined) {
      setClause.push(`color = $${paramCount++}`);
      values.push(updates.color);
    }
    if (updates.isDefault !== undefined) {
      setClause.push(`is_default = $${paramCount++}`);
      values.push(updates.isDefault);
    }

    if (setClause.length === 0) return this.getList(userId, listId);

    values.push(listId, userId);
    const result = await pool.query(`
      UPDATE task_lists SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount++} AND user_id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0] || null;
  }

  async deleteList(userId: string, listId: string): Promise<boolean> {
    // No permitir eliminar la lista por defecto si hay otras
    const list = await this.getList(userId, listId);
    if (list?.is_default) {
      const otherLists = await pool.query(
        'SELECT id FROM task_lists WHERE user_id = $1 AND id != $2',
        [userId, listId]
      );
      if (otherLists.rows.length > 0) {
        throw new Error('Cannot delete default list while other lists exist');
      }
    }

    const result = await pool.query(
      'DELETE FROM task_lists WHERE id = $1 AND user_id = $2',
      [listId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ==================== TASKS ====================

  async getTasks(
    userId: string,
    options: {
      listId?: string;
      status?: Task['status'] | Task['status'][];
      priority?: Task['priority'];
      dueDate?: string;
      overdue?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ tasks: Task[]; total: number }> {
    const { listId, status, priority, dueDate, overdue, limit = 50, offset = 0 } = options;

    const conditions: string[] = ['t.user_id = $1'];
    const params: any[] = [userId];
    let paramCount = 2;

    if (listId) {
      conditions.push(`t.list_id = $${paramCount++}`);
      params.push(listId);
    }

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(`t.status = ANY($${paramCount++})`);
        params.push(status);
      } else {
        conditions.push(`t.status = $${paramCount++}`);
        params.push(status);
      }
    }

    if (priority) {
      conditions.push(`t.priority = $${paramCount++}`);
      params.push(priority);
    }

    if (dueDate) {
      conditions.push(`t.due_date = $${paramCount++}`);
      params.push(dueDate);
    }

    if (overdue) {
      conditions.push(`t.due_date < CURRENT_DATE AND t.status != 'completed'`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tasks t WHERE ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await pool.query(`
      SELECT t.*, tl.name as list_name, tl.color as list_color
      FROM tasks t
      LEFT JOIN task_lists tl ON t.list_id = tl.id
      WHERE ${whereClause}
      ORDER BY
        CASE t.status WHEN 'completed' THEN 1 ELSE 0 END,
        CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,
        t.due_date ASC,
        CASE t.priority WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
        t.order_position ASC
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `, params);

    return {
      tasks: result.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }

  async getTask(userId: string, taskId: string): Promise<Task | null> {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );
    return result.rows[0] || null;
  }

  async getTasksByEmail(userId: string, emailId: string): Promise<Task[]> {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 AND email_id = $2 ORDER BY created_at DESC',
      [userId, emailId]
    );
    return result.rows;
  }

  async getSubtasks(userId: string, parentTaskId: string): Promise<Task[]> {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 AND parent_task_id = $2 ORDER BY order_position ASC',
      [userId, parentTaskId]
    );
    return result.rows;
  }

  async createTask(userId: string, input: CreateTaskInput): Promise<Task> {
    const id = uuidv4();

    // Obtener lista por defecto si no se especifica
    let listId = input.listId;
    if (!listId) {
      const defaultList = await pool.query(
        'SELECT id FROM task_lists WHERE user_id = $1 AND is_default = TRUE',
        [userId]
      );
      if (defaultList.rows[0]) {
        listId = defaultList.rows[0].id;
      } else {
        // Crear lista por defecto
        const newList = await this.createList(userId, 'Mis tareas', '#4285f4', true);
        listId = newList.id;
      }
    }

    const posResult = await pool.query(
      'SELECT COALESCE(MAX(order_position), 0) + 1 as next_pos FROM tasks WHERE list_id = $1',
      [listId]
    );

    const result = await pool.query(`
      INSERT INTO tasks (
        id, user_id, list_id, email_id, parent_task_id, title, notes,
        due_date, due_time, reminder_at, priority, order_position, recurrence, tags
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      id,
      userId,
      listId,
      input.emailId,
      input.parentTaskId,
      input.title,
      input.notes,
      input.dueDate,
      input.dueTime,
      input.reminderAt,
      input.priority || 'normal',
      posResult.rows[0].next_pos,
      input.recurrence ? JSON.stringify(input.recurrence) : null,
      JSON.stringify(input.tags || [])
    ]);

    logger.info(`Task created: ${input.title} for user ${userId}`);
    return result.rows[0];
  }

  async updateTask(userId: string, taskId: string, input: UpdateTaskInput): Promise<Task | null> {
    const task = await this.getTask(userId, taskId);
    if (!task) return null;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(input.title);
    }
    if (input.listId !== undefined) {
      updates.push(`list_id = $${paramCount++}`);
      values.push(input.listId);
    }
    if (input.notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(input.notes);
    }
    if (input.dueDate !== undefined) {
      updates.push(`due_date = $${paramCount++}`);
      values.push(input.dueDate);
    }
    if (input.dueTime !== undefined) {
      updates.push(`due_time = $${paramCount++}`);
      values.push(input.dueTime);
    }
    if (input.reminderAt !== undefined) {
      updates.push(`reminder_at = $${paramCount++}`);
      values.push(input.reminderAt);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(input.status);
      if (input.status === 'completed' && task.status !== 'completed') {
        updates.push(`completed_at = CURRENT_TIMESTAMP`);
      } else if (input.status !== 'completed') {
        updates.push(`completed_at = NULL`);
      }
    }
    if (input.priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(input.priority);
    }
    if (input.orderPosition !== undefined) {
      updates.push(`order_position = $${paramCount++}`);
      values.push(input.orderPosition);
    }
    if (input.recurrence !== undefined) {
      updates.push(`recurrence = $${paramCount++}`);
      values.push(input.recurrence ? JSON.stringify(input.recurrence) : null);
    }
    if (input.tags !== undefined) {
      updates.push(`tags = $${paramCount++}`);
      values.push(JSON.stringify(input.tags));
    }

    if (updates.length === 0) return task;

    values.push(taskId, userId);
    const result = await pool.query(`
      UPDATE tasks SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount++} AND user_id = $${paramCount}
      RETURNING *
    `, values);

    // Si se completó y tiene recurrencia, crear la siguiente tarea
    if (input.status === 'completed' && task.recurrence) {
      await this.createRecurringTask(userId, task);
    }

    return result.rows[0];
  }

  async deleteTask(userId: string, taskId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async completeTask(userId: string, taskId: string): Promise<Task | null> {
    return this.updateTask(userId, taskId, { status: 'completed' });
  }

  async uncompleteTask(userId: string, taskId: string): Promise<Task | null> {
    return this.updateTask(userId, taskId, { status: 'pending' });
  }

  async moveTask(userId: string, taskId: string, targetListId: string, position?: number): Promise<Task | null> {
    const task = await this.getTask(userId, taskId);
    if (!task) return null;

    // Calcular posición si no se especifica
    let orderPosition = position;
    if (orderPosition === undefined) {
      const posResult = await pool.query(
        'SELECT COALESCE(MAX(order_position), 0) + 1 as next_pos FROM tasks WHERE list_id = $1',
        [targetListId]
      );
      orderPosition = posResult.rows[0].next_pos;
    }

    return this.updateTask(userId, taskId, { listId: targetListId, orderPosition });
  }

  private async createRecurringTask(userId: string, completedTask: Task): Promise<void> {
    const recurrence = completedTask.recurrence;
    if (!recurrence) return;

    let nextDueDate = completedTask.due_date ? new Date(completedTask.due_date) : new Date();
    const interval = recurrence.interval || 1;

    switch (recurrence.type) {
      case 'daily':
        nextDueDate.setDate(nextDueDate.getDate() + interval);
        break;
      case 'weekly':
        nextDueDate.setDate(nextDueDate.getDate() + (7 * interval));
        break;
      case 'monthly':
        nextDueDate.setMonth(nextDueDate.getMonth() + interval);
        break;
      case 'yearly':
        nextDueDate.setFullYear(nextDueDate.getFullYear() + interval);
        break;
    }

    // Verificar fecha de fin
    if (recurrence.endDate && nextDueDate > new Date(recurrence.endDate)) {
      return;
    }

    await this.createTask(userId, {
      title: completedTask.title,
      listId: completedTask.list_id,
      notes: completedTask.notes || undefined,
      dueDate: nextDueDate.toISOString().split('T')[0],
      dueTime: completedTask.due_time || undefined,
      priority: completedTask.priority,
      recurrence: completedTask.recurrence,
      tags: completedTask.tags
    });

    logger.info(`Recurring task created from ${completedTask.id}`);
  }

  private async processReminders(): Promise<void> {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    const tasks = await pool.query(`
      SELECT t.*, u.email as user_email
      FROM tasks t
      INNER JOIN users u ON t.user_id = u.id
      WHERE t.reminder_at IS NOT NULL
        AND t.reminder_at <= $1
        AND t.status != 'completed'
        AND NOT EXISTS (
          SELECT 1 FROM task_reminders_sent trs
          WHERE trs.task_id = t.id
        )
    `, [fiveMinutesFromNow]);

    for (const task of tasks.rows) {
      try {
        // TODO: Enviar notificación (WebSocket, email, push)
        logger.info(`Task reminder: ${task.title} for ${task.user_email}`);

        // Registrar que se envió el recordatorio
        await pool.query(`
          INSERT INTO task_reminders_sent (task_id, sent_at)
          VALUES ($1, CURRENT_TIMESTAMP)
          ON CONFLICT DO NOTHING
        `, [task.id]);
      } catch (error) {
        logger.error(`Error sending task reminder for ${task.id}:`, error);
      }
    }
  }

  async createTaskFromEmail(userId: string, emailId: string, title?: string): Promise<Task> {
    // Obtener información del email
    const email = await pool.query('SELECT * FROM emails WHERE id = $1', [emailId]);
    if (!email.rows[0]) {
      throw new Error('Email not found');
    }

    const emailData = email.rows[0];
    const taskTitle = title || `Seguimiento: ${emailData.subject}`;

    return this.createTask(userId, {
      title: taskTitle,
      emailId,
      notes: `De: ${emailData.from_address}\nAsunto: ${emailData.subject}`,
      priority: emailData.is_starred ? 'high' : 'normal'
    });
  }

  async getStatistics(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN due_date < CURRENT_DATE AND status != 'completed' THEN 1 END) as overdue_tasks,
        COUNT(CASE WHEN due_date = CURRENT_DATE THEN 1 END) as due_today,
        COUNT(CASE WHEN priority = 'high' AND status != 'completed' THEN 1 END) as high_priority_pending
      FROM tasks
      WHERE user_id = $1
    `, [userId]);

    return result.rows[0];
  }

  stopProcessor(): void {
    if (this.reminderJob) {
      this.reminderJob.stop();
      logger.info('Task reminder processor stopped');
    }
  }
}

export const tasksService = new TasksService();
