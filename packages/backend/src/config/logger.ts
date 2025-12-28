import winston from 'winston';
import path from 'path';

const logDir = process.env.LOG_DIR || 'logs';

/**
 * Configuración de niveles de log personalizados
 */
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Colores para cada nivel de log
 */
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

/**
 * Formato para logs en desarrollo (consola)
 */
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

/**
 * Formato para logs en producción (JSON)
 */
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Determinar nivel de log según entorno
 */
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

/**
 * Configurar transporters
 */
const transports = [
  // Consola
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  }),

  // Archivo para errores
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: prodFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Archivo para todos los logs
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: prodFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // Archivo para actividad HTTP
  new winston.transports.File({
    filename: path.join(logDir, 'http.log'),
    level: 'http',
    format: prodFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 3,
  }),
];

/**
 * Logger principal
 */
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  // No salir en errores no capturados
  exitOnError: false,
});

/**
 * Logger específico para emails
 */
export const emailLogger = winston.createLogger({
  level: level(),
  levels,
  defaultMeta: { service: 'email-service' },
  transports: [
    new winston.transports.Console({ format: devFormat }),
    new winston.transports.File({
      filename: path.join(logDir, 'email.log'),
      format: prodFormat,
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

/**
 * Logger específico para scheduler
 */
export const schedulerLogger = winston.createLogger({
  level: level(),
  levels,
  defaultMeta: { service: 'scheduler-service' },
  transports: [
    new winston.transports.Console({ format: devFormat }),
    new winston.transports.File({
      filename: path.join(logDir, 'scheduler.log'),
      format: prodFormat,
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

/**
 * Stream para Morgan (HTTP logging middleware)
 */
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export default logger;
