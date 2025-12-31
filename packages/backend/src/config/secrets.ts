import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Lee un secreto desde un archivo o desde una variable de entorno
 * Prioriza archivos (Docker secrets) sobre variables de entorno
 *
 * @param envVarName - Nombre de la variable de entorno
 * @param envVarFileSuffix - Sufijo para la variable de entorno que contiene la ruta del archivo (default: '_FILE')
 * @param defaultValue - Valor por defecto si no se encuentra ni archivo ni variable
 * @returns El valor del secreto
 */
export function getSecret(
  envVarName: string,
  envVarFileSuffix: string = '_FILE',
  defaultValue?: string
): string {
  // 1. Intentar leer desde archivo especificado en variable de entorno
  const filePathEnvVar = envVarName + envVarFileSuffix;
  const secretFilePath = process.env[filePathEnvVar];

  if (secretFilePath) {
    try {
      const secretValue = readFileSync(secretFilePath, 'utf8').trim();
      if (secretValue) {
        console.log(`✓ Secret loaded from file: ${filePathEnvVar}`);
        return secretValue;
      }
    } catch (error) {
      console.error(`⚠ Error reading secret file ${secretFilePath}:`, error);
      // Continuar a intentar con variable de entorno
    }
  }

  // 2. Intentar leer desde ruta estándar de Docker secrets
  const dockerSecretPath = join('/run/secrets', envVarName.toLowerCase());
  try {
    const secretValue = readFileSync(dockerSecretPath, 'utf8').trim();
    if (secretValue) {
      console.log(`✓ Secret loaded from Docker secrets: ${envVarName.toLowerCase()}`);
      return secretValue;
    }
  } catch (error) {
    // No es error crítico, puede que no esté usando Docker secrets
  }

  // 3. Leer desde variable de entorno directa
  const envValue = process.env[envVarName];
  if (envValue) {
    console.log(`✓ Secret loaded from environment variable: ${envVarName}`);
    return envValue;
  }

  // 4. Usar valor por defecto
  if (defaultValue !== undefined) {
    console.log(`⚠ Using default value for: ${envVarName}`);
    return defaultValue;
  }

  // 5. Lanzar error si es un secreto requerido
  throw new Error(
    `Secret not found: ${envVarName}. ` +
    `Tried: ${filePathEnvVar}, ${dockerSecretPath}, and environment variable ${envVarName}`
  );
}

/**
 * Obtiene un secreto opcional que puede no existir
 */
export function getOptionalSecret(
  envVarName: string,
  envVarFileSuffix: string = '_FILE',
  defaultValue?: string
): string | undefined {
  try {
    return getSecret(envVarName, envVarFileSuffix, defaultValue);
  } catch (error) {
    return undefined;
  }
}

/**
 * Obtiene la configuración completa de secretos
 */
export function loadSecrets() {
  console.log('\n=== Loading Secrets Configuration ===\n');

  return {
    // Database
    db: {
      password: getSecret('DB_PASSWORD'),
    },

    // Redis
    redis: {
      password: getSecret('REDIS_PASSWORD'),
    },

    // JWT
    jwt: {
      secret: getSecret('JWT_SECRET'),
    },

    // API Keys
    gemini: {
      apiKey: getSecret('GEMINI_API_KEY'),
    },

    // OAuth2 (opcional)
    oauth: {
      gmail: {
        clientSecret: getOptionalSecret('GMAIL_CLIENT_SECRET'),
      },
      microsoft: {
        clientSecret: getOptionalSecret('MICROSOFT_CLIENT_SECRET'),
      },
    },
  };
}

// Export singleton de secretos cargados
let secretsCache: ReturnType<typeof loadSecrets> | null = null;

export function getSecrets() {
  if (!secretsCache) {
    secretsCache = loadSecrets();
  }
  return secretsCache;
}

export default getSecrets;
