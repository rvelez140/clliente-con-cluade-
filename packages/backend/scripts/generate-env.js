#!/usr/bin/env node

/**
 * Generador automático de archivo .env
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

console.log('\n' + colors.cyan + '╔═══════════════════════════════════════════════════════════════╗' + colors.reset);
console.log(colors.cyan + '║            🔧 Generador de Configuración .env                 ║' + colors.reset);
console.log(colors.cyan + '╚═══════════════════════════════════════════════════════════════╝' + colors.reset + '\n');

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (fs.existsSync(envPath)) {
  console.log(colors.yellow + '⚠ .env ya existe' + colors.reset);
  rl.question('¿Deseas sobrescribirlo? (s/N): ', (answer) => {
    if (answer.toLowerCase() === 's') {
      generateEnv();
    } else {
      console.log(colors.blue + 'Operación cancelada' + colors.reset);
      rl.close();
    }
  });
} else {
  generateEnv();
}

function generateEnv() {
  console.log(colors.blue + '\n==> Configuración de variables de entorno\n' + colors.reset);

  const config = {};

  askQuestion('Usuario de PostgreSQL', 'postgres', (dbUser) => {
    config.DB_USER = dbUser;

    askQuestion('Contraseña de PostgreSQL', '', (dbPassword) => {
      config.DB_PASSWORD = dbPassword;

      askQuestion('Host de PostgreSQL', 'localhost', (dbHost) => {
        config.DB_HOST = dbHost;

        askQuestion('Puerto de PostgreSQL', '5432', (dbPort) => {
          config.DB_PORT = dbPort;

          askQuestion('Nombre de la base de datos', 'gemini_mail', (dbName) => {
            config.DB_NAME = dbName;

            askQuestion('Gemini API Key', '', (geminiKey) => {
              config.GEMINI_API_KEY = geminiKey;

              askOptional('Google Client ID (opcional)', (googleClientId) => {
                config.GOOGLE_CLIENT_ID = googleClientId;

                askOptional('Google Client Secret (opcional)', (googleSecret) => {
                  config.GOOGLE_CLIENT_SECRET = googleSecret;

                  askOptional('Microsoft Client ID (opcional)', (msClientId) => {
                    config.MICROSOFT_CLIENT_ID = msClientId;

                    askOptional('Microsoft Client Secret (opcional)', (msSecret) => {
                      config.MICROSOFT_CLIENT_SECRET = msSecret;

                      // Generar claves automáticamente
                      console.log(colors.blue + '\n==> Generando claves de seguridad...' + colors.reset);

                      const passwordEncryptionKey = crypto.randomBytes(32).toString('hex');
                      const jwtSecret = crypto.randomBytes(64).toString('hex');

                      // Construir DATABASE_URL
                      const dbUrl = config.DB_PASSWORD
                        ? `postgresql://${config.DB_USER}:${config.DB_PASSWORD}@${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME}`
                        : `postgresql://${config.DB_USER}@${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME}`;

                      // Crear contenido del .env
                      const envContent = `# Base de datos PostgreSQL
DATABASE_URL=${dbUrl}

# JWT
JWT_SECRET=${jwtSecret}

# Gemini AI
GEMINI_API_KEY=${config.GEMINI_API_KEY || ''}

# Google OAuth (Gmail API)
GOOGLE_CLIENT_ID=${config.GOOGLE_CLIENT_ID || ''}
GOOGLE_CLIENT_SECRET=${config.GOOGLE_CLIENT_SECRET || ''}
GOOGLE_REDIRECT_URI=http://localhost:4000/api/oauth/google/callback

# Microsoft OAuth (Outlook API)
MICROSOFT_CLIENT_ID=${config.MICROSOFT_CLIENT_ID || ''}
MICROSOFT_CLIENT_SECRET=${config.MICROSOFT_CLIENT_SECRET || ''}
MICROSOFT_REDIRECT_URI=http://localhost:4000/api/oauth/microsoft/callback

# Encriptación de contraseñas
PASSWORD_ENCRYPTION_KEY=${passwordEncryptionKey}

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# WebSocket
FRONTEND_URL=http://localhost:3000

# Logging
LOG_DIR=logs
NODE_ENV=development

# Server
PORT=4000
`;

                      // Escribir archivo
                      fs.writeFileSync(envPath, envContent);

                      console.log(colors.green + '\n✓ Archivo .env creado exitosamente\n' + colors.reset);
                      console.log('Claves generadas:');
                      console.log(colors.cyan + '  - PASSWORD_ENCRYPTION_KEY: ✓' + colors.reset);
                      console.log(colors.cyan + '  - JWT_SECRET: ✓' + colors.reset);
                      console.log('');

                      if (!config.GEMINI_API_KEY) {
                        console.log(colors.yellow + '⚠ Recuerda configurar GEMINI_API_KEY en .env' + colors.reset);
                      }

                      console.log('\nPróximos pasos:');
                      console.log(colors.blue + '  1. npm run verify  - Verificar instalación' + colors.reset);
                      console.log(colors.blue + '  2. npm run dev     - Iniciar servidor' + colors.reset);
                      console.log('');

                      rl.close();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

function askQuestion(prompt, defaultValue, callback) {
  const displayPrompt = defaultValue
    ? `${prompt} [${defaultValue}]: `
    : `${prompt}: `;

  rl.question(displayPrompt, (answer) => {
    callback(answer.trim() || defaultValue);
  });
}

function askOptional(prompt, callback) {
  rl.question(`${prompt}: `, (answer) => {
    callback(answer.trim());
  });
}
