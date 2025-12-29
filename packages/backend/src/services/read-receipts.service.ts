import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';

export interface ReadReceipt {
  id: string;
  email_id: string;
  sender_user_id: string;
  recipient_email: string;
  requested: boolean;
  read_at?: Date;
  read_from_ip?: string;
  read_user_agent?: string;
  read_device_type?: string;
  tracking_pixel_id: string;
  pixel_loaded_count: number;
  sender_notified: boolean;
  notified_at?: Date;
  created_at: Date;
}

class ReadReceiptsService {
  async createReadReceipt(
    userId: string,
    emailId: string,
    recipientEmail: string
  ): Promise<ReadReceipt> {
    const id = uuidv4();
    const trackingPixelId = uuidv4();

    const result = await pool.query(`
      INSERT INTO read_receipts (id, email_id, sender_user_id, recipient_email, tracking_pixel_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, emailId, userId, recipientEmail, trackingPixelId]);

    logger.info(`Read receipt created for email ${emailId} to ${recipientEmail}`);
    return result.rows[0];
  }

  async trackPixelLoad(
    trackingPixelId: string,
    ip: string,
    userAgent: string
  ): Promise<ReadReceipt | null> {
    // Detectar tipo de dispositivo
    const deviceType = this.detectDeviceType(userAgent);

    // Actualizar solo si es la primera lectura
    const result = await pool.query(`
      UPDATE read_receipts
      SET
        read_at = COALESCE(read_at, CURRENT_TIMESTAMP),
        read_from_ip = COALESCE(read_from_ip, $2),
        read_user_agent = COALESCE(read_user_agent, $3),
        read_device_type = COALESCE(read_device_type, $4),
        pixel_loaded_count = pixel_loaded_count + 1
      WHERE tracking_pixel_id = $1
      RETURNING *
    `, [trackingPixelId, ip, userAgent, deviceType]);

    if (result.rows[0]) {
      const receipt = result.rows[0];

      // Notificar al remitente si aún no se ha notificado
      if (!receipt.sender_notified) {
        await this.notifySender(receipt);
      }

      return receipt;
    }

    return null;
  }

  async getReadReceipt(userId: string, receiptId: string): Promise<ReadReceipt | null> {
    const result = await pool.query(
      'SELECT * FROM read_receipts WHERE id = $1 AND sender_user_id = $2',
      [receiptId, userId]
    );
    return result.rows[0] || null;
  }

  async getReceiptByTrackingPixel(trackingPixelId: string): Promise<ReadReceipt | null> {
    const result = await pool.query(
      'SELECT * FROM read_receipts WHERE tracking_pixel_id = $1',
      [trackingPixelId]
    );
    return result.rows[0] || null;
  }

  async getReceiptsForEmail(userId: string, emailId: string): Promise<ReadReceipt[]> {
    const result = await pool.query(`
      SELECT * FROM read_receipts
      WHERE email_id = $1 AND sender_user_id = $2
      ORDER BY created_at DESC
    `, [emailId, userId]);
    return result.rows;
  }

  async getUserReceipts(
    userId: string,
    options: {
      onlyRead?: boolean;
      onlyUnread?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ receipts: any[]; total: number }> {
    const { onlyRead, onlyUnread, limit = 50, offset = 0 } = options;

    let whereClause = 'rr.sender_user_id = $1';
    if (onlyRead) {
      whereClause += ' AND rr.read_at IS NOT NULL';
    } else if (onlyUnread) {
      whereClause += ' AND rr.read_at IS NULL';
    }

    const countResult = await pool.query(`
      SELECT COUNT(*) FROM read_receipts rr WHERE ${whereClause}
    `, [userId]);

    const result = await pool.query(`
      SELECT rr.*, e.subject, e.to_addresses
      FROM read_receipts rr
      INNER JOIN emails e ON rr.email_id = e.id
      WHERE ${whereClause}
      ORDER BY rr.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    return {
      receipts: result.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }

  async deleteReceipt(userId: string, receiptId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM read_receipts WHERE id = $1 AND sender_user_id = $2',
      [receiptId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async generateTrackingPixelHtml(trackingPixelId: string, baseUrl: string): Promise<string> {
    const pixelUrl = `${baseUrl}/api/tracking/pixel/${trackingPixelId}.gif`;
    return `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
  }

  async getTrackingPixel(): Promise<Buffer> {
    // Generar un GIF transparente de 1x1 pixel
    const gif = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
      0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
      0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
      0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
      0x01, 0x00, 0x3b
    ]);
    return gif;
  }

  private detectDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    } else if (ua.includes('outlook') || ua.includes('thunderbird')) {
      return 'desktop_client';
    } else if (ua.includes('gmail') || ua.includes('yahoo')) {
      return 'webmail';
    }

    return 'desktop';
  }

  private async notifySender(receipt: ReadReceipt): Promise<void> {
    try {
      // TODO: Implementar notificación real (WebSocket, email, push)
      await pool.query(`
        UPDATE read_receipts
        SET sender_notified = TRUE, notified_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [receipt.id]);

      logger.info(`Sender notified for read receipt ${receipt.id}`);
    } catch (error) {
      logger.error('Error notifying sender:', error);
    }
  }

  async getStatistics(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_receipts,
        COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as read_count,
        COUNT(CASE WHEN read_at IS NULL THEN 1 END) as unread_count,
        AVG(EXTRACT(EPOCH FROM (read_at - created_at))) as avg_read_time_seconds,
        COUNT(CASE WHEN read_device_type = 'mobile' THEN 1 END) as mobile_reads,
        COUNT(CASE WHEN read_device_type = 'desktop' THEN 1 END) as desktop_reads
      FROM read_receipts
      WHERE sender_user_id = $1
    `, [userId]);

    return result.rows[0];
  }

  async getReadRate(userId: string, days: number = 30): Promise<number> {
    const result = await pool.query(`
      SELECT
        COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END)::float /
        NULLIF(COUNT(*)::float, 0) * 100 as read_rate
      FROM read_receipts
      WHERE sender_user_id = $1
        AND created_at >= NOW() - INTERVAL '${days} days'
    `, [userId]);

    return result.rows[0]?.read_rate || 0;
  }
}

export const readReceiptsService = new ReadReceiptsService();
