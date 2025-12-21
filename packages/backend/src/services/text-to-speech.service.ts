import textToSpeech from '@google-cloud/text-to-speech';
import { config } from '../config';

export class TextToSpeechService {
  private client: textToSpeech.TextToSpeechClient | null = null;

  constructor() {
    // Solo inicializar si hay credenciales configuradas
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || config.gemini?.apiKey) {
      try {
        this.client = new textToSpeech.TextToSpeechClient();
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
          ssmlGender: textToSpeech.protos.google.cloud.texttospeech.v1.SsmlVoiceGender.NEUTRAL,
        },
        audioConfig: {
          audioEncoding: textToSpeech.protos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
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
