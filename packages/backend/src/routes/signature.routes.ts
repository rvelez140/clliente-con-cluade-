import { Router, Request, Response } from 'express';
import emailSignatureService from '../services/email-signature.service';

const router = Router();

/**
 * Rutas para gestión de firmas de correo electrónico
 */

// Generar una firma
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { data, templateId, style } = req.body;

    if (!data || !data.name) {
      return res.status(400).json({ error: 'Se requiere al menos el nombre' });
    }

    const signature = emailSignatureService.generateSignature(
      data,
      templateId || 'professional-modern',
      style || {}
    );

    res.json(signature);
  } catch (error) {
    console.error('Error generando firma:', error);
    res.status(500).json({ error: 'Error al generar la firma' });
  }
});

// Generar firma con IA
router.post('/generate-ai', async (req: Request, res: Response) => {
  try {
    const { description, data } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Se requiere una descripción' });
    }

    const signature = await emailSignatureService.generateWithAI(description, data || {});
    res.json(signature);
  } catch (error) {
    console.error('Error generando firma con IA:', error);
    res.status(500).json({ error: 'Error al generar firma con IA' });
  }
});

// Obtener todas las plantillas
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = emailSignatureService.getTemplates();
    res.json({ templates });
  } catch (error) {
    console.error('Error obteniendo plantillas:', error);
    res.status(500).json({ error: 'Error al obtener plantillas' });
  }
});

// Obtener una plantilla específica
router.get('/templates/:templateId', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const template = emailSignatureService.getTemplate(templateId);

    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error obteniendo plantilla:', error);
    res.status(500).json({ error: 'Error al obtener plantilla' });
  }
});

// Vista previa de una firma
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { data, templateId, style } = req.body;

    if (!data || !data.name) {
      return res.status(400).json({ error: 'Se requiere al menos el nombre' });
    }

    const signature = emailSignatureService.generateSignature(
      data,
      templateId || 'professional-modern',
      style || {}
    );

    // Devolver HTML de preview directamente
    res.setHeader('Content-Type', 'text/html');
    res.send(signature.preview);
  } catch (error) {
    console.error('Error generando preview:', error);
    res.status(500).json({ error: 'Error al generar preview' });
  }
});

// Validar una firma HTML personalizada
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { html } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'Se requiere el HTML de la firma' });
    }

    const validation = emailSignatureService.validateSignature(html);
    res.json(validation);
  } catch (error) {
    console.error('Error validando firma:', error);
    res.status(500).json({ error: 'Error al validar firma' });
  }
});

// Optimizar firma para email
router.post('/optimize', async (req: Request, res: Response) => {
  try {
    const { html } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'Se requiere el HTML de la firma' });
    }

    const optimized = emailSignatureService.optimizeForEmail(html);
    res.json({ html: optimized });
  } catch (error) {
    console.error('Error optimizando firma:', error);
    res.status(500).json({ error: 'Error al optimizar firma' });
  }
});

export default router;
