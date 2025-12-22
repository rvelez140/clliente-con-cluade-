import { Router } from 'express';
import scheduledEmailController from '../controllers/scheduled-email.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas CRUD para correos programados
router.post('/scheduled-emails', scheduledEmailController.createScheduledEmail.bind(scheduledEmailController));
router.get('/scheduled-emails', scheduledEmailController.getScheduledEmails.bind(scheduledEmailController));
router.get('/scheduled-emails/:id', scheduledEmailController.getScheduledEmailById.bind(scheduledEmailController));
router.put('/scheduled-emails/:id', scheduledEmailController.updateScheduledEmail.bind(scheduledEmailController));
router.delete('/scheduled-emails/:id', scheduledEmailController.deleteScheduledEmail.bind(scheduledEmailController));

// Rutas de IA
router.post('/scheduled-emails/ai/generate', scheduledEmailController.generateEmailWithAI.bind(scheduledEmailController));
router.post('/scheduled-emails/ai/summarize', scheduledEmailController.summarizeEmail.bind(scheduledEmailController));

export default router;
