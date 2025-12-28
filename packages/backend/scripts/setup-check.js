#!/usr/bin/env node

/**
 * Script de verificación post-instalación
 * Se ejecuta automáticamente después de npm install
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const platform = os.platform();

console.log('\n' + colors.cyan + '╔═══════════════════════════════════════════════════════════════╗' + colors.reset);
console.log(colors.cyan + '║          📦 Post-Instalación: Sistema de Correos IA           ║' + colors.reset);
console.log(colors.cyan + '╚═══════════════════════════════════════════════════════════════╝' + colors.reset + '\n');

// Verificar si .env existe
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  console.log(colors.yellow + '⚠ Archivo .env no encontrado' + colors.reset);
  console.log(colors.blue + '==> Configuración inicial requerida' + colors.reset);
  console.log('');

  // Sugerir comando según plataforma
  if (platform === 'win32') {
    console.log('Ejecuta el instalador automático:');
    console.log(colors.green + '  npm run setup:windows' + colors.reset);
    console.log('');
    console.log('O manualmente:');
    console.log(colors.green + '  powershell -ExecutionPolicy Bypass -File setup.ps1' + colors.reset);
  } else {
    console.log('Ejecuta el instalador automático:');
    console.log(colors.green + '  npm run setup:linux' + colors.reset);
    console.log('');
    console.log('O manualmente:');
    console.log(colors.green + '  chmod +x setup.sh && ./setup.sh' + colors.reset);
  }

  console.log('');
  console.log('Configuración manual:');
  console.log(colors.blue + '  1. cp .env.example .env' + colors.reset);
  console.log(colors.blue + '  2. npm run generate:key' + colors.reset);
  console.log(colors.blue + '  3. Edita .env con tus credenciales' + colors.reset);
  console.log(colors.blue + '  4. npm run verify' + colors.reset);
  console.log('');
} else {
  console.log(colors.green + '✓ Archivo .env encontrado' + colors.reset);
  console.log('');
  console.log('Próximos pasos:');
  console.log(colors.blue + '  1. Verifica la instalación:' + colors.reset);
  console.log(colors.green + '     npm run verify' + colors.reset);
  console.log('');
  console.log(colors.blue + '  2. Inicia el servidor:' + colors.reset);
  console.log(colors.green + '     npm run dev' + colors.reset);
  console.log('');
}

console.log('📚 Documentación completa:');
console.log(colors.cyan + '   - MEJORAS_IMPLEMENTADAS.md' + colors.reset);
console.log(colors.cyan + '   - README_SETUP.md' + colors.reset);
console.log('');
