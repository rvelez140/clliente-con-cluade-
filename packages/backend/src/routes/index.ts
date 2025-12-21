import { Router } from 'express';
import authRoutes from './auth.routes';
import emailRoutes from './email.routes';
import geminiRoutes from './gemini.routes';
import oauthRoutes from './oauth.routes';
import aiRoutes from './ai.routes';
import encryptionRoutes from './encryption.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/email', emailRoutes);
router.use('/gemini', geminiRoutes);
router.use('/oauth', oauthRoutes);
router.use('/ai', aiRoutes);
router.use('/encryption', encryptionRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
