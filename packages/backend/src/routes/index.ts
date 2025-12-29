import { Router } from 'express';
import authRoutes from './auth.routes';
import emailRoutes from './email.routes';
import geminiRoutes from './gemini.routes';
import oauthRoutes from './oauth.routes';
import aiRoutes from './ai.routes';
import encryptionRoutes from './encryption.routes';
import scheduledEmailRoutes from './scheduled-email.routes';
import gmailFeaturesRoutes from './gmail-features.routes';
import outlookFeaturesRoutes from './outlook-features.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/email', emailRoutes);
router.use('/gemini', geminiRoutes);
router.use('/oauth', oauthRoutes);
router.use('/ai', aiRoutes);
router.use('/encryption', encryptionRoutes);
router.use('/api', scheduledEmailRoutes);

// Gmail Competition Features - Full suite of Gmail-like functionality
router.use('/features', gmailFeaturesRoutes);

// Outlook Competition Features - Full suite of Outlook-like functionality
router.use('/outlook', outlookFeaturesRoutes);

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '3.0.0',
    gmailFeatures: [
      'labels', 'filters', 'contacts', 'snooze', 'undo-send',
      'confidential-mode', 'read-receipts', 'nudges', 'tasks',
      'calendar', 'advanced-search', 'analytics', 'keyboard-shortcuts'
    ],
    outlookFeatures: [
      'focused-inbox', 'quick-steps', 'sweep', 'mentions', 'voting-buttons',
      'follow-up-flags', 'categories', 'quick-parts', 'auto-text',
      'resources', 'dictation', 'immersive-reader'
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;
