import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import emailService from '../services/email.service';
import { query } from '../config/database';
import passwordEncryptionService from '../services/password-encryption.service';

export class EmailController {
  async getAccounts(req: AuthRequest, res: Response) {
    try {
      const result = await query(
        'SELECT id, provider, email, imap_host, imap_port, smtp_host, smtp_port FROM email_accounts WHERE user_id = $1',
        [req.user.id]
      );

      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async addAccount(req: AuthRequest, res: Response) {
    try {
      const { provider, email, password, imapHost, imapPort, smtpHost, smtpPort } = req.body;

      // Encriptar la contraseña antes de guardarla
      const encryptedPassword = password ? passwordEncryptionService.encrypt(password) : null;

      const result = await query(
        `INSERT INTO email_accounts (user_id, provider, email, password, imap_host, imap_port, smtp_host, smtp_port)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, provider, email, imap_host, imap_port, smtp_host, smtp_port`,
        [req.user.id, provider, email, encryptedPassword, imapHost, imapPort, smtpHost, smtpPort]
      );

      // No devolver la contraseña encriptada en la respuesta
      res.status(201).json(result.rows[0]);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async fetchEmails(req: AuthRequest, res: Response) {
    try {
      const { accountId } = req.params;
      const { folder = 'INBOX', limit = 50 } = req.query;

      const accountResult = await query(
        'SELECT * FROM email_accounts WHERE id = $1 AND user_id = $2',
        [accountId, req.user.id]
      );

      if (accountResult.rows.length === 0) {
        return res.status(404).json({ error: 'Cuenta no encontrada' });
      }

      const account = accountResult.rows[0];
      const emails = await emailService.fetchEmails(account, folder as string, Number(limit));

      for (const email of emails) {
        await query(
          `INSERT INTO emails (account_id, message_id, from_address, to_addresses, subject, body, html_body, folder, received_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (message_id) DO NOTHING`,
          [
            email.accountId,
            email.messageId,
            email.from,
            JSON.stringify(email.to),
            email.subject,
            email.body,
            email.htmlBody,
            email.folder,
            email.receivedAt,
          ]
        );
      }

      res.json(emails);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async sendEmail(req: AuthRequest, res: Response) {
    try {
      const { accountId } = req.params;
      const { to, subject, body, cc, bcc } = req.body;

      const accountResult = await query(
        'SELECT * FROM email_accounts WHERE id = $1 AND user_id = $2',
        [accountId, req.user.id]
      );

      if (accountResult.rows.length === 0) {
        return res.status(404).json({ error: 'Cuenta no encontrada' });
      }

      const account = accountResult.rows[0];
      await emailService.sendEmail(account, to, subject, body, cc, bcc);

      res.json({ message: 'Correo enviado exitosamente' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getEmails(req: AuthRequest, res: Response) {
    try {
      const { accountId } = req.params;

      const result = await query(
        'SELECT * FROM emails WHERE account_id = $1 ORDER BY received_at DESC LIMIT 100',
        [accountId]
      );

      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new EmailController();
