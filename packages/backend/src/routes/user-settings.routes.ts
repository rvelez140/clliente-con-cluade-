import { Router } from 'express';
import userSettingsController from '../controllers/user-settings.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Rutas de firma
router.get('/signature', authenticate, userSettingsController.getSignature.bind(userSettingsController));
router.put('/signature', authenticate, userSettingsController.updateSignature.bind(userSettingsController));
router.post('/signature/generate', authenticate, userSettingsController.generateSignature.bind(userSettingsController));
router.post('/signature/sample', authenticate, userSettingsController.generateSignatureSample.bind(userSettingsController));

// Rutas de avatar
router.get('/avatar', authenticate, userSettingsController.getAvatarConfig.bind(userSettingsController));
router.put('/avatar', authenticate, userSettingsController.updateAvatarConfig.bind(userSettingsController));
router.post('/avatar/preview', authenticate, userSettingsController.generateAvatarPreview.bind(userSettingsController));

// Rutas de validación
router.post('/validate-image-url', authenticate, userSettingsController.validateImageUrl.bind(userSettingsController));

export default router;
