import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import cron from 'node-cron';

export interface DailyAnalytics {
  user_id: string;
  analytics_date: Date;
  emails_received: number;
  emails_sent: number;
  emails_read: number;
  emails_archived: number;
  emails_deleted: number;
  avg_response_time_minutes?: number;
  inbox_zero_achieved: boolean;
  inbox_zero_time?: string;
  busiest_hour?: number;
  most_active_sender?: string;
  most_active_domain?: string;
  work_emails: number;
  personal_emails: number;
  promotional_emails: number;
  social_emails: number;
}

export interface ProductivityInsights {
  inbox_health_score: number;
  response_rate: number;
  avg_response_time_hours: number;
  email_volume_trend: 'increasing' | 'stable' | 'decreasing';
  busiest_day: string;
  busiest_hour: number;
  top_senders: { email: string; count: number }[];
  top_domains: { domain: string; count: number }[];
  unread_by_age: { age: string; count: number }[];
  recommendations: string[];
}

class AnalyticsService {
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    this.startDailyAnalytics();
  }

  private startDailyAnalytics(): void {
    // Generar analytics diarios a las 23:55
    this.cronJob = cron.schedule('55 23 * * *', async () => {
      await this.generateDailyAnalyticsForAllUsers();
    });
    logger.info('Analytics processor started');
  }

  async getDailyAnalytics(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<DailyAnalytics[]> {
    const result = await pool.query(`
      SELECT * FROM email_analytics
      WHERE user_id = $1 AND analytics_date BETWEEN $2 AND $3
      ORDER BY analytics_date DESC
    `, [userId, startDate, endDate]);

    return result.rows;
  }

  async getWeeklyAnalytics(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        SUM(emails_received) as total_received,
        SUM(emails_sent) as total_sent,
        SUM(emails_read) as total_read,
        SUM(emails_archived) as total_archived,
        AVG(avg_response_time_minutes) as avg_response_time,
        COUNT(CASE WHEN inbox_zero_achieved THEN 1 END) as inbox_zero_days,
        array_agg(DISTINCT busiest_hour) as busy_hours
      FROM email_analytics
      WHERE user_id = $1
        AND analytics_date >= CURRENT_DATE - INTERVAL '7 days'
    `, [userId]);

    return result.rows[0];
  }

  async getMonthlyAnalytics(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        date_trunc('week', analytics_date) as week,
        SUM(emails_received) as received,
        SUM(emails_sent) as sent,
        AVG(avg_response_time_minutes) as avg_response_time
      FROM email_analytics
      WHERE user_id = $1
        AND analytics_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY date_trunc('week', analytics_date)
      ORDER BY week DESC
    `, [userId]);

    return result.rows;
  }

  async getProductivityInsights(userId: string): Promise<ProductivityInsights> {
    // Calcular puntuación de salud del inbox
    const inboxHealth = await this.calculateInboxHealth(userId);

    // Tasa de respuesta
    const responseStats = await pool.query(`
      SELECT
        COUNT(CASE WHEN folder = 'Sent' THEN 1 END)::float /
        NULLIF(COUNT(CASE WHEN folder = 'INBOX' THEN 1 END)::float, 0) as response_rate,
        AVG(EXTRACT(EPOCH FROM (
          SELECT MIN(s.received_at) FROM emails s
          WHERE s.folder = 'Sent'
            AND s.from_address = ANY(e.to_addresses::text[])
            AND s.received_at > e.received_at
        ) - e.received_at) / 3600) as avg_response_hours
      FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1
        AND e.received_at >= NOW() - INTERVAL '30 days'
    `, [userId]);

    // Tendencia de volumen
    const volumeTrend = await this.calculateVolumeTrend(userId);

    // Día y hora más ocupados
    const busyTime = await pool.query(`
      SELECT
        EXTRACT(DOW FROM received_at) as day_of_week,
        EXTRACT(HOUR FROM received_at) as hour,
        COUNT(*) as count
      FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1
        AND e.received_at >= NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(DOW FROM received_at), EXTRACT(HOUR FROM received_at)
      ORDER BY count DESC
      LIMIT 1
    `, [userId]);

    // Top senders
    const topSenders = await pool.query(`
      SELECT from_address as email, COUNT(*) as count
      FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1
        AND e.received_at >= NOW() - INTERVAL '30 days'
      GROUP BY from_address
      ORDER BY count DESC
      LIMIT 5
    `, [userId]);

    // Top domains
    const topDomains = await pool.query(`
      SELECT
        SUBSTRING(from_address FROM POSITION('@' IN from_address) + 1) as domain,
        COUNT(*) as count
      FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1
        AND e.received_at >= NOW() - INTERVAL '30 days'
      GROUP BY SUBSTRING(from_address FROM POSITION('@' IN from_address) + 1)
      ORDER BY count DESC
      LIMIT 5
    `, [userId]);

    // No leídos por antigüedad
    const unreadByAge = await pool.query(`
      SELECT
        CASE
          WHEN received_at >= NOW() - INTERVAL '1 day' THEN 'Hoy'
          WHEN received_at >= NOW() - INTERVAL '7 days' THEN 'Esta semana'
          WHEN received_at >= NOW() - INTERVAL '30 days' THEN 'Este mes'
          ELSE 'Más antiguo'
        END as age,
        COUNT(*) as count
      FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1
        AND e.is_read = FALSE
        AND e.folder = 'INBOX'
      GROUP BY age
      ORDER BY
        CASE age
          WHEN 'Hoy' THEN 1
          WHEN 'Esta semana' THEN 2
          WHEN 'Este mes' THEN 3
          ELSE 4
        END
    `, [userId]);

    // Generar recomendaciones
    const recommendations = await this.generateRecommendations(userId, inboxHealth);

    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    return {
      inbox_health_score: inboxHealth,
      response_rate: responseStats.rows[0]?.response_rate || 0,
      avg_response_time_hours: responseStats.rows[0]?.avg_response_hours || 0,
      email_volume_trend: volumeTrend,
      busiest_day: days[busyTime.rows[0]?.day_of_week] || 'N/A',
      busiest_hour: busyTime.rows[0]?.hour || 0,
      top_senders: topSenders.rows,
      top_domains: topDomains.rows,
      unread_by_age: unreadByAge.rows,
      recommendations
    };
  }

  private async calculateInboxHealth(userId: string): Promise<number> {
    const stats = await pool.query(`
      SELECT
        COUNT(CASE WHEN is_read = FALSE AND folder = 'INBOX' THEN 1 END) as unread,
        COUNT(CASE WHEN folder = 'INBOX' THEN 1 END) as total_inbox,
        COUNT(CASE WHEN is_starred AND is_read = FALSE THEN 1 END) as starred_unread
      FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1
    `, [userId]);

    const { unread, total_inbox, starred_unread } = stats.rows[0];

    let score = 100;

    // Penalizar por no leídos
    if (unread > 50) score -= 30;
    else if (unread > 20) score -= 20;
    else if (unread > 10) score -= 10;

    // Penalizar por inbox muy lleno
    if (total_inbox > 1000) score -= 20;
    else if (total_inbox > 500) score -= 10;

    // Bonificar por inbox zero
    if (unread === 0) score = Math.min(100, score + 20);

    return Math.max(0, Math.min(100, score));
  }

  private async calculateVolumeTrend(userId: string): Promise<'increasing' | 'stable' | 'decreasing'> {
    const result = await pool.query(`
      WITH weekly_counts AS (
        SELECT
          date_trunc('week', received_at) as week,
          COUNT(*) as count
        FROM emails e
        INNER JOIN email_accounts ea ON e.account_id = ea.id
        WHERE ea.user_id = $1
          AND e.received_at >= NOW() - INTERVAL '4 weeks'
        GROUP BY date_trunc('week', received_at)
        ORDER BY week DESC
        LIMIT 4
      )
      SELECT
        (SELECT count FROM weekly_counts ORDER BY week DESC LIMIT 1) as recent,
        (SELECT AVG(count) FROM weekly_counts) as avg
      FROM weekly_counts
      LIMIT 1
    `, [userId]);

    if (!result.rows[0]) return 'stable';

    const { recent, avg } = result.rows[0];
    const ratio = recent / avg;

    if (ratio > 1.2) return 'increasing';
    if (ratio < 0.8) return 'decreasing';
    return 'stable';
  }

  private async generateRecommendations(userId: string, healthScore: number): Promise<string[]> {
    const recommendations: string[] = [];

    // Recomendaciones basadas en el score
    if (healthScore < 50) {
      recommendations.push('Tu inbox necesita atención. Considera archivar emails antiguos.');
    }

    // Verificar emails no leídos antiguos
    const oldUnread = await pool.query(`
      SELECT COUNT(*) as count FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1
        AND e.is_read = FALSE
        AND e.received_at < NOW() - INTERVAL '7 days'
    `, [userId]);

    if (parseInt(oldUnread.rows[0].count) > 20) {
      recommendations.push('Tienes muchos emails sin leer de hace más de una semana. Revísalos o archívalos.');
    }

    // Verificar suscripciones
    const newsletters = await pool.query(`
      SELECT COUNT(DISTINCT from_address) as count FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1
        AND (e.subject ILIKE '%newsletter%' OR e.subject ILIKE '%unsubscribe%')
        AND e.received_at >= NOW() - INTERVAL '30 days'
    `, [userId]);

    if (parseInt(newsletters.rows[0].count) > 10) {
      recommendations.push('Recibes muchos newsletters. Considera cancelar suscripciones innecesarias.');
    }

    // Verificar filtros
    const filters = await pool.query(
      'SELECT COUNT(*) as count FROM email_filters WHERE user_id = $1',
      [userId]
    );

    if (parseInt(filters.rows[0].count) === 0) {
      recommendations.push('No tienes filtros configurados. Los filtros pueden organizar tu inbox automáticamente.');
    }

    return recommendations.slice(0, 5);
  }

  async generateDailyAnalyticsForUser(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Obtener estadísticas del día
    const stats = await pool.query(`
      SELECT
        COUNT(CASE WHEN folder = 'INBOX' THEN 1 END) as received,
        COUNT(CASE WHEN folder = 'Sent' THEN 1 END) as sent,
        COUNT(CASE WHEN is_read = TRUE THEN 1 END) as read_count,
        COUNT(CASE WHEN folder = 'Archive' THEN 1 END) as archived,
        COUNT(CASE WHEN folder = 'TRASH' THEN 1 END) as deleted,
        MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM received_at)) as busiest_hour
      FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1
        AND DATE(e.received_at) = $2
    `, [userId, today]);

    const data = stats.rows[0];

    // Verificar inbox zero
    const inboxCheck = await pool.query(`
      SELECT COUNT(*) as unread FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1
        AND e.folder = 'INBOX'
        AND e.is_read = FALSE
    `, [userId]);

    const inboxZero = parseInt(inboxCheck.rows[0].unread) === 0;

    // Top sender del día
    const topSender = await pool.query(`
      SELECT from_address, COUNT(*) as count
      FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1
        AND DATE(e.received_at) = $2
      GROUP BY from_address
      ORDER BY count DESC
      LIMIT 1
    `, [userId, today]);

    // Insertar o actualizar analytics
    await pool.query(`
      INSERT INTO email_analytics (
        user_id, analytics_date, emails_received, emails_sent, emails_read,
        emails_archived, emails_deleted, inbox_zero_achieved, busiest_hour, most_active_sender
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id, analytics_date)
      DO UPDATE SET
        emails_received = EXCLUDED.emails_received,
        emails_sent = EXCLUDED.emails_sent,
        emails_read = EXCLUDED.emails_read,
        emails_archived = EXCLUDED.emails_archived,
        emails_deleted = EXCLUDED.emails_deleted,
        inbox_zero_achieved = EXCLUDED.inbox_zero_achieved,
        busiest_hour = EXCLUDED.busiest_hour,
        most_active_sender = EXCLUDED.most_active_sender
    `, [
      userId,
      today,
      data.received || 0,
      data.sent || 0,
      data.read_count || 0,
      data.archived || 0,
      data.deleted || 0,
      inboxZero,
      data.busiest_hour,
      topSender.rows[0]?.from_address
    ]);
  }

  private async generateDailyAnalyticsForAllUsers(): Promise<void> {
    logger.info('Generating daily analytics for all users');

    const users = await pool.query('SELECT id FROM users');

    for (const user of users.rows) {
      try {
        await this.generateDailyAnalyticsForUser(user.id);
      } catch (error) {
        logger.error(`Error generating analytics for user ${user.id}:`, error);
      }
    }

    logger.info('Daily analytics generation completed');
  }

  async getEmailHeatmap(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        EXTRACT(DOW FROM received_at) as day,
        EXTRACT(HOUR FROM received_at) as hour,
        COUNT(*) as count
      FROM emails e
      INNER JOIN email_accounts ea ON e.account_id = ea.id
      WHERE ea.user_id = $1
        AND e.received_at >= NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(DOW FROM received_at), EXTRACT(HOUR FROM received_at)
    `, [userId]);

    // Crear matriz 7x24
    const heatmap: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));

    for (const row of result.rows) {
      heatmap[row.day][row.hour] = parseInt(row.count);
    }

    return heatmap;
  }

  stopProcessor(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Analytics processor stopped');
    }
  }
}

export const analyticsService = new AnalyticsService();
