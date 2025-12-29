import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export interface ConfidentialEmail {
  id: string;
  email_id: string;
  sender_user_id: string;
  expires_at?: Date;
  require_passcode: boolean;
  passcode_hint?: string;
  prevent_forwarding: boolean;
  prevent_copy: boolean;
  prevent_download: boolean;
  prevent_print: boolean;
  require_sms_verification: boolean;
  recipient_phone?: string;
  sms_verified: boolean;
  access_count: number;
  last_accessed_at?: Date;
  revoked: boolean;
  revoked_at?: Date;
  created_at: Date;
}

export interface ConfidentialSettings {
  expiresAt?: string; // ISO date string
  expiresInDays?: number;
  requirePasscode?: boolean;
  passcode?: string;
  passcodeHint?: string;
  preventForwarding?: boolean;
  preventCopy?: boolean;
  preventDownload?: boolean;
  preventPrint?: boolean;
  requireSmsVerification?: boolean;
  recipientPhone?: string;
}

export interface AccessResult {
  granted: boolean;
  email?: any;
  restrictions?: {
    preventForwarding: boolean;
    preventCopy: boolean;
    preventDownload: boolean;
    preventPrint: boolean;
  };
  error?: string;
  expired?: boolean;
  revoked?: boolean;
  requiresPasscode?: boolean;
  requiresSmsVerification?: boolean;
}

class ConfidentialService {
  async createConfidentialEmail(
    userId: string,
    emailId: string,
    settings: ConfidentialSettings
  ): Promise<ConfidentialEmail> {
    const id = uuidv4();

    // Calcular fecha de expiración
    let expiresAt: Date | null = null;
    if (settings.expiresAt) {
      expiresAt = new Date(settings.expiresAt);
    } else if (settings.expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + settings.expiresInDays);
    }

    // Hash del passcode si se proporciona
    let passcodeHash: string | null = null;
    if (settings.requirePasscode && settings.passcode) {
      passcodeHash = await bcrypt.hash(settings.passcode, 10);
    }

    const result = await pool.query(`
      INSERT INTO confidential_emails (
        id, email_id, sender_user_id, expires_at,
        require_passcode, passcode_hash, passcode_hint,
        prevent_forwarding, prevent_copy, prevent_download, prevent_print,
        require_sms_verification, recipient_phone
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      id,
      emailId,
      userId,
      expiresAt,
      settings.requirePasscode || false,
      passcodeHash,
      settings.passcodeHint,
      settings.preventForwarding ?? true,
      settings.preventCopy ?? true,
      settings.preventDownload ?? true,
      settings.preventPrint ?? true,
      settings.requireSmsVerification || false,
      settings.recipientPhone
    ]);

    logger.info(`Confidential email created: ${id} for email ${emailId}`);
    return result.rows[0];
  }

  async accessEmail(
    confidentialId: string,
    accessInfo: {
      passcode?: string;
      smsCode?: string;
      accessedBy: string;
      ip: string;
      userAgent: string;
    }
  ): Promise<AccessResult> {
    const conf = await this.getConfidentialEmail(confidentialId);
    if (!conf) {
      return { granted: false, error: 'Confidential email not found' };
    }

    // Verificar si está revocado
    if (conf.revoked) {
      await this.logAccess(confidentialId, accessInfo, false, 'Email has been revoked');
      return { granted: false, revoked: true, error: 'This email has been revoked by the sender' };
    }

    // Verificar expiración
    if (conf.expires_at && new Date(conf.expires_at) < new Date()) {
      await this.logAccess(confidentialId, accessInfo, false, 'Email has expired');
      return { granted: false, expired: true, error: 'This email has expired' };
    }

    // Verificar passcode
    if (conf.require_passcode) {
      if (!accessInfo.passcode) {
        return {
          granted: false,
          requiresPasscode: true,
          error: 'Passcode required'
        };
      }

      const passcodeValid = await bcrypt.compare(accessInfo.passcode, conf.passcode_hash);
      if (!passcodeValid) {
        await this.logAccess(confidentialId, accessInfo, false, 'Invalid passcode');
        return { granted: false, error: 'Invalid passcode' };
      }
    }

    // Verificar SMS
    if (conf.require_sms_verification && !conf.sms_verified) {
      if (!accessInfo.smsCode) {
        // Enviar código SMS
        await this.sendSmsVerification(confidentialId, conf.recipient_phone!);
        return {
          granted: false,
          requiresSmsVerification: true,
          error: 'SMS verification required'
        };
      }

      const smsValid = await this.verifySmsCode(confidentialId, accessInfo.smsCode);
      if (!smsValid) {
        await this.logAccess(confidentialId, accessInfo, false, 'Invalid SMS code');
        return { granted: false, error: 'Invalid SMS code' };
      }
    }

    // Acceso concedido
    await this.recordAccess(confidentialId);
    await this.logAccess(confidentialId, accessInfo, true);

    // Obtener contenido del email
    const email = await pool.query('SELECT * FROM emails WHERE id = $1', [conf.email_id]);

    return {
      granted: true,
      email: email.rows[0],
      restrictions: {
        preventForwarding: conf.prevent_forwarding,
        preventCopy: conf.prevent_copy,
        preventDownload: conf.prevent_download,
        preventPrint: conf.prevent_print
      }
    };
  }

  async getConfidentialEmail(confidentialId: string): Promise<ConfidentialEmail | null> {
    const result = await pool.query(
      'SELECT * FROM confidential_emails WHERE id = $1',
      [confidentialId]
    );
    return result.rows[0] || null;
  }

  async getConfidentialByEmailId(emailId: string): Promise<ConfidentialEmail | null> {
    const result = await pool.query(
      'SELECT * FROM confidential_emails WHERE email_id = $1',
      [emailId]
    );
    return result.rows[0] || null;
  }

  async revokeAccess(userId: string, confidentialId: string): Promise<boolean> {
    const result = await pool.query(`
      UPDATE confidential_emails
      SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND sender_user_id = $2
      RETURNING *
    `, [confidentialId, userId]);

    if (result.rowCount && result.rowCount > 0) {
      logger.info(`Confidential email revoked: ${confidentialId}`);
      return true;
    }
    return false;
  }

  async updateExpiration(userId: string, confidentialId: string, newExpiresAt: string | null): Promise<ConfidentialEmail | null> {
    const expiresAt = newExpiresAt ? new Date(newExpiresAt) : null;

    const result = await pool.query(`
      UPDATE confidential_emails
      SET expires_at = $1
      WHERE id = $2 AND sender_user_id = $3
      RETURNING *
    `, [expiresAt, confidentialId, userId]);

    return result.rows[0] || null;
  }

  async getSentConfidentialEmails(userId: string): Promise<any[]> {
    const result = await pool.query(`
      SELECT ce.*, e.subject, e.to_addresses
      FROM confidential_emails ce
      INNER JOIN emails e ON ce.email_id = e.id
      WHERE ce.sender_user_id = $1
      ORDER BY ce.created_at DESC
    `, [userId]);
    return result.rows;
  }

  async getAccessLog(userId: string, confidentialId: string): Promise<any[]> {
    // Verificar que el usuario es el propietario
    const conf = await this.getConfidentialEmail(confidentialId);
    if (!conf || conf.sender_user_id !== userId) {
      return [];
    }

    const result = await pool.query(`
      SELECT * FROM confidential_access_log
      WHERE confidential_email_id = $1
      ORDER BY accessed_at DESC
    `, [confidentialId]);

    return result.rows;
  }

  private async recordAccess(confidentialId: string): Promise<void> {
    await pool.query(`
      UPDATE confidential_emails
      SET access_count = access_count + 1, last_accessed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [confidentialId]);
  }

  private async logAccess(
    confidentialId: string,
    accessInfo: { accessedBy: string; ip: string; userAgent: string },
    granted: boolean,
    failureReason?: string
  ): Promise<void> {
    await pool.query(`
      INSERT INTO confidential_access_log (
        confidential_email_id, accessed_by_email, accessed_from_ip,
        user_agent, access_granted, failure_reason
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      confidentialId,
      accessInfo.accessedBy,
      accessInfo.ip,
      accessInfo.userAgent,
      granted,
      failureReason
    ]);
  }

  private async sendSmsVerification(confidentialId: string, phone: string): Promise<void> {
    // Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    await pool.query(`
      UPDATE confidential_emails
      SET sms_code_hash = $1
      WHERE id = $2
    `, [codeHash, confidentialId]);

    // TODO: Integrar con servicio de SMS (Twilio, etc.)
    logger.info(`SMS verification code for ${confidentialId}: ${code} (would be sent to ${phone})`);
  }

  private async verifySmsCode(confidentialId: string, code: string): Promise<boolean> {
    const conf = await this.getConfidentialEmail(confidentialId);
    if (!conf || !conf.sms_code_hash) {
      return false;
    }

    const valid = await bcrypt.compare(code, conf.sms_code_hash);
    if (valid) {
      await pool.query(`
        UPDATE confidential_emails
        SET sms_verified = TRUE
        WHERE id = $1
      `, [confidentialId]);
    }

    return valid;
  }

  async getStatistics(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_sent,
        COUNT(CASE WHEN revoked THEN 1 END) as revoked_count,
        COUNT(CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 1 END) as expired_count,
        SUM(access_count) as total_accesses,
        AVG(access_count) as avg_accesses_per_email
      FROM confidential_emails
      WHERE sender_user_id = $1
    `, [userId]);

    return result.rows[0];
  }

  // Limpiar emails confidenciales expirados (para cron job)
  async cleanupExpired(): Promise<number> {
    // No eliminamos los registros, solo los marcamos como expirados
    // Los emails se mantienen pero no son accesibles
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM confidential_emails
      WHERE expires_at IS NOT NULL AND expires_at < NOW() AND revoked = FALSE
    `);

    return parseInt(result.rows[0].count);
  }
}

export const confidentialService = new ConfidentialService();
