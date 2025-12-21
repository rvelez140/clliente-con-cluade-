/**
 * Setup global para tests de Jest
 * Este archivo se ejecuta antes de todos los tests
 */

// Mock de variables de entorno para testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'gemini_mail_test';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = 'test_redis_password';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.GEMINI_API_KEY = 'test-gemini-api-key';
process.env.CORS_ORIGIN = 'http://localhost:5173';

// Silence console logs durante tests (opcional, puedes comentar si necesitas ver logs)
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Mantener warn y error para debugging
  warn: originalConsole.warn,
  error: originalConsole.error,
};

// Setup timeout global para tests
jest.setTimeout(10000);
