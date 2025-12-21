/**
 * Mock del módulo de secretos para testing
 * Jest automáticamente usará este mock cuando se llame a jest.mock('../config/secrets')
 */

// Mapas de secretos para testing
const secretMap: Record<string, string> = {
  DB_PASSWORD: 'test_password',
  REDIS_PASSWORD: 'test_redis_password',
  JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
  GEMINI_API_KEY: 'test-gemini-api-key',
};

const optionalSecretMap: Record<string, string | undefined> = {
  REDIS_PASSWORD: 'test_redis_password',
  GMAIL_CLIENT_SECRET: undefined,
  MICROSOFT_CLIENT_SECRET: undefined,
};

// Implementación mockeada de getSecret
export function getSecret(name: string, suffix?: string, defaultValue?: string): string {
  return secretMap[name] || defaultValue || '';
}

// Implementación mockeada de getOptionalSecret
export function getOptionalSecret(name: string, suffix?: string, defaultValue?: string): string | undefined {
  return optionalSecretMap[name] !== undefined ? optionalSecretMap[name] : defaultValue;
}

// Implementación mockeada de getSecrets
export function getSecrets() {
  return {
    db: {
      password: 'test_password',
    },
    redis: {
      password: 'test_redis_password',
    },
    jwt: {
      secret: 'test-jwt-secret-key-for-testing-only',
    },
    gemini: {
      apiKey: 'test-gemini-api-key',
    },
    oauth: {
      gmail: {
        clientSecret: undefined,
      },
      microsoft: {
        clientSecret: undefined,
      },
    },
  };
}

// Implementación mockeada de loadSecrets
export function loadSecrets() {
  return getSecrets();
}

export default getSecrets;
