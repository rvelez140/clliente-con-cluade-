import { GoogleGenerativeAI } from '@google/generative-ai';
import { Email } from '../types';

interface ClassificationResult {
  category: 'personal' | 'work' | 'finance' | 'social' | 'promotions' | 'spam' | 'important' | 'updates';
  confidence: number;
  suggestedFolder?: string;
  tags?: string[];
}

interface SpamAnalysis {
  isSpam: boolean;
  isPhishing: boolean;
  confidence: number;
  reasons: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface EmailPriority {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  score: number;
  reasons: string[];
}

export class AIClassifierService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  async classifyEmail(email: Email): Promise<ClassificationResult> {
    const prompt = `Analiza el siguiente correo electrónico y clasifícalo en una de estas categorías:
- personal: Correos personales de amigos, familia, etc.
- work: Correos relacionados con trabajo
- finance: Bancos, inversiones, facturas, pagos
- social: Redes sociales, notificaciones
- promotions: Ofertas, marketing, publicidad
- spam: Correo basura
- important: Correos importantes que requieren atención
- updates: Actualizaciones de servicios, newsletters

Correo:
De: ${email.from}
Asunto: ${email.subject}
Contenido: ${email.body.substring(0, 500)}

Responde SOLO con un JSON válido en este formato:
{
  "category": "nombre_categoria",
  "confidence": 0.95,
  "suggestedFolder": "nombre_carpeta_opcional",
  "tags": ["tag1", "tag2"]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extraer JSON del texto
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const classification = JSON.parse(jsonMatch[0]);
        return classification;
      }

      // Fallback
      return {
        category: 'personal',
        confidence: 0.5,
        tags: [],
      };
    } catch (error) {
      console.error('Error classifying email:', error);
      return {
        category: 'personal',
        confidence: 0.5,
        tags: [],
      };
    }
  }

  async detectSpamAndPhishing(email: Email): Promise<SpamAnalysis> {
    const prompt = `Analiza el siguiente correo electrónico para detectar si es spam o phishing.

Correo:
De: ${email.from}
Asunto: ${email.subject}
Contenido: ${email.body.substring(0, 1000)}

Busca indicadores de:
1. SPAM: Ofertas sospechosas, lenguaje agresivo de marketing, enlaces múltiples
2. PHISHING: Suplantación de identidad, solicitud de datos personales/financieros, URLs sospechosas, urgencia artificial
3. Errores ortográficos o gramaticales graves
4. Amenazas o presión para actuar rápidamente
5. Remitentes sospechosos o no verificados

Responde SOLO con un JSON válido en este formato:
{
  "isSpam": true/false,
  "isPhishing": true/false,
  "confidence": 0.95,
  "reasons": ["razón1", "razón2"],
  "riskLevel": "low/medium/high/critical"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return analysis;
      }

      return {
        isSpam: false,
        isPhishing: false,
        confidence: 0.5,
        reasons: [],
        riskLevel: 'low',
      };
    } catch (error) {
      console.error('Error detecting spam/phishing:', error);
      return {
        isSpam: false,
        isPhishing: false,
        confidence: 0.5,
        reasons: [],
        riskLevel: 'low',
      };
    }
  }

  async calculatePriority(email: Email): Promise<EmailPriority> {
    const prompt = `Analiza la prioridad del siguiente correo electrónico.

Correo:
De: ${email.from}
Asunto: ${email.subject}
Contenido: ${email.body.substring(0, 500)}

Considera:
- Palabras clave de urgencia (urgente, importante, deadline, etc.)
- Remitente conocido o importante
- Contenido que requiere acción inmediata
- Contexto laboral vs personal

Responde SOLO con un JSON válido en este formato:
{
  "priority": "low/medium/high/urgent",
  "score": 75,
  "reasons": ["razón1", "razón2"]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const priority = JSON.parse(jsonMatch[0]);
        return priority;
      }

      return {
        priority: 'medium',
        score: 50,
        reasons: [],
      };
    } catch (error) {
      console.error('Error calculating priority:', error);
      return {
        priority: 'medium',
        score: 50,
        reasons: [],
      };
    }
  }

  async extractActionItems(email: Email): Promise<string[]> {
    const prompt = `Extrae las acciones o tareas mencionadas en el siguiente correo electrónico.

Correo:
De: ${email.from}
Asunto: ${email.subject}
Contenido: ${email.body}

Identifica:
- Tareas explícitas (ej: "por favor envía el reporte")
- Deadlines o fechas límite
- Solicitudes de información
- Reuniones o eventos mencionados

Responde SOLO con un JSON válido con array de acciones:
{
  "actions": ["acción1", "acción2", "acción3"]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return result.actions || [];
      }

      return [];
    } catch (error) {
      console.error('Error extracting action items:', error);
      return [];
    }
  }

  async suggestQuickReplies(email: Email): Promise<string[]> {
    const prompt = `Genera 3 respuestas rápidas apropiadas para el siguiente correo:

Correo:
De: ${email.from}
Asunto: ${email.subject}
Contenido: ${email.body.substring(0, 500)}

Responde SOLO con un JSON válido:
{
  "replies": [
    "Respuesta corta 1",
    "Respuesta corta 2",
    "Respuesta corta 3"
  ]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return result.replies || [];
      }

      return ['Gracias por tu mensaje', 'Entendido, revisaré la información', 'Te responderé pronto'];
    } catch (error) {
      console.error('Error suggesting replies:', error);
      return ['Gracias por tu mensaje', 'Entendido, revisaré la información', 'Te responderé pronto'];
    }
  }

  async analyzeEmailBatch(emails: Email[]): Promise<Map<string, ClassificationResult>> {
    const results = new Map<string, ClassificationResult>();

    // Procesar en paralelo con límite de concurrencia
    const batchSize = 5;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const promises = batch.map(email =>
        this.classifyEmail(email).then(result => ({ email, result }))
      );

      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ email, result }) => {
        results.set(email.id, result);
      });
    }

    return results;
  }
}

export default new AIClassifierService();
