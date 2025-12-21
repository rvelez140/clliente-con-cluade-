import { OAuthService } from '../oauth.service';
import { google } from 'googleapis';
import { EmailAccount } from '../../types';

// Mock de googleapis
jest.mock('googleapis');

// Mock de fetch global
global.fetch = jest.fn();

describe('OAuthService', () => {
  let oauthService: OAuthService;
  let mockOAuth2Client: any;

  beforeEach(() => {
    // Reset environment variables
    process.env.GMAIL_CLIENT_ID = 'test-gmail-client-id';
    process.env.GMAIL_CLIENT_SECRET = 'test-gmail-secret';
    process.env.GMAIL_REDIRECT_URI = 'http://localhost:3000/api/auth/gmail/callback';
    process.env.MICROSOFT_CLIENT_ID = 'test-ms-client-id';
    process.env.MICROSOFT_CLIENT_SECRET = 'test-ms-secret';
    process.env.MICROSOFT_REDIRECT_URI = 'http://localhost:3000/api/auth/microsoft/callback';

    // Mock OAuth2Client
    mockOAuth2Client = {
      generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/oauth?...'),
      getToken: jest.fn(),
      setCredentials: jest.fn(),
      refreshAccessToken: jest.fn(),
    };

    (google.auth.OAuth2 as jest.Mock).mockImplementation(() => mockOAuth2Client);

    oauthService = new OAuthService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.GMAIL_CLIENT_ID;
    delete process.env.GMAIL_CLIENT_SECRET;
    delete process.env.GMAIL_REDIRECT_URI;
    delete process.env.MICROSOFT_CLIENT_ID;
    delete process.env.MICROSOFT_CLIENT_SECRET;
    delete process.env.MICROSOFT_REDIRECT_URI;
  });

  describe('Gmail OAuth2', () => {
    describe('getGmailAuthUrl', () => {
      it('debe generar URL de autenticación de Gmail', () => {
        const url = oauthService.getGmailAuthUrl();

        expect(url).toBe('https://accounts.google.com/oauth?...');
        expect(mockOAuth2Client.generateAuthUrl).toHaveBeenCalledWith({
          access_type: 'offline',
          scope: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://mail.google.com/',
          ],
          prompt: 'consent',
        });
      });
    });

    describe('getGmailTokensFromCode', () => {
      it('debe intercambiar código por tokens', async () => {
        const mockTokens = {
          access_token: 'access-token-123',
          refresh_token: 'refresh-token-456',
        };

        mockOAuth2Client.getToken.mockResolvedValue({ tokens: mockTokens });

        const result = await oauthService.getGmailTokensFromCode('auth-code-123');

        expect(mockOAuth2Client.getToken).toHaveBeenCalledWith('auth-code-123');
        expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith(mockTokens);
        expect(result).toEqual({
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
        });
      });

      it('debe lanzar error si falla la obtención de tokens', async () => {
        mockOAuth2Client.getToken.mockRejectedValue(new Error('Invalid code'));

        await expect(oauthService.getGmailTokensFromCode('invalid-code')).rejects.toThrow(
          'Invalid code'
        );
      });
    });

    describe('refreshGmailAccessToken', () => {
      it('debe refrescar access token de Gmail', async () => {
        const mockCredentials = {
          access_token: 'new-access-token',
        };

        mockOAuth2Client.refreshAccessToken.mockResolvedValue({
          credentials: mockCredentials,
        });

        const newToken = await oauthService.refreshGmailAccessToken('refresh-token-456');

        expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
          refresh_token: 'refresh-token-456',
        });
        expect(newToken).toBe('new-access-token');
      });

      it('debe lanzar error si falla el refresh', async () => {
        mockOAuth2Client.refreshAccessToken.mockRejectedValue(
          new Error('Invalid refresh token')
        );

        await expect(
          oauthService.refreshGmailAccessToken('invalid-refresh')
        ).rejects.toThrow('Invalid refresh token');
      });
    });
  });

  describe('Microsoft/Outlook OAuth2', () => {
    describe('getMicrosoftAuthUrl', () => {
      it('debe generar URL de autenticación de Microsoft', () => {
        const url = oauthService.getMicrosoftAuthUrl();

        expect(url).toContain('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
        expect(url).toContain('client_id=test-ms-client-id');
        expect(url).toContain('response_type=code');
        expect(url).toContain(
          encodeURIComponent('http://localhost:3000/api/auth/microsoft/callback')
        );
        expect(url).toContain(
          encodeURIComponent('https://graph.microsoft.com/Mail.ReadWrite')
        );
      });

      it('debe incluir todos los scopes necesarios', () => {
        const url = oauthService.getMicrosoftAuthUrl();

        expect(url).toContain('Mail.ReadWrite');
        expect(url).toContain('Mail.Send');
        expect(url).toContain('offline_access');
      });
    });

    describe('getMicrosoftTokensFromCode', () => {
      it('debe intercambiar código por tokens de Microsoft', async () => {
        const mockResponse = {
          access_token: 'ms-access-token',
          refresh_token: 'ms-refresh-token',
        };

        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse,
        });

        const result = await oauthService.getMicrosoftTokensFromCode('auth-code-ms');

        expect(global.fetch).toHaveBeenCalledWith(
          'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          })
        );

        expect(result).toEqual({
          accessToken: 'ms-access-token',
          refreshToken: 'ms-refresh-token',
        });
      });

      it('debe enviar parámetros correctos en el body', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => ({ access_token: 'token', refresh_token: 'refresh' }),
        });

        await oauthService.getMicrosoftTokensFromCode('code123');

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
        const bodyParams = new URLSearchParams(fetchCall[1].body);

        expect(bodyParams.get('client_id')).toBe('test-ms-client-id');
        expect(bodyParams.get('client_secret')).toBe('test-ms-secret');
        expect(bodyParams.get('code')).toBe('code123');
        expect(bodyParams.get('grant_type')).toBe('authorization_code');
      });
    });

    describe('refreshMicrosoftAccessToken', () => {
      it('debe refrescar access token de Microsoft', async () => {
        const mockResponse = {
          access_token: 'new-ms-access-token',
        };

        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => mockResponse,
        });

        const newToken = await oauthService.refreshMicrosoftAccessToken('ms-refresh-token');

        expect(newToken).toBe('new-ms-access-token');

        const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
        const bodyParams = new URLSearchParams(fetchCall[1].body);

        expect(bodyParams.get('refresh_token')).toBe('ms-refresh-token');
        expect(bodyParams.get('grant_type')).toBe('refresh_token');
      });
    });
  });

  describe('Token Management', () => {
    describe('getValidAccessToken', () => {
      it('debe lanzar error si la cuenta no tiene tokens OAuth', async () => {
        const account: EmailAccount = {
          id: 'acc-1',
          userId: 'user-1',
          email: 'test@gmail.com',
          provider: 'gmail',
          displayName: 'Test User',
          isDefault: true,
          isSyncing: false,
          lastSyncAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          // Sin accessToken ni refreshToken
        };

        await expect(oauthService.getValidAccessToken(account)).rejects.toThrow(
          'Account does not have OAuth tokens'
        );
      });

      it('debe refrescar token de Gmail si la cuenta es Gmail', async () => {
        const account: EmailAccount = {
          id: 'acc-1',
          userId: 'user-1',
          email: 'test@gmail.com',
          provider: 'gmail',
          accessToken: 'old-token',
          refreshToken: 'gmail-refresh',
          displayName: 'Test User',
          isDefault: true,
          isSyncing: false,
          lastSyncAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockOAuth2Client.refreshAccessToken.mockResolvedValue({
          credentials: { access_token: 'new-gmail-token' },
        });

        const token = await oauthService.getValidAccessToken(account);

        expect(token).toBe('new-gmail-token');
        expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({
          refresh_token: 'gmail-refresh',
        });
      });

      it('debe refrescar token de Microsoft si la cuenta es Outlook', async () => {
        const account: EmailAccount = {
          id: 'acc-1',
          userId: 'user-1',
          email: 'test@outlook.com',
          provider: 'outlook',
          accessToken: 'old-ms-token',
          refreshToken: 'ms-refresh',
          displayName: 'Test User',
          isDefault: true,
          isSyncing: false,
          lastSyncAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (global.fetch as jest.Mock).mockResolvedValue({
          json: async () => ({ access_token: 'new-ms-token' }),
        });

        const token = await oauthService.getValidAccessToken(account);

        expect(token).toBe('new-ms-token');
      });

      it('debe devolver access token actual si el proveedor no es Gmail ni Outlook', async () => {
        const account: EmailAccount = {
          id: 'acc-1',
          userId: 'user-1',
          email: 'test@custom.com',
          provider: 'custom',
          accessToken: 'custom-token',
          refreshToken: 'custom-refresh',
          displayName: 'Test User',
          isDefault: true,
          isSyncing: false,
          lastSyncAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const token = await oauthService.getValidAccessToken(account);

        expect(token).toBe('custom-token');
      });

      it('debe lanzar error si falla el refresh del token', async () => {
        const account: EmailAccount = {
          id: 'acc-1',
          userId: 'user-1',
          email: 'test@gmail.com',
          provider: 'gmail',
          accessToken: 'old-token',
          refreshToken: 'invalid-refresh',
          displayName: 'Test User',
          isDefault: true,
          isSyncing: false,
          lastSyncAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockOAuth2Client.refreshAccessToken.mockRejectedValue(
          new Error('Refresh failed')
        );

        await expect(oauthService.getValidAccessToken(account)).rejects.toThrow(
          'Failed to refresh access token'
        );
      });
    });
  });
});
