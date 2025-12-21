import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import { EmailAccount } from '../types';

export class OAuthService {
  private gmailOAuth2Client: any;

  constructor() {
    // Configurar cliente OAuth2 de Gmail
    this.gmailOAuth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/auth/gmail/callback'
    );
  }

  // ============= GMAIL OAUTH2 =============

  getGmailAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://mail.google.com/',
    ];

    return this.gmailOAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  async getGmailTokensFromCode(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    const { tokens } = await this.gmailOAuth2Client.getToken(code);
    this.gmailOAuth2Client.setCredentials(tokens);

    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
    };
  }

  async refreshGmailAccessToken(refreshToken: string): Promise<string> {
    this.gmailOAuth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await this.gmailOAuth2Client.refreshAccessToken();
    return credentials.access_token!;
  }

  // ============= MICROSOFT/OUTLOOK OAUTH2 =============

  getMicrosoftAuthUrl(): string {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/api/auth/microsoft/callback';
    const scopes = [
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/Mail.Send',
      'offline_access',
    ];

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${clientId}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes.join(' '))}` +
      `&response_mode=query`;

    return authUrl;
  }

  async getMicrosoftTokensFromCode(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/api/auth/microsoft/callback';

    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

    const params = new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  async refreshMicrosoftAccessToken(refreshToken: string): Promise<string> {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

    const params = new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();
    return data.access_token;
  }

  // ============= TOKEN MANAGEMENT =============

  async getValidAccessToken(account: EmailAccount): Promise<string> {
    if (!account.accessToken || !account.refreshToken) {
      throw new Error('Account does not have OAuth tokens');
    }

    // Intentar usar el access token actual
    // Si falla, refrescar con el refresh token
    try {
      if (account.provider === 'gmail') {
        return await this.refreshGmailAccessToken(account.refreshToken);
      } else if (account.provider === 'outlook') {
        return await this.refreshMicrosoftAccessToken(account.refreshToken);
      }
      return account.accessToken;
    } catch (error) {
      throw new Error('Failed to refresh access token');
    }
  }
}

export default new OAuthService();
