import { Router, Request, Response } from 'express';
import attachmentDetectorService from '../services/attachment-detector.service';

const router = Router();

/**
 * Rutas para detección de adjuntos olvidados
 */

// Verificar si falta un adjunto antes de enviar
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { subject, body, attachments = [], language } = req.body;

    if (body === undefined) {
      return res.status(400).json({ error: 'Se requiere el cuerpo del email' });
    }

    const result = attachmentDetectorService.detectMissingAttachment({
      emailSubject: subject || '',
      emailBody: body,
      attachments,
      language
    });

    res.json(result);
  } catch (error) {
    console.error('Error en detección de adjuntos:', error);
    res.status(500).json({ error: 'Error al verificar adjuntos' });
  }
});

// Verificación pre-vuelo antes de enviar
router.post('/preflight', async (req: Request, res: Response) => {
  try {
    const { subject, body, attachments = [], language } = req.body;

    const result = await attachmentDetectorService.preFlightCheck({
      emailSubject: subject || '',
      emailBody: body || '',
      attachments,
      language
    });

    res.json(result);
  } catch (error) {
    console.error('Error en verificación pre-vuelo:', error);
    res.status(500).json({ error: 'Error en verificación pre-vuelo' });
  }
});

// Detectar tipos de archivos esperados
router.post('/expected-types', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Se requiere el texto a analizar' });
    }

    const types = attachmentDetectorService.detectExpectedFileTypes(text);
    res.json({ expectedTypes: types });
  } catch (error) {
    console.error('Error detectando tipos:', error);
    res.status(500).json({ error: 'Error al detectar tipos de archivo' });
  }
});

// Generar sugerencias de nombres de archivo
router.post('/suggestions', async (req: Request, res: Response) => {
  try {
    const { subject, body } = req.body;

    const suggestions = attachmentDetectorService.generateFileSuggestions({
      emailSubject: subject || '',
      emailBody: body || '',
      attachments: []
    });

    res.json({ suggestions });
  } catch (error) {
    console.error('Error generando sugerencias:', error);
    res.status(500).json({ error: 'Error al generar sugerencias' });
  }
});

export default router;
