import { Router } from 'express';
import authRoutes from './auth.routes';
import emailRoutes from './email.routes';
import geminiRoutes from './gemini.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/email', emailRoutes);
router.use('/gemini', geminiRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
