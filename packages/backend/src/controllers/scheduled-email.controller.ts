import { Request, Response } from 'express';
import { ScheduledEmailService } from '../services/scheduled-email.service';

const scheduledEmailService = new ScheduledEmailService();

export class ScheduledEmailController {
  async createScheduledEmail(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      const {
        accountId,
        toAddresses,
        ccAddresses,
        bccAddresses,
        subject,
        body,
        scheduledAt,
        timezone,
        recurrence,
        recurrenceEndDate,
        aiGenerated,
        aiPrompt,
        aiTone,
        useVoice,
        voiceLang,
      } = req.body;

      if (!accountId || !toAddresses || !scheduledAt) {
        res.status(400).json({ error: 'Faltan campos requeridos' });
        return;
      }

      const emailId = await scheduledEmailService.createScheduledEmail({
        userId,
        accountId,
        toAddresses,
        ccAddresses,
        bccAddresses,
        subject: subject || '',
        body: body || '',
        scheduledAt: new Date(scheduledAt),
        timezone,
        recurrence,
        recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : undefined,
        aiGenerated,
        aiPrompt,
        aiTone,
        useVoice,
        voiceLang,
      });

      res.status(201).json({ id: emailId, message: 'Correo programado creado exitosamente' });
    } catch (error) {
      console.error('Error creando correo programado:', error);
      res.status(500).json({ error: 'Error al crear correo programado' });
    }
  }

  async getScheduledEmails(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      const emails = await scheduledEmailService.getScheduledEmails(userId);
      res.json(emails);
    } catch (error) {
      console.error('Error obteniendo correos programados:', error);
      res.status(500).json({ error: 'Error al obtener correos programados' });
    }
  }

  async getScheduledEmailById(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      const { id } = req.params;
      const email = await scheduledEmailService.getScheduledEmailById(parseInt(id), userId);

      if (!email) {
        res.status(404).json({ error: 'Correo programado no encontrado' });
        return;
      }

      res.json(email);
    } catch (error) {
      console.error('Error obteniendo correo programado:', error);
      res.status(500).json({ error: 'Error al obtener correo programado' });
    }
  }

  async updateScheduledEmail(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      const { id } = req.params;
      const updates = req.body;

      if (updates.scheduledAt) {
        updates.scheduledAt = new Date(updates.scheduledAt);
      }

      const success = await scheduledEmailService.updateScheduledEmail(
        parseInt(id),
        userId,
        updates
      );

      if (!success) {
        res.status(404).json({ error: 'Correo programado no encontrado' });
        return;
      }

      res.json({ message: 'Correo programado actualizado exitosamente' });
    } catch (error) {
      console.error('Error actualizando correo programado:', error);
      res.status(500).json({ error: 'Error al actualizar correo programado' });
    }
  }

  async deleteScheduledEmail(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      const { id } = req.params;
      const success = await scheduledEmailService.deleteScheduledEmail(parseInt(id), userId);

      if (!success) {
        res.status(404).json({ error: 'Correo programado no encontrado' });
        return;
      }

      res.json({ message: 'Correo programado eliminado exitosamente' });
    } catch (error) {
      console.error('Error eliminando correo programado:', error);
      res.status(500).json({ error: 'Error al eliminar correo programado' });
    }
  }

  async generateEmailWithAI(req: Request, res: Response): Promise<void> {
    try {
      const { prompt, tone, context } = req.body;

      if (!prompt) {
        res.status(400).json({ error: 'Se requiere un prompt' });
        return;
      }

      const result = await scheduledEmailService.generateEmailWithAI(prompt, tone, context);
      res.json(result);
    } catch (error) {
      console.error('Error generando correo con IA:', error);
      res.status(500).json({ error: 'Error al generar correo con IA' });
    }
  }

  async summarizeEmail(req: Request, res: Response): Promise<void> {
    try {
      const { emailBody } = req.body;

      if (!emailBody) {
        res.status(400).json({ error: 'Se requiere el cuerpo del correo' });
        return;
      }

      const summary = await scheduledEmailService.summarizeEmail(emailBody);
      res.json({ summary });
    } catch (error) {
      console.error('Error resumiendo correo:', error);
      res.status(500).json({ error: 'Error al resumir correo' });
    }
  }
}

export default new ScheduledEmailController();
