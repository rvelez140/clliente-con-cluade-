import { Request, Response } from 'express';
import oauthService from '../services/oauth.service';

export class OAuthController {
  // ============= GMAIL OAUTH =============

  async getGmailAuthUrl(req: Request, res: Response) {
    try {
      const authUrl = oauthService.getGmailAuthUrl();
      res.json({ authUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async handleGmailCallback(req: Request, res: Response) {
    try {
      const { code } = req.query;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Authorization code is required' });
      }

      const tokens = await oauthService.getGmailTokensFromCode(code);

      // En producción, guardar los tokens en la base de datos asociados al usuario
      res.json({
        success: true,
        message: 'Gmail account connected successfully',
        tokens,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============= YAHOO OAUTH =============

  async getYahooAuthUrl(req: Request, res: Response) {
    try {
      const authUrl = oauthService.getYahooAuthUrl();
      res.json({ authUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async handleYahooCallback(req: Request, res: Response) {
    try {
      const { code } = req.query;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Authorization code is required' });
      }

      const tokens = await oauthService.getYahooTokensFromCode(code);

      // En producción, guardar los tokens en la base de datos asociados al usuario
      res.json({
        success: true,
        message: 'Yahoo account connected successfully',
        tokens,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============= MICROSOFT OAUTH =============

  async getMicrosoftAuthUrl(req: Request, res: Response) {
    try {
      const authUrl = oauthService.getMicrosoftAuthUrl();
      res.json({ authUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async handleMicrosoftCallback(req: Request, res: Response) {
    try {
      const { code } = req.query;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Authorization code is required' });
      }

      const tokens = await oauthService.getMicrosoftTokensFromCode(code);

      // En producción, guardar los tokens en la base de datos asociados al usuario
      res.json({
        success: true,
        message: 'Microsoft account connected successfully',
        tokens,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new OAuthController();
