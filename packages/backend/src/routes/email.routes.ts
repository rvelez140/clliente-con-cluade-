import { Router } from 'express';
import emailController from '../controllers/email.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/accounts', emailController.getAccounts.bind(emailController));
router.post('/accounts', emailController.addAccount.bind(emailController));
router.get('/accounts/:accountId/fetch', emailController.fetchEmails.bind(emailController));
router.get('/accounts/:accountId/emails', emailController.getEmails.bind(emailController));
router.post('/accounts/:accountId/send', emailController.sendEmail.bind(emailController));

export default router;
