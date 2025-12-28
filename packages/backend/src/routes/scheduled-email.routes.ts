import { Router } from 'express';
import scheduledEmailController from '../controllers/scheduled-email.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import {
  createScheduledEmailSchema,
  updateScheduledEmailSchema,
  generateEmailAISchema,
  summarizeEmailSchema
} from '../validators/email.validators';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Rutas CRUD para correos programados
router.post('/scheduled-emails', validateBody(createScheduledEmailSchema), scheduledEmailController.createScheduledEmail.bind(scheduledEmailController));
router.get('/scheduled-emails', scheduledEmailController.getScheduledEmails.bind(scheduledEmailController));
router.get('/scheduled-emails/:id', scheduledEmailController.getScheduledEmailById.bind(scheduledEmailController));
router.put('/scheduled-emails/:id', validateBody(updateScheduledEmailSchema), scheduledEmailController.updateScheduledEmail.bind(scheduledEmailController));
router.delete('/scheduled-emails/:id', scheduledEmailController.deleteScheduledEmail.bind(scheduledEmailController));

// Rutas de IA
router.post('/scheduled-emails/ai/generate', validateBody(generateEmailAISchema), scheduledEmailController.generateEmailWithAI.bind(scheduledEmailController));
router.post('/scheduled-emails/ai/summarize', validateBody(summarizeEmailSchema), scheduledEmailController.summarizeEmail.bind(scheduledEmailController));

export default router;
