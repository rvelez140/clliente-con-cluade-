import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiRequest, GeminiResponse } from '../types';
import { config } from '../config';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

export class GeminiService {
  private model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  async generateEmailContent(request: GeminiRequest): Promise<GeminiResponse> {
    try {
      const { prompt, context, tone = 'professional', length = 'medium' } = request;

      const fullPrompt = this.buildPrompt(prompt, context, tone, length);

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      return {
        text: text.trim(),
        suggestions: this.generateSuggestions(text),
      };
    } catch (error) {
      console.error('Error generando contenido con Gemini:', error);
      throw new Error('No se pudo generar el contenido del correo');
    }
  }

  async improveDraft(draft: string, improvements: string): Promise<string> {
    try {
      const prompt = `Mejora el siguiente borrador de correo electrónico basándote en estas instrucciones: ${improvements}

Borrador actual:
${draft}

Por favor, proporciona una versión mejorada del correo manteniendo el contexto y el mensaje principal.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error mejorando borrador:', error);
      throw new Error('No se pudo mejorar el borrador');
    }
  }

  async summarizeEmail(emailBody: string): Promise<string> {
    try {
      const prompt = `Resume el siguiente correo electrónico en 2-3 oraciones concisas:

${emailBody}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error resumiendo correo:', error);
      throw new Error('No se pudo resumir el correo');
    }
  }

  async suggestReply(emailBody: string, tone: string = 'professional'): Promise<string[]> {
    try {
      const prompt = `Dado el siguiente correo electrónico, sugiere 3 posibles respuestas breves con un tono ${tone}:

${emailBody}

Proporciona solo las respuestas, separadas por líneas en blanco.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();

      return text.split('\n\n').filter(s => s.trim().length > 0);
    } catch (error) {
      console.error('Error sugiriendo respuestas:', error);
      throw new Error('No se pudieron generar sugerencias de respuesta');
    }
  }

  private buildPrompt(
    userPrompt: string,
    context?: string,
    tone?: string,
    length?: string
  ): string {
    let prompt = 'Eres un asistente de redacción de correos electrónicos profesional. ';

    if (tone) {
      const toneDescriptions = {
        formal: 'muy formal y respetuoso',
        casual: 'casual y amigable',
        friendly: 'amigable y cálido',
        professional: 'profesional y cortés',
      };
      prompt += `Usa un tono ${toneDescriptions[tone as keyof typeof toneDescriptions] || 'profesional'}. `;
    }

    if (length) {
      const lengthDescriptions = {
        short: 'Mantén la respuesta breve (2-3 oraciones)',
        medium: 'Proporciona una respuesta de longitud media (1-2 párrafos)',
        long: 'Proporciona una respuesta detallada (3-4 párrafos)',
      };
      prompt += `${lengthDescriptions[length as keyof typeof lengthDescriptions] || ''}. `;
    }

    if (context) {
      prompt += `\n\nContexto: ${context}`;
    }

    prompt += `\n\nTarea: ${userPrompt}`;

    return prompt;
  }

  private generateSuggestions(text: string): string[] {
    return [
      'Hacer más formal',
      'Hacer más conciso',
      'Agregar más detalles',
      'Cambiar el tono',
    ];
  }
}

export default new GeminiService();
