import * as cron from 'node-cron';
import { ScheduledEmailService } from './scheduled-email.service';

export class EmailSchedulerService {
  private scheduledEmailService: ScheduledEmailService;
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    this.scheduledEmailService = new ScheduledEmailService();
  }

  start(): void {
    // Ejecutar cada minuto para verificar correos pendientes
    this.cronJob = cron.schedule('* * * * *', async () => {
      console.log('Verificando correos programados pendientes...');
      try {
        await this.processPendingEmails();
      } catch (error) {
        console.error('Error procesando correos programados:', error);
      }
    });

    console.log('Servicio de correos programados iniciado');
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('Servicio de correos programados detenido');
    }
  }

  private async processPendingEmails(): Promise<void> {
    try {
      const pendingEmails = await this.scheduledEmailService.getPendingEmails();

      if (pendingEmails.length === 0) {
        return;
      }

      console.log(`Encontrados ${pendingEmails.length} correos programados pendientes`);

      for (const email of pendingEmails) {
        try {
          console.log(`Enviando correo programado ID: ${email.id}`);
          await this.scheduledEmailService.sendScheduledEmail(email);
          console.log(`Correo programado ID: ${email.id} enviado exitosamente`);
        } catch (error) {
          console.error(`Error enviando correo programado ID: ${email.id}`, error);
        }
      }
    } catch (error) {
      console.error('Error obteniendo correos programados pendientes:', error);
      throw error;
    }
  }
}

export default new EmailSchedulerService();
