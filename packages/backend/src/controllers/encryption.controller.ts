import { Request, Response } from 'express';
import encryptionService from '../services/encryption.service';

export class EncryptionController {
  async generateKeyPair(req: Request, res: Response) {
    try {
      const { name, email, passphrase } = req.body;

      if (!name || !email || !passphrase) {
        return res.status(400).json({ error: 'Name, email, and passphrase are required' });
      }

      const keyPair = await encryptionService.generateKeyPair(name, email, passphrase);

      res.json({
        success: true,
        keyPair,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async encryptMessage(req: Request, res: Response) {
    try {
      const { message, recipientPublicKey, senderPrivateKey, passphrase } = req.body;

      if (!message || !recipientPublicKey) {
        return res.status(400).json({ error: 'Message and recipient public key are required' });
      }

      const encrypted = await encryptionService.encryptMessage(
        message,
        recipientPublicKey,
        senderPrivateKey,
        passphrase
      );

      res.json({
        success: true,
        encrypted,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async decryptMessage(req: Request, res: Response) {
    try {
      const { encryptedMessage, privateKey, passphrase, senderPublicKey } = req.body;

      if (!encryptedMessage || !privateKey || !passphrase) {
        return res.status(400).json({ error: 'Encrypted message, private key, and passphrase are required' });
      }

      const decrypted = await encryptionService.decryptMessage(
        encryptedMessage,
        privateKey,
        passphrase,
        senderPublicKey
      );

      res.json({
        success: true,
        data: decrypted.data,
        verified: decrypted.verified,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async signMessage(req: Request, res: Response) {
    try {
      const { message, privateKey, passphrase } = req.body;

      if (!message || !privateKey || !passphrase) {
        return res.status(400).json({ error: 'Message, private key, and passphrase are required' });
      }

      const signed = await encryptionService.signMessage(message, privateKey, passphrase);

      res.json({
        success: true,
        signed,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async verifySignature(req: Request, res: Response) {
    try {
      const { signedMessage, publicKey } = req.body;

      if (!signedMessage || !publicKey) {
        return res.status(400).json({ error: 'Signed message and public key are required' });
      }

      const result = await encryptionService.verifySignature(signedMessage, publicKey);

      res.json({
        success: true,
        data: result.data,
        verified: result.verified,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async encryptEmail(req: Request, res: Response) {
    try {
      const { emailContent, recipientPublicKey, senderPrivateKey, passphrase } = req.body;

      if (!emailContent || !recipientPublicKey || !senderPrivateKey || !passphrase) {
        return res.status(400).json({
          error: 'Email content, recipient public key, sender private key, and passphrase are required',
        });
      }

      const encrypted = await encryptionService.encryptEmail(
        emailContent,
        recipientPublicKey,
        senderPrivateKey,
        passphrase
      );

      res.json({
        success: true,
        encrypted,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async decryptEmail(req: Request, res: Response) {
    try {
      const { encryptedEmail, recipientPrivateKey, passphrase, senderPublicKey } = req.body;

      if (!encryptedEmail || !recipientPrivateKey || !passphrase) {
        return res.status(400).json({
          error: 'Encrypted email, recipient private key, and passphrase are required',
        });
      }

      const decrypted = await encryptionService.decryptEmail(
        encryptedEmail,
        recipientPrivateKey,
        passphrase,
        senderPublicKey
      );

      res.json({
        success: true,
        email: decrypted,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async exportPublicKey(req: Request, res: Response) {
    try {
      const { privateKey, passphrase } = req.body;

      if (!privateKey || !passphrase) {
        return res.status(400).json({ error: 'Private key and passphrase are required' });
      }

      const publicKey = await encryptionService.exportPublicKey(privateKey, passphrase);

      res.json({
        success: true,
        publicKey,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async importPublicKey(req: Request, res: Response) {
    try {
      const { publicKey } = req.body;

      if (!publicKey) {
        return res.status(400).json({ error: 'Public key is required' });
      }

      const isValid = await encryptionService.importPublicKey(publicKey);

      res.json({
        success: isValid,
        message: isValid ? 'Public key imported successfully' : 'Invalid public key',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async changePassphrase(req: Request, res: Response) {
    try {
      const { privateKey, oldPassphrase, newPassphrase } = req.body;

      if (!privateKey || !oldPassphrase || !newPassphrase) {
        return res.status(400).json({ error: 'Private key, old passphrase, and new passphrase are required' });
      }

      const newPrivateKey = await encryptionService.changePassphrase(
        privateKey,
        oldPassphrase,
        newPassphrase
      );

      res.json({
        success: true,
        privateKey: newPrivateKey,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new EncryptionController();
