import { Client } from '@microsoft/microsoft-graph-client';
import { EmailAccount, Email, Attachment } from '../types';
import oauthService from './oauth.service';

export class MicrosoftGraphService {
  private getClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  async fetchEmails(account: EmailAccount, folder: string = 'INBOX', limit: number = 50): Promise<Email[]> {
    const accessToken = await oauthService.getValidAccessToken(account);
    const client = this.getClient(accessToken);

    const folderName = this.getFolderName(folder);

    const response = await client
      .api(`/me/mailFolders/${folderName}/messages`)
      .top(limit)
      .orderby('receivedDateTime DESC')
      .select('id,subject,bodyPreview,body,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,isRead,flag,hasAttachments')
      .get();

    const emails: Email[] = [];

    for (const message of response.value) {
      const email = this.parseGraphMessage(message, account.id, folder);
      emails.push(email);
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
    const client = this.getClient(accessToken);

    const message = {
      subject,
      body: {
        contentType: 'HTML',
        content: body,
      },
      toRecipients: to.map(email => ({
        emailAddress: { address: email },
      })),
      ccRecipients: cc ? cc.map(email => ({
        emailAddress: { address: email },
      })) : undefined,
      bccRecipients: bcc ? bcc.map(email => ({
        emailAddress: { address: email },
      })) : undefined,
    };

    await client.api('/me/sendMail').post({
      message,
      saveToSentItems: true,
    });
  }

  async markAsRead(account: EmailAccount, messageId: string): Promise<void> {
    const accessToken = await oauthService.getValidAccessToken(account);
    const client = this.getClient(accessToken);

    await client.api(`/me/messages/${messageId}`).patch({
      isRead: true,
    });
  }

  async markAsStarred(account: EmailAccount, messageId: string, starred: boolean): Promise<void> {
    const accessToken = await oauthService.getValidAccessToken(account);
    const client = this.getClient(accessToken);

    await client.api(`/me/messages/${messageId}`).patch({
      flag: {
        flagStatus: starred ? 'flagged' : 'notFlagged',
      },
    });
  }

  async searchEmails(account: EmailAccount, query: string): Promise<Email[]> {
    const accessToken = await oauthService.getValidAccessToken(account);
    const client = this.getClient(accessToken);

    const response = await client
      .api('/me/messages')
      .search(query)
      .top(50)
      .select('id,subject,bodyPreview,body,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,isRead,flag,hasAttachments')
      .get();

    const emails: Email[] = [];

    for (const message of response.value) {
      const email = this.parseGraphMessage(message, account.id, 'INBOX');
      emails.push(email);
    }

    return emails;
  }

  async getAttachments(account: EmailAccount, messageId: string): Promise<Attachment[]> {
    const accessToken = await oauthService.getValidAccessToken(account);
    const client = this.getClient(accessToken);

    const response = await client
      .api(`/me/messages/${messageId}/attachments`)
      .get();

    const attachments: Attachment[] = response.value.map((attachment: any) => ({
      id: attachment.id,
      filename: attachment.name,
      mimeType: attachment.contentType,
      size: attachment.size,
      url: '', // Los datos están en attachment.contentBytes (base64)
    }));

    return attachments;
  }

  async moveToFolder(account: EmailAccount, messageId: string, destinationFolder: string): Promise<void> {
    const accessToken = await oauthService.getValidAccessToken(account);
    const client = this.getClient(accessToken);

    const folderName = this.getFolderName(destinationFolder);

    await client.api(`/me/messages/${messageId}/move`).post({
      destinationId: folderName,
    });
  }

  async deleteEmail(account: EmailAccount, messageId: string): Promise<void> {
    const accessToken = await oauthService.getValidAccessToken(account);
    const client = this.getClient(accessToken);

    await client.api(`/me/messages/${messageId}`).delete();
  }

  private parseGraphMessage(message: any, accountId: string, folder: string): Email {
    const getEmailAddresses = (recipients: any[]): string[] => {
      if (!recipients) return [];
      return recipients.map(r => r.emailAddress.address);
    };

    return {
      id: message.id,
      accountId,
      messageId: message.id,
      from: message.from?.emailAddress?.address || '',
      to: getEmailAddresses(message.toRecipients),
      cc: message.ccRecipients ? getEmailAddresses(message.ccRecipients) : undefined,
      bcc: message.bccRecipients ? getEmailAddresses(message.bccRecipients) : undefined,
      subject: message.subject || '',
      body: message.bodyPreview || '',
      htmlBody: message.body?.contentType === 'html' ? message.body.content : undefined,
      attachments: [],
      isRead: message.isRead || false,
      isStarred: message.flag?.flagStatus === 'flagged',
      folder,
      receivedAt: new Date(message.receivedDateTime),
      createdAt: new Date(),
    };
  }

  private getFolderName(folder: string): string {
    const folderMap: { [key: string]: string } = {
      'INBOX': 'inbox',
      'SENT': 'sentitems',
      'DRAFTS': 'drafts',
      'TRASH': 'deleteditems',
      'SPAM': 'junkemail',
    };

    return folderMap[folder.toUpperCase()] || 'inbox';
  }
}

export default new MicrosoftGraphService();
