import dotenv from 'dotenv';
import { getSecret, getOptionalSecret } from './secrets';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: getSecret('JWT_SECRET', '_FILE', 'your-secret-key'),
  jwtExpiration: '7d',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'gemini_mail',
    user: process.env.DB_USER || 'gemini_user',
    password: getSecret('DB_PASSWORD', '_FILE', 'changeme123'),
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: getOptionalSecret('REDIS_PASSWORD'),
  },

  gemini: {
    apiKey: getSecret('GEMINI_API_KEY', '_FILE', ''),
  },

  oauth: {
    gmail: {
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: getOptionalSecret('GMAIL_CLIENT_SECRET'),
      redirectUri: process.env.GMAIL_REDIRECT_URI,
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: getOptionalSecret('MICROSOFT_CLIENT_SECRET'),
      redirectUri: process.env.MICROSOFT_REDIRECT_URI,
    },
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },

  // Configuración de trust proxy para uso detrás de reverse proxy
  trustProxy: process.env.TRUST_PROXY === 'true',
};
