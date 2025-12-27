#!/usr/bin/env node

/**
 * Script de Verificación de Instalación
 * Verifica que todos los componentes estén correctamente instalados
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createClient } = require('redis');
const { Pool } = require('pg');

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const success = (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`);
const error = (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`);
const warning = (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`);
const info = (msg) => console.log(`${colors.blue}==>${colors.reset} ${msg}`);

let allPassed = true;

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║          🔍 Verificación de Instalación del Sistema          ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// 1. Verificar Node.js
info('Verificando Node.js...');
try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion >= 18) {
    success(`Node.js ${nodeVersion} (✓ Compatible)`);
  } else {
    error(`Node.js ${nodeVersion} (✗ Requiere v18+)`);
    allPassed = false;
  }
} catch (err) {
  error('Node.js no encontrado');
  allPassed = false;
}

// 2. Verificar npm
info('Verificando npm...');
try {
  const npmVersion = execSync('npm -v', { encoding: 'utf-8' }).trim();
  success(`npm v${npmVersion}`);
} catch (err) {
  error('npm no encontrado');
  allPassed = false;
}

// 3. Verificar dependencias de Node.js
info('Verificando dependencias de Node.js...');
const packageJson = require('../package.json');
const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
let missingDeps = [];

for (const dep in dependencies) {
  try {
    require.resolve(dep);
  } catch (err) {
    missingDeps.push(dep);
  }
}

if (missingDeps.length === 0) {
  success(`Todas las dependencias instaladas (${Object.keys(dependencies).length} paquetes)`);
} else {
  error(`Dependencias faltantes: ${missingDeps.join(', ')}`);
  warning('Ejecuta: npm install');
  allPassed = false;
}

// 4. Verificar archivo .env
info('Verificando archivo .env...');
const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  success('Archivo .env existe');

  // Leer y verificar configuraciones críticas
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const requiredVars = [
    'PASSWORD_ENCRYPTION_KEY',
    'JWT_SECRET',
    'DATABASE_URL',
  ];

  const optionalVars = [
    'GEMINI_API_KEY',
    'REDIS_URL',
  ];

  let missingRequired = [];
  let missingOptional = [];

  requiredVars.forEach(varName => {
    const regex = new RegExp(`^${varName}=(.+)$`, 'm');
    const match = envContent.match(regex);
    if (!match || !match[1] || match[1].trim() === '') {
      missingRequired.push(varName);
    } else {
      success(`  ${varName} configurado`);
    }
  });

  optionalVars.forEach(varName => {
    const regex = new RegExp(`^${varName}=(.+)$`, 'm');
    const match = envContent.match(regex);
    if (!match || !match[1] || match[1].trim() === '') {
      missingOptional.push(varName);
    } else {
      success(`  ${varName} configurado`);
    }
  });

  if (missingRequired.length > 0) {
    error(`  Variables requeridas faltantes: ${missingRequired.join(', ')}`);
    allPassed = false;
  }

  if (missingOptional.length > 0) {
    warning(`  Variables opcionales faltantes: ${missingOptional.join(', ')}`);
  }
} else {
  error('Archivo .env no encontrado');
  warning('Ejecuta: cp .env.example .env');
  allPassed = false;
}

// 5. Verificar Redis
info('Verificando Redis...');
(async () => {
  let redisClient;
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 3000
      }
    });

    await redisClient.connect();
    const pong = await redisClient.ping();

    if (pong === 'PONG') {
      success('Redis conectado y funcionando');
    } else {
      error('Redis no responde correctamente');
      allPassed = false;
    }

    await redisClient.quit();
  } catch (err) {
    error(`Redis no disponible: ${err.message}`);
    warning('Inicia Redis o verifica la configuración REDIS_URL');
    allPassed = false;
  }

  // 6. Verificar PostgreSQL
  info('Verificando PostgreSQL...');
  try {
    require('dotenv').config();

    if (!process.env.DATABASE_URL) {
      error('DATABASE_URL no configurado en .env');
      allPassed = false;
    } else {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 3000,
      });

      const client = await pool.connect();
      const result = await client.query('SELECT version()');
      const version = result.rows[0].version;

      success(`PostgreSQL conectado: ${version.split(' ')[1]}`);

      // Verificar tablas
      const tablesResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      const tables = tablesResult.rows.map(r => r.table_name);
      const requiredTables = [
        'users',
        'email_accounts',
        'emails',
        'scheduled_emails',
        'scheduled_email_history',
        'email_templates',
        'email_metrics',
      ];

      const missingTables = requiredTables.filter(t => !tables.includes(t));

      if (missingTables.length === 0) {
        success(`  Todas las tablas creadas (${tables.length} tablas)`);
      } else {
        error(`  Tablas faltantes: ${missingTables.join(', ')}`);
        warning('  Ejecuta: psql -U postgres -d gemini_mail -f src/scripts/init-db.sql');
        allPassed = false;
      }

      client.release();
      await pool.end();
    }
  } catch (err) {
    error(`PostgreSQL error: ${err.message}`);
    warning('Verifica DATABASE_URL en .env');
    allPassed = false;
  }

  // 7. Verificar directorio de logs
  info('Verificando directorio de logs...');
  const logsDir = path.join(__dirname, '..', 'logs');
  if (fs.existsSync(logsDir)) {
    const stats = fs.statSync(logsDir);
    if (stats.isDirectory()) {
      success('Directorio logs/ existe');
    } else {
      error('logs/ existe pero no es un directorio');
      allPassed = false;
    }
  } else {
    warning('Directorio logs/ no existe, se creará al iniciar');
    fs.mkdirSync(logsDir);
    success('Directorio logs/ creado');
  }

  // 8. Verificar archivos críticos
  info('Verificando archivos del proyecto...');
  const criticalFiles = [
    'src/index.ts',
    'src/config/database.ts',
    'src/config/logger.ts',
    'src/services/email.service.ts',
    'src/services/scheduled-email.service.ts',
    'src/services/password-encryption.service.ts',
    'src/scripts/init-db.sql',
  ];

  let missingFiles = [];
  criticalFiles.forEach(file => {
    if (fs.existsSync(path.join(__dirname, '..', file))) {
      success(`  ${file} ✓`);
    } else {
      missingFiles.push(file);
    }
  });

  if (missingFiles.length > 0) {
    error(`Archivos faltantes: ${missingFiles.join(', ')}`);
    allPassed = false;
  }

  // Resultado final
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  if (allPassed) {
    console.log('║              ✅ SISTEMA VERIFICADO CORRECTAMENTE              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    success('Todos los componentes funcionando correctamente');
    console.log('\n📚 Próximos pasos:');
    console.log('   npm run dev    - Iniciar en desarrollo');
    console.log('   npm run build  - Compilar para producción');
    console.log('   npm start      - Iniciar en producción\n');
    process.exit(0);
  } else {
    console.log('║              ⚠️  VERIFICACIÓN INCOMPLETA                      ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    error('Algunos componentes requieren configuración');
    console.log('\n📚 Revisa los errores anteriores y:');
    console.log('   1. Ejecuta ./setup.sh (Linux/macOS) o ./setup.ps1 (Windows)');
    console.log('   2. Configura las variables faltantes en .env');
    console.log('   3. Ejecuta nuevamente: npm run verify\n');
    process.exit(1);
  }
})();
