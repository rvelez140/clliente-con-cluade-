import Imap from 'imap';
import { simpleParser, ParsedMail, AddressObject, Attachment } from 'mailparser';
import nodemailer from 'nodemailer';
import { EmailAccount, Email } from '../types';
import passwordEncryptionService from './password-encryption.service';

export class EmailService {
  /**
   * Obtiene la contraseña desencriptada de una cuenta
   */
  private getDecryptedPassword(account: EmailAccount): string {
    if (!account.password) {
      throw new Error('La cuenta no tiene contraseña configurada');
    }

    // Si la contraseña está encriptada, desencriptarla
    if (passwordEncryptionService.isEncrypted(account.password)) {
      return passwordEncryptionService.decrypt(account.password);
    }

    // Si no está encriptada, devolverla tal cual (compatibilidad con datos antiguos)
    return account.password;
  }

  async fetchEmails(account: EmailAccount, folder: string = 'INBOX', limit: number = 50): Promise<Email[]> {
    return new Promise((resolve, reject) => {
      const imapConfig = this.getImapConfig(account);
      const imap = new Imap(imapConfig);
      const emails: Email[] = [];

      imap.once('ready', () => {
        imap.openBox(folder, false, (err, box) => {
          if (err) {
            reject(err);
            return;
          }

          const fetchRange = `${Math.max(1, box.messages.total - limit + 1)}:${box.messages.total}`;
          const fetch = imap.seq.fetch(fetchRange, {
            bodies: '',
            struct: true,
          });

          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream as any, async (err: Error | null, parsed: ParsedMail) => {
                if (err) {
                  console.error('Error parsing email:', err);
                  return;
                }

                const getAddresses = (obj: any) => {
                  if (!obj) return [];
                  if (Array.isArray(obj)) return obj.flatMap((o: any) => o.value?.map((t: any) => t.address || '') || []);
                  return obj.value?.map((t: any) => t.address || '') || [];
                };

                const email: Email = {
                  id: parsed.messageId || '',
                  accountId: account.id,
                  messageId: parsed.messageId || '',
                  from: parsed.from?.text || '',
                  to: getAddresses(parsed.to),
                  cc: getAddresses(parsed.cc),
                  bcc: getAddresses(parsed.bcc),
                  subject: parsed.subject || '',
                  body: parsed.text || '',
                  htmlBody: parsed.html ? parsed.html.toString() : undefined,
                  attachments: parsed.attachments?.map((a: Attachment) => ({
                    id: a.contentId || '',
                    filename: a.filename || 'unknown',
                    mimeType: a.contentType,
                    size: a.size,
                    url: '',
                  })),
                  isRead: false,
                  isStarred: false,
                  folder: folder,
                  receivedAt: parsed.date || new Date(),
                  createdAt: new Date(),
                };

                emails.push(email);
              });
            });
          });

          fetch.once('error', (err) => {
            reject(err);
          });

          fetch.once('end', () => {
            imap.end();
          });
        });
      });

      imap.once('error', (err) => {
        reject(err);
      });

      imap.once('end', () => {
        resolve(emails);
      });

      imap.connect();
    });
  }

  async sendEmail(
    account: EmailAccount,
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
    attachments?: any[]
  ): Promise<void> {
    const smtpConfig = this.getSmtpConfig(account);
    const transporter = nodemailer.createTransport(smtpConfig);

    await transporter.sendMail({
      from: account.email,
      to: to.join(', '),
      cc: cc?.join(', '),
      bcc: bcc?.join(', '),
      subject,
      html: body,
      attachments,
    });
  }

  private getImapConfig(account: EmailAccount): any {
    const password = this.getDecryptedPassword(account);

    if (account.provider === 'gmail') {
      return {
        user: account.email,
        password,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
      };
    } else if (account.provider === 'outlook') {
      return {
        user: account.email,
        password,
        host: 'outlook.office365.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
      };
    } else if (account.provider === 'yahoo') {
      return {
        user: account.email,
        password,
        host: 'imap.mail.yahoo.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
      };
    } else if (account.provider === 'protonmail') {
      return {
        user: account.email,
        password,
        host: 'imap.protonmail.ch',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
      };
    } else {
      return {
        user: account.email,
        password,
        host: account.imapHost,
        port: account.imapPort,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
      };
    }
  }

  private getSmtpConfig(account: EmailAccount): any {
    const password = this.getDecryptedPassword(account);

    const baseConfig = {
      pool: true, // Usar pool de conexiones
      maxConnections: 5, // Máximo 5 conexiones simultáneas
      maxMessages: 100, // Máximo 100 mensajes por conexión
      rateDelta: 1000, // Tiempo entre mensajes (ms)
      rateLimit: 5, // Máximo 5 mensajes por rateDelta
      auth: {
        user: account.email,
        pass: password,
      },
    };

    if (account.provider === 'gmail') {
      return {
        ...baseConfig,
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
      };
    } else if (account.provider === 'outlook') {
      return {
        ...baseConfig,
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
      };
    } else if (account.provider === 'yahoo') {
      return {
        ...baseConfig,
        host: 'smtp.mail.yahoo.com',
        port: 587,
        secure: false,
      };
    } else if (account.provider === 'protonmail') {
      return {
        ...baseConfig,
        host: 'smtp.protonmail.ch',
        port: 587,
        secure: false,
      };
    } else {
      return {
        ...baseConfig,
        host: account.smtpHost,
        port: account.smtpPort,
        secure: false,
      };
    }
  }
}

export default new EmailService();
