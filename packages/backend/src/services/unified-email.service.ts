import { EmailAccount, Email } from '../types';
import emailService from './email.service';
import gmailApiService from './gmail-api.service';
import microsoftGraphService from './microsoft-graph.service';
import aiClassifierService from './ai-classifier.service';
import smartSearchService from './smart-search.service';
import encryptionService from './encryption.service';

/**
 * Servicio unificado que gestiona múltiples cuentas de correo
 * y decide automáticamente qué implementación usar (IMAP/SMTP vs API)
 */
export class UnifiedEmailService {
  /**
   * Obtiene correos de una cuenta usando el método óptimo
   */
  async fetchEmails(account: EmailAccount, folder: string = 'INBOX', limit: number = 50): Promise<Email[]> {
    let emails: Email[];

    // Decidir qué servicio usar basado en la configuración de la cuenta
    if (this.shouldUseApi(account)) {
      emails = await this.fetchEmailsViaApi(account, folder, limit);
    } else {
      emails = await this.fetchEmailsViaImap(account, folder, limit);
    }

    // Procesar correos con IA (clasificación, detección de spam, etc.)
    await this.enrichEmailsWithAI(emails);

    return emails;
  }

  /**
   * Obtiene correos de múltiples cuentas simultáneamente
   */
  async fetchEmailsFromMultipleAccounts(accounts: EmailAccount[], folder: string = 'INBOX', limit: number = 50): Promise<Map<string, Email[]>> {
    const results = new Map<string, Email[]>();

    // Procesar cuentas en paralelo
    const promises = accounts.map(async account => {
      try {
        const emails = await this.fetchEmails(account, folder, limit);
        return { accountId: account.id, emails };
      } catch (error) {
        console.error(`Error fetching emails for account ${account.id}:`, error);
        return { accountId: account.id, emails: [] };
      }
    });

    const accountResults = await Promise.all(promises);

    accountResults.forEach(({ accountId, emails }) => {
      results.set(accountId, emails);
    });

    return results;
  }

  /**
   * Envía un correo usando el método óptimo
   */
  async sendEmail(
    account: EmailAccount,
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
    attachments?: any[],
    encrypt?: boolean,
    recipientPublicKeys?: string[]
  ): Promise<void> {
    let finalBody = body;

    // Encriptar si es necesario
    if (encrypt && recipientPublicKeys && recipientPublicKeys.length > 0) {
      const encryptedContent = await encryptionService.encryptEmail(
        { subject, body, attachments: [] },
        recipientPublicKeys[0], // TODO: manejar múltiples destinatarios
        account.accessToken || '', // Usar la clave privada del usuario
        '' // TODO: obtener passphrase del usuario
      );
      finalBody = encryptedContent;
    }

    if (this.shouldUseApi(account)) {
      await this.sendEmailViaApi(account, to, subject, finalBody, cc, bcc, attachments);
    } else {
      await this.sendEmailViaSmtp(account, to, subject, finalBody, cc, bcc, attachments);
    }
  }

  /**
   * Búsqueda inteligente en múltiples cuentas
   */
  async smartSearch(accounts: EmailAccount[], query: string): Promise<Map<string, any[]>> {
    const results = new Map<string, any[]>();

    for (const account of accounts) {
      try {
        // Obtener todos los emails de la cuenta (en producción, esto debería ser paginado)
        const emails = await this.fetchEmails(account, 'INBOX', 100);

        // Realizar búsqueda semántica
        const searchResults = await smartSearchService.semanticSearch(emails, query);

        results.set(account.id, searchResults);
      } catch (error) {
        console.error(`Error searching in account ${account.id}:`, error);
        results.set(account.id, []);
      }
    }

    return results;
  }

  /**
   * Sincroniza todas las cuentas en paralelo
   */
  async syncAllAccounts(accounts: EmailAccount[]): Promise<void> {
    const syncPromises = accounts.map(account =>
      this.syncAccount(account).catch(error => {
        console.error(`Error syncing account ${account.id}:`, error);
      })
    );

    await Promise.all(syncPromises);
  }

  /**
   * Sincroniza una cuenta individual
   */
  async syncAccount(account: EmailAccount): Promise<void> {
    // Sincronizar múltiples carpetas en paralelo
    const folders = ['INBOX', 'SENT', 'DRAFTS', 'TRASH'];

    const syncPromises = folders.map(folder =>
      this.fetchEmails(account, folder, 50).catch(error => {
        console.error(`Error syncing folder ${folder} for account ${account.id}:`, error);
        return [];
      })
    );

    await Promise.all(syncPromises);
  }

  /**
   * Clasifica correos automáticamente
   */
  async autoClassifyEmails(emails: Email[]): Promise<Map<string, any>> {
    return await aiClassifierService.analyzeEmailBatch(emails);
  }

  /**
   * Detecta spam y phishing en un lote de correos
   */
  async batchSpamDetection(emails: Email[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const promises = batch.map(email =>
        aiClassifierService.detectSpamAndPhishing(email).then(result => ({ email, result }))
      );

      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ email, result }) => {
        results.set(email.id, result);
      });
    }

    return results;
  }

  // ============= MÉTODOS PRIVADOS =============

  private shouldUseApi(account: EmailAccount): boolean {
    // Usar API si la cuenta tiene tokens OAuth2
    return !!(account.accessToken && account.refreshToken);
  }

  private async fetchEmailsViaApi(account: EmailAccount, folder: string, limit: number): Promise<Email[]> {
    if (account.provider === 'gmail') {
      return await gmailApiService.fetchEmails(account, folder, limit);
    } else if (account.provider === 'outlook') {
      return await microsoftGraphService.fetchEmails(account, folder, limit);
    }
    throw new Error('API not supported for this provider');
  }

  private async fetchEmailsViaImap(account: EmailAccount, folder: string, limit: number): Promise<Email[]> {
    return await emailService.fetchEmails(account, folder, limit);
  }

  private async sendEmailViaApi(
    account: EmailAccount,
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
    attachments?: any[]
  ): Promise<void> {
    if (account.provider === 'gmail') {
      await gmailApiService.sendEmail(account, to, subject, body, cc, bcc, attachments);
    } else if (account.provider === 'outlook') {
      await microsoftGraphService.sendEmail(account, to, subject, body, cc, bcc, attachments);
    } else {
      throw new Error('API not supported for this provider');
    }
  }

  private async sendEmailViaSmtp(
    account: EmailAccount,
    to: string[],
    subject: string,
    body: string,
    cc?: string[],
    bcc?: string[],
    attachments?: any[]
  ): Promise<void> {
    await emailService.sendEmail(account, to, subject, body, cc, bcc, attachments);
  }

  private async enrichEmailsWithAI(emails: Email[]): Promise<void> {
    // Procesar en segundo plano (no bloqueante)
    Promise.all(
      emails.map(async email => {
        try {
          // Clasificar
          const classification = await aiClassifierService.classifyEmail(email);

          // Detectar spam/phishing
          const spamAnalysis = await aiClassifierService.detectSpamAndPhishing(email);

          // Calcular prioridad
          const priority = await aiClassifierService.calculatePriority(email);

          // Adjuntar metadatos (en producción, guardar en BD)
          (email as any).aiMetadata = {
            classification,
            spamAnalysis,
            priority,
          };
        } catch (error) {
          console.error('Error enriching email with AI:', error);
        }
      })
    );
  }
}

export default new UnifiedEmailService();
