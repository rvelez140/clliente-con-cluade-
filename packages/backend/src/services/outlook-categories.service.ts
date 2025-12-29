import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export interface OutlookCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  shortcut_key?: string;
  is_default: boolean;
  usage_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface EmailCategory {
  id: string;
  email_id: string;
  category_id: string;
  assigned_at: Date;
}

// Colores predefinidos de Outlook
export const OUTLOOK_COLORS = {
  red: '#E74C3C',
  orange: '#E67E22',
  yellow: '#F1C40F',
  green: '#2ECC71',
  blue: '#3498DB',
  purple: '#9B59B6',
  pink: '#E91E63',
  teal: '#1ABC9C',
  olive: '#808000',
  steel: '#607D8B',
  dark_steel: '#455A64',
  gray: '#95A5A6',
  dark_gray: '#7F8C8D',
  black: '#2C3E50',
  dark_red: '#C0392B',
  dark_orange: '#D35400',
  dark_yellow: '#F39C12',
  dark_green: '#27AE60',
  dark_blue: '#2980B9',
  dark_purple: '#8E44AD',
  dark_teal: '#16A085',
  peach: '#FFDAB9',
  maroon: '#800000',
  white: '#FFFFFF'
};

// Categorías predeterminadas de Outlook
const DEFAULT_CATEGORIES = [
  { name: 'Red Category', color: OUTLOOK_COLORS.red, shortcut_key: 'CTRL+F1' },
  { name: 'Orange Category', color: OUTLOOK_COLORS.orange, shortcut_key: 'CTRL+F2' },
  { name: 'Yellow Category', color: OUTLOOK_COLORS.yellow, shortcut_key: 'CTRL+F3' },
  { name: 'Green Category', color: OUTLOOK_COLORS.green, shortcut_key: 'CTRL+F4' },
  { name: 'Blue Category', color: OUTLOOK_COLORS.blue, shortcut_key: 'CTRL+F5' },
  { name: 'Purple Category', color: OUTLOOK_COLORS.purple, shortcut_key: 'CTRL+F6' }
];

class OutlookCategoriesService {
  async initializeDefaultCategories(userId: string): Promise<OutlookCategory[]> {
    const categories: OutlookCategory[] = [];

    for (const cat of DEFAULT_CATEGORIES) {
      const existing = await pool.query(
        'SELECT * FROM outlook_categories WHERE user_id = $1 AND name = $2',
        [userId, cat.name]
      );

      if (!existing.rows[0]) {
        const id = uuidv4();
        const result = await pool.query(`
          INSERT INTO outlook_categories (id, user_id, name, color, shortcut_key, is_default)
          VALUES ($1, $2, $3, $4, $5, TRUE)
          RETURNING *
        `, [id, userId, cat.name, cat.color, cat.shortcut_key]);
        categories.push(result.rows[0]);
      } else {
        categories.push(existing.rows[0]);
      }
    }

    logger.info(`Initialized default categories for user ${userId}`);
    return categories;
  }

  async createCategory(
    userId: string,
    name: string,
    color: string,
    shortcutKey?: string
  ): Promise<OutlookCategory> {
    // Verificar si ya existe
    const existing = await pool.query(
      'SELECT * FROM outlook_categories WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
      [userId, name]
    );

    if (existing.rows[0]) {
      throw new Error('Category with this name already exists');
    }

    // Validar color
    if (!Object.values(OUTLOOK_COLORS).includes(color) && !color.match(/^#[0-9A-Fa-f]{6}$/)) {
      throw new Error('Invalid color format');
    }

    // Verificar shortcut key único
    if (shortcutKey) {
      const existingShortcut = await pool.query(
        'SELECT * FROM outlook_categories WHERE user_id = $1 AND shortcut_key = $2',
        [userId, shortcutKey]
      );
      if (existingShortcut.rows[0]) {
        throw new Error('Shortcut key already in use');
      }
    }

    const id = uuidv4();
    const result = await pool.query(`
      INSERT INTO outlook_categories (id, user_id, name, color, shortcut_key)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, userId, name, color, shortcutKey]);

    logger.info(`Category created: ${name} for user ${userId}`);
    return result.rows[0];
  }

  async getCategories(userId: string): Promise<OutlookCategory[]> {
    const result = await pool.query(`
      SELECT * FROM outlook_categories
      WHERE user_id = $1
      ORDER BY is_default DESC, usage_count DESC, name ASC
    `, [userId]);

    return result.rows;
  }

  async getCategory(userId: string, categoryId: string): Promise<OutlookCategory | null> {
    const result = await pool.query(
      'SELECT * FROM outlook_categories WHERE id = $1 AND user_id = $2',
      [categoryId, userId]
    );
    return result.rows[0] || null;
  }

  async getCategoryByName(userId: string, name: string): Promise<OutlookCategory | null> {
    const result = await pool.query(
      'SELECT * FROM outlook_categories WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
      [userId, name]
    );
    return result.rows[0] || null;
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    updates: { name?: string; color?: string; shortcutKey?: string }
  ): Promise<OutlookCategory | null> {
    const category = await this.getCategory(userId, categoryId);
    if (!category) return null;

    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      // Verificar nombre único
      const existing = await pool.query(
        'SELECT * FROM outlook_categories WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
        [userId, updates.name, categoryId]
      );
      if (existing.rows[0]) {
        throw new Error('Category with this name already exists');
      }
      setClause.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }

    if (updates.color !== undefined) {
      setClause.push(`color = $${paramCount++}`);
      values.push(updates.color);
    }

    if (updates.shortcutKey !== undefined) {
      if (updates.shortcutKey) {
        const existingShortcut = await pool.query(
          'SELECT * FROM outlook_categories WHERE user_id = $1 AND shortcut_key = $2 AND id != $3',
          [userId, updates.shortcutKey, categoryId]
        );
        if (existingShortcut.rows[0]) {
          throw new Error('Shortcut key already in use');
        }
      }
      setClause.push(`shortcut_key = $${paramCount++}`);
      values.push(updates.shortcutKey || null);
    }

    if (setClause.length === 0) return category;

    values.push(categoryId, userId);
    const result = await pool.query(`
      UPDATE outlook_categories
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount++} AND user_id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0] || null;
  }

  async deleteCategory(userId: string, categoryId: string): Promise<boolean> {
    const category = await this.getCategory(userId, categoryId);
    if (!category) return false;

    // Eliminar asignaciones primero
    await pool.query(
      'DELETE FROM email_categories WHERE category_id = $1',
      [categoryId]
    );

    const result = await pool.query(
      'DELETE FROM outlook_categories WHERE id = $1 AND user_id = $2',
      [categoryId, userId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async assignCategoryToEmail(
    userId: string,
    emailId: string,
    categoryId: string
  ): Promise<EmailCategory> {
    // Verificar que la categoría pertenece al usuario
    const category = await this.getCategory(userId, categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    // Verificar si ya está asignada
    const existing = await pool.query(
      'SELECT * FROM email_categories WHERE email_id = $1 AND category_id = $2',
      [emailId, categoryId]
    );

    if (existing.rows[0]) {
      return existing.rows[0];
    }

    const id = uuidv4();
    const result = await pool.query(`
      INSERT INTO email_categories (id, email_id, category_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, emailId, categoryId]);

    // Incrementar contador de uso
    await pool.query(
      'UPDATE outlook_categories SET usage_count = usage_count + 1 WHERE id = $1',
      [categoryId]
    );

    logger.info(`Category ${category.name} assigned to email ${emailId}`);
    return result.rows[0];
  }

  async removeCategoryFromEmail(
    userId: string,
    emailId: string,
    categoryId: string
  ): Promise<boolean> {
    // Verificar que la categoría pertenece al usuario
    const category = await this.getCategory(userId, categoryId);
    if (!category) return false;

    const result = await pool.query(
      'DELETE FROM email_categories WHERE email_id = $1 AND category_id = $2',
      [emailId, categoryId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async getEmailCategories(emailId: string): Promise<OutlookCategory[]> {
    const result = await pool.query(`
      SELECT oc.*
      FROM outlook_categories oc
      INNER JOIN email_categories ec ON oc.id = ec.category_id
      WHERE ec.email_id = $1
      ORDER BY oc.name ASC
    `, [emailId]);

    return result.rows;
  }

  async getEmailsByCategory(
    userId: string,
    categoryId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ emails: any[]; total: number }> {
    const { limit = 50, offset = 0 } = options;

    const category = await this.getCategory(userId, categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    const countResult = await pool.query(`
      SELECT COUNT(*)
      FROM email_categories ec
      INNER JOIN emails e ON ec.email_id = e.id
      WHERE ec.category_id = $1 AND e.user_id = $2
    `, [categoryId, userId]);

    const result = await pool.query(`
      SELECT e.*, ec.assigned_at as category_assigned_at
      FROM emails e
      INNER JOIN email_categories ec ON e.id = ec.email_id
      WHERE ec.category_id = $1 AND e.user_id = $2
      ORDER BY e.received_at DESC
      LIMIT $3 OFFSET $4
    `, [categoryId, userId, limit, offset]);

    return {
      emails: result.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }

  async bulkAssignCategory(
    userId: string,
    emailIds: string[],
    categoryId: string
  ): Promise<number> {
    const category = await this.getCategory(userId, categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    let assignedCount = 0;
    for (const emailId of emailIds) {
      try {
        await this.assignCategoryToEmail(userId, emailId, categoryId);
        assignedCount++;
      } catch (error) {
        // Ignorar errores individuales
      }
    }

    return assignedCount;
  }

  async bulkRemoveCategory(
    userId: string,
    emailIds: string[],
    categoryId: string
  ): Promise<number> {
    const result = await pool.query(`
      DELETE FROM email_categories
      WHERE category_id = $1 AND email_id = ANY($2)
    `, [categoryId, emailIds]);

    return result.rowCount ?? 0;
  }

  async clearAllCategories(userId: string, emailId: string): Promise<number> {
    const result = await pool.query(`
      DELETE FROM email_categories ec
      USING outlook_categories oc
      WHERE ec.category_id = oc.id
        AND ec.email_id = $1
        AND oc.user_id = $2
    `, [emailId, userId]);

    return result.rowCount ?? 0;
  }

  async getCategoryStats(userId: string): Promise<any[]> {
    const result = await pool.query(`
      SELECT
        oc.id,
        oc.name,
        oc.color,
        oc.usage_count,
        COUNT(ec.id) as email_count
      FROM outlook_categories oc
      LEFT JOIN email_categories ec ON oc.id = ec.category_id
      WHERE oc.user_id = $1
      GROUP BY oc.id, oc.name, oc.color, oc.usage_count
      ORDER BY email_count DESC
    `, [userId]);

    return result.rows;
  }

  async getMostUsedCategories(userId: string, limit: number = 5): Promise<OutlookCategory[]> {
    const result = await pool.query(`
      SELECT * FROM outlook_categories
      WHERE user_id = $1
      ORDER BY usage_count DESC
      LIMIT $2
    `, [userId, limit]);

    return result.rows;
  }

  getAvailableColors(): typeof OUTLOOK_COLORS {
    return OUTLOOK_COLORS;
  }
}

export const outlookCategoriesService = new OutlookCategoriesService();
