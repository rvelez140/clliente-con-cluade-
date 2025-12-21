import { Router } from 'express';
import geminiController from '../controllers/gemini.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/generate', geminiController.generateEmail.bind(geminiController));
router.post('/improve', geminiController.improveDraft.bind(geminiController));
router.post('/summarize', geminiController.summarizeEmail.bind(geminiController));
router.post('/suggest-reply', geminiController.suggestReply.bind(geminiController));

export default router;
