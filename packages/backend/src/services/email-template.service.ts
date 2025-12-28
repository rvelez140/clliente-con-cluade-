import { query } from '../config/database';
import logger from '../config/logger';

export interface EmailTemplate {
  id?: number;
  userId: string;
  name: string;
  description?: string;
  category?: string;
  subject: string;
  body: string;
  variables: string[];
  isFavorite?: boolean;
  usageCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class EmailTemplateService {
  /**
   * Crea una nueva plantilla
   */
  async createTemplate(template: EmailTemplate): Promise<number> {
    try {
      const result = await query(
        `INSERT INTO email_templates (user_id, name, description, category, subject, body, variables, is_favorite)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          template.userId,
          template.name,
          template.description || null,
          template.category || null,
          template.subject,
          template.body,
          JSON.stringify(template.variables || []),
          template.isFavorite || false,
        ]
      );

      logger.info(`Plantilla creada: ${template.name}`);
      return result.rows[0].id;
    } catch (error) {
      logger.error('Error creando plantilla:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las plantillas de un usuario
   */
  async getUserTemplates(
    userId: string,
    category?: string
  ): Promise<EmailTemplate[]> {
    try {
      let sql = 'SELECT * FROM email_templates WHERE user_id = $1';
      const params: any[] = [userId];

      if (category) {
        sql += ' AND category = $2';
        params.push(category);
      }

      sql += ' ORDER BY is_favorite DESC, usage_count DESC, created_at DESC';

      const result = await query(sql, params);
      return result.rows.map(this.mapRow);
    } catch (error) {
      logger.error('Error obteniendo plantillas:', error);
      throw error;
    }
  }

  /**
   * Obtiene una plantilla por ID
   */
  async getTemplateById(id: number, userId: string): Promise<EmailTemplate | null> {
    try {
      const result = await query(
        'SELECT * FROM email_templates WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (result.rows.length === 0) return null;

      return this.mapRow(result.rows[0]);
    } catch (error) {
      logger.error('Error obteniendo plantilla:', error);
      throw error;
    }
  }

  /**
   * Actualiza una plantilla
   */
  async updateTemplate(
    id: number,
    userId: string,
    updates: Partial<EmailTemplate>
  ): Promise<boolean> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        fields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        fields.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      if (updates.category !== undefined) {
        fields.push(`category = $${paramIndex++}`);
        values.push(updates.category);
      }
      if (updates.subject !== undefined) {
        fields.push(`subject = $${paramIndex++}`);
        values.push(updates.subject);
      }
      if (updates.body !== undefined) {
        fields.push(`body = $${paramIndex++}`);
        values.push(updates.body);
      }
      if (updates.variables !== undefined) {
        fields.push(`variables = $${paramIndex++}`);
        values.push(JSON.stringify(updates.variables));
      }
      if (updates.isFavorite !== undefined) {
        fields.push(`is_favorite = $${paramIndex++}`);
        values.push(updates.isFavorite);
      }

      if (fields.length === 0) return false;

      fields.push(`updated_at = NOW()`);
      values.push(id, userId);

      const result = await query(
        `UPDATE email_templates SET ${fields.join(', ')}
         WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}`,
        values
      );

      return (result.rowCount || 0) > 0;
    } catch (error) {
      logger.error('Error actualizando plantilla:', error);
      throw error;
    }
  }

  /**
   * Elimina una plantilla
   */
  async deleteTemplate(id: number, userId: string): Promise<boolean> {
    try {
      const result = await query(
        'DELETE FROM email_templates WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      return (result.rowCount || 0) > 0;
    } catch (error) {
      logger.error('Error eliminando plantilla:', error);
      throw error;
    }
  }

  /**
   * Renderiza una plantilla con variables
   * Reemplaza {{variable}} con el valor correspondiente
   */
  renderTemplate(
    template: EmailTemplate,
    variables: Record<string, string>
  ): { subject: string; body: string } {
    let subject = template.subject;
    let body = template.body;

    // Reemplazar variables en subject y body
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }

    return { subject, body };
  }

  /**
   * Extrae variables de una plantilla
   * Busca patrones como {{variable}}
   */
  extractVariables(text: string): string[] {
    const regex = /{{([^}]+)}}/g;
    const matches = text.matchAll(regex);
    const variables = new Set<string>();

    for (const match of matches) {
      variables.add(match[1].trim());
    }

    return Array.from(variables);
  }

  /**
   * Incrementa el contador de uso de una plantilla
   */
  async incrementUsage(id: number, userId: string): Promise<void> {
    try {
      await query(
        `UPDATE email_templates
         SET usage_count = usage_count + 1
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
    } catch (error) {
      logger.error('Error incrementando uso de plantilla:', error);
    }
  }

  /**
   * Obtiene plantillas favoritas
   */
  async getFavoriteTemplates(userId: string): Promise<EmailTemplate[]> {
    try {
      const result = await query(
        `SELECT * FROM email_templates
         WHERE user_id = $1 AND is_favorite = true
         ORDER BY usage_count DESC, created_at DESC`,
        [userId]
      );

      return result.rows.map(this.mapRow);
    } catch (error) {
      logger.error('Error obteniendo plantillas favoritas:', error);
      throw error;
    }
  }

  /**
   * Obtiene plantillas más usadas
   */
  async getPopularTemplates(userId: string, limit: number = 10): Promise<EmailTemplate[]> {
    try {
      const result = await query(
        `SELECT * FROM email_templates
         WHERE user_id = $1
         ORDER BY usage_count DESC
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows.map(this.mapRow);
    } catch (error) {
      logger.error('Error obteniendo plantillas populares:', error);
      throw error;
    }
  }

  /**
   * Obtiene categorías disponibles para un usuario
   */
  async getCategories(userId: string): Promise<string[]> {
    try {
      const result = await query(
        `SELECT DISTINCT category FROM email_templates
         WHERE user_id = $1 AND category IS NOT NULL
         ORDER BY category`,
        [userId]
      );

      return result.rows.map((row) => row.category);
    } catch (error) {
      logger.error('Error obteniendo categorías:', error);
      throw error;
    }
  }

  private mapRow(row: any): EmailTemplate {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      category: row.category,
      subject: row.subject,
      body: row.body,
      variables: typeof row.variables === 'string'
        ? JSON.parse(row.variables)
        : row.variables || [],
      isFavorite: row.is_favorite,
      usageCount: row.usage_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new EmailTemplateService();
