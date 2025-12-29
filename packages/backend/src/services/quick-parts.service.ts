import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export interface QuickPart {
  id: string;
  user_id: string;
  name: string;
  content: string;
  content_type: 'text' | 'html' | 'signature' | 'auto_text';
  category?: string;
  description?: string;
  shortcut?: string;
  gallery_category?: 'general' | 'mail' | 'text_box' | 'custom';
  formatting?: object;
  usage_count: number;
  is_favorite: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AutoText {
  id: string;
  user_id: string;
  name: string;
  trigger_text: string;
  replacement_content: string;
  content_type: 'text' | 'html';
  is_active: boolean;
  usage_count: number;
  created_at: Date;
}

class QuickPartsService {
  // Quick Parts (Building Blocks)
  async createQuickPart(
    userId: string,
    input: {
      name: string;
      content: string;
      contentType?: QuickPart['content_type'];
      category?: string;
      description?: string;
      shortcut?: string;
      galleryCategory?: QuickPart['gallery_category'];
      formatting?: object;
    }
  ): Promise<QuickPart> {
    // Verificar nombre único
    const existing = await pool.query(
      'SELECT * FROM quick_parts WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
      [userId, input.name]
    );

    if (existing.rows[0]) {
      throw new Error('Quick Part with this name already exists');
    }

    // Verificar shortcut único si se proporciona
    if (input.shortcut) {
      const existingShortcut = await pool.query(
        'SELECT * FROM quick_parts WHERE user_id = $1 AND shortcut = $2',
        [userId, input.shortcut]
      );
      if (existingShortcut.rows[0]) {
        throw new Error('Shortcut already in use');
      }
    }

    const id = uuidv4();
    const result = await pool.query(`
      INSERT INTO quick_parts (
        id, user_id, name, content, content_type, category,
        description, shortcut, gallery_category, formatting
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      id,
      userId,
      input.name,
      input.content,
      input.contentType || 'text',
      input.category,
      input.description,
      input.shortcut,
      input.galleryCategory || 'general',
      input.formatting ? JSON.stringify(input.formatting) : null
    ]);

    logger.info(`Quick Part created: ${input.name} for user ${userId}`);
    return result.rows[0];
  }

  async getQuickParts(
    userId: string,
    options: {
      category?: string;
      contentType?: QuickPart['content_type'];
      galleryCategory?: QuickPart['gallery_category'];
      favoritesOnly?: boolean;
      search?: string;
    } = {}
  ): Promise<QuickPart[]> {
    const conditions: string[] = ['user_id = $1'];
    const params: any[] = [userId];
    let paramCount = 2;

    if (options.category) {
      conditions.push(`category = $${paramCount++}`);
      params.push(options.category);
    }

    if (options.contentType) {
      conditions.push(`content_type = $${paramCount++}`);
      params.push(options.contentType);
    }

    if (options.galleryCategory) {
      conditions.push(`gallery_category = $${paramCount++}`);
      params.push(options.galleryCategory);
    }

    if (options.favoritesOnly) {
      conditions.push('is_favorite = TRUE');
    }

    if (options.search) {
      conditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      params.push(`%${options.search}%`);
      paramCount++;
    }

    const result = await pool.query(`
      SELECT * FROM quick_parts
      WHERE ${conditions.join(' AND ')}
      ORDER BY is_favorite DESC, usage_count DESC, name ASC
    `, params);

    return result.rows;
  }

  async getQuickPart(userId: string, partId: string): Promise<QuickPart | null> {
    const result = await pool.query(
      'SELECT * FROM quick_parts WHERE id = $1 AND user_id = $2',
      [partId, userId]
    );
    return result.rows[0] || null;
  }

  async getQuickPartByShortcut(userId: string, shortcut: string): Promise<QuickPart | null> {
    const result = await pool.query(
      'SELECT * FROM quick_parts WHERE user_id = $1 AND shortcut = $2',
      [userId, shortcut]
    );
    return result.rows[0] || null;
  }

  async updateQuickPart(
    userId: string,
    partId: string,
    updates: Partial<{
      name: string;
      content: string;
      contentType: QuickPart['content_type'];
      category: string;
      description: string;
      shortcut: string;
      galleryCategory: QuickPart['gallery_category'];
      formatting: object;
      isFavorite: boolean;
    }>
  ): Promise<QuickPart | null> {
    const part = await this.getQuickPart(userId, partId);
    if (!part) return null;

    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      const existing = await pool.query(
        'SELECT * FROM quick_parts WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
        [userId, updates.name, partId]
      );
      if (existing.rows[0]) {
        throw new Error('Quick Part with this name already exists');
      }
      setClause.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }

    if (updates.content !== undefined) {
      setClause.push(`content = $${paramCount++}`);
      values.push(updates.content);
    }

    if (updates.contentType !== undefined) {
      setClause.push(`content_type = $${paramCount++}`);
      values.push(updates.contentType);
    }

    if (updates.category !== undefined) {
      setClause.push(`category = $${paramCount++}`);
      values.push(updates.category);
    }

    if (updates.description !== undefined) {
      setClause.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }

    if (updates.shortcut !== undefined) {
      if (updates.shortcut) {
        const existingShortcut = await pool.query(
          'SELECT * FROM quick_parts WHERE user_id = $1 AND shortcut = $2 AND id != $3',
          [userId, updates.shortcut, partId]
        );
        if (existingShortcut.rows[0]) {
          throw new Error('Shortcut already in use');
        }
      }
      setClause.push(`shortcut = $${paramCount++}`);
      values.push(updates.shortcut || null);
    }

    if (updates.galleryCategory !== undefined) {
      setClause.push(`gallery_category = $${paramCount++}`);
      values.push(updates.galleryCategory);
    }

    if (updates.formatting !== undefined) {
      setClause.push(`formatting = $${paramCount++}`);
      values.push(JSON.stringify(updates.formatting));
    }

    if (updates.isFavorite !== undefined) {
      setClause.push(`is_favorite = $${paramCount++}`);
      values.push(updates.isFavorite);
    }

    if (setClause.length === 0) return part;

    values.push(partId, userId);
    const result = await pool.query(`
      UPDATE quick_parts
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount++} AND user_id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0] || null;
  }

  async deleteQuickPart(userId: string, partId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM quick_parts WHERE id = $1 AND user_id = $2',
      [partId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async useQuickPart(userId: string, partId: string): Promise<QuickPart | null> {
    const result = await pool.query(`
      UPDATE quick_parts
      SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [partId, userId]);

    return result.rows[0] || null;
  }

  async toggleFavorite(userId: string, partId: string): Promise<QuickPart | null> {
    const result = await pool.query(`
      UPDATE quick_parts
      SET is_favorite = NOT is_favorite, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [partId, userId]);

    return result.rows[0] || null;
  }

  // AutoText (Auto-complete text blocks)
  async createAutoText(
    userId: string,
    input: {
      name: string;
      triggerText: string;
      replacementContent: string;
      contentType?: 'text' | 'html';
    }
  ): Promise<AutoText> {
    // Verificar trigger único
    const existing = await pool.query(
      'SELECT * FROM auto_text WHERE user_id = $1 AND LOWER(trigger_text) = LOWER($2)',
      [userId, input.triggerText]
    );

    if (existing.rows[0]) {
      throw new Error('AutoText with this trigger already exists');
    }

    const id = uuidv4();
    const result = await pool.query(`
      INSERT INTO auto_text (id, user_id, name, trigger_text, replacement_content, content_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      id,
      userId,
      input.name,
      input.triggerText,
      input.replacementContent,
      input.contentType || 'text'
    ]);

    logger.info(`AutoText created: ${input.name} (trigger: ${input.triggerText})`);
    return result.rows[0];
  }

  async getAutoTexts(userId: string, activeOnly: boolean = true): Promise<AutoText[]> {
    let query = 'SELECT * FROM auto_text WHERE user_id = $1';
    if (activeOnly) {
      query += ' AND is_active = TRUE';
    }
    query += ' ORDER BY usage_count DESC, name ASC';

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async getAutoTextByTrigger(userId: string, triggerText: string): Promise<AutoText | null> {
    const result = await pool.query(
      'SELECT * FROM auto_text WHERE user_id = $1 AND LOWER(trigger_text) = LOWER($2) AND is_active = TRUE',
      [userId, triggerText]
    );
    return result.rows[0] || null;
  }

  async expandAutoText(userId: string, text: string): Promise<{ expanded: string; replacements: number }> {
    const autoTexts = await this.getAutoTexts(userId, true);
    let expanded = text;
    let replacements = 0;

    for (const autoText of autoTexts) {
      const regex = new RegExp(`\\b${autoText.trigger_text}\\b`, 'gi');
      const matches = expanded.match(regex);
      if (matches) {
        expanded = expanded.replace(regex, autoText.replacement_content);
        replacements += matches.length;

        // Actualizar contador de uso
        await pool.query(
          'UPDATE auto_text SET usage_count = usage_count + $1 WHERE id = $2',
          [matches.length, autoText.id]
        );
      }
    }

    return { expanded, replacements };
  }

  async updateAutoText(
    userId: string,
    autoTextId: string,
    updates: Partial<{
      name: string;
      triggerText: string;
      replacementContent: string;
      contentType: 'text' | 'html';
      isActive: boolean;
    }>
  ): Promise<AutoText | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      setClause.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }

    if (updates.triggerText !== undefined) {
      const existing = await pool.query(
        'SELECT * FROM auto_text WHERE user_id = $1 AND LOWER(trigger_text) = LOWER($2) AND id != $3',
        [userId, updates.triggerText, autoTextId]
      );
      if (existing.rows[0]) {
        throw new Error('AutoText with this trigger already exists');
      }
      setClause.push(`trigger_text = $${paramCount++}`);
      values.push(updates.triggerText);
    }

    if (updates.replacementContent !== undefined) {
      setClause.push(`replacement_content = $${paramCount++}`);
      values.push(updates.replacementContent);
    }

    if (updates.contentType !== undefined) {
      setClause.push(`content_type = $${paramCount++}`);
      values.push(updates.contentType);
    }

    if (updates.isActive !== undefined) {
      setClause.push(`is_active = $${paramCount++}`);
      values.push(updates.isActive);
    }

    if (setClause.length === 0) return null;

    values.push(autoTextId, userId);
    const result = await pool.query(`
      UPDATE auto_text
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount++} AND user_id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0] || null;
  }

  async deleteAutoText(userId: string, autoTextId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM auto_text WHERE id = $1 AND user_id = $2',
      [autoTextId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Categories for Quick Parts
  async getCategories(userId: string): Promise<string[]> {
    const result = await pool.query(`
      SELECT DISTINCT category FROM quick_parts
      WHERE user_id = $1 AND category IS NOT NULL
      ORDER BY category ASC
    `, [userId]);

    return result.rows.map(r => r.category);
  }

  // Import/Export
  async exportQuickParts(userId: string): Promise<object> {
    const quickParts = await this.getQuickParts(userId);
    const autoTexts = await this.getAutoTexts(userId, false);

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      quickParts: quickParts.map(qp => ({
        name: qp.name,
        content: qp.content,
        contentType: qp.content_type,
        category: qp.category,
        description: qp.description,
        shortcut: qp.shortcut,
        galleryCategory: qp.gallery_category,
        formatting: qp.formatting
      })),
      autoTexts: autoTexts.map(at => ({
        name: at.name,
        triggerText: at.trigger_text,
        replacementContent: at.replacement_content,
        contentType: at.content_type
      }))
    };
  }

  async importQuickParts(
    userId: string,
    data: any,
    options: { overwrite?: boolean } = {}
  ): Promise<{ imported: number; skipped: number }> {
    let imported = 0;
    let skipped = 0;

    // Importar Quick Parts
    if (data.quickParts && Array.isArray(data.quickParts)) {
      for (const qp of data.quickParts) {
        try {
          const existing = await pool.query(
            'SELECT * FROM quick_parts WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
            [userId, qp.name]
          );

          if (existing.rows[0]) {
            if (options.overwrite) {
              await this.updateQuickPart(userId, existing.rows[0].id, {
                content: qp.content,
                contentType: qp.contentType,
                category: qp.category,
                description: qp.description,
                galleryCategory: qp.galleryCategory,
                formatting: qp.formatting
              });
              imported++;
            } else {
              skipped++;
            }
          } else {
            await this.createQuickPart(userId, {
              name: qp.name,
              content: qp.content,
              contentType: qp.contentType,
              category: qp.category,
              description: qp.description,
              shortcut: qp.shortcut,
              galleryCategory: qp.galleryCategory,
              formatting: qp.formatting
            });
            imported++;
          }
        } catch (error) {
          skipped++;
        }
      }
    }

    // Importar AutoText
    if (data.autoTexts && Array.isArray(data.autoTexts)) {
      for (const at of data.autoTexts) {
        try {
          const existing = await pool.query(
            'SELECT * FROM auto_text WHERE user_id = $1 AND LOWER(trigger_text) = LOWER($2)',
            [userId, at.triggerText]
          );

          if (!existing.rows[0]) {
            await this.createAutoText(userId, {
              name: at.name,
              triggerText: at.triggerText,
              replacementContent: at.replacementContent,
              contentType: at.contentType
            });
            imported++;
          } else {
            skipped++;
          }
        } catch (error) {
          skipped++;
        }
      }
    }

    logger.info(`Quick Parts import: ${imported} imported, ${skipped} skipped`);
    return { imported, skipped };
  }

  async getStats(userId: string): Promise<any> {
    const quickPartsResult = await pool.query(`
      SELECT
        COUNT(*) as total_quick_parts,
        COUNT(CASE WHEN is_favorite THEN 1 END) as favorites,
        SUM(usage_count) as total_uses
      FROM quick_parts
      WHERE user_id = $1
    `, [userId]);

    const autoTextResult = await pool.query(`
      SELECT
        COUNT(*) as total_auto_text,
        COUNT(CASE WHEN is_active THEN 1 END) as active,
        SUM(usage_count) as total_uses
      FROM auto_text
      WHERE user_id = $1
    `, [userId]);

    return {
      quickParts: {
        total: parseInt(quickPartsResult.rows[0].total_quick_parts),
        favorites: parseInt(quickPartsResult.rows[0].favorites),
        totalUses: parseInt(quickPartsResult.rows[0].total_uses) || 0
      },
      autoText: {
        total: parseInt(autoTextResult.rows[0].total_auto_text),
        active: parseInt(autoTextResult.rows[0].active),
        totalUses: parseInt(autoTextResult.rows[0].total_uses) || 0
      }
    };
  }
}

export const quickPartsService = new QuickPartsService();
