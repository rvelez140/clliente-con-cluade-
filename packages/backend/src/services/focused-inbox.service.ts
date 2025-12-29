import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface FocusedInboxSettings {
  id: string;
  user_id: string;
  is_enabled: boolean;
  auto_learn: boolean;
  notify_focused_only: boolean;
  training_data: any;
  last_trained_at?: Date;
}

export interface FocusedClassification {
  email_id: string;
  classification: 'focused' | 'other';
  confidence: number;
  user_override: boolean;
  classification_reasons: string[];
}

class FocusedInboxService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  async getSettings(userId: string): Promise<FocusedInboxSettings | null> {
    const result = await pool.query(
      'SELECT * FROM focused_inbox_settings WHERE user_id = $1',
      [userId]
    );

    if (!result.rows[0]) {
      // Crear configuración por defecto
      return this.createDefaultSettings(userId);
    }

    return result.rows[0];
  }

  async createDefaultSettings(userId: string): Promise<FocusedInboxSettings> {
    const id = uuidv4();
    const result = await pool.query(`
      INSERT INTO focused_inbox_settings (id, user_id)
      VALUES ($1, $2)
      RETURNING *
    `, [id, userId]);

    return result.rows[0];
  }

  async updateSettings(
    userId: string,
    updates: Partial<FocusedInboxSettings>
  ): Promise<FocusedInboxSettings | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.is_enabled !== undefined) {
      setClause.push(`is_enabled = $${paramCount++}`);
      values.push(updates.is_enabled);
    }
    if (updates.auto_learn !== undefined) {
      setClause.push(`auto_learn = $${paramCount++}`);
      values.push(updates.auto_learn);
    }
    if (updates.notify_focused_only !== undefined) {
      setClause.push(`notify_focused_only = $${paramCount++}`);
      values.push(updates.notify_focused_only);
    }

    if (setClause.length === 0) return this.getSettings(userId);

    values.push(userId);
    const result = await pool.query(`
      UPDATE focused_inbox_settings SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0] || null;
  }

  async classifyEmail(userId: string, email: any): Promise<FocusedClassification> {
    const settings = await this.getSettings(userId);
    if (!settings?.is_enabled) {
      return {
        email_id: email.id,
        classification: 'focused',
        confidence: 1,
        user_override: false,
        classification_reasons: ['Focused inbox disabled']
      };
    }

    // 1. Verificar reglas del usuario primero
    const ruleResult = await this.checkUserRules(userId, email);
    if (ruleResult) {
      await this.saveClassification(email.id, userId, ruleResult);
      return ruleResult;
    }

    // 2. Verificar patrones de entrenamiento
    const trainingResult = await this.checkTrainingPatterns(userId, email);
    if (trainingResult.confidence > 0.8) {
      await this.saveClassification(email.id, userId, trainingResult);
      return trainingResult;
    }

    // 3. Usar IA para clasificación
    if (this.genAI) {
      const aiResult = await this.classifyWithAI(userId, email);
      await this.saveClassification(email.id, userId, aiResult);
      return aiResult;
    }

    // 4. Por defecto: focused si es de un contacto conocido
    const defaultResult = await this.defaultClassification(userId, email);
    await this.saveClassification(email.id, userId, defaultResult);
    return defaultResult;
  }

  private async checkUserRules(userId: string, email: any): Promise<FocusedClassification | null> {
    const rules = await pool.query(`
      SELECT * FROM focused_inbox_rules
      WHERE user_id = $1 AND is_active = TRUE
      ORDER BY priority DESC
    `, [userId]);

    for (const rule of rules.rows) {
      let matches = false;

      switch (rule.rule_type) {
        case 'sender':
          matches = email.from_address?.toLowerCase().includes(rule.rule_value.toLowerCase());
          break;
        case 'domain':
          const domain = email.from_address?.split('@')[1]?.toLowerCase();
          matches = domain === rule.rule_value.toLowerCase();
          break;
        case 'subject':
          matches = email.subject?.toLowerCase().includes(rule.rule_value.toLowerCase());
          break;
      }

      if (matches) {
        return {
          email_id: email.id,
          classification: rule.target_classification,
          confidence: 1,
          user_override: false,
          classification_reasons: [`Rule match: ${rule.rule_type} = ${rule.rule_value}`]
        };
      }
    }

    return null;
  }

  private async checkTrainingPatterns(userId: string, email: any): Promise<FocusedClassification> {
    // Verificar historial de clasificaciones del mismo remitente
    const senderHistory = await pool.query(`
      SELECT classification, COUNT(*) as count
      FROM focused_inbox_classification fic
      INNER JOIN emails e ON fic.email_id = e.id
      WHERE fic.user_id = $1 AND e.from_address = $2
      GROUP BY classification
      ORDER BY count DESC
      LIMIT 1
    `, [userId, email.from_address]);

    if (senderHistory.rows[0]) {
      const total = await pool.query(`
        SELECT COUNT(*) as total FROM focused_inbox_classification fic
        INNER JOIN emails e ON fic.email_id = e.id
        WHERE fic.user_id = $1 AND e.from_address = $2
      `, [userId, email.from_address]);

      const confidence = parseInt(senderHistory.rows[0].count) / parseInt(total.rows[0].total);

      return {
        email_id: email.id,
        classification: senderHistory.rows[0].classification,
        confidence,
        user_override: false,
        classification_reasons: [`Sender pattern: ${senderHistory.rows[0].count} previous emails classified as ${senderHistory.rows[0].classification}`]
      };
    }

    return {
      email_id: email.id,
      classification: 'other',
      confidence: 0.5,
      user_override: false,
      classification_reasons: ['No training data available']
    };
  }

  private async classifyWithAI(userId: string, email: any): Promise<FocusedClassification> {
    try {
      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `
        Clasifica este email como "focused" (importante, requiere atención) o "other" (newsletters, promociones, actualizaciones automáticas).

        De: ${email.from_address}
        Asunto: ${email.subject}
        Preview: ${(email.body || '').substring(0, 300)}

        Criterios para "focused":
        - Emails personales directos
        - Emails de trabajo importantes
        - Comunicaciones de personas conocidas
        - Emails que requieren respuesta

        Criterios para "other":
        - Newsletters y boletines
        - Promociones y ofertas
        - Notificaciones automáticas
        - Actualizaciones de redes sociales
        - Emails masivos

        Responde con JSON:
        {
          "classification": "focused" o "other",
          "confidence": número entre 0 y 1,
          "reasons": ["razón 1", "razón 2"]
        }
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          email_id: email.id,
          classification: parsed.classification,
          confidence: parsed.confidence,
          user_override: false,
          classification_reasons: parsed.reasons
        };
      }
    } catch (error) {
      logger.error('AI classification failed:', error);
    }

    return {
      email_id: email.id,
      classification: 'other',
      confidence: 0.5,
      user_override: false,
      classification_reasons: ['AI classification failed, defaulting to other']
    };
  }

  private async defaultClassification(userId: string, email: any): Promise<FocusedClassification> {
    // Verificar si el remitente está en contactos
    const isContact = await pool.query(
      'SELECT 1 FROM contacts WHERE user_id = $1 AND email = $2',
      [userId, email.from_address]
    );

    if (isContact.rows[0]) {
      return {
        email_id: email.id,
        classification: 'focused',
        confidence: 0.7,
        user_override: false,
        classification_reasons: ['Sender is in contacts']
      };
    }

    // Verificar si hemos respondido a este remitente
    const hasReplied = await pool.query(`
      SELECT 1 FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1 AND e.folder = 'Sent' AND e.to_addresses::text ILIKE $2
      LIMIT 1
    `, [userId, `%${email.from_address}%`]);

    if (hasReplied.rows[0]) {
      return {
        email_id: email.id,
        classification: 'focused',
        confidence: 0.8,
        user_override: false,
        classification_reasons: ['Previously replied to sender']
      };
    }

    return {
      email_id: email.id,
      classification: 'other',
      confidence: 0.6,
      user_override: false,
      classification_reasons: ['Unknown sender, no interaction history']
    };
  }

  private async saveClassification(
    emailId: string,
    userId: string,
    classification: FocusedClassification
  ): Promise<void> {
    await pool.query(`
      INSERT INTO focused_inbox_classification (
        email_id, user_id, classification, confidence, classification_reasons
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email_id) DO UPDATE SET
        classification = EXCLUDED.classification,
        confidence = EXCLUDED.confidence,
        classification_reasons = EXCLUDED.classification_reasons
    `, [
      emailId,
      userId,
      classification.classification,
      classification.confidence,
      JSON.stringify(classification.classification_reasons)
    ]);
  }

  async moveToFocused(userId: string, emailId: string): Promise<boolean> {
    const result = await pool.query(`
      UPDATE focused_inbox_classification
      SET classification = 'focused', user_override = TRUE, override_at = CURRENT_TIMESTAMP
      WHERE email_id = $1 AND user_id = $2
      RETURNING *
    `, [emailId, userId]);

    if (result.rowCount && result.rowCount > 0) {
      // Aprender de esta acción
      await this.learnFromMove(userId, emailId, 'focused');
      return true;
    }
    return false;
  }

  async moveToOther(userId: string, emailId: string): Promise<boolean> {
    const result = await pool.query(`
      UPDATE focused_inbox_classification
      SET classification = 'other', user_override = TRUE, override_at = CURRENT_TIMESTAMP
      WHERE email_id = $1 AND user_id = $2
      RETURNING *
    `, [emailId, userId]);

    if (result.rowCount && result.rowCount > 0) {
      await this.learnFromMove(userId, emailId, 'other');
      return true;
    }
    return false;
  }

  private async learnFromMove(userId: string, emailId: string, classification: 'focused' | 'other'): Promise<void> {
    const settings = await this.getSettings(userId);
    if (!settings?.auto_learn) return;

    // Obtener email
    const email = await pool.query('SELECT from_address FROM emails WHERE id = $1', [emailId]);
    if (!email.rows[0]) return;

    const senderAddress = email.rows[0].from_address;

    // Contar cuántas veces se ha movido este remitente
    const moveCount = await pool.query(`
      SELECT COUNT(*) FROM focused_inbox_classification fic
      INNER JOIN emails e ON fic.email_id = e.id
      WHERE fic.user_id = $1 AND e.from_address = $2 AND fic.user_override = TRUE
    `, [userId, senderAddress]);

    // Si se ha movido más de 3 veces, crear regla automática
    if (parseInt(moveCount.rows[0].count) >= 3) {
      await pool.query(`
        INSERT INTO focused_inbox_rules (user_id, rule_type, rule_value, target_classification)
        VALUES ($1, 'sender', $2, $3)
        ON CONFLICT (user_id, rule_type, rule_value) DO UPDATE SET
          target_classification = EXCLUDED.target_classification
      `, [userId, senderAddress, classification]);

      logger.info(`Auto-created focused inbox rule for ${senderAddress} -> ${classification}`);
    }
  }

  async getFocusedEmails(userId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const result = await pool.query(`
      SELECT e.*, fic.confidence, fic.classification_reasons
      FROM emails e
      INNER JOIN focused_inbox_classification fic ON e.id = fic.email_id
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1 AND fic.classification = 'focused' AND e.folder = 'INBOX'
      ORDER BY e.received_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    return result.rows;
  }

  async getOtherEmails(userId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const result = await pool.query(`
      SELECT e.*, fic.confidence, fic.classification_reasons
      FROM emails e
      INNER JOIN focused_inbox_classification fic ON e.id = fic.email_id
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1 AND fic.classification = 'other' AND e.folder = 'INBOX'
      ORDER BY e.received_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    return result.rows;
  }

  async addRule(
    userId: string,
    ruleType: 'sender' | 'domain' | 'subject',
    ruleValue: string,
    targetClassification: 'focused' | 'other'
  ): Promise<any> {
    const id = uuidv4();
    const result = await pool.query(`
      INSERT INTO focused_inbox_rules (id, user_id, rule_type, rule_value, target_classification)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, rule_type, rule_value) DO UPDATE SET
        target_classification = EXCLUDED.target_classification
      RETURNING *
    `, [id, userId, ruleType, ruleValue, targetClassification]);

    return result.rows[0];
  }

  async getRules(userId: string): Promise<any[]> {
    const result = await pool.query(
      'SELECT * FROM focused_inbox_rules WHERE user_id = $1 ORDER BY priority DESC',
      [userId]
    );
    return result.rows;
  }

  async deleteRule(userId: string, ruleId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM focused_inbox_rules WHERE id = $1 AND user_id = $2',
      [ruleId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getStats(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        COUNT(CASE WHEN classification = 'focused' THEN 1 END) as focused_count,
        COUNT(CASE WHEN classification = 'other' THEN 1 END) as other_count,
        COUNT(CASE WHEN user_override THEN 1 END) as manual_moves,
        AVG(confidence) as avg_confidence
      FROM focused_inbox_classification
      WHERE user_id = $1
    `, [userId]);

    return result.rows[0];
  }
}

export const focusedInboxService = new FocusedInboxService();
