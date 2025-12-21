import { GeminiService } from '../gemini.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiRequest } from '../../types';

jest.mock('@google/generative-ai');

describe('GeminiService', () => {
  let geminiService: GeminiService;
  let mockGenerateContent: jest.Mock;
  let mockModel: any;

  beforeEach(() => {
    mockGenerateContent = jest.fn();
    mockModel = {
      generateContent: mockGenerateContent,
    };

    (GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>).mockImplementation(
      () =>
        ({
          getGenerativeModel: () => mockModel,
        } as any)
    );

    geminiService = new GeminiService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEmailContent', () => {
    it('debe generar contenido de email correctamente', async () => {
      const mockResponse = {
        response: {
          text: () => 'Estimado cliente,\n\nGracias por su interés...',
        },
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const request: GeminiRequest = {
        prompt: 'Escribe un email de agradecimiento',
        context: 'Cliente nuevo',
        tone: 'professional',
        length: 'medium',
      };

      const result = await geminiService.generateEmailContent(request);

      expect(result.text).toBe('Estimado cliente,\n\nGracias por su interés...');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining('profesional'));
    });

    it('debe manejar errores correctamente', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'));

      const request: GeminiRequest = {
        prompt: 'Test',
      };

      await expect(geminiService.generateEmailContent(request)).rejects.toThrow(
        'No se pudo generar el contenido del correo'
      );
    });

    it('debe incluir contexto en el prompt cuando se proporciona', async () => {
      const mockResponse = {
        response: {
          text: () => 'Email generado',
        },
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const request: GeminiRequest = {
        prompt: 'Escribe un email',
        context: 'Reunión importante mañana',
      };

      await geminiService.generateEmailContent(request);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('Reunión importante mañana')
      );
    });
  });

  describe('improveDraft', () => {
    it('debe mejorar un borrador de email', async () => {
      const mockResponse = {
        response: {
          text: () => 'Estimado Sr. García,\n\nMe permito contactarle...',
        },
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const draft = 'Hola, quiero hablar contigo sobre el proyecto';
      const improvements = 'Hacer más formal';

      const result = await geminiService.improveDraft(draft, improvements);

      expect(result).toBe('Estimado Sr. García,\n\nMe permito contactarle...');
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('Hacer más formal')
      );
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining(draft)
      );
    });

    it('debe lanzar error si falla la API', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Network error'));

      await expect(
        geminiService.improveDraft('Draft', 'Improvements')
      ).rejects.toThrow('No se pudo mejorar el borrador');
    });
  });

  describe('summarizeEmail', () => {
    it('debe resumir un email largo', async () => {
      const mockResponse = {
        response: {
          text: () => 'El cliente solicita información sobre precios y disponibilidad.',
        },
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const emailBody = `Estimado equipo,
        Me gustaría obtener información sobre sus productos.
        Específicamente necesito conocer precios y disponibilidad.
        Por favor envíenme un catálogo.`;

      const summary = await geminiService.summarizeEmail(emailBody);

      expect(summary).toBe('El cliente solicita información sobre precios y disponibilidad.');
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('Resume el siguiente correo')
      );
    });

    it('debe manejar errores de resumen', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API error'));

      await expect(geminiService.summarizeEmail('Test email')).rejects.toThrow(
        'No se pudo resumir el correo'
      );
    });
  });

  describe('suggestReply', () => {
    it('debe sugerir múltiples respuestas', async () => {
      const mockResponse = {
        response: {
          text: () =>
            'Gracias por su mensaje. Me pondré en contacto pronto.\n\nAprecio su interés. Le responderé a la brevedad.\n\nRecibido. Revisaré y responderé pronto.',
        },
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const emailBody = 'Hola, necesito información sobre el proyecto';
      const suggestions = await geminiService.suggestReply(emailBody, 'professional');

      expect(suggestions).toHaveLength(3);
      expect(suggestions[0]).toContain('Gracias por su mensaje');
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('professional')
      );
    });

    it('debe usar tono por defecto si no se especifica', async () => {
      const mockResponse = {
        response: {
          text: () => 'Respuesta 1\n\nRespuesta 2',
        },
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      await geminiService.suggestReply('Test email');

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining('professional')
      );
    });

    it('debe filtrar respuestas vacías', async () => {
      const mockResponse = {
        response: {
          text: () => 'Respuesta 1\n\n\n\nRespuesta 2\n\n',
        },
      };
      mockGenerateContent.mockResolvedValue(mockResponse);

      const suggestions = await geminiService.suggestReply('Test');

      expect(suggestions.length).toBeLessThanOrEqual(2);
      suggestions.forEach((s) => expect(s.trim()).not.toBe(''));
    });
  });
});
