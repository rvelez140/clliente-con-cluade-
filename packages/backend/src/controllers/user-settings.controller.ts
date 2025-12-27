import { Request, Response } from 'express';
import emailSignatureService, { EmailSignature } from '../services/email-signature.service';
import avatarService from '../services/avatar.service';

export class UserSettingsController {
  /**
   * Obtiene la firma del usuario autenticado
   */
  async getSignature(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      const signature = await emailSignatureService.getUserSignature(userId);

      res.json({
        signature: signature || null,
      });
    } catch (error) {
      console.error('Error obteniendo firma:', error);
      res.status(500).json({ error: 'Error obteniendo firma' });
    }
  }

  /**
   * Actualiza la firma del usuario autenticado
   */
  async updateSignature(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      const { signature } = req.body;

      if (!signature) {
        res.status(400).json({ error: 'La firma es requerida' });
        return;
      }

      await emailSignatureService.createUserSignature(userId, signature);

      res.json({ success: true, message: 'Firma actualizada correctamente' });
    } catch (error) {
      console.error('Error actualizando firma:', error);
      res.status(500).json({ error: 'Error actualizando firma' });
    }
  }

  /**
   * Genera una firma HTML a partir de datos estructurados
   */
  async generateSignature(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      const signatureData: EmailSignature = {
        userId,
        ...req.body,
      };

      // Validar URL de imagen de fondo si existe
      if (signatureData.backgroundImageUrl && !emailSignatureService.isValidImageUrl(signatureData.backgroundImageUrl)) {
        res.status(400).json({ error: 'URL de imagen de fondo inválida' });
        return;
      }

      const signatureHtml = emailSignatureService.generateSignatureHtml(signatureData);

      res.json({ signature: signatureHtml });
    } catch (error) {
      console.error('Error generando firma:', error);
      res.status(500).json({ error: 'Error generando firma' });
    }
  }

  /**
   * Obtiene la configuración de avatar del usuario
   */
  async getAvatarConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      const avatarConfig = await avatarService.getUserAvatarConfig(userId);

      if (!avatarConfig) {
        res.status(404).json({ error: 'Configuración de avatar no encontrada' });
        return;
      }

      // Generar la URL del avatar
      const avatarUrl = avatarService.generateAvatarUrl(avatarConfig);

      res.json({
        ...avatarConfig,
        avatarUrl,
      });
    } catch (error) {
      console.error('Error obteniendo configuración de avatar:', error);
      res.status(500).json({ error: 'Error obteniendo configuración de avatar' });
    }
  }

  /**
   * Actualiza la configuración de avatar del usuario
   */
  async updateAvatarConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      const { type, customUrl, backgroundColor } = req.body;

      if (!type || !['gravatar', 'initials', 'custom'].includes(type)) {
        res.status(400).json({ error: 'Tipo de avatar inválido' });
        return;
      }

      if (type === 'custom' && customUrl && !avatarService.isValidAvatarUrl(customUrl)) {
        res.status(400).json({ error: 'URL de avatar personalizado inválida' });
        return;
      }

      const success = await avatarService.updateUserAvatarConfig(
        userId,
        type,
        customUrl,
        backgroundColor
      );

      if (!success) {
        res.status(500).json({ error: 'Error actualizando configuración de avatar' });
        return;
      }

      res.json({ success: true, message: 'Configuración de avatar actualizada correctamente' });
    } catch (error) {
      console.error('Error actualizando configuración de avatar:', error);
      res.status(500).json({ error: 'Error actualizando configuración de avatar' });
    }
  }

  /**
   * Genera un avatar preview
   */
  async generateAvatarPreview(req: Request, res: Response): Promise<void> {
    try {
      const { email, name, type, size, backgroundColor } = req.body;

      if (!email) {
        res.status(400).json({ error: 'El email es requerido' });
        return;
      }

      const avatarUrl = avatarService.generateAvatarUrl({
        email,
        name,
        type: type || 'gravatar',
        size: size || 80,
        backgroundColor,
      });

      res.json({ avatarUrl });
    } catch (error) {
      console.error('Error generando preview de avatar:', error);
      res.status(500).json({ error: 'Error generando preview de avatar' });
    }
  }

  /**
   * Genera una firma de ejemplo con imagen de fondo
   */
  async generateSignatureSample(req: Request, res: Response): Promise<void> {
    try {
      const { name, title, company, backgroundImageUrl } = req.body;

      if (!name) {
        res.status(400).json({ error: 'El nombre es requerido' });
        return;
      }

      // Validar URL de imagen de fondo si existe
      if (backgroundImageUrl && !emailSignatureService.isValidImageUrl(backgroundImageUrl)) {
        res.status(400).json({ error: 'URL de imagen de fondo inválida' });
        return;
      }

      const signatureHtml = emailSignatureService.generateSampleSignatureWithBackground(
        name,
        title || '',
        company || '',
        backgroundImageUrl
      );

      res.json({ signature: signatureHtml });
    } catch (error) {
      console.error('Error generando firma de ejemplo:', error);
      res.status(500).json({ error: 'Error generando firma de ejemplo' });
    }
  }

  /**
   * Valida una URL de imagen
   */
  async validateImageUrl(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.body;

      if (!url) {
        res.status(400).json({ error: 'La URL es requerida' });
        return;
      }

      const isValid = emailSignatureService.isValidImageUrl(url);

      res.json({ valid: isValid });
    } catch (error) {
      console.error('Error validando URL de imagen:', error);
      res.status(500).json({ error: 'Error validando URL de imagen' });
    }
  }
}

export default new UserSettingsController();
