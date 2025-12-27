import { Queue, Worker, Job } from 'bullmq';
import { ScheduledEmailService, ScheduledEmail } from './scheduled-email.service';
import { schedulerLogger as logger } from '../config/logger';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

/**
 * Interfaz para jobs de email programado
 */
interface EmailJob {
  scheduledEmailId: number;
  scheduledEmail: ScheduledEmail;
}

/**
 * Servicio de cola para procesamiento de emails programados
 */
export class EmailQueueService {
  private queue: Queue<EmailJob>;
  private worker: Worker<EmailJob> | null = null;
  private scheduledEmailService: ScheduledEmailService;

  constructor() {
    this.scheduledEmailService = new ScheduledEmailService();

    // Crear la cola
    this.queue = new Queue<EmailJob>('scheduled-emails', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2 * 60 * 1000, // 2 minutos
        },
        removeOnComplete: {
          age: 24 * 3600, // Mantener por 24 horas
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Mantener por 7 días
        },
      },
    });

    logger.info('✓ Cola de emails programados creada');
  }

  /**
   * Inicia el worker que procesa los jobs
   */
  async startWorker(): Promise<void> {
    this.worker = new Worker<EmailJob>(
      'scheduled-emails',
      async (job: Job<EmailJob>) => {
        const { scheduledEmail } = job.data;
        logger.info(`Procesando email programado ID: ${scheduledEmail.id}`);

        try {
          await this.scheduledEmailService.sendScheduledEmail(scheduledEmail);
          logger.info(`✓ Email ID: ${scheduledEmail.id} enviado exitosamente`);
          return { success: true, emailId: scheduledEmail.id };
        } catch (error) {
          logger.error(`✗ Error enviando email ID: ${scheduledEmail.id}`, error);
          throw error;
        }
      },
      {
        connection,
        concurrency: 5, // Procesar hasta 5 emails simultáneamente
        limiter: {
          max: 10, // Máximo 10 jobs por...
          duration: 60000, // ...1 minuto (rate limiting)
        },
      }
    );

    // Event listeners
    this.worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completado`);
    });

    this.worker.on('failed', (job, error) => {
      logger.error(`Job ${job?.id} falló:`, error);
    });

    this.worker.on('error', (error) => {
      logger.error('Error en el worker:', error);
    });

    logger.info('✓ Worker de emails programados iniciado');
  }

  /**
   * Agrega un email a la cola para ser enviado
   */
  async addEmail(scheduledEmail: ScheduledEmail, delay: number = 0): Promise<void> {
    const jobId = `email-${scheduledEmail.id}`;

    await this.queue.add(
      'send-email',
      {
        scheduledEmailId: scheduledEmail.id!,
        scheduledEmail,
      },
      {
        jobId,
        delay, // Delay en milisegundos
        priority: this.calculatePriority(scheduledEmail),
      }
    );

    logger.info(`Email ID: ${scheduledEmail.id} agregado a la cola (delay: ${delay}ms)`);
  }

  /**
   * Programa un email para ser enviado en una fecha específica
   */
  async scheduleEmail(scheduledEmail: ScheduledEmail): Promise<void> {
    const now = new Date();
    const scheduledAt = new Date(scheduledEmail.scheduledAt);
    const delay = Math.max(0, scheduledAt.getTime() - now.getTime());

    await this.addEmail(scheduledEmail, delay);
  }

  /**
   * Cancela un email programado
   */
  async cancelEmail(scheduledEmailId: number): Promise<void> {
    const jobId = `email-${scheduledEmailId}`;

    try {
      const job = await this.queue.getJob(jobId);
      if (job) {
        await job.remove();
        logger.info(`Email ID: ${scheduledEmailId} removido de la cola`);
      }
    } catch (error) {
      logger.error(`Error cancelando email ID: ${scheduledEmailId}`, error);
      throw error;
    }
  }

  /**
   * Obtiene el estado de un email en la cola
   */
  async getEmailStatus(scheduledEmailId: number): Promise<string | null> {
    const jobId = `email-${scheduledEmailId}`;

    try {
      const job = await this.queue.getJob(jobId);
      if (job) {
        return await job.getState();
      }
      return null;
    } catch (error) {
      logger.error(`Error obteniendo estado de email ID: ${scheduledEmailId}`, error);
      return null;
    }
  }

  /**
   * Calcula la prioridad del email
   * Menor número = mayor prioridad
   */
  private calculatePriority(scheduledEmail: ScheduledEmail): number {
    // Emails de IA tienen menor prioridad
    if (scheduledEmail.aiGenerated) return 5;

    // Emails recurrentes tienen prioridad media
    if (scheduledEmail.recurrence && scheduledEmail.recurrence !== 'none') return 3;

    // Emails normales tienen alta prioridad
    return 1;
  }

  /**
   * Obtiene estadísticas de la cola
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const counts = await this.queue.getJobCounts();

    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
    };
  }

  /**
   * Limpia jobs antiguos
   */
  async cleanQueue(): Promise<void> {
    const grace = 24 * 3600 * 1000; // 24 horas
    await this.queue.clean(grace, 1000, 'completed');
    await this.queue.clean(7 * 24 * 3600 * 1000, 1000, 'failed'); // 7 días para fallidos
    logger.info('Cola limpiada');
  }

  /**
   * Detiene el worker
   */
  async stop(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      logger.info('Worker detenido');
    }
  }
}

export default new EmailQueueService();
