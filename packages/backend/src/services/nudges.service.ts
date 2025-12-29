import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import cron from 'node-cron';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface Nudge {
  id: string;
  user_id: string;
  email_id: string;
  nudge_type: 'follow_up' | 'reply_needed' | 'no_response' | 'important_unread' | 'suggested';
  title: string;
  description?: string;
  priority: 'low' | 'normal' | 'high';
  show_after: Date;
  expires_at?: Date;
  is_dismissed: boolean;
  dismissed_at?: Date;
  is_actioned: boolean;
  actioned_at?: Date;
  action_taken?: string;
  ai_generated: boolean;
  ai_confidence?: number;
  created_at: Date;
}

class NudgesService {
  private cronJob: cron.ScheduledTask | null = null;
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    this.startNudgeGenerator();
  }

  private startNudgeGenerator(): void {
    // Generar nudges cada hora
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.generateAutoNudges();
    });
    logger.info('Nudge generator started');
  }

  async createNudge(
    userId: string,
    emailId: string,
    type: Nudge['nudge_type'],
    title: string,
    options: {
      description?: string;
      priority?: 'low' | 'normal' | 'high';
      showAfter?: Date;
      expiresAt?: Date;
      aiGenerated?: boolean;
      aiConfidence?: number;
    } = {}
  ): Promise<Nudge> {
    const id = uuidv4();

    const result = await pool.query(`
      INSERT INTO nudges (
        id, user_id, email_id, nudge_type, title, description,
        priority, show_after, expires_at, ai_generated, ai_confidence
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      id,
      userId,
      emailId,
      type,
      title,
      options.description,
      options.priority || 'normal',
      options.showAfter || new Date(),
      options.expiresAt,
      options.aiGenerated || false,
      options.aiConfidence
    ]);

    return result.rows[0];
  }

  async getActiveNudges(userId: string): Promise<any[]> {
    const result = await pool.query(`
      SELECT n.*, e.subject, e.from_address, e.received_at
      FROM nudges n
      INNER JOIN emails e ON n.email_id = e.id
      WHERE n.user_id = $1
        AND n.is_dismissed = FALSE
        AND n.show_after <= NOW()
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
      ORDER BY
        CASE n.priority WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
        n.show_after ASC
    `, [userId]);
    return result.rows;
  }

  async dismissNudge(userId: string, nudgeId: string): Promise<boolean> {
    const result = await pool.query(`
      UPDATE nudges
      SET is_dismissed = TRUE, dismissed_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [nudgeId, userId]);

    return (result.rowCount ?? 0) > 0;
  }

  async markActioned(
    userId: string,
    nudgeId: string,
    actionTaken: string
  ): Promise<boolean> {
    const result = await pool.query(`
      UPDATE nudges
      SET is_actioned = TRUE, actioned_at = CURRENT_TIMESTAMP, action_taken = $3
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [nudgeId, userId, actionTaken]);

    return (result.rowCount ?? 0) > 0;
  }

  async snoozeNudge(userId: string, nudgeId: string, until: Date): Promise<boolean> {
    const result = await pool.query(`
      UPDATE nudges
      SET show_after = $3
      WHERE id = $1 AND user_id = $2 AND is_dismissed = FALSE
      RETURNING *
    `, [nudgeId, userId, until]);

    return (result.rowCount ?? 0) > 0;
  }

  private async generateAutoNudges(): Promise<void> {
    logger.info('Generating automatic nudges...');

    try {
      // Obtener todos los usuarios activos
      const users = await pool.query('SELECT DISTINCT id FROM users');

      for (const user of users.rows) {
        await this.generateNudgesForUser(user.id);
      }
    } catch (error) {
      logger.error('Error generating auto nudges:', error);
    }
  }

  private async generateNudgesForUser(userId: string): Promise<void> {
    // 1. Nudges para emails enviados sin respuesta (después de 3 días)
    const unanswered = await pool.query(`
      SELECT e.* FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1
        AND e.folder = 'Sent'
        AND e.received_at < NOW() - INTERVAL '3 days'
        AND NOT EXISTS (
          SELECT 1 FROM emails reply
          WHERE reply.from_address = ANY(e.to_addresses::text[])
            AND reply.received_at > e.received_at
        )
        AND NOT EXISTS (
          SELECT 1 FROM nudges n
          WHERE n.email_id = e.id AND n.nudge_type = 'no_response'
        )
      LIMIT 10
    `, [userId]);

    for (const email of unanswered.rows) {
      await this.createNudge(
        userId,
        email.id,
        'no_response',
        'Sin respuesta',
        {
          description: `No has recibido respuesta a tu email "${email.subject}"`,
          priority: 'normal',
          aiGenerated: true
        }
      );
    }

    // 2. Nudges para emails importantes no leídos (más de 1 día)
    const importantUnread = await pool.query(`
      SELECT e.* FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      LEFT JOIN email_labels el ON e.id = el.email_id
      LEFT JOIN labels l ON el.label_id = l.id
      WHERE ea.user_id = $1
        AND e.is_read = FALSE
        AND e.received_at < NOW() - INTERVAL '1 day'
        AND (e.is_starred = TRUE OR l.name = 'IMPORTANT')
        AND NOT EXISTS (
          SELECT 1 FROM nudges n
          WHERE n.email_id = e.id AND n.nudge_type = 'important_unread'
        )
      LIMIT 5
    `, [userId]);

    for (const email of importantUnread.rows) {
      await this.createNudge(
        userId,
        email.id,
        'important_unread',
        'Email importante sin leer',
        {
          description: `Tienes un email importante de ${email.from_address} sin leer`,
          priority: 'high',
          aiGenerated: true
        }
      );
    }

    // 3. Nudges sugeridos por IA
    if (this.genAI) {
      await this.generateAINudges(userId);
    }
  }

  private async generateAINudges(userId: string): Promise<void> {
    try {
      // Obtener emails recientes que podrían necesitar seguimiento
      const recentEmails = await pool.query(`
        SELECT e.id, e.subject, e.from_address, e.body, e.received_at
        FROM emails e
        INNER JOIN email_accounts ea ON e.account_id = ea.id
        WHERE ea.user_id = $1
          AND e.is_read = TRUE
          AND e.received_at > NOW() - INTERVAL '7 days'
          AND NOT EXISTS (
            SELECT 1 FROM nudges n WHERE n.email_id = e.id
          )
        ORDER BY e.received_at DESC
        LIMIT 20
      `, [userId]);

      if (recentEmails.rows.length === 0) return;

      const model = this.genAI!.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      for (const email of recentEmails.rows) {
        const prompt = `
          Analiza este email y determina si el usuario necesita tomar alguna acción o hacer seguimiento.

          Asunto: ${email.subject}
          De: ${email.from_address}
          Contenido (primeros 500 caracteres): ${(email.body || '').substring(0, 500)}

          Responde en JSON con el formato:
          {
            "needs_action": boolean,
            "action_type": "follow_up" | "reply_needed" | null,
            "title": "string con título corto del nudge",
            "description": "string con descripción",
            "priority": "low" | "normal" | "high",
            "confidence": number entre 0 y 1
          }

          Solo sugiere acción si hay una clara necesidad de respuesta o seguimiento.
        `;

        try {
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          const jsonMatch = text.match(/\{[\s\S]*\}/);

          if (jsonMatch) {
            const analysis = JSON.parse(jsonMatch[0]);

            if (analysis.needs_action && analysis.confidence > 0.7) {
              await this.createNudge(
                userId,
                email.id,
                analysis.action_type || 'suggested',
                analysis.title,
                {
                  description: analysis.description,
                  priority: analysis.priority,
                  showAfter: new Date(),
                  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
                  aiGenerated: true,
                  aiConfidence: analysis.confidence
                }
              );
            }
          }
        } catch (aiError) {
          // Continuar con el siguiente email si falla uno
          logger.debug(`AI nudge generation failed for email ${email.id}`);
        }
      }
    } catch (error) {
      logger.error('Error generating AI nudges:', error);
    }
  }

  async getNudgeSettings(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT COALESCE(
        (SELECT settings->'nudges' FROM user_settings WHERE user_id = $1),
        '{}'::jsonb
      ) as settings
    `, [userId]);

    return {
      enabled: true,
      followUpDays: 3,
      importantUnreadHours: 24,
      aiSuggestions: true,
      ...result.rows[0]?.settings
    };
  }

  async updateNudgeSettings(userId: string, settings: any): Promise<void> {
    await pool.query(`
      INSERT INTO user_settings (user_id, settings)
      VALUES ($1, jsonb_build_object('nudges', $2::jsonb))
      ON CONFLICT (user_id)
      DO UPDATE SET settings = user_settings.settings || jsonb_build_object('nudges', $2::jsonb)
    `, [userId, JSON.stringify(settings)]);
  }

  async getStatistics(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_nudges,
        COUNT(CASE WHEN is_dismissed THEN 1 END) as dismissed_count,
        COUNT(CASE WHEN is_actioned THEN 1 END) as actioned_count,
        COUNT(CASE WHEN NOT is_dismissed AND NOT is_actioned THEN 1 END) as active_count,
        COUNT(CASE WHEN ai_generated THEN 1 END) as ai_generated_count,
        AVG(ai_confidence) as avg_ai_confidence
      FROM nudges
      WHERE user_id = $1
    `, [userId]);

    return result.rows[0];
  }

  stopGenerator(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Nudge generator stopped');
    }
  }
}

export const nudgesService = new NudgesService();
