import * as openpgp from 'openpgp';

interface KeyPair {
  publicKey: string;
  privateKey: string;
  revocationCertificate: string;
}

interface EncryptedMessage {
  encryptedData: string;
  signature?: string;
}

export class EncryptionService {
  /**
   * Genera un par de claves PGP (pública y privada)
   */
  async generateKeyPair(
    name: string,
    email: string,
    passphrase: string
  ): Promise<KeyPair> {
    const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
      type: 'rsa',
      rsaBits: 4096,
      userIDs: [{ name, email }],
      passphrase,
      format: 'armored',
    });

    return {
      publicKey,
      privateKey,
      revocationCertificate,
    };
  }

  /**
   * Encripta un mensaje usando la clave pública del destinatario
   */
  async encryptMessage(
    message: string,
    recipientPublicKey: string,
    senderPrivateKey?: string,
    passphrase?: string
  ): Promise<EncryptedMessage> {
    const publicKey = await openpgp.readKey({ armoredKey: recipientPublicKey });

    let privateKey;
    if (senderPrivateKey && passphrase) {
      const encryptedPrivateKey = await openpgp.readPrivateKey({
        armoredKey: senderPrivateKey,
      });
      privateKey = await openpgp.decryptKey({
        privateKey: encryptedPrivateKey,
        passphrase,
      });
    }

    const encrypted = await openpgp.encrypt({
      message: await openpgp.createMessage({ text: message }),
      encryptionKeys: publicKey,
      signingKeys: privateKey,
    });

    return {
      encryptedData: encrypted as string,
      signature: privateKey ? 'signed' : undefined,
    };
  }

  /**
   * Desencripta un mensaje usando la clave privada del destinatario
   */
  async decryptMessage(
    encryptedMessage: string,
    privateKey: string,
    passphrase: string,
    senderPublicKey?: string
  ): Promise<{ data: string; verified: boolean }> {
    const message = await openpgp.readMessage({
      armoredMessage: encryptedMessage,
    });

    const encryptedPrivateKey = await openpgp.readPrivateKey({
      armoredKey: privateKey,
    });

    const decryptedPrivateKey = await openpgp.decryptKey({
      privateKey: encryptedPrivateKey,
      passphrase,
    });

    let publicKey;
    let verified = false;

    if (senderPublicKey) {
      publicKey = await openpgp.readKey({ armoredKey: senderPublicKey });
    }

    const { data, signatures } = await openpgp.decrypt({
      message,
      decryptionKeys: decryptedPrivateKey,
      verificationKeys: publicKey,
    });

    if (signatures && signatures.length > 0) {
      try {
        await signatures[0].verified;
        verified = true;
      } catch (e) {
        verified = false;
      }
    }

    return {
      data: data as string,
      verified,
    };
  }

  /**
   * Firma un mensaje con la clave privada
   */
  async signMessage(
    message: string,
    privateKey: string,
    passphrase: string
  ): Promise<string> {
    const encryptedPrivateKey = await openpgp.readPrivateKey({
      armoredKey: privateKey,
    });

    const decryptedPrivateKey = await openpgp.decryptKey({
      privateKey: encryptedPrivateKey,
      passphrase,
    });

    const signedMessage = await openpgp.sign({
      message: await openpgp.createCleartextMessage({ text: message }),
      signingKeys: decryptedPrivateKey,
    });

    return signedMessage as string;
  }

  /**
   * Verifica la firma de un mensaje
   */
  async verifySignature(
    signedMessage: string,
    publicKey: string
  ): Promise<{ data: string; verified: boolean }> {
    const message = await openpgp.readCleartextMessage({
      cleartextMessage: signedMessage,
    });

    const verificationKey = await openpgp.readKey({ armoredKey: publicKey });

    const { data, signatures } = await openpgp.verify({
      message,
      verificationKeys: verificationKey,
    });

    let verified = false;
    if (signatures && signatures.length > 0) {
      try {
        await signatures[0].verified;
        verified = true;
      } catch (e) {
        verified = false;
      }
    }

    return {
      data: data as string,
      verified,
    };
  }

  /**
   * Encripta y firma un correo electrónico completo
   */
  async encryptEmail(
    emailContent: {
      subject: string;
      body: string;
      attachments?: { name: string; data: string }[];
    },
    recipientPublicKey: string,
    senderPrivateKey: string,
    passphrase: string
  ): Promise<string> {
    // Serializar el contenido del email
    const emailData = JSON.stringify(emailContent);

    // Encriptar y firmar
    const result = await this.encryptMessage(
      emailData,
      recipientPublicKey,
      senderPrivateKey,
      passphrase
    );

    return result.encryptedData;
  }

  /**
   * Desencripta un correo electrónico completo
   */
  async decryptEmail(
    encryptedEmail: string,
    recipientPrivateKey: string,
    passphrase: string,
    senderPublicKey?: string
  ): Promise<{
    subject: string;
    body: string;
    attachments?: { name: string; data: string }[];
    verified: boolean;
  }> {
    const result = await this.decryptMessage(
      encryptedEmail,
      recipientPrivateKey,
      passphrase,
      senderPublicKey
    );

    const emailContent = JSON.parse(result.data);

    return {
      ...emailContent,
      verified: result.verified,
    };
  }

  /**
   * Importa una clave pública desde formato armored
   */
  async importPublicKey(armoredKey: string): Promise<boolean> {
    try {
      await openpgp.readKey({ armoredKey });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Exporta una clave pública en formato armored
   */
  async exportPublicKey(privateKey: string, passphrase: string): Promise<string> {
    const encryptedPrivateKey = await openpgp.readPrivateKey({
      armoredKey: privateKey,
    });

    const publicKey = encryptedPrivateKey.toPublic();

    return publicKey.armor();
  }

  /**
   * Cambia la contraseña de una clave privada
   */
  async changePassphrase(
    privateKey: string,
    oldPassphrase: string,
    newPassphrase: string
  ): Promise<string> {
    const encryptedPrivateKey = await openpgp.readPrivateKey({
      armoredKey: privateKey,
    });

    const decryptedPrivateKey = await openpgp.decryptKey({
      privateKey: encryptedPrivateKey,
      passphrase: oldPassphrase,
    });

    const reencryptedPrivateKey = await openpgp.encryptKey({
      privateKey: decryptedPrivateKey,
      passphrase: newPassphrase,
    });

    return reencryptedPrivateKey.armor();
  }

  /**
   * Revoca una clave usando el certificado de revocación
   */
  async revokeKey(
    privateKey: string,
    revocationCertificate: string
  ): Promise<string> {
    const key = await openpgp.readKey({ armoredKey: privateKey });
    const revocationSignature = await openpgp.readSignature({
      armoredSignature: revocationCertificate,
    });

    const revokedKey = await openpgp.revokeKey({
      key,
      revocationCertificate: revocationSignature,
    });

    return revokedKey.armor();
  }
}

export default new EncryptionService();
