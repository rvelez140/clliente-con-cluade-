import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import geminiService from '../services/gemini.service';

export class GeminiController {
  async generateEmail(req: AuthRequest, res: Response) {
    try {
      const { prompt, context, tone, length } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'El prompt es requerido' });
      }

      const result = await geminiService.generateEmailContent({
        prompt,
        context,
        tone,
        length,
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async improveDraft(req: AuthRequest, res: Response) {
    try {
      const { draft, improvements } = req.body;

      if (!draft || !improvements) {
        return res.status(400).json({ error: 'El borrador y las mejoras son requeridos' });
      }

      const result = await geminiService.improveDraft(draft, improvements);

      res.json({ text: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async summarizeEmail(req: AuthRequest, res: Response) {
    try {
      const { emailBody } = req.body;

      if (!emailBody) {
        return res.status(400).json({ error: 'El cuerpo del correo es requerido' });
      }

      const result = await geminiService.summarizeEmail(emailBody);

      res.json({ summary: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async suggestReply(req: AuthRequest, res: Response) {
    try {
      const { emailBody, tone } = req.body;

      if (!emailBody) {
        return res.status(400).json({ error: 'El cuerpo del correo es requerido' });
      }

      const suggestions = await geminiService.suggestReply(emailBody, tone);

      res.json({ suggestions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new GeminiController();
