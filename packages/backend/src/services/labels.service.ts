import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export interface Label {
  id: string;
  user_id: string;
  name: string;
  color: string;
  text_color: string;
  icon?: string;
  is_system: boolean;
  parent_id?: string;
  visibility: 'show' | 'hide' | 'show_if_unread';
  order_position: number;
  message_count: number;
  unread_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateLabelInput {
  name: string;
  color?: string;
  text_color?: string;
  icon?: string;
  parent_id?: string;
  visibility?: 'show' | 'hide' | 'show_if_unread';
}

export interface UpdateLabelInput {
  name?: string;
  color?: string;
  text_color?: string;
  icon?: string;
  parent_id?: string;
  visibility?: 'show' | 'hide' | 'show_if_unread';
  order_position?: number;
}

class LabelsService {
  // Colores predefinidos estilo Gmail
  private readonly defaultColors = [
    '#4285f4', '#ea4335', '#fbbc04', '#34a853', '#ff6d01',
    '#46bdc6', '#7baaf7', '#f07b72', '#fcd04f', '#78d9ec',
    '#a142f4', '#fa7b17', '#16a765', '#42a5f5', '#f9a825'
  ];

  // Etiquetas del sistema por defecto
  private readonly systemLabels = [
    { name: 'INBOX', color: '#4285f4', icon: 'inbox' },
    { name: 'STARRED', color: '#fbbc04', icon: 'star' },
    { name: 'SNOOZED', color: '#7baaf7', icon: 'schedule' },
    { name: 'IMPORTANT', color: '#fbbc04', icon: 'label_important' },
    { name: 'SENT', color: '#34a853', icon: 'send' },
    { name: 'DRAFTS', color: '#ea4335', icon: 'drafts' },
    { name: 'SPAM', color: '#ea4335', icon: 'report' },
    { name: 'TRASH', color: '#5f6368', icon: 'delete' },
    { name: 'ALL', color: '#5f6368', icon: 'all_inbox' },
    { name: 'CATEGORY_PERSONAL', color: '#4285f4', icon: 'person' },
    { name: 'CATEGORY_SOCIAL', color: '#ea4335', icon: 'people' },
    { name: 'CATEGORY_PROMOTIONS', color: '#34a853', icon: 'local_offer' },
    { name: 'CATEGORY_UPDATES', color: '#fbbc04', icon: 'info' },
    { name: 'CATEGORY_FORUMS', color: '#46bdc6', icon: 'forum' },
  ];

  async initializeSystemLabels(userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const [index, label] of this.systemLabels.entries()) {
        await client.query(`
          INSERT INTO labels (id, user_id, name, color, icon, is_system, order_position)
          VALUES ($1, $2, $3, $4, $5, TRUE, $6)
          ON CONFLICT (user_id, name) DO NOTHING
        `, [uuidv4(), userId, label.name, label.color, label.icon, index]);
      }

      await client.query('COMMIT');
      logger.info(`System labels initialized for user ${userId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getLabels(userId: string, includeSystem: boolean = true): Promise<Label[]> {
    let query = 'SELECT * FROM labels WHERE user_id = $1';
    if (!includeSystem) {
      query += ' AND is_system = FALSE';
    }
    query += ' ORDER BY is_system DESC, order_position ASC, name ASC';

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async getLabel(userId: string, labelId: string): Promise<Label | null> {
    const result = await pool.query(
      'SELECT * FROM labels WHERE id = $1 AND user_id = $2',
      [labelId, userId]
    );
    return result.rows[0] || null;
  }

  async getLabelByName(userId: string, name: string): Promise<Label | null> {
    const result = await pool.query(
      'SELECT * FROM labels WHERE user_id = $1 AND name = $2',
      [userId, name]
    );
    return result.rows[0] || null;
  }

  async createLabel(userId: string, input: CreateLabelInput): Promise<Label> {
    const id = uuidv4();
    const color = input.color || this.defaultColors[Math.floor(Math.random() * this.defaultColors.length)];

    // Obtener la siguiente posición de orden
    const posResult = await pool.query(
      'SELECT COALESCE(MAX(order_position), 0) + 1 as next_pos FROM labels WHERE user_id = $1 AND is_system = FALSE',
      [userId]
    );
    const orderPosition = posResult.rows[0].next_pos;

    const result = await pool.query(`
      INSERT INTO labels (id, user_id, name, color, text_color, icon, parent_id, visibility, order_position)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      id,
      userId,
      input.name,
      color,
      input.text_color || '#ffffff',
      input.icon,
      input.parent_id,
      input.visibility || 'show',
      orderPosition
    ]);

    logger.info(`Label created: ${input.name} for user ${userId}`);
    return result.rows[0];
  }

  async updateLabel(userId: string, labelId: string, input: UpdateLabelInput): Promise<Label | null> {
    const label = await this.getLabel(userId, labelId);
    if (!label) return null;

    if (label.is_system) {
      // Solo permitir cambiar visibilidad en etiquetas del sistema
      if (Object.keys(input).some(k => k !== 'visibility')) {
        throw new Error('Cannot modify system labels');
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(input.name);
    }
    if (input.color !== undefined) {
      updates.push(`color = $${paramCount++}`);
      values.push(input.color);
    }
    if (input.text_color !== undefined) {
      updates.push(`text_color = $${paramCount++}`);
      values.push(input.text_color);
    }
    if (input.icon !== undefined) {
      updates.push(`icon = $${paramCount++}`);
      values.push(input.icon);
    }
    if (input.parent_id !== undefined) {
      updates.push(`parent_id = $${paramCount++}`);
      values.push(input.parent_id);
    }
    if (input.visibility !== undefined) {
      updates.push(`visibility = $${paramCount++}`);
      values.push(input.visibility);
    }
    if (input.order_position !== undefined) {
      updates.push(`order_position = $${paramCount++}`);
      values.push(input.order_position);
    }

    if (updates.length === 0) return label;

    values.push(labelId, userId);
    const result = await pool.query(`
      UPDATE labels SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount++} AND user_id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0];
  }

  async deleteLabel(userId: string, labelId: string): Promise<boolean> {
    const label = await this.getLabel(userId, labelId);
    if (!label) return false;

    if (label.is_system) {
      throw new Error('Cannot delete system labels');
    }

    const result = await pool.query(
      'DELETE FROM labels WHERE id = $1 AND user_id = $2 AND is_system = FALSE',
      [labelId, userId]
    );

    if (result.rowCount && result.rowCount > 0) {
      logger.info(`Label deleted: ${label.name} for user ${userId}`);
      return true;
    }
    return false;
  }

  async applyLabel(emailId: string, labelId: string): Promise<boolean> {
    try {
      await pool.query(`
        INSERT INTO email_labels (email_id, label_id)
        VALUES ($1, $2)
        ON CONFLICT (email_id, label_id) DO NOTHING
      `, [emailId, labelId]);
      return true;
    } catch (error) {
      logger.error('Error applying label:', error);
      return false;
    }
  }

  async removeLabel(emailId: string, labelId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM email_labels WHERE email_id = $1 AND label_id = $2',
      [emailId, labelId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getEmailLabels(emailId: string): Promise<Label[]> {
    const result = await pool.query(`
      SELECT l.* FROM labels l
      INNER JOIN email_labels el ON l.id = el.label_id
      WHERE el.email_id = $1
      ORDER BY l.is_system DESC, l.order_position ASC
    `, [emailId]);
    return result.rows;
  }

  async getEmailsByLabel(userId: string, labelId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const result = await pool.query(`
      SELECT e.* FROM emails e
      INNER JOIN email_labels el ON e.id = el.email_id
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE el.label_id = $1 AND ea.user_id = $2
      ORDER BY e.received_at DESC
      LIMIT $3 OFFSET $4
    `, [labelId, userId, limit, offset]);
    return result.rows;
  }

  async bulkApplyLabel(emailIds: string[], labelId: string): Promise<number> {
    if (emailIds.length === 0) return 0;

    const values = emailIds.map((id, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
    const params = emailIds.flatMap(id => [id, labelId]);

    const result = await pool.query(`
      INSERT INTO email_labels (email_id, label_id)
      VALUES ${values}
      ON CONFLICT (email_id, label_id) DO NOTHING
    `, params);

    return result.rowCount ?? 0;
  }

  async bulkRemoveLabel(emailIds: string[], labelId: string): Promise<number> {
    if (emailIds.length === 0) return 0;

    const placeholders = emailIds.map((_, i) => `$${i + 2}`).join(', ');
    const result = await pool.query(`
      DELETE FROM email_labels
      WHERE label_id = $1 AND email_id IN (${placeholders})
    `, [labelId, ...emailIds]);

    return result.rowCount ?? 0;
  }

  async reorderLabels(userId: string, labelIds: string[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (let i = 0; i < labelIds.length; i++) {
        await client.query(
          'UPDATE labels SET order_position = $1 WHERE id = $2 AND user_id = $3 AND is_system = FALSE',
          [i, labelIds[i], userId]
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

  async getNested(userId: string): Promise<Label[]> {
    const labels = await this.getLabels(userId);
    const rootLabels = labels.filter(l => !l.parent_id);

    const buildTree = (parent: Label): any => ({
      ...parent,
      children: labels
        .filter(l => l.parent_id === parent.id)
        .map(buildTree)
    });

    return rootLabels.map(buildTree);
  }
}

export const labelsService = new LabelsService();
