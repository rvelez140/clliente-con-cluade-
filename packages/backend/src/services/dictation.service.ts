import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface DictationSession {
  id: string;
  user_id: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  language: string;
  raw_text: string;
  formatted_text: string;
  word_count: number;
  duration_seconds: number;
  started_at: Date;
  completed_at?: Date;
}

export interface VoiceCommand {
  command: string;
  action: string;
  description: string;
}

// Comandos de voz predefinidos
const VOICE_COMMANDS: VoiceCommand[] = [
  { command: 'new paragraph', action: 'INSERT_PARAGRAPH', description: 'Start a new paragraph' },
  { command: 'nuevo párrafo', action: 'INSERT_PARAGRAPH', description: 'Iniciar nuevo párrafo' },
  { command: 'new line', action: 'INSERT_LINE', description: 'Start a new line' },
  { command: 'nueva línea', action: 'INSERT_LINE', description: 'Nueva línea' },
  { command: 'period', action: 'INSERT_PERIOD', description: 'Insert period' },
  { command: 'punto', action: 'INSERT_PERIOD', description: 'Insertar punto' },
  { command: 'comma', action: 'INSERT_COMMA', description: 'Insert comma' },
  { command: 'coma', action: 'INSERT_COMMA', description: 'Insertar coma' },
  { command: 'question mark', action: 'INSERT_QUESTION', description: 'Insert question mark' },
  { command: 'signo de interrogación', action: 'INSERT_QUESTION', description: 'Insertar signo de interrogación' },
  { command: 'exclamation mark', action: 'INSERT_EXCLAMATION', description: 'Insert exclamation mark' },
  { command: 'signo de exclamación', action: 'INSERT_EXCLAMATION', description: 'Insertar signo de exclamación' },
  { command: 'colon', action: 'INSERT_COLON', description: 'Insert colon' },
  { command: 'dos puntos', action: 'INSERT_COLON', description: 'Insertar dos puntos' },
  { command: 'semicolon', action: 'INSERT_SEMICOLON', description: 'Insert semicolon' },
  { command: 'punto y coma', action: 'INSERT_SEMICOLON', description: 'Insertar punto y coma' },
  { command: 'open quote', action: 'INSERT_OPEN_QUOTE', description: 'Insert opening quote' },
  { command: 'abrir comillas', action: 'INSERT_OPEN_QUOTE', description: 'Abrir comillas' },
  { command: 'close quote', action: 'INSERT_CLOSE_QUOTE', description: 'Insert closing quote' },
  { command: 'cerrar comillas', action: 'INSERT_CLOSE_QUOTE', description: 'Cerrar comillas' },
  { command: 'delete last word', action: 'DELETE_WORD', description: 'Delete the last word' },
  { command: 'borrar última palabra', action: 'DELETE_WORD', description: 'Borrar última palabra' },
  { command: 'delete last sentence', action: 'DELETE_SENTENCE', description: 'Delete the last sentence' },
  { command: 'borrar última oración', action: 'DELETE_SENTENCE', description: 'Borrar última oración' },
  { command: 'undo', action: 'UNDO', description: 'Undo last action' },
  { command: 'deshacer', action: 'UNDO', description: 'Deshacer última acción' },
  { command: 'stop dictation', action: 'STOP', description: 'Stop dictation' },
  { command: 'detener dictado', action: 'STOP', description: 'Detener dictado' },
  { command: 'pause', action: 'PAUSE', description: 'Pause dictation' },
  { command: 'pausar', action: 'PAUSE', description: 'Pausar dictado' },
  { command: 'resume', action: 'RESUME', description: 'Resume dictation' },
  { command: 'continuar', action: 'RESUME', description: 'Continuar dictado' }
];

class DictationService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  async startSession(userId: string, language: string = 'en-US'): Promise<DictationSession> {
    const id = uuidv4();

    const result = await pool.query(`
      INSERT INTO dictation_sessions (id, user_id, language, status)
      VALUES ($1, $2, $3, 'active')
      RETURNING *
    `, [id, userId, language]);

    logger.info(`Dictation session started for user ${userId}, language: ${language}`);
    return result.rows[0];
  }

  async getSession(sessionId: string): Promise<DictationSession | null> {
    const result = await pool.query(
      'SELECT * FROM dictation_sessions WHERE id = $1',
      [sessionId]
    );
    return result.rows[0] || null;
  }

  async appendText(sessionId: string, text: string): Promise<DictationSession | null> {
    const session = await this.getSession(sessionId);
    if (!session || session.status !== 'active') {
      throw new Error('Session is not active');
    }

    // Procesar comandos de voz
    const processedText = this.processVoiceCommands(text);

    const result = await pool.query(`
      UPDATE dictation_sessions
      SET raw_text = raw_text || ' ' || $1,
          word_count = word_count + $2
      WHERE id = $3
      RETURNING *
    `, [
      processedText,
      text.split(/\s+/).length,
      sessionId
    ]);

    return result.rows[0];
  }

  private processVoiceCommands(text: string): string {
    let processed = text;

    for (const cmd of VOICE_COMMANDS) {
      const regex = new RegExp(`\\b${cmd.command}\\b`, 'gi');

      switch (cmd.action) {
        case 'INSERT_PARAGRAPH':
          processed = processed.replace(regex, '\n\n');
          break;
        case 'INSERT_LINE':
          processed = processed.replace(regex, '\n');
          break;
        case 'INSERT_PERIOD':
          processed = processed.replace(regex, '.');
          break;
        case 'INSERT_COMMA':
          processed = processed.replace(regex, ',');
          break;
        case 'INSERT_QUESTION':
          processed = processed.replace(regex, '?');
          break;
        case 'INSERT_EXCLAMATION':
          processed = processed.replace(regex, '!');
          break;
        case 'INSERT_COLON':
          processed = processed.replace(regex, ':');
          break;
        case 'INSERT_SEMICOLON':
          processed = processed.replace(regex, ';');
          break;
        case 'INSERT_OPEN_QUOTE':
          processed = processed.replace(regex, '"');
          break;
        case 'INSERT_CLOSE_QUOTE':
          processed = processed.replace(regex, '"');
          break;
        default:
          // Otros comandos se manejan por el cliente
          break;
      }
    }

    return processed.trim();
  }

  async pauseSession(sessionId: string): Promise<DictationSession | null> {
    const result = await pool.query(`
      UPDATE dictation_sessions
      SET status = 'paused'
      WHERE id = $1 AND status = 'active'
      RETURNING *
    `, [sessionId]);

    return result.rows[0] || null;
  }

  async resumeSession(sessionId: string): Promise<DictationSession | null> {
    const result = await pool.query(`
      UPDATE dictation_sessions
      SET status = 'active'
      WHERE id = $1 AND status = 'paused'
      RETURNING *
    `, [sessionId]);

    return result.rows[0] || null;
  }

  async completeSession(sessionId: string): Promise<DictationSession | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    // Formatear texto con IA si está disponible
    let formattedText = session.raw_text;
    if (this.genAI && session.raw_text.length > 0) {
      try {
        formattedText = await this.formatWithAI(session.raw_text, session.language);
      } catch (error) {
        logger.error('Error formatting with AI:', error);
        formattedText = this.basicFormatting(session.raw_text);
      }
    } else {
      formattedText = this.basicFormatting(session.raw_text);
    }

    const durationSeconds = Math.floor(
      (Date.now() - new Date(session.started_at).getTime()) / 1000
    );

    const result = await pool.query(`
      UPDATE dictation_sessions
      SET status = 'completed',
          formatted_text = $1,
          duration_seconds = $2,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [formattedText, durationSeconds, sessionId]);

    logger.info(`Dictation session ${sessionId} completed: ${session.word_count} words`);
    return result.rows[0];
  }

  async cancelSession(sessionId: string): Promise<boolean> {
    const result = await pool.query(`
      UPDATE dictation_sessions
      SET status = 'cancelled'
      WHERE id = $1
      RETURNING *
    `, [sessionId]);

    return (result.rowCount ?? 0) > 0;
  }

  private async formatWithAI(text: string, language: string): Promise<string> {
    if (!this.genAI) {
      return this.basicFormatting(text);
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `Format the following dictated text. Add proper capitalization, punctuation,
and paragraph breaks where appropriate. Maintain the original meaning exactly.
The text is in ${language}. Return only the formatted text without any explanations:

${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  private basicFormatting(text: string): string {
    // Capitalizar primera letra después de . ! ?
    let formatted = text.replace(
      /([.!?]\s+)([a-z])/g,
      (match, punct, letter) => punct + letter.toUpperCase()
    );

    // Capitalizar primera letra del texto
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

    // Limpiar espacios múltiples
    formatted = formatted.replace(/\s+/g, ' ').trim();

    return formatted;
  }

  async getSessionHistory(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ sessions: DictationSession[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM dictation_sessions WHERE user_id = $1',
      [userId]
    );

    const result = await pool.query(`
      SELECT * FROM dictation_sessions
      WHERE user_id = $1
      ORDER BY started_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    return {
      sessions: result.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }

  getVoiceCommands(language: string = 'en'): VoiceCommand[] {
    if (language.startsWith('es')) {
      return VOICE_COMMANDS.filter(cmd =>
        /[áéíóúñ]/.test(cmd.command) ||
        ['punto', 'coma', 'nuevo', 'borrar', 'pausar', 'continuar', 'detener', 'deshacer'].some(
          word => cmd.command.includes(word)
        )
      );
    }
    return VOICE_COMMANDS.filter(cmd =>
      !/[áéíóúñ]/.test(cmd.command)
    );
  }

  getSupportedLanguages(): { code: string; name: string }[] {
    return [
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-GB', name: 'English (UK)' },
      { code: 'es-ES', name: 'Español (España)' },
      { code: 'es-MX', name: 'Español (México)' },
      { code: 'fr-FR', name: 'Français' },
      { code: 'de-DE', name: 'Deutsch' },
      { code: 'it-IT', name: 'Italiano' },
      { code: 'pt-BR', name: 'Português (Brasil)' },
      { code: 'pt-PT', name: 'Português (Portugal)' },
      { code: 'zh-CN', name: '中文 (简体)' },
      { code: 'ja-JP', name: '日本語' },
      { code: 'ko-KR', name: '한국어' },
      { code: 'ar-SA', name: 'العربية' },
      { code: 'hi-IN', name: 'हिन्दी' },
      { code: 'ru-RU', name: 'Русский' }
    ];
  }

  async getStats(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
        SUM(word_count) as total_words,
        SUM(duration_seconds) as total_duration_seconds,
        AVG(word_count) as avg_words_per_session
      FROM dictation_sessions
      WHERE user_id = $1
    `, [userId]);

    const stats = result.rows[0];
    return {
      totalSessions: parseInt(stats.total_sessions),
      completedSessions: parseInt(stats.completed_sessions),
      totalWords: parseInt(stats.total_words) || 0,
      totalDurationMinutes: Math.round((parseInt(stats.total_duration_seconds) || 0) / 60),
      avgWordsPerSession: Math.round(parseFloat(stats.avg_words_per_session) || 0)
    };
  }
}

export const dictationService = new DictationService();
