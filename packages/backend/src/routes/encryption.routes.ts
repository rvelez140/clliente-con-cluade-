import { Router } from 'express';
import encryptionController from '../controllers/encryption.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Gestión de claves
router.post('/generate-keypair', encryptionController.generateKeyPair);
router.post('/export-public-key', encryptionController.exportPublicKey);
router.post('/import-public-key', encryptionController.importPublicKey);
router.post('/change-passphrase', encryptionController.changePassphrase);

// Encriptación de mensajes
router.post('/encrypt', encryptionController.encryptMessage);
router.post('/decrypt', encryptionController.decryptMessage);

// Firma de mensajes
router.post('/sign', encryptionController.signMessage);
router.post('/verify', encryptionController.verifySignature);

// Encriptación de emails completos
router.post('/encrypt-email', encryptionController.encryptEmail);
router.post('/decrypt-email', encryptionController.decryptEmail);

export default router;
