import crypto from 'crypto';

export class PasswordEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly saltLength = 64;
  private readonly tagLength = 16;
  private readonly iterations = 100000;

  /**
   * Obtiene la clave de encriptación desde las variables de entorno
   * Si no existe, genera una (solo para desarrollo)
   */
  private getEncryptionKey(): string {
    const key = process.env.PASSWORD_ENCRYPTION_KEY;

    if (!key) {
      console.warn('⚠️  PASSWORD_ENCRYPTION_KEY no está configurada. Usando clave temporal (NO USAR EN PRODUCCIÓN)');
      // En producción, esto debería lanzar un error
      return crypto.randomBytes(32).toString('hex');
    }

    return key;
  }

  /**
   * Deriva una clave desde la master key usando PBKDF2
   */
  private deriveKey(salt: Buffer): Buffer {
    const masterKey = this.getEncryptionKey();
    return crypto.pbkdf2Sync(
      masterKey,
      salt,
      this.iterations,
      this.keyLength,
      'sha512'
    );
  }

  /**
   * Encripta una contraseña
   * @param password - Contraseña en texto plano
   * @returns String encriptado en formato: salt:iv:tag:encrypted
   */
  encrypt(password: string): string {
    try {
      // Generar salt aleatorio
      const salt = crypto.randomBytes(this.saltLength);

      // Derivar clave desde la master key
      const key = this.deriveKey(salt);

      // Generar IV aleatorio
      const iv = crypto.randomBytes(this.ivLength);

      // Crear cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encriptar
      let encrypted = cipher.update(password, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Obtener authentication tag
      const tag = cipher.getAuthTag();

      // Retornar en formato: salt:iv:tag:encrypted
      return [
        salt.toString('hex'),
        iv.toString('hex'),
        tag.toString('hex'),
        encrypted
      ].join(':');
    } catch (error) {
      console.error('Error encriptando contraseña:', error);
      throw new Error('Error al encriptar la contraseña');
    }
  }

  /**
   * Desencripta una contraseña
   * @param encryptedPassword - String encriptado en formato: salt:iv:tag:encrypted
   * @returns Contraseña en texto plano
   */
  decrypt(encryptedPassword: string): string {
    try {
      // Parsear el string encriptado
      const parts = encryptedPassword.split(':');

      if (parts.length !== 4) {
        throw new Error('Formato de contraseña encriptada inválido');
      }

      const [saltHex, ivHex, tagHex, encrypted] = parts;

      // Convertir de hex a Buffer
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');

      // Derivar la misma clave
      const key = this.deriveKey(salt);

      // Crear decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      // Desencriptar
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Error desencriptando contraseña:', error);
      throw new Error('Error al desencriptar la contraseña');
    }
  }

  /**
   * Verifica si una string está encriptada
   */
  isEncrypted(value: string): boolean {
    const parts = value.split(':');
    return parts.length === 4 &&
           parts.every(part => /^[0-9a-f]+$/i.test(part));
  }

  /**
   * Re-encripta contraseñas con una nueva clave
   * Útil para rotación de claves
   */
  reencrypt(oldEncryptedPassword: string, newMasterKey: string): string {
    // Desencriptar con la clave actual
    const plainPassword = this.decrypt(oldEncryptedPassword);

    // Temporalmente cambiar la clave
    const originalKey = process.env.PASSWORD_ENCRYPTION_KEY;
    process.env.PASSWORD_ENCRYPTION_KEY = newMasterKey;

    try {
      // Encriptar con la nueva clave
      const newEncrypted = this.encrypt(plainPassword);
      return newEncrypted;
    } finally {
      // Restaurar la clave original
      process.env.PASSWORD_ENCRYPTION_KEY = originalKey;
    }
  }

  /**
   * Genera una clave de encriptación segura para usar en .env
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

export default new PasswordEncryptionService();
