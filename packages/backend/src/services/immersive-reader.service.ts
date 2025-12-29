import { pool } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ImmersiveReaderSettings {
  id: string;
  user_id: string;
  text_size: 'small' | 'medium' | 'large' | 'extra_large';
  text_spacing: 'compact' | 'normal' | 'wide' | 'extra_wide';
  font_family: 'default' | 'opendyslexic' | 'comic_sans' | 'arial' | 'calibri';
  page_theme: 'light' | 'dark' | 'sepia' | 'high_contrast';
  line_focus: 'none' | 'one_line' | 'three_lines' | 'five_lines';
  show_syllables: boolean;
  show_parts_of_speech: boolean;
  highlight_nouns: boolean;
  highlight_verbs: boolean;
  highlight_adjectives: boolean;
  highlight_adverbs: boolean;
  enable_translation: boolean;
  translation_language?: string;
  enable_picture_dictionary: boolean;
  enable_read_aloud: boolean;
  read_aloud_speed: number;
  read_aloud_voice?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ReadingSession {
  id: string;
  user_id: string;
  email_id?: string;
  content_type: 'email' | 'attachment' | 'custom';
  original_text: string;
  processed_text?: string;
  word_count: number;
  reading_time_minutes: number;
  started_at: Date;
  completed_at?: Date;
}

interface ProcessedWord {
  word: string;
  syllables?: string[];
  partOfSpeech?: string;
  definition?: string;
  imageUrl?: string;
}

class ImmersiveReaderService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  // Configuración del usuario
  async getSettings(userId: string): Promise<ImmersiveReaderSettings | null> {
    const result = await pool.query(
      'SELECT * FROM immersive_reader_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows[0]) {
      return result.rows[0];
    }

    // Crear configuración por defecto
    return this.createDefaultSettings(userId);
  }

  async createDefaultSettings(userId: string): Promise<ImmersiveReaderSettings> {
    const id = uuidv4();

    const result = await pool.query(`
      INSERT INTO immersive_reader_settings (
        id, user_id, text_size, text_spacing, font_family, page_theme,
        line_focus, show_syllables, show_parts_of_speech,
        highlight_nouns, highlight_verbs, highlight_adjectives, highlight_adverbs,
        enable_translation, enable_picture_dictionary, enable_read_aloud, read_aloud_speed
      )
      VALUES ($1, $2, 'medium', 'normal', 'default', 'light',
              'none', FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
              FALSE, FALSE, FALSE, 1.0)
      ON CONFLICT (user_id) DO NOTHING
      RETURNING *
    `, [id, userId]);

    if (result.rows[0]) {
      return result.rows[0];
    }

    // Si ya existía, obtenerla
    const existing = await pool.query(
      'SELECT * FROM immersive_reader_settings WHERE user_id = $1',
      [userId]
    );
    return existing.rows[0];
  }

  async updateSettings(
    userId: string,
    updates: Partial<Omit<ImmersiveReaderSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<ImmersiveReaderSettings | null> {
    const setClause: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const fieldMap: { [key: string]: string } = {
      textSize: 'text_size',
      textSpacing: 'text_spacing',
      fontFamily: 'font_family',
      pageTheme: 'page_theme',
      lineFocus: 'line_focus',
      showSyllables: 'show_syllables',
      showPartsOfSpeech: 'show_parts_of_speech',
      highlightNouns: 'highlight_nouns',
      highlightVerbs: 'highlight_verbs',
      highlightAdjectives: 'highlight_adjectives',
      highlightAdverbs: 'highlight_adverbs',
      enableTranslation: 'enable_translation',
      translationLanguage: 'translation_language',
      enablePictureDictionary: 'enable_picture_dictionary',
      enableReadAloud: 'enable_read_aloud',
      readAloudSpeed: 'read_aloud_speed',
      readAloudVoice: 'read_aloud_voice'
    };

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if ((updates as any)[key] !== undefined) {
        setClause.push(`${dbField} = $${paramCount++}`);
        values.push((updates as any)[key]);
      }
    }

    // También manejar keys en snake_case directamente
    for (const [key, value] of Object.entries(updates)) {
      if (!fieldMap[key] && value !== undefined) {
        setClause.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    }

    if (setClause.length === 0) {
      return this.getSettings(userId);
    }

    values.push(userId);
    const result = await pool.query(`
      UPDATE immersive_reader_settings
      SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $${paramCount}
      RETURNING *
    `, values);

    return result.rows[0] || null;
  }

  // Procesamiento de texto
  async processTextForReading(
    userId: string,
    text: string,
    options: {
      emailId?: string;
      contentType?: 'email' | 'attachment' | 'custom';
    } = {}
  ): Promise<{
    sessionId: string;
    processedContent: {
      paragraphs: {
        sentences: {
          words: ProcessedWord[];
          text: string;
        }[];
      }[];
    };
    readingTimeMinutes: number;
  }> {
    const settings = await this.getSettings(userId);
    const wordCount = text.split(/\s+/).length;
    const readingTimeMinutes = Math.ceil(wordCount / 200); // ~200 palabras por minuto

    // Crear sesión de lectura
    const sessionId = uuidv4();
    await pool.query(`
      INSERT INTO reading_sessions (
        id, user_id, email_id, content_type, original_text, word_count, reading_time_minutes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      sessionId,
      userId,
      options.emailId,
      options.contentType || 'custom',
      text,
      wordCount,
      readingTimeMinutes
    ]);

    // Procesar texto
    const paragraphs = text.split(/\n\n+/);
    const processedParagraphs = [];

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;

      const sentences = this.splitIntoSentences(paragraph);
      const processedSentences = [];

      for (const sentence of sentences) {
        const words = sentence.split(/\s+/);
        const processedWords: ProcessedWord[] = [];

        for (const word of words) {
          const cleanWord = word.replace(/[^\w\s'-]/g, '');
          if (!cleanWord) continue;

          const processedWord: ProcessedWord = { word };

          if (settings?.show_syllables) {
            processedWord.syllables = this.getSyllables(cleanWord);
          }

          if (settings?.show_parts_of_speech) {
            processedWord.partOfSpeech = await this.getPartOfSpeech(cleanWord);
          }

          if (settings?.enable_picture_dictionary) {
            processedWord.definition = await this.getDefinition(cleanWord);
          }

          processedWords.push(processedWord);
        }

        processedSentences.push({
          text: sentence,
          words: processedWords
        });
      }

      processedParagraphs.push({ sentences: processedSentences });
    }

    return {
      sessionId,
      processedContent: { paragraphs: processedParagraphs },
      readingTimeMinutes
    };
  }

  private splitIntoSentences(text: string): string[] {
    return text.match(/[^.!?]+[.!?]+/g) || [text];
  }

  private getSyllables(word: string): string[] {
    // Algoritmo básico de división silábica
    const vowels = 'aeiouyáéíóúü';
    const syllables: string[] = [];
    let currentSyllable = '';

    for (let i = 0; i < word.length; i++) {
      currentSyllable += word[i];

      if (vowels.includes(word[i].toLowerCase())) {
        // Verificar si la siguiente letra es una consonante seguida de vocal
        if (i + 2 < word.length &&
            !vowels.includes(word[i + 1].toLowerCase()) &&
            vowels.includes(word[i + 2].toLowerCase())) {
          syllables.push(currentSyllable);
          currentSyllable = '';
        }
      }
    }

    if (currentSyllable) {
      syllables.push(currentSyllable);
    }

    return syllables.length > 0 ? syllables : [word];
  }

  private async getPartOfSpeech(word: string): Promise<string> {
    // Cache simple para partes del discurso comunes
    const commonWords: { [key: string]: string } = {
      'the': 'article', 'a': 'article', 'an': 'article',
      'is': 'verb', 'are': 'verb', 'was': 'verb', 'were': 'verb',
      'have': 'verb', 'has': 'verb', 'had': 'verb',
      'be': 'verb', 'been': 'verb', 'being': 'verb',
      'do': 'verb', 'does': 'verb', 'did': 'verb',
      'i': 'pronoun', 'you': 'pronoun', 'he': 'pronoun', 'she': 'pronoun',
      'it': 'pronoun', 'we': 'pronoun', 'they': 'pronoun',
      'and': 'conjunction', 'but': 'conjunction', 'or': 'conjunction',
      'in': 'preposition', 'on': 'preposition', 'at': 'preposition',
      'to': 'preposition', 'for': 'preposition', 'with': 'preposition'
    };

    const lowerWord = word.toLowerCase();
    if (commonWords[lowerWord]) {
      return commonWords[lowerWord];
    }

    // Heurísticas básicas
    if (word.endsWith('ly')) return 'adverb';
    if (word.endsWith('ing')) return 'verb';
    if (word.endsWith('ed')) return 'verb';
    if (word.endsWith('tion') || word.endsWith('ness')) return 'noun';
    if (word.endsWith('ful') || word.endsWith('less') || word.endsWith('ous')) return 'adjective';

    return 'unknown';
  }

  private async getDefinition(word: string): Promise<string | undefined> {
    if (!this.genAI) return undefined;

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
      const result = await model.generateContent(
        `Provide a simple, one-sentence definition for the word "${word}".
         Reply with just the definition, no other text.`
      );
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      return undefined;
    }
  }

  // Traducción
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error('Translation service not available');
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = sourceLanguage
      ? `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Return only the translation:\n\n${text}`
      : `Translate the following text to ${targetLanguage}. Return only the translation:\n\n${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  // Text-to-Speech preparación
  async prepareTextForSpeech(
    text: string,
    options: {
      speed?: number;
      language?: string;
    } = {}
  ): Promise<{
    ssml: string;
    segments: { text: string; pauseAfter: number }[];
  }> {
    const sentences = this.splitIntoSentences(text);
    const segments = sentences.map(sentence => ({
      text: sentence.trim(),
      pauseAfter: sentence.endsWith('?') ? 500 : sentence.endsWith('!') ? 400 : 300
    }));

    // Generar SSML para text-to-speech
    let ssml = '<speak>';
    for (const segment of segments) {
      ssml += `<s>${segment.text}</s>`;
      if (segment.pauseAfter > 0) {
        ssml += `<break time="${segment.pauseAfter}ms"/>`;
      }
    }
    ssml += '</speak>';

    return { ssml, segments };
  }

  // Sesiones de lectura
  async completeSession(sessionId: string): Promise<ReadingSession | null> {
    const result = await pool.query(`
      UPDATE reading_sessions
      SET completed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [sessionId]);

    return result.rows[0] || null;
  }

  async getSessionHistory(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ sessions: ReadingSession[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM reading_sessions WHERE user_id = $1',
      [userId]
    );

    const result = await pool.query(`
      SELECT * FROM reading_sessions
      WHERE user_id = $1
      ORDER BY started_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    return {
      sessions: result.rows,
      total: parseInt(countResult.rows[0].count)
    };
  }

  // Opciones disponibles
  getAvailableOptions(): {
    textSizes: string[];
    textSpacings: string[];
    fontFamilies: { value: string; label: string }[];
    pageThemes: { value: string; label: string }[];
    lineFocusOptions: { value: string; label: string }[];
    translationLanguages: { code: string; name: string }[];
  } {
    return {
      textSizes: ['small', 'medium', 'large', 'extra_large'],
      textSpacings: ['compact', 'normal', 'wide', 'extra_wide'],
      fontFamilies: [
        { value: 'default', label: 'Default' },
        { value: 'opendyslexic', label: 'OpenDyslexic' },
        { value: 'comic_sans', label: 'Comic Sans' },
        { value: 'arial', label: 'Arial' },
        { value: 'calibri', label: 'Calibri' }
      ],
      pageThemes: [
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'sepia', label: 'Sepia' },
        { value: 'high_contrast', label: 'High Contrast' }
      ],
      lineFocusOptions: [
        { value: 'none', label: 'None' },
        { value: 'one_line', label: 'One Line' },
        { value: 'three_lines', label: 'Three Lines' },
        { value: 'five_lines', label: 'Five Lines' }
      ],
      translationLanguages: [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'zh', name: 'Chinese' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'ar', name: 'Arabic' },
        { code: 'hi', name: 'Hindi' },
        { code: 'ru', name: 'Russian' }
      ]
    };
  }

  async getStats(userId: string): Promise<any> {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_sessions,
        SUM(word_count) as total_words_read,
        SUM(reading_time_minutes) as total_reading_time_minutes
      FROM reading_sessions
      WHERE user_id = $1
    `, [userId]);

    return {
      totalSessions: parseInt(result.rows[0].total_sessions),
      completedSessions: parseInt(result.rows[0].completed_sessions),
      totalWordsRead: parseInt(result.rows[0].total_words_read) || 0,
      totalReadingTimeMinutes: parseInt(result.rows[0].total_reading_time_minutes) || 0
    };
  }
}

export const immersiveReaderService = new ImmersiveReaderService();
