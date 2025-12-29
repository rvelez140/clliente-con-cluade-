import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export interface EmailMention {
  id: string;
  email_id: string;
  mentioned_email: string;
  mentioned_name?: string;
  mentioned_user_id?: string;
  position_start?: number;
  position_end?: number;
  is_read: boolean;
  read_at?: Date;
  notification_sent: boolean;
  created_at: Date;
}

class MentionsService {
  // Regex para detectar @mentions
  private mentionRegex = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|@(\w+)/g;

  async extractAndSaveMentions(emailId: string, content: string): Promise<EmailMention[]> {
    const mentions: EmailMention[] = [];
    let match;

    while ((match = this.mentionRegex.exec(content)) !== null) {
      const mentionedValue = match[1] || match[2];
      const isEmail = match[1] !== undefined;

      let mentionedEmail = mentionedValue;
      let mentionedName = undefined;

      // Si es un nombre de usuario, buscar en contactos
      if (!isEmail) {
        const contact = await pool.query(`
          SELECT email, name FROM contacts
          WHERE (LOWER(name) LIKE LOWER($1) OR LOWER(nickname) LIKE LOWER($1))
          LIMIT 1
        `, [`%${mentionedValue}%`]);

        if (contact.rows[0]) {
          mentionedEmail = contact.rows[0].email;
          mentionedName = contact.rows[0].name;
        } else {
          continue; // No se encontró el usuario
        }
      }

      // Buscar si el usuario mencionado existe en el sistema
      const user = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [mentionedEmail]
      );

      const id = uuidv4();
      const mention: EmailMention = {
        id,
        email_id: emailId,
        mentioned_email: mentionedEmail,
        mentioned_name: mentionedName,
        mentioned_user_id: user.rows[0]?.id,
        position_start: match.index,
        position_end: match.index + match[0].length,
        is_read: false,
        notification_sent: false,
        created_at: new Date()
      };

      await pool.query(`
        INSERT INTO email_mentions (
          id, email_id, mentioned_email, mentioned_name, mentioned_user_id,
          position_start, position_end
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        id,
        emailId,
        mentionedEmail,
        mentionedName,
        user.rows[0]?.id,
        match.index,
        match.index + match[0].length
      ]);

      mentions.push(mention);
    }

    return mentions;
  }

  async getMentionsForUser(userId: string, unreadOnly: boolean = false): Promise<any[]> {
    let query = `
      SELECT em.*, e.subject, e.from_address, e.received_at
      FROM email_mentions em
      INNER JOIN emails e ON em.email_id = e.id
      WHERE em.mentioned_user_id = $1
    `;

    if (unreadOnly) {
      query += ' AND em.is_read = FALSE';
    }

    query += ' ORDER BY e.received_at DESC';

    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async getMentionsInEmail(emailId: string): Promise<EmailMention[]> {
    const result = await pool.query(
      'SELECT * FROM email_mentions WHERE email_id = $1 ORDER BY position_start ASC',
      [emailId]
    );
    return result.rows;
  }

  async markMentionAsRead(userId: string, mentionId: string): Promise<boolean> {
    const result = await pool.query(`
      UPDATE email_mentions
      SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND mentioned_user_id = $2
      RETURNING *
    `, [mentionId, userId]);

    return (result.rowCount ?? 0) > 0;
  }

  async markAllMentionsAsRead(userId: string): Promise<number> {
    const result = await pool.query(`
      UPDATE email_mentions
      SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
      WHERE mentioned_user_id = $1 AND is_read = FALSE
    `, [userId]);

    return result.rowCount ?? 0;
  }

  async getUnreadMentionCount(userId: string): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) FROM email_mentions WHERE mentioned_user_id = $1 AND is_read = FALSE',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  async sendMentionNotifications(): Promise<void> {
    // Obtener menciones no notificadas
    const unnotified = await pool.query(`
      SELECT em.*, e.subject, e.from_address, u.email as user_email
      FROM email_mentions em
      INNER JOIN emails e ON em.email_id = e.id
      INNER JOIN users u ON em.mentioned_user_id = u.id
      WHERE em.notification_sent = FALSE AND em.mentioned_user_id IS NOT NULL
    `);

    for (const mention of unnotified.rows) {
      try {
        // TODO: Implementar envío de notificación (WebSocket, email, push)
        logger.info(`Mention notification: ${mention.from_address} mentioned ${mention.user_email} in "${mention.subject}"`);

        await pool.query(
          'UPDATE email_mentions SET notification_sent = TRUE WHERE id = $1',
          [mention.id]
        );
      } catch (error) {
        logger.error(`Error sending mention notification ${mention.id}:`, error);
      }
    }
  }

  async searchMentions(userId: string, query: string): Promise<any[]> {
    const result = await pool.query(`
      SELECT em.*, e.subject, e.from_address, e.received_at
      FROM email_mentions em
      INNER JOIN emails e ON em.email_id = e.id
      WHERE em.mentioned_user_id = $1
        AND (e.subject ILIKE $2 OR e.from_address ILIKE $2)
      ORDER BY e.received_at DESC
      LIMIT 50
    `, [userId, `%${query}%`]);

    return result.rows;
  }

  async getSuggestionsForMention(userId: string, partialMention: string): Promise<any[]> {
    // Buscar en contactos frecuentes
    const result = await pool.query(`
      SELECT DISTINCT email, name, interaction_count
      FROM contacts
      WHERE user_id = $1
        AND (
          email ILIKE $2
          OR name ILIKE $2
          OR nickname ILIKE $2
        )
      ORDER BY interaction_count DESC
      LIMIT 10
    `, [userId, `%${partialMention}%`]);

    return result.rows.map(c => ({
      email: c.email,
      name: c.name,
      displayText: c.name ? `${c.name} (${c.email})` : c.email
    }));
  }

  async getStats(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_mentions,
        COUNT(CASE WHEN is_read THEN 1 END) as read_mentions,
        COUNT(CASE WHEN NOT is_read THEN 1 END) as unread_mentions
      FROM email_mentions
      WHERE mentioned_user_id = $1
    `, [userId]);

    return result.rows[0];
  }
}

export const mentionsService = new MentionsService();
