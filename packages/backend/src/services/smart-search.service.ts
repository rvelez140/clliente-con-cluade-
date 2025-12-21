import { GoogleGenerativeAI } from '@google/generative-ai';
import { Email } from '../types';

interface SearchQuery {
  originalQuery: string;
  expandedQuery: string;
  filters: SearchFilters;
  semanticKeywords: string[];
}

interface SearchFilters {
  from?: string;
  to?: string;
  subject?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  hasAttachment?: boolean;
  isRead?: boolean;
  isStarred?: boolean;
  category?: string;
  priority?: string;
}

interface SearchResult {
  email: Email;
  relevanceScore: number;
  matchedFields: string[];
  snippet: string;
}

export class SmartSearchService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  async parseNaturalLanguageQuery(query: string): Promise<SearchQuery> {
    const prompt = `Analiza la siguiente búsqueda en lenguaje natural y extrae filtros y palabras clave:

Búsqueda: "${query}"

Extrae:
1. Filtros específicos (remitente, fecha, categoría, etc.)
2. Palabras clave semánticas expandidas (sinónimos, términos relacionados)
3. Intención de búsqueda

Ejemplos:
- "correos de Juan la semana pasada" -> from: Juan, dateRange: última semana
- "facturas del último mes" -> category: finance, keywords: [factura, pago, invoice], dateRange: último mes
- "emails importantes no leídos" -> isRead: false, priority: high

Responde SOLO con un JSON válido:
{
  "expandedQuery": "query expandido con sinónimos",
  "filters": {
    "from": "remitente opcional",
    "subject": "asunto opcional",
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "hasAttachment": true/false,
    "isRead": true/false,
    "category": "categoria opcional",
    "priority": "prioridad opcional"
  },
  "semanticKeywords": ["palabra1", "palabra2", "sinónimo1"]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          originalQuery: query,
          expandedQuery: parsed.expandedQuery || query,
          filters: parsed.filters || {},
          semanticKeywords: parsed.semanticKeywords || [],
        };
      }

      return {
        originalQuery: query,
        expandedQuery: query,
        filters: {},
        semanticKeywords: [],
      };
    } catch (error) {
      console.error('Error parsing query:', error);
      return {
        originalQuery: query,
        expandedQuery: query,
        filters: {},
        semanticKeywords: [],
      };
    }
  }

  async semanticSearch(emails: Email[], query: string): Promise<SearchResult[]> {
    const parsedQuery = await this.parseNaturalLanguageQuery(query);

    // Filtrar emails basados en filtros estructurados
    let filteredEmails = this.applyFilters(emails, parsedQuery.filters);

    // Calcular relevancia semántica para cada email
    const results: SearchResult[] = [];

    for (const email of filteredEmails) {
      const relevance = await this.calculateSemanticRelevance(
        email,
        parsedQuery.expandedQuery,
        parsedQuery.semanticKeywords
      );

      if (relevance.score > 0.3) { // Umbral de relevancia
        results.push({
          email,
          relevanceScore: relevance.score,
          matchedFields: relevance.matchedFields,
          snippet: this.generateSnippet(email, parsedQuery.semanticKeywords),
        });
      }
    }

    // Ordenar por relevancia
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return results;
  }

  async suggestSearchFilters(query: string, emails: Email[]): Promise<string[]> {
    const prompt = `Dada la búsqueda "${query}" y un conjunto de correos electrónicos, sugiere filtros adicionales útiles.

Sugerencias pueden incluir:
- Remitentes frecuentes relacionados
- Rangos de fecha relevantes
- Categorías relacionadas
- Filtros de estado (leído/no leído, con adjuntos, etc.)

Responde SOLO con un JSON válido:
{
  "suggestions": [
    "from:usuario@ejemplo.com",
    "category:trabajo",
    "last 7 days",
    "has:attachment"
  ]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.suggestions || [];
      }

      return [];
    } catch (error) {
      console.error('Error suggesting filters:', error);
      return [];
    }
  }

  private applyFilters(emails: Email[], filters: SearchFilters): Email[] {
    return emails.filter(email => {
      if (filters.from && !email.from.toLowerCase().includes(filters.from.toLowerCase())) {
        return false;
      }

      if (filters.to && !email.to.some(t => t.toLowerCase().includes(filters.to!.toLowerCase()))) {
        return false;
      }

      if (filters.subject && !email.subject.toLowerCase().includes(filters.subject.toLowerCase())) {
        return false;
      }

      if (filters.dateRange) {
        const emailDate = new Date(email.receivedAt);
        if (filters.dateRange.start && emailDate < new Date(filters.dateRange.start)) {
          return false;
        }
        if (filters.dateRange.end && emailDate > new Date(filters.dateRange.end)) {
          return false;
        }
      }

      if (filters.hasAttachment !== undefined && (email.attachments?.length || 0) > 0 !== filters.hasAttachment) {
        return false;
      }

      if (filters.isRead !== undefined && email.isRead !== filters.isRead) {
        return false;
      }

      if (filters.isStarred !== undefined && email.isStarred !== filters.isStarred) {
        return false;
      }

      return true;
    });
  }

  private async calculateSemanticRelevance(
    email: Email,
    query: string,
    keywords: string[]
  ): Promise<{ score: number; matchedFields: string[] }> {
    const matchedFields: string[] = [];
    let score = 0;

    const searchText = query.toLowerCase();
    const allKeywords = [searchText, ...keywords.map(k => k.toLowerCase())];

    // Búsqueda en asunto (peso mayor)
    if (allKeywords.some(k => email.subject.toLowerCase().includes(k))) {
      score += 0.5;
      matchedFields.push('subject');
    }

    // Búsqueda en remitente
    if (allKeywords.some(k => email.from.toLowerCase().includes(k))) {
      score += 0.3;
      matchedFields.push('from');
    }

    // Búsqueda en cuerpo
    if (allKeywords.some(k => email.body.toLowerCase().includes(k))) {
      score += 0.2;
      matchedFields.push('body');
    }

    // Búsqueda en destinatarios
    if (allKeywords.some(k => email.to.some(t => t.toLowerCase().includes(k)))) {
      score += 0.1;
      matchedFields.push('to');
    }

    return { score, matchedFields };
  }

  private generateSnippet(email: Email, keywords: string[]): string {
    const text = email.body;
    const lowerText = text.toLowerCase();

    // Buscar la primera ocurrencia de alguna keyword
    for (const keyword of keywords) {
      const index = lowerText.indexOf(keyword.toLowerCase());
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(text.length, index + keyword.length + 50);
        let snippet = text.substring(start, end);

        if (start > 0) snippet = '...' + snippet;
        if (end < text.length) snippet = snippet + '...';

        return snippet;
      }
    }

    // Si no se encuentra, devolver los primeros 100 caracteres
    return text.substring(0, 100) + (text.length > 100 ? '...' : '');
  }

  async findSimilarEmails(email: Email, allEmails: Email[]): Promise<Email[]> {
    const prompt = `Dado este correo electrónico, identifica características clave para encontrar correos similares:

Correo:
De: ${email.from}
Asunto: ${email.subject}
Contenido: ${email.body.substring(0, 300)}

Extrae:
- Temas principales
- Palabras clave relevantes
- Tipo de correo (conversación, notificación, etc.)

Responde SOLO con un JSON válido:
{
  "keywords": ["palabra1", "palabra2"],
  "topic": "tema principal",
  "type": "tipo de correo"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);

        // Buscar emails similares basados en las keywords
        const similar = allEmails.filter(e => {
          if (e.id === email.id) return false;

          const keywords = analysis.keywords || [];
          return keywords.some((k: string) =>
            e.subject.toLowerCase().includes(k.toLowerCase()) ||
            e.body.toLowerCase().includes(k.toLowerCase())
          );
        });

        return similar.slice(0, 10); // Limitar a 10 resultados
      }

      return [];
    } catch (error) {
      console.error('Error finding similar emails:', error);
      return [];
    }
  }
}

export default new SmartSearchService();
