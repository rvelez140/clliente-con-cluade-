import { Router } from 'express';
import emailController from '../controllers/email.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import { addAccountSchema, sendEmailSchema, fetchEmailsQuerySchema } from '../validators/email.validators';

const router = Router();

router.use(authenticateToken);

router.get('/accounts', emailController.getAccounts.bind(emailController));
router.post('/accounts', validateBody(addAccountSchema), emailController.addAccount.bind(emailController));
router.get('/accounts/:accountId/fetch', validateQuery(fetchEmailsQuerySchema), emailController.fetchEmails.bind(emailController));
router.get('/accounts/:accountId/emails', emailController.getEmails.bind(emailController));
router.post('/accounts/:accountId/send', validateBody(sendEmailSchema), emailController.sendEmail.bind(emailController));

export default router;
