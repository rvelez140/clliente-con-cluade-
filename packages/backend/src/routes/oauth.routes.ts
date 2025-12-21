import { Router } from 'express';
import oauthController from '../controllers/oauth.controller';

const router = Router();

// Gmail OAuth
router.get('/gmail/auth-url', oauthController.getGmailAuthUrl);
router.get('/gmail/callback', oauthController.handleGmailCallback);

// Microsoft OAuth
router.get('/microsoft/auth-url', oauthController.getMicrosoftAuthUrl);
router.get('/microsoft/callback', oauthController.handleMicrosoftCallback);

export default router;
