import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { config } from '../config';

export class TextToSpeechService {
  private client: TextToSpeechClient | null = null;

  constructor() {
    // Solo inicializar si hay credenciales configuradas
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || config.gemini?.apiKey) {
      try {
        this.client = new TextToSpeechClient();
      } catch (error) {
        console.warn('Text-to-Speech no configurado, usando funcionalidad limitada');
      }
    }
  }

  async synthesize(text: string, languageCode: string = 'es-ES'): Promise<Buffer | null> {
    if (!this.client) {
      console.warn('Cliente de Text-to-Speech no disponible');
      return null;
    }

    try {
      const request = {
        input: { text },
        voice: {
          languageCode,
          ssmlGender: 'NEUTRAL' as const,
        },
        audioConfig: {
          audioEncoding: 'MP3' as const,
        },
      };

      const [response] = await this.client.synthesizeSpeech(request);

      if (response.audioContent) {
        return Buffer.from(response.audioContent as Uint8Array);
      }

      return null;
    } catch (error) {
      console.error('Error sintetizando voz:', error);
      throw error;
    }
  }

  async synthesizeEmailContent(subject: string, body: string, languageCode: string = 'es-ES'): Promise<Buffer | null> {
    const fullText = `Asunto: ${subject}. Contenido: ${body}`;
    return this.synthesize(fullText, languageCode);
  }

  isAvailable(): boolean {
    return this.client !== null;
  }
}

export default new TextToSpeechService();
