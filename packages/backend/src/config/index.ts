import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiration: '7d',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'gemini_mail',
    user: process.env.DB_USER || 'gemini_user',
    password: process.env.DB_PASSWORD || 'changeme123',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
};
