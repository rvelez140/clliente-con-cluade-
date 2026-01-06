import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface SearchQuery {
  // Texto libre
  query?: string;
  // Operadores estilo Gmail
  from?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  // Búsqueda en cuerpo
  body?: string;
  // Filtros
  hasAttachment?: boolean;
  hasLabels?: string[];
  notLabels?: string[];
  isRead?: boolean;
  isStarred?: boolean;
  isImportant?: boolean;
  inFolder?: string;
  // Fechas
  after?: string;
  before?: string;
  older?: string; // older:7d, older:1m, older:1y
  newer?: string; // newer:7d, newer:1m, newer:1y
  // Tamaño
  largerThan?: string; // larger:5M, larger:1K
  smallerThan?: string;
  // Otros
  filename?: string;
  category?: string;
  // Paginación
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  emails: any[];
  total: number;
  searchTimeMs: number;
  query: SearchQuery;
  suggestions?: string[];
}

class AdvancedSearchService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  async search(userId: string, searchQuery: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();

    const { limit = 50, offset = 0 } = searchQuery;
    const conditions: string[] = ['ea.user_id = $1'];
    const params: any[] = [userId];
    let paramCount = 2;

    // Búsqueda de texto libre (full text search)
    if (searchQuery.query) {
      const tsQuery = this.buildTsQuery(searchQuery.query);
      conditions.push(`(
        to_tsvector('spanish', coalesce(e.subject, '') || ' ' || coalesce(e.body, '')) @@ to_tsquery('spanish', $${paramCount})
        OR e.from_address ILIKE $${paramCount + 1}
        OR e.subject ILIKE $${paramCount + 1}
      )`);
      params.push(tsQuery, `%${searchQuery.query}%`);
      paramCount += 2;
    }

    // From
    if (searchQuery.from) {
      conditions.push(`e.from_address ILIKE $${paramCount++}`);
      params.push(`%${searchQuery.from}%`);
    }

    // To
    if (searchQuery.to) {
      conditions.push(`e.to_addresses::text ILIKE $${paramCount++}`);
      params.push(`%${searchQuery.to}%`);
    }

    // CC
    if (searchQuery.cc) {
      conditions.push(`e.cc_addresses::text ILIKE $${paramCount++}`);
      params.push(`%${searchQuery.cc}%`);
    }

    // BCC
    if (searchQuery.bcc) {
      conditions.push(`e.bcc_addresses::text ILIKE $${paramCount++}`);
      params.push(`%${searchQuery.bcc}%`);
    }

    // Subject
    if (searchQuery.subject) {
      conditions.push(`e.subject ILIKE $${paramCount++}`);
      params.push(`%${searchQuery.subject}%`);
    }

    // Body
    if (searchQuery.body) {
      conditions.push(`(e.body ILIKE $${paramCount} OR e.html_body ILIKE $${paramCount})`);
      params.push(`%${searchQuery.body}%`);
      paramCount++;
    }

    // Has attachment
    if (searchQuery.hasAttachment !== undefined) {
      if (searchQuery.hasAttachment) {
        conditions.push(`e.attachments IS NOT NULL AND jsonb_array_length(e.attachments) > 0`);
      } else {
        conditions.push(`(e.attachments IS NULL OR jsonb_array_length(e.attachments) = 0)`);
      }
    }

    // Filename in attachments
    if (searchQuery.filename) {
      conditions.push(`e.attachments::text ILIKE $${paramCount++}`);
      params.push(`%${searchQuery.filename}%`);
    }

    // Is read
    if (searchQuery.isRead !== undefined) {
      conditions.push(`e.is_read = $${paramCount++}`);
      params.push(searchQuery.isRead);
    }

    // Is starred
    if (searchQuery.isStarred !== undefined) {
      conditions.push(`e.is_starred = $${paramCount++}`);
      params.push(searchQuery.isStarred);
    }

    // Folder
    if (searchQuery.inFolder) {
      conditions.push(`e.folder = $${paramCount++}`);
      params.push(searchQuery.inFolder);
    }

    // Date filters
    if (searchQuery.after) {
      conditions.push(`e.received_at >= $${paramCount++}`);
      params.push(new Date(searchQuery.after));
    }

    if (searchQuery.before) {
      conditions.push(`e.received_at <= $${paramCount++}`);
      params.push(new Date(searchQuery.before));
    }

    if (searchQuery.older) {
      const olderDate = this.parseRelativeDate(searchQuery.older, 'older');
      if (olderDate) {
        conditions.push(`e.received_at <= $${paramCount++}`);
        params.push(olderDate);
      }
    }

    if (searchQuery.newer) {
      const newerDate = this.parseRelativeDate(searchQuery.newer, 'newer');
      if (newerDate) {
        conditions.push(`e.received_at >= $${paramCount++}`);
        params.push(newerDate);
      }
    }

    // Size filters
    if (searchQuery.largerThan) {
      const bytes = this.parseSize(searchQuery.largerThan);
      if (bytes) {
        conditions.push(`octet_length(coalesce(e.body, '') || coalesce(e.html_body, '')) > $${paramCount++}`);
        params.push(bytes);
      }
    }

    if (searchQuery.smallerThan) {
      const bytes = this.parseSize(searchQuery.smallerThan);
      if (bytes) {
        conditions.push(`octet_length(coalesce(e.body, '') || coalesce(e.html_body, '')) < $${paramCount++}`);
        params.push(bytes);
      }
    }

    // Labels
    if (searchQuery.hasLabels && searchQuery.hasLabels.length > 0) {
      conditions.push(`EXISTS (
        SELECT 1 FROM email_labels el
        INNER JOIN labels l ON el.label_id = l.id
        WHERE el.email_id = e.id AND l.name = ANY($${paramCount++})
      )`);
      params.push(searchQuery.hasLabels);
    }

    if (searchQuery.notLabels && searchQuery.notLabels.length > 0) {
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM email_labels el
        INNER JOIN labels l ON el.label_id = l.id
        WHERE el.email_id = e.id AND l.name = ANY($${paramCount++})
      )`);
      params.push(searchQuery.notLabels);
    }

    const whereClause = conditions.join(' AND ');

    // Count query
    const countQuery = `
      SELECT COUNT(DISTINCT e.id)
      FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ${whereClause}
    `;

    // Main query with ranking
    let orderBy = 'e.received_at DESC';
    if (searchQuery.query) {
      orderBy = `ts_rank(to_tsvector('spanish', coalesce(e.subject, '') || ' ' || coalesce(e.body, '')), to_tsquery('spanish', $2)) DESC, e.received_at DESC`;
    }

    params.push(limit, offset);
    const mainQuery = `
      SELECT DISTINCT e.*, ea.email as account_email
      FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;

    const [countResult, emailsResult] = await Promise.all([
      pool.query(countQuery, params.slice(0, -2)),
      pool.query(mainQuery, params)
    ]);

    const searchTimeMs = Date.now() - startTime;

    // Guardar en historial
    await this.saveToHistory(userId, searchQuery, parseInt(countResult.rows[0].count), searchTimeMs);

    // Generar sugerencias si hay pocos resultados
    let suggestions: string[] | undefined;
    if (parseInt(countResult.rows[0].count) < 5 && searchQuery.query) {
      suggestions = await this.generateSuggestions(searchQuery.query);
    }

    return {
      emails: emailsResult.rows,
      total: parseInt(countResult.rows[0].count),
      searchTimeMs,
      query: searchQuery,
      suggestions
    };
  }

  async parseNaturalLanguageQuery(query: string): Promise<SearchQuery> {
    // Primero intentar parsear operadores conocidos
    const parsed = this.parseOperators(query);

    // Si hay texto restante y tenemos IA, mejorar con Gemini
    if (parsed.query && this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const prompt = `
          Analiza esta búsqueda de email en lenguaje natural y conviértela a parámetros estructurados.

          Búsqueda: "${parsed.query}"

          Responde SOLO con un JSON válido con estos campos posibles:
          {
            "from": "string o null",
            "to": "string o null",
            "subject": "string o null",
            "body": "string o null",
            "hasAttachment": "boolean o null",
            "after": "YYYY-MM-DD o null",
            "before": "YYYY-MM-DD o null",
            "isStarred": "boolean o null",
            "isRead": "boolean o null",
            "inFolder": "string o null",
            "query": "texto restante para búsqueda libre"
          }

          Ejemplos:
          - "emails de Juan de la semana pasada" -> {"from": "juan", "newer": "7d"}
          - "facturas con adjuntos" -> {"subject": "factura", "hasAttachment": true}
          - "mensajes no leídos importantes" -> {"isRead": false, "isStarred": true}
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const aiParsed = JSON.parse(jsonMatch[0]);
          return { ...parsed, ...aiParsed };
        }
      } catch (error) {
        logger.debug('AI parsing failed, using basic parsing');
      }
    }

    return parsed;
  }

  private parseOperators(query: string): SearchQuery {
    const result: SearchQuery = {};
    let remainingQuery = query;

    // Patrones de operadores estilo Gmail
    const operators: [RegExp, keyof SearchQuery][] = [
      [/from:(\S+)/gi, 'from'],
      [/to:(\S+)/gi, 'to'],
      [/cc:(\S+)/gi, 'cc'],
      [/bcc:(\S+)/gi, 'bcc'],
      [/subject:("[^"]+"|'[^']+'|\S+)/gi, 'subject'],
      [/in:(\S+)/gi, 'inFolder'],
      [/after:(\d{4}-\d{2}-\d{2})/gi, 'after'],
      [/before:(\d{4}-\d{2}-\d{2})/gi, 'before'],
      [/older:(\d+[dmy])/gi, 'older'],
      [/newer:(\d+[dmy])/gi, 'newer'],
      [/larger:(\d+[KMG]?)/gi, 'largerThan'],
      [/smaller:(\d+[KMG]?)/gi, 'smallerThan'],
      [/filename:(\S+)/gi, 'filename'],
      [/label:(\S+)/gi, 'hasLabels' as keyof SearchQuery],
    ];

    for (const [regex, key] of operators) {
      const match = regex.exec(query);
      if (match) {
        let value = match[1].replace(/^["']|["']$/g, ''); // Quitar comillas
        if (key === 'hasLabels') {
          result.hasLabels = result.hasLabels || [];
          result.hasLabels.push(value);
        } else {
          (result as any)[key] = value;
        }
        remainingQuery = remainingQuery.replace(match[0], '').trim();
      }
    }

    // Operadores booleanos
    if (/has:attachment/i.test(query)) {
      result.hasAttachment = true;
      remainingQuery = remainingQuery.replace(/has:attachment/gi, '').trim();
    }

    if (/is:starred/i.test(query)) {
      result.isStarred = true;
      remainingQuery = remainingQuery.replace(/is:starred/gi, '').trim();
    }

    if (/is:unread/i.test(query)) {
      result.isRead = false;
      remainingQuery = remainingQuery.replace(/is:unread/gi, '').trim();
    }

    if (/is:read/i.test(query)) {
      result.isRead = true;
      remainingQuery = remainingQuery.replace(/is:read/gi, '').trim();
    }

    if (/is:important/i.test(query)) {
      result.isImportant = true;
      remainingQuery = remainingQuery.replace(/is:important/gi, '').trim();
    }

    // El resto es búsqueda libre
    if (remainingQuery.trim()) {
      result.query = remainingQuery.trim();
    }

    return result;
  }

  private buildTsQuery(query: string): string {
    // Convertir a formato de tsquery
    const words = query.split(/\s+/).filter(w => w.length > 2);
    return words.map(w => `${w}:*`).join(' & ');
  }

  private parseRelativeDate(value: string, type: 'older' | 'newer'): Date | null {
    const match = value.match(/^(\d+)([dmy])$/i);
    if (!match) return null;

    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const date = new Date();

    switch (unit) {
      case 'd':
        date.setDate(date.getDate() - amount);
        break;
      case 'm':
        date.setMonth(date.getMonth() - amount);
        break;
      case 'y':
        date.setFullYear(date.getFullYear() - amount);
        break;
    }

    return date;
  }

  private parseSize(value: string): number | null {
    const match = value.match(/^(\d+)([KMG]?)$/i);
    if (!match) return null;

    const amount = parseInt(match[1]);
    const unit = (match[2] || 'B').toUpperCase();

    const multipliers: Record<string, number> = {
      'B': 1,
      'K': 1024,
      'M': 1024 * 1024,
      'G': 1024 * 1024 * 1024
    };

    return amount * (multipliers[unit] || 1);
  }

  private async saveToHistory(
    userId: string,
    query: SearchQuery,
    resultCount: number,
    searchTimeMs: number
  ): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO search_history (user_id, query, result_count, search_duration_ms)
        VALUES ($1, $2, $3, $4)
      `, [userId, JSON.stringify(query), resultCount, searchTimeMs]);
    } catch (error) {
      logger.error('Error saving search history:', error);
    }
  }

  private async generateSuggestions(query: string): Promise<string[]> {
    // Sugerencias básicas
    const suggestions: string[] = [];

    // Sugerir quitar restricciones
    if (query.includes(':')) {
      suggestions.push('Prueba una búsqueda más simple');
    }

    // Sugerir operadores
    if (!query.includes('from:')) {
      suggestions.push(`from:${query}`);
    }
    if (!query.includes('subject:')) {
      suggestions.push(`subject:${query}`);
    }

    return suggestions.slice(0, 3);
  }

  // ==================== SAVED SEARCHES ====================

  async saveSearch(
    userId: string,
    name: string,
    query: SearchQuery,
    description?: string
  ): Promise<any> {
    const id = uuidv4();

    const result = await pool.query(`
      INSERT INTO saved_searches (id, user_id, name, query, parsed_query, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, userId, name, JSON.stringify(query), JSON.stringify(query), description]);

    return result.rows[0];
  }

  async getSavedSearches(userId: string): Promise<any[]> {
    const result = await pool.query(
      'SELECT * FROM saved_searches WHERE user_id = $1 ORDER BY is_favorite DESC, use_count DESC',
      [userId]
    );
    return result.rows;
  }

  async executeSavedSearch(userId: string, searchId: string): Promise<SearchResult> {
    const saved = await pool.query(
      'SELECT * FROM saved_searches WHERE id = $1 AND user_id = $2',
      [searchId, userId]
    );

    if (!saved.rows[0]) {
      throw new Error('Saved search not found');
    }

    // Actualizar uso
    await pool.query(`
      UPDATE saved_searches
      SET use_count = use_count + 1, last_used_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [searchId]);

    const query = typeof saved.rows[0].parsed_query === 'string'
      ? JSON.parse(saved.rows[0].parsed_query)
      : saved.rows[0].parsed_query;

    return this.search(userId, query);
  }

  async deleteSavedSearch(userId: string, searchId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM saved_searches WHERE id = $1 AND user_id = $2',
      [searchId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async toggleFavorite(userId: string, searchId: string): Promise<boolean> {
    const result = await pool.query(`
      UPDATE saved_searches
      SET is_favorite = NOT is_favorite
      WHERE id = $1 AND user_id = $2
      RETURNING is_favorite
    `, [searchId, userId]);

    return result.rows[0]?.is_favorite ?? false;
  }

  // ==================== SEARCH HISTORY ====================

  async getSearchHistory(userId: string, limit: number = 20): Promise<any[]> {
    const result = await pool.query(`
      SELECT * FROM search_history
      WHERE user_id = $1
      ORDER BY searched_at DESC
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  }

  async clearSearchHistory(userId: string): Promise<void> {
    await pool.query('DELETE FROM search_history WHERE user_id = $1', [userId]);
  }

  async getSearchStats(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_searches,
        AVG(search_duration_ms) as avg_search_time,
        AVG(result_count) as avg_results
      FROM search_history
      WHERE user_id = $1
    `, [userId]);

    return result.rows[0];
  }
}

export const advancedSearchService = new AdvancedSearchService();
