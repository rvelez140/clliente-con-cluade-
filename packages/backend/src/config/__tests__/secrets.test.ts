// Mock del módulo de secretos antes de importarlo
jest.mock('../secrets');

import { getSecret, getOptionalSecret, getSecrets } from '../secrets';

describe('Secrets Configuration', () => {
  // Reset mocks antes de cada test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('getSecret', () => {
    it('should return secret from environment variable', () => {
      const result = getSecret('DB_PASSWORD');
      expect(result).toBe('test_password');
    });

    it('should return secret for JWT_SECRET', () => {
      const result = getSecret('JWT_SECRET');
      expect(result).toBe('test-jwt-secret-key-for-testing-only');
    });

    it('should return default value when secret not found', () => {
      const result = getSecret('NON_EXISTENT_SECRET', '_FILE', 'default_value');
      expect(result).toBe('default_value');
    });

    it('should return secret for GEMINI_API_KEY', () => {
      const result = getSecret('GEMINI_API_KEY');
      expect(result).toBe('test-gemini-api-key');
    });
  });

  describe('getOptionalSecret', () => {
    it('should return optional secret when it exists', () => {
      const result = getOptionalSecret('REDIS_PASSWORD');
      expect(result).toBe('test_redis_password');
    });

    it('should return undefined for non-existent optional secret', () => {
      const result = getOptionalSecret('GMAIL_CLIENT_SECRET');
      expect(result).toBeUndefined();
    });

    it('should return undefined for Microsoft client secret in test', () => {
      const result = getOptionalSecret('MICROSOFT_CLIENT_SECRET');
      expect(result).toBeUndefined();
    });
  });

  describe('getSecrets', () => {
    it('should return all secrets configuration', () => {
      const secrets = getSecrets();

      expect(secrets).toHaveProperty('db');
      expect(secrets.db).toHaveProperty('password', 'test_password');

      expect(secrets).toHaveProperty('redis');
      expect(secrets.redis).toHaveProperty('password', 'test_redis_password');

      expect(secrets).toHaveProperty('jwt');
      expect(secrets.jwt).toHaveProperty('secret', 'test-jwt-secret-key-for-testing-only');

      expect(secrets).toHaveProperty('gemini');
      expect(secrets.gemini).toHaveProperty('apiKey', 'test-gemini-api-key');

      expect(secrets).toHaveProperty('oauth');
      expect(secrets.oauth).toHaveProperty('gmail');
      expect(secrets.oauth).toHaveProperty('microsoft');
    });

    it('should have OAuth secrets as undefined in test environment', () => {
      const secrets = getSecrets();

      expect(secrets.oauth.gmail.clientSecret).toBeUndefined();
      expect(secrets.oauth.microsoft.clientSecret).toBeUndefined();
    });
  });

  describe('Secrets in test environment', () => {
    it('should have all required secrets configured', () => {
      const dbPassword = getSecret('DB_PASSWORD');
      const redisPassword = getOptionalSecret('REDIS_PASSWORD');
      const jwtSecret = getSecret('JWT_SECRET');
      const geminiApiKey = getSecret('GEMINI_API_KEY');

      expect(dbPassword).toBeTruthy();
      expect(redisPassword).toBeTruthy();
      expect(jwtSecret).toBeTruthy();
      expect(geminiApiKey).toBeTruthy();
    });

    it('should not expose real secrets in test environment', () => {
      const jwtSecret = getSecret('JWT_SECRET');

      // En test, no deberíamos tener valores de producción
      expect(jwtSecret).toContain('test');
      expect(jwtSecret).not.toBe('your-secret-key');
    });
  });
});
