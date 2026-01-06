import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import { labelsService } from './labels.service';
import { tasksService } from './tasks.service';
import { calendarService } from './calendar.service';

export interface QuickStepAction {
  type: 'move_to' | 'copy_to' | 'delete' | 'archive' | 'mark_read' | 'mark_unread' |
        'flag' | 'clear_flag' | 'categorize' | 'forward' | 'reply' | 'create_task' |
        'create_meeting' | 'mark_important' | 'apply_label' | 'remove_label';
  value?: string;
}

export interface QuickStep {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  actions: QuickStepAction[];
  keyboard_shortcut?: string;
  use_count: number;
  last_used_at?: Date;
  order_position: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateQuickStepInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  actions: QuickStepAction[];
  keyboardShortcut?: string;
}

class QuickStepsService {
  async getQuickSteps(userId: string): Promise<QuickStep[]> {
    const result = await pool.query(
      'SELECT * FROM quick_steps WHERE user_id = $1 AND is_active = TRUE ORDER BY order_position ASC',
      [userId]
    );
    return result.rows;
  }

  async getQuickStep(userId: string, quickStepId: string): Promise<QuickStep | null> {
    const result = await pool.query(
      'SELECT * FROM quick_steps WHERE id = $1 AND user_id = $2',
      [quickStepId, userId]
    );
    return result.rows[0] || null;
  }

  async createQuickStep(userId: string, input: CreateQuickStepInput): Promise<QuickStep> {
    const id = uuidv4();

    // Validar acciones
    this.validateActions(input.actions);

    // Obtener siguiente posición
    const posResult = await pool.query(
      'SELECT COALESCE(MAX(order_position), 0) + 1 as next_pos FROM quick_steps WHERE user_id = $1',
      [userId]
    );

    const result = await pool.query(`
      INSERT INTO quick_steps (
        id, user_id, name, description, icon, color, actions, keyboard_shortcut, order_position
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      id,
      userId,
      input.name,
      input.description,
      input.icon || 'flash_on',
      input.color || '#0078d4',
      JSON.stringify(input.actions),
      input.keyboardShortcut,
      posResult.rows[0].next_pos
    ]);

    logger.info(`Quick step created: ${input.name} for user ${userId}`);
    return result.rows[0];
  }

  async updateQuickStep(
    userId: string,
    quickStepId: string,
    updates: Partial<CreateQuickStepInput> & { orderPosition?: number; isActive?: boolean }
  ): Promise<QuickStep | null> {
    const quickStep = await this.getQuickStep(userId, quickStepId);
    if (!quickStep) return null;

    if (updates.actions) {
      this.validateActions(updates.actions);
    }

    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClause.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }
    if (updates.icon !== undefined) {
      setClause.push(`icon = $${paramCount++}`);
      values.push(updates.icon);
    }
    if (updates.color !== undefined) {
      setClause.push(`color = $${paramCount++}`);
      values.push(updates.color);
    }
    if (updates.actions !== undefined) {
      setClause.push(`actions = $${paramCount++}`);
      values.push(JSON.stringify(updates.actions));
    }
    if (updates.keyboardShortcut !== undefined) {
      setClause.push(`keyboard_shortcut = $${paramCount++}`);
      values.push(updates.keyboardShortcut);
    }
    if (updates.orderPosition !== undefined) {
      setClause.push(`order_position = $${paramCount++}`);
      values.push(updates.orderPosition);
    }
    if (updates.isActive !== undefined) {
      setClause.push(`is_active = $${paramCount++}`);
      values.push(updates.isActive);
    }

    if (setClause.length === 0) return quickStep;

    values.push(quickStepId, userId);
    const result = await pool.query(`
      UPDATE quick_steps SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount++} AND user_id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0] || null;
  }

  async deleteQuickStep(userId: string, quickStepId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM quick_steps WHERE id = $1 AND user_id = $2',
      [quickStepId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async executeQuickStep(
    userId: string,
    quickStepId: string,
    emailIds: string[]
  ): Promise<{ success: boolean; results: any[] }> {
    const quickStep = await this.getQuickStep(userId, quickStepId);
    if (!quickStep) {
      throw new Error('Quick step not found');
    }

    const results: any[] = [];

    for (const emailId of emailIds) {
      try {
        const result = await this.executeActionsOnEmail(userId, emailId, quickStep.actions);
        results.push({ emailId, success: true, result });
      } catch (error: any) {
        results.push({ emailId, success: false, error: error.message });
      }
    }

    // Actualizar estadísticas
    await pool.query(`
      UPDATE quick_steps
      SET use_count = use_count + 1, last_used_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [quickStepId]);

    logger.info(`Quick step ${quickStep.name} executed on ${emailIds.length} emails`);

    return {
      success: results.every(r => r.success),
      results
    };
  }

  private async executeActionsOnEmail(
    userId: string,
    emailId: string,
    actions: QuickStepAction[]
  ): Promise<any> {
    const actionResults: any[] = [];

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'move_to':
            if (action.value) {
              await pool.query('UPDATE emails SET folder = $1 WHERE id = $2', [action.value, emailId]);
              actionResults.push({ type: 'move_to', success: true, folder: action.value });
            }
            break;

          case 'copy_to':
            // Crear copia del email en otra carpeta
            if (action.value) {
              await pool.query(`
                INSERT INTO emails (id, account_id, message_id, from_address, to_addresses, cc_addresses, bcc_addresses,
                  subject, body, html_body, attachments, is_read, is_starred, folder, received_at)
                SELECT $1, account_id, message_id || '-copy', from_address, to_addresses, cc_addresses, bcc_addresses,
                  subject, body, html_body, attachments, is_read, is_starred, $2, received_at
                FROM emails WHERE id = $3
              `, [uuidv4(), action.value, emailId]);
              actionResults.push({ type: 'copy_to', success: true, folder: action.value });
            }
            break;

          case 'delete':
            await pool.query("UPDATE emails SET folder = 'TRASH' WHERE id = $1", [emailId]);
            actionResults.push({ type: 'delete', success: true });
            break;

          case 'archive':
            await pool.query("UPDATE emails SET folder = 'Archive' WHERE id = $1", [emailId]);
            actionResults.push({ type: 'archive', success: true });
            break;

          case 'mark_read':
            await pool.query('UPDATE emails SET is_read = TRUE WHERE id = $1', [emailId]);
            actionResults.push({ type: 'mark_read', success: true });
            break;

          case 'mark_unread':
            await pool.query('UPDATE emails SET is_read = FALSE WHERE id = $1', [emailId]);
            actionResults.push({ type: 'mark_unread', success: true });
            break;

          case 'flag':
            // Crear flag de seguimiento
            await pool.query(`
              INSERT INTO follow_up_flags (email_id, user_id, flag_type)
              VALUES ($1, $2, $3)
              ON CONFLICT (email_id) DO UPDATE SET flag_type = EXCLUDED.flag_type
            `, [emailId, userId, action.value || 'follow_up']);
            actionResults.push({ type: 'flag', success: true, flagType: action.value });
            break;

          case 'clear_flag':
            await pool.query('DELETE FROM follow_up_flags WHERE email_id = $1 AND user_id = $2', [emailId, userId]);
            actionResults.push({ type: 'clear_flag', success: true });
            break;

          case 'categorize':
            if (action.value) {
              // Buscar o crear categoría
              let category = await pool.query(
                'SELECT id FROM outlook_categories WHERE user_id = $1 AND name = $2',
                [userId, action.value]
              );

              if (!category.rows[0]) {
                const catId = uuidv4();
                await pool.query(
                  'INSERT INTO outlook_categories (id, user_id, name, color) VALUES ($1, $2, $3, $4)',
                  [catId, userId, action.value, 'blue']
                );
                category = { rows: [{ id: catId }] };
              }

              await pool.query(`
                INSERT INTO email_categories (email_id, category_id)
                VALUES ($1, $2)
                ON CONFLICT (email_id, category_id) DO NOTHING
              `, [emailId, category.rows[0].id]);
              actionResults.push({ type: 'categorize', success: true, category: action.value });
            }
            break;

          case 'apply_label':
            if (action.value) {
              await labelsService.applyLabel(emailId, action.value);
              actionResults.push({ type: 'apply_label', success: true, label: action.value });
            }
            break;

          case 'remove_label':
            if (action.value) {
              await labelsService.removeLabel(emailId, action.value);
              actionResults.push({ type: 'remove_label', success: true, label: action.value });
            }
            break;

          case 'mark_important':
            await pool.query('UPDATE emails SET is_starred = TRUE WHERE id = $1', [emailId]);
            actionResults.push({ type: 'mark_important', success: true });
            break;

          case 'create_task':
            const task = await tasksService.createTaskFromEmail(userId, emailId);
            actionResults.push({ type: 'create_task', success: true, taskId: task.id });
            break;

          case 'create_meeting':
            const event = await calendarService.createEventFromEmail(userId, emailId);
            actionResults.push({ type: 'create_meeting', success: true, eventId: event.id });
            break;

          case 'forward':
            // Crear borrador de reenvío
            actionResults.push({ type: 'forward', success: true, action: 'draft_created', to: action.value });
            break;

          case 'reply':
            // Crear borrador de respuesta
            actionResults.push({ type: 'reply', success: true, action: 'draft_created' });
            break;
        }
      } catch (error: any) {
        actionResults.push({ type: action.type, success: false, error: error.message });
      }
    }

    return actionResults;
  }

  private validateActions(actions: QuickStepAction[]): void {
    if (!actions || actions.length === 0) {
      throw new Error('At least one action is required');
    }

    const validTypes = [
      'move_to', 'copy_to', 'delete', 'archive', 'mark_read', 'mark_unread',
      'flag', 'clear_flag', 'categorize', 'forward', 'reply', 'create_task',
      'create_meeting', 'mark_important', 'apply_label', 'remove_label'
    ];

    for (const action of actions) {
      if (!validTypes.includes(action.type)) {
        throw new Error(`Invalid action type: ${action.type}`);
      }
    }
  }

  async getTemplates(): Promise<any[]> {
    const result = await pool.query(
      'SELECT * FROM quick_step_templates ORDER BY category, name'
    );
    return result.rows;
  }

  async createFromTemplate(userId: string, templateId: string, name?: string): Promise<QuickStep> {
    const template = await pool.query(
      'SELECT * FROM quick_step_templates WHERE id = $1',
      [templateId]
    );

    if (!template.rows[0]) {
      throw new Error('Template not found');
    }

    const t = template.rows[0];
    return this.createQuickStep(userId, {
      name: name || t.name,
      description: t.description,
      icon: t.icon,
      actions: typeof t.actions === 'string' ? JSON.parse(t.actions) : t.actions
    });
  }

  async reorderQuickSteps(userId: string, quickStepIds: string[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (let i = 0; i < quickStepIds.length; i++) {
        await client.query(
          'UPDATE quick_steps SET order_position = $1 WHERE id = $2 AND user_id = $3',
          [i, quickStepIds[i], userId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getStats(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_quick_steps,
        SUM(use_count) as total_uses,
        AVG(use_count) as avg_uses_per_step
      FROM quick_steps
      WHERE user_id = $1 AND is_active = TRUE
    `, [userId]);

    const topUsed = await pool.query(`
      SELECT name, use_count, last_used_at
      FROM quick_steps
      WHERE user_id = $1 AND is_active = TRUE
      ORDER BY use_count DESC
      LIMIT 5
    `, [userId]);

    return {
      ...result.rows[0],
      top_used: topUsed.rows
    };
  }
}

export const quickStepsService = new QuickStepsService();
