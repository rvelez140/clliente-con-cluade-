import { google } from 'googleapis';
import { EmailAccount, Email, Attachment } from '../types';
import oauthService from './oauth.service';

export class GmailApiService {
  async fetchEmails(account: EmailAccount, folder: string = 'INBOX', limit: number = 50): Promise<Email[]> {
    const accessToken = await oauthService.getValidAccessToken(account);

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth });

    // Obtener lista de mensajes
    const response = await gmail.users.messages.list({
      userId: 'me',
      labelIds: [this.getFolderLabel(folder)],
      maxResults: limit,
    });

    const messages = response.data.messages || [];
    const emails: Email[] = [];

    // Obtener detalles de cada mensaje
    for (const message of messages) {
      try {
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full',
        });

        const email = this.parseGmailMessage(details.data, account.id);
        emails.push(email);
      } catch (error) {
        console.error('Error fetching message:', error);
      }
    }

    return emails;
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
    const accessToken = await oauthService.getValidAccessToken(account);

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth });

    // Construir mensaje en formato RFC 2822
    const message = this.buildRFC2822Message(
      account.email,
      to,
      subject,
      body,
      cc,
      bcc,
      attachments
    );

    // Codificar en base64url
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
  }

  async markAsRead(account: EmailAccount, messageId: string): Promise<void> {
    const accessToken = await oauthService.getValidAccessToken(account);

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth });

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });
  }

  async markAsStarred(account: EmailAccount, messageId: string, starred: boolean): Promise<void> {
    const accessToken = await oauthService.getValidAccessToken(account);

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth });

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: starred ? ['STARRED'] : [],
        removeLabelIds: starred ? [] : ['STARRED'],
      },
    });
  }

  async searchEmails(account: EmailAccount, query: string): Promise<Email[]> {
    const accessToken = await oauthService.getValidAccessToken(account);

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth });

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 50,
    });

    const messages = response.data.messages || [];
    const emails: Email[] = [];

    for (const message of messages) {
      try {
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full',
        });

        const email = this.parseGmailMessage(details.data, account.id);
        emails.push(email);
      } catch (error) {
        console.error('Error fetching message:', error);
      }
    }

    return emails;
  }

  private parseGmailMessage(message: any, accountId: string): Email {
    const headers = message.payload.headers;
    const getHeader = (name: string) => {
      const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : '';
    };

    const getBody = (payload: any): string => {
      if (payload.body && payload.body.data) {
        return Buffer.from(payload.body.data, 'base64').toString('utf-8');
      }

      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
            const body = getBody(part);
            if (body) return body;
          }
        }
      }

      return '';
    };

    const getAttachments = (payload: any): Attachment[] => {
      const attachments: Attachment[] = [];

      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.filename && part.body.attachmentId) {
            attachments.push({
              id: part.body.attachmentId,
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body.size,
              url: '', // Se obtendría con users.messages.attachments.get
            });
          }
        }
      }

      return attachments;
    };

    const isRead = !message.labelIds?.includes('UNREAD');
    const isStarred = message.labelIds?.includes('STARRED') || false;

    return {
      id: message.id,
      accountId,
      messageId: message.id,
      from: getHeader('From'),
      to: getHeader('To').split(',').map((e: string) => e.trim()),
      cc: getHeader('Cc') ? getHeader('Cc').split(',').map((e: string) => e.trim()) : undefined,
      bcc: undefined,
      subject: getHeader('Subject'),
      body: getBody(message.payload),
      htmlBody: undefined,
      attachments: getAttachments(message.payload),
      isRead,
      isStarred,
      folder: 'INBOX',
      receivedAt: new Date(parseInt(message.internalDate)),
      createdAt: new Date(),
    };
  }

  private buildRFC2822Message(
    from: string,
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
    attachments?: any[]
  ): string {
    const lines = [
      `From: ${from}`,
      `To: ${to.join(', ')}`,
    ];

    if (cc && cc.length > 0) {
      lines.push(`Cc: ${cc.join(', ')}`);
    }

    if (bcc && bcc.length > 0) {
      lines.push(`Bcc: ${bcc.join(', ')}`);
    }

    lines.push(`Subject: ${subject}`);
    lines.push('Content-Type: text/html; charset=utf-8');
    lines.push('');
    lines.push(body);

    return lines.join('\r\n');
  }

  private getFolderLabel(folder: string): string {
    const folderMap: { [key: string]: string } = {
      'INBOX': 'INBOX',
      'SENT': 'SENT',
      'DRAFTS': 'DRAFTS',
      'TRASH': 'TRASH',
      'SPAM': 'SPAM',
    };

    return folderMap[folder.toUpperCase()] || 'INBOX';
  }
}

export default new GmailApiService();
