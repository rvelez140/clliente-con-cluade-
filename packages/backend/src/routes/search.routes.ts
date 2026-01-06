import { Router, Request, Response } from 'express';
import perplexityService from '../services/perplexity.service';

const router = Router();

/**
 * Rutas para búsquedas con Perplexity
 */

// Búsqueda general en internet
router.post('/search', async (req: Request, res: Response) => {
  try {
    const {
      query,
      maxResults = 10,
      searchType = 'web',
      timeRange = 'all',
      language = 'es',
      safeSearch = true,
      includeAnswers = true,
      focusAreas = []
    } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Se requiere una query de búsqueda' });
    }

    const results = await perplexityService.search({
      query,
      maxResults,
      searchType,
      timeRange,
      language,
      safeSearch,
      includeAnswers,
      focusAreas
    });

    res.json(results);
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({ error: 'Error al realizar la búsqueda' });
  }
});

// Autocompletar búsqueda
router.get('/autocomplete', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Se requiere el parámetro q' });
    }

    const suggestions = await perplexityService.autoComplete(q);
    res.json({ suggestions });
  } catch (error) {
    console.error('Error en autocompletado:', error);
    res.status(500).json({ error: 'Error en autocompletado' });
  }
});

// Extraer metadatos de un enlace
router.post('/link-metadata', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Se requiere una URL' });
    }

    const metadata = await perplexityService.extractLinkMetadata(url);
    res.json(metadata);
  } catch (error) {
    console.error('Error extrayendo metadatos:', error);
    res.status(500).json({ error: 'Error al extraer metadatos del enlace' });
  }
});

// Procesar múltiples enlaces del portapapeles
router.post('/process-clipboard', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Se requiere el texto del portapapeles' });
    }

    const links = await perplexityService.processClipboardLinks(text);
    res.json({ links });
  } catch (error) {
    console.error('Error procesando portapapeles:', error);
    res.status(500).json({ error: 'Error al procesar enlaces del portapapeles' });
  }
});

// Formatear enlace para email
router.post('/format-link', async (req: Request, res: Response) => {
  try {
    const { url, format = 'html' } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Se requiere una URL' });
    }

    const metadata = await perplexityService.extractLinkMetadata(url);

    const formatted = format === 'html'
      ? perplexityService.formatLinkForEmail(metadata)
      : perplexityService.formatLinkForPlainText(metadata);

    res.json({
      metadata,
      formatted
    });
  } catch (error) {
    console.error('Error formateando enlace:', error);
    res.status(500).json({ error: 'Error al formatear enlace' });
  }
});

// Búsqueda contextual basada en email
router.post('/contextual-search', async (req: Request, res: Response) => {
  try {
    const { subject, body, from } = req.body;

    if (!body) {
      return res.status(400).json({ error: 'Se requiere el contenido del email' });
    }

    const results = await perplexityService.contextualEmailSearch({
      subject: subject || '',
      body,
      from: from || ''
    });

    res.json(results);
  } catch (error) {
    console.error('Error en búsqueda contextual:', error);
    res.status(500).json({ error: 'Error en búsqueda contextual' });
  }
});

export default router;
