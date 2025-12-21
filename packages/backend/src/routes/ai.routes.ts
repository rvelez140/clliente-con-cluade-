import { Router } from 'express';
import aiController from '../controllers/ai.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Clasificación
router.post('/classify', aiController.classifyEmail);
router.post('/classify-batch', aiController.batchClassify);

// Spam y Phishing
router.post('/detect-spam', aiController.detectSpam);

// Prioridad
router.post('/calculate-priority', aiController.calculatePriority);

// Extracción de información
router.post('/extract-actions', aiController.extractActionItems);
router.post('/suggest-replies', aiController.suggestQuickReplies);

// Búsqueda inteligente
router.post('/search', aiController.smartSearch);
router.post('/parse-query', aiController.parseSearchQuery);
router.post('/find-similar', aiController.findSimilarEmails);

export default router;
