import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import { labelsService } from './labels.service';

export interface FilterCondition {
  field: 'from' | 'to' | 'cc' | 'bcc' | 'subject' | 'body' | 'has_attachment' | 'size' | 'date';
  operator: 'contains' | 'not_contains' | 'equals' | 'not_equals' | 'starts_with' | 'ends_with' | 'matches' | 'greater_than' | 'less_than';
  value: string | number | boolean;
}

export interface FilterAction {
  type: 'apply_label' | 'remove_label' | 'mark_read' | 'mark_unread' | 'star' | 'unstar' |
        'archive' | 'delete' | 'move_to' | 'forward_to' | 'mark_important' | 'never_spam' |
        'always_spam' | 'category';
  value?: string;
}

export interface EmailFilter {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  priority: number;
  conditions: FilterCondition[];
  match_type: 'all' | 'any';
  actions: FilterAction[];
  stop_processing: boolean;
  apply_to_existing: boolean;
  match_count: number;
  last_matched_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateFilterInput {
  name: string;
  conditions: FilterCondition[];
  actions: FilterAction[];
  match_type?: 'all' | 'any';
  priority?: number;
  stop_processing?: boolean;
  apply_to_existing?: boolean;
}

export interface UpdateFilterInput {
  name?: string;
  is_active?: boolean;
  priority?: number;
  conditions?: FilterCondition[];
  match_type?: 'all' | 'any';
  actions?: FilterAction[];
  stop_processing?: boolean;
}

class FiltersService {
  async getFilters(userId: string): Promise<EmailFilter[]> {
    const result = await pool.query(
      'SELECT * FROM email_filters WHERE user_id = $1 ORDER BY priority ASC, created_at ASC',
      [userId]
    );
    return result.rows;
  }

  async getActiveFilters(userId: string): Promise<EmailFilter[]> {
    const result = await pool.query(
      'SELECT * FROM email_filters WHERE user_id = $1 AND is_active = TRUE ORDER BY priority ASC',
      [userId]
    );
    return result.rows;
  }

  async getFilter(userId: string, filterId: string): Promise<EmailFilter | null> {
    const result = await pool.query(
      'SELECT * FROM email_filters WHERE id = $1 AND user_id = $2',
      [filterId, userId]
    );
    return result.rows[0] || null;
  }

  async createFilter(userId: string, input: CreateFilterInput): Promise<EmailFilter> {
    const id = uuidv4();

    // Validar condiciones y acciones
    this.validateConditions(input.conditions);
    this.validateActions(input.actions);

    const result = await pool.query(`
      INSERT INTO email_filters (
        id, user_id, name, conditions, actions, match_type,
        priority, stop_processing, apply_to_existing
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      id,
      userId,
      input.name,
      JSON.stringify(input.conditions),
      JSON.stringify(input.actions),
      input.match_type || 'all',
      input.priority || 0,
      input.stop_processing || false,
      input.apply_to_existing || false
    ]);

    const filter = result.rows[0];
    logger.info(`Filter created: ${input.name} for user ${userId}`);

    // Aplicar a emails existentes si se solicita
    if (input.apply_to_existing) {
      this.applyFilterToExistingEmails(userId, filter).catch(err => {
        logger.error('Error applying filter to existing emails:', err);
      });
    }

    return filter;
  }

  async updateFilter(userId: string, filterId: string, input: UpdateFilterInput): Promise<EmailFilter | null> {
    const filter = await this.getFilter(userId, filterId);
    if (!filter) return null;

    if (input.conditions) {
      this.validateConditions(input.conditions);
    }
    if (input.actions) {
      this.validateActions(input.actions);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(input.name);
    }
    if (input.is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(input.is_active);
    }
    if (input.priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(input.priority);
    }
    if (input.conditions !== undefined) {
      updates.push(`conditions = $${paramCount++}`);
      values.push(JSON.stringify(input.conditions));
    }
    if (input.match_type !== undefined) {
      updates.push(`match_type = $${paramCount++}`);
      values.push(input.match_type);
    }
    if (input.actions !== undefined) {
      updates.push(`actions = $${paramCount++}`);
      values.push(JSON.stringify(input.actions));
    }
    if (input.stop_processing !== undefined) {
      updates.push(`stop_processing = $${paramCount++}`);
      values.push(input.stop_processing);
    }

    if (updates.length === 0) return filter;

    values.push(filterId, userId);
    const result = await pool.query(`
      UPDATE email_filters SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount++} AND user_id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0];
  }

  async deleteFilter(userId: string, filterId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM email_filters WHERE id = $1 AND user_id = $2',
      [filterId, userId]
    );

    if (result.rowCount && result.rowCount > 0) {
      logger.info(`Filter deleted: ${filterId} for user ${userId}`);
      return true;
    }
    return false;
  }

  async processEmail(userId: string, email: any): Promise<FilterAction[]> {
    const filters = await this.getActiveFilters(userId);
    const appliedActions: FilterAction[] = [];

    for (const filter of filters) {
      if (this.emailMatchesFilter(email, filter)) {
        // Registrar coincidencia
        await this.recordMatch(filter.id, email.id, filter.actions);

        // Agregar acciones
        appliedActions.push(...filter.actions);

        // Ejecutar acciones
        await this.executeActions(email, filter.actions);

        // Si stop_processing está activado, no continuar con más filtros
        if (filter.stop_processing) {
          break;
        }
      }
    }

    return appliedActions;
  }

  private emailMatchesFilter(email: any, filter: EmailFilter): boolean {
    const conditions = filter.conditions;
    const matchType = filter.match_type;

    if (matchType === 'all') {
      return conditions.every(cond => this.evaluateCondition(email, cond));
    } else {
      return conditions.some(cond => this.evaluateCondition(email, cond));
    }
  }

  private evaluateCondition(email: any, condition: FilterCondition): boolean {
    const { field, operator, value } = condition;
    let fieldValue: any;

    switch (field) {
      case 'from':
        fieldValue = email.from_address?.toLowerCase() || '';
        break;
      case 'to':
        fieldValue = JSON.stringify(email.to_addresses || []).toLowerCase();
        break;
      case 'cc':
        fieldValue = JSON.stringify(email.cc_addresses || []).toLowerCase();
        break;
      case 'bcc':
        fieldValue = JSON.stringify(email.bcc_addresses || []).toLowerCase();
        break;
      case 'subject':
        fieldValue = email.subject?.toLowerCase() || '';
        break;
      case 'body':
        fieldValue = (email.body || email.html_body || '').toLowerCase();
        break;
      case 'has_attachment':
        fieldValue = (email.attachments && email.attachments.length > 0);
        break;
      case 'size':
        fieldValue = email.size || 0;
        break;
      case 'date':
        fieldValue = email.received_at;
        break;
      default:
        return false;
    }

    const searchValue = typeof value === 'string' ? value.toLowerCase() : value;

    switch (operator) {
      case 'contains':
        return String(fieldValue).includes(String(searchValue));
      case 'not_contains':
        return !String(fieldValue).includes(String(searchValue));
      case 'equals':
        return fieldValue === searchValue;
      case 'not_equals':
        return fieldValue !== searchValue;
      case 'starts_with':
        return String(fieldValue).startsWith(String(searchValue));
      case 'ends_with':
        return String(fieldValue).endsWith(String(searchValue));
      case 'matches':
        try {
          const regex = new RegExp(String(searchValue), 'i');
          return regex.test(String(fieldValue));
        } catch {
          return false;
        }
      case 'greater_than':
        return Number(fieldValue) > Number(searchValue);
      case 'less_than':
        return Number(fieldValue) < Number(searchValue);
      default:
        return false;
    }
  }

  private async executeActions(email: any, actions: FilterAction[]): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'apply_label':
            if (action.value) {
              await labelsService.applyLabel(email.id, action.value);
            }
            break;
          case 'remove_label':
            if (action.value) {
              await labelsService.removeLabel(email.id, action.value);
            }
            break;
          case 'mark_read':
            await pool.query('UPDATE emails SET is_read = TRUE WHERE id = $1', [email.id]);
            break;
          case 'mark_unread':
            await pool.query('UPDATE emails SET is_read = FALSE WHERE id = $1', [email.id]);
            break;
          case 'star':
            await pool.query('UPDATE emails SET is_starred = TRUE WHERE id = $1', [email.id]);
            break;
          case 'unstar':
            await pool.query('UPDATE emails SET is_starred = FALSE WHERE id = $1', [email.id]);
            break;
          case 'archive':
            await pool.query("UPDATE emails SET folder = 'Archive' WHERE id = $1", [email.id]);
            break;
          case 'delete':
            await pool.query("UPDATE emails SET folder = 'TRASH' WHERE id = $1", [email.id]);
            break;
          case 'move_to':
            if (action.value) {
              await pool.query('UPDATE emails SET folder = $1 WHERE id = $2', [action.value, email.id]);
            }
            break;
          case 'mark_important':
            // Aplicar etiqueta de importante
            const importantLabel = await labelsService.getLabelByName(email.user_id, 'IMPORTANT');
            if (importantLabel) {
              await labelsService.applyLabel(email.id, importantLabel.id);
            }
            break;
          case 'category':
            if (action.value) {
              const categoryLabel = await labelsService.getLabelByName(email.user_id, `CATEGORY_${action.value.toUpperCase()}`);
              if (categoryLabel) {
                await labelsService.applyLabel(email.id, categoryLabel.id);
              }
            }
            break;
        }
      } catch (error) {
        logger.error(`Error executing filter action ${action.type}:`, error);
      }
    }
  }

  private async recordMatch(filterId: string, emailId: string, actions: FilterAction[]): Promise<void> {
    await pool.query(`
      UPDATE email_filters
      SET match_count = match_count + 1, last_matched_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [filterId]);

    await pool.query(`
      INSERT INTO filter_execution_log (filter_id, email_id, actions_executed)
      VALUES ($1, $2, $3)
    `, [filterId, emailId, JSON.stringify(actions)]);
  }

  private async applyFilterToExistingEmails(userId: string, filter: EmailFilter): Promise<void> {
    logger.info(`Applying filter ${filter.id} to existing emails for user ${userId}`);

    // Obtener todos los emails del usuario
    const emails = await pool.query(`
      SELECT e.* FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1
      ORDER BY e.received_at DESC
      LIMIT 1000
    `, [userId]);

    let matchCount = 0;
    for (const email of emails.rows) {
      if (this.emailMatchesFilter(email, filter)) {
        await this.executeActions(email, filter.actions);
        matchCount++;
      }
    }

    logger.info(`Filter ${filter.id} applied to ${matchCount} existing emails`);
  }

  private validateConditions(conditions: FilterCondition[]): void {
    if (!conditions || conditions.length === 0) {
      throw new Error('At least one condition is required');
    }

    const validFields = ['from', 'to', 'cc', 'bcc', 'subject', 'body', 'has_attachment', 'size', 'date'];
    const validOperators = ['contains', 'not_contains', 'equals', 'not_equals', 'starts_with', 'ends_with', 'matches', 'greater_than', 'less_than'];

    for (const condition of conditions) {
      if (!validFields.includes(condition.field)) {
        throw new Error(`Invalid field: ${condition.field}`);
      }
      if (!validOperators.includes(condition.operator)) {
        throw new Error(`Invalid operator: ${condition.operator}`);
      }
    }
  }

  private validateActions(actions: FilterAction[]): void {
    if (!actions || actions.length === 0) {
      throw new Error('At least one action is required');
    }

    const validTypes = [
      'apply_label', 'remove_label', 'mark_read', 'mark_unread', 'star', 'unstar',
      'archive', 'delete', 'move_to', 'forward_to', 'mark_important', 'never_spam',
      'always_spam', 'category'
    ];

    for (const action of actions) {
      if (!validTypes.includes(action.type)) {
        throw new Error(`Invalid action type: ${action.type}`);
      }
    }
  }

  async getFilterStats(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_filters,
        SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_filters,
        SUM(match_count) as total_matches
      FROM email_filters
      WHERE user_id = $1
    `, [userId]);

    const topFilters = await pool.query(`
      SELECT name, match_count, last_matched_at
      FROM email_filters
      WHERE user_id = $1
      ORDER BY match_count DESC
      LIMIT 5
    `, [userId]);

    return {
      ...result.rows[0],
      top_filters: topFilters.rows
    };
  }
}

export const filtersService = new FiltersService();
