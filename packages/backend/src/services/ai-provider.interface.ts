/**
 * Interfaz común para proveedores de IA
 */
export interface AIProvider {
  /**
   * Genera contenido de email basado en un prompt
   */
  generateEmailContent(params: {
    prompt: string;
    context?: string;
    tone: 'formal' | 'casual' | 'friendly' | 'professional';
    length: 'short' | 'medium' | 'long';
  }): Promise<{ text: string; tokensUsed?: number }>;

  /**
   * Resume un texto largo
   */
  summarizeText(text: string, maxLength?: number): Promise<string>;

  /**
   * Clasifica un email en categorías
   */
  classifyEmail(emailBody: string): Promise<{
    category: string;
    confidence: number;
    tags: string[];
  }>;

  /**
   * Detecta spam y phishing
   */
  detectSpam(emailBody: string): Promise<{
    isSpam: boolean;
    isPhishing: boolean;
    confidence: number;
    reasons: string[];
  }>;

  /**
   * Calcula la prioridad de un email
   */
  calculatePriority(emailBody: string, subject: string): Promise<{
    priority: 'low' | 'medium' | 'high' | 'urgent';
    score: number;
    reasons: string[];
  }>;

  /**
   * Sugiere respuestas rápidas
   */
  suggestQuickReplies(emailBody: string): Promise<string[]>;
}

/**
 * Configuración de proveedor de IA
 */
export interface AIProviderConfig {
  provider: 'gemini' | 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
