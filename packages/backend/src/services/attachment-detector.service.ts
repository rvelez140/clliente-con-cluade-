/**
 * Servicio de detección de adjuntos olvidados
 * Detecta cuando el usuario menciona un adjunto pero no lo ha incluido
 */

interface DetectionResult {
  hasAttachmentMention: boolean;
  hasMissingAttachment: boolean;
  mentionedWords: string[];
  confidence: number;
  suggestedAction: string;
  language: 'es' | 'en';
}

interface AttachmentCheck {
  emailBody: string;
  emailSubject: string;
  attachments: any[];
  language?: 'es' | 'en';
}

export class AttachmentDetectorService {
  // Palabras clave en español que indican un adjunto
  private readonly spanishKeywords = [
    // Sustantivos
    'adjunto', 'adjuntos', 'archivo', 'archivos', 'documento', 'documentos',
    'fichero', 'ficheros', 'anexo', 'anexos', 'imagen', 'imágenes',
    'foto', 'fotos', 'fotografía', 'fotografías', 'captura', 'capturas',
    'factura', 'facturas', 'informe', 'informes', 'reporte', 'reportes',
    'presentación', 'presentaciones', 'pdf', 'excel', 'word', 'powerpoint',
    'hoja de cálculo', 'hojas de cálculo', 'currículum', 'cv', 'contrato',
    'contratos', 'presupuesto', 'presupuestos', 'cotización', 'cotizaciones',
    'propuesta', 'propuestas', 'certificado', 'certificados', 'comprobante',
    'comprobantes', 'recibo', 'recibos', 'ticket', 'tickets', 'boleta',
    'boletas', 'planilla', 'planillas', 'formulario', 'formularios',
    'manual', 'manuales', 'guía', 'guías', 'instructivo', 'instructivos',
    'video', 'videos', 'vídeo', 'vídeos', 'audio', 'audios', 'grabación',
    'grabaciones', 'screenshot', 'screenshots', 'pantallazo', 'pantallazos',

    // Verbos y frases
    'te adjunto', 'adjunto aquí', 'aquí adjunto', 'te envío', 'envío adjunto',
    'te mando', 'te remito', 'incluyo', 'incluido', 'encontrarás adjunto',
    'encontrarás el archivo', 'encuentra adjunto', 'encuentra el archivo',
    'va adjunto', 'van adjuntos', 'está adjunto', 'están adjuntos',
    'ver adjunto', 'ver archivo', 'revisa el archivo', 'revisa el adjunto',
    'como se muestra', 'como puedes ver', 'en el documento adjunto',
    'en el archivo adjunto', 'según el documento', 'según el archivo',
    'he adjuntado', 'adjunté', 'te he enviado', 'te mandé',
    'como mencioné en el adjunto', 'tal como se indica en el documento',
    'por favor revisa', 'sírvanse revisar', 'por favor ver',

    // Expresiones coloquiales
    'acá va', 'ahí va', 'aquí te va', 'ahí te mando', 'te lo paso',
    'te paso el', 'te comparto', 'comparto contigo', 'adjunto a continuación'
  ];

  // Palabras clave en inglés
  private readonly englishKeywords = [
    // Nouns
    'attachment', 'attachments', 'attached', 'file', 'files', 'document',
    'documents', 'image', 'images', 'photo', 'photos', 'picture', 'pictures',
    'screenshot', 'screenshots', 'invoice', 'invoices', 'report', 'reports',
    'presentation', 'presentations', 'spreadsheet', 'spreadsheets',
    'pdf', 'excel', 'word', 'powerpoint', 'resume', 'cv', 'contract',
    'contracts', 'proposal', 'proposals', 'certificate', 'certificates',
    'receipt', 'receipts', 'form', 'forms', 'manual', 'guide', 'guides',
    'video', 'videos', 'audio', 'recording', 'recordings',

    // Phrases
    'please find attached', 'pfa', 'attached herewith', 'attached please find',
    'i have attached', "i've attached", 'see attached', 'see the attached',
    'see attachment', 'as attached', 'find attached', 'enclosed',
    'enclosed please find', 'please see attached', 'please refer to the attached',
    'the attached file', 'the attached document', 'attached is', 'attached are',
    'sending you', 'here is the', 'here are the', 'as shown in the',
    'as per the attached', 'as mentioned in the attached', 'kindly find',
    'please find enclosed', 'herewith', 'attaching', 'i am attaching',
    "i'm attaching", 'along with this email'
  ];

  // Patrones de exclusión (cuando estas palabras aparecen, no es realmente un adjunto mencionado)
  private readonly exclusionPatterns = [
    /no\s+(he\s+)?(adjunto|adjuntado|anexado)/i,
    /sin\s+adjunto/i,
    /sin\s+archivo/i,
    /not?\s+attach/i,
    /without\s+attach/i,
    /no\s+attachment/i,
    /olvidé\s+(el\s+)?adjunt/i,
    /forgot\s+(the\s+)?attach/i,
    /will\s+send\s+later/i,
    /enviaré\s+después/i,
    /te\s+lo\s+mando\s+(luego|después|mañana)/i,
    /adjuntaré/i,
    /voy\s+a\s+adjuntar/i,
    /going\s+to\s+attach/i,
    /will\s+attach/i
  ];

  /**
   * Detecta si hay un adjunto olvidado
   */
  detectMissingAttachment(check: AttachmentCheck): DetectionResult {
    const { emailBody, emailSubject, attachments, language } = check;
    const fullText = `${emailSubject} ${emailBody}`.toLowerCase();

    // Detectar idioma automáticamente si no se especifica
    const detectedLanguage = language || this.detectLanguage(fullText);

    // Obtener keywords según idioma
    const keywords = detectedLanguage === 'es'
      ? this.spanishKeywords
      : this.englishKeywords;

    // Buscar menciones de adjuntos
    const mentionedWords: string[] = [];
    let hasAttachmentMention = false;

    for (const keyword of keywords) {
      if (fullText.includes(keyword.toLowerCase())) {
        // Verificar que no sea una exclusión
        const isExcluded = this.exclusionPatterns.some(pattern =>
          pattern.test(fullText)
        );

        if (!isExcluded) {
          hasAttachmentMention = true;
          if (!mentionedWords.includes(keyword)) {
            mentionedWords.push(keyword);
          }
        }
      }
    }

    // Calcular confianza
    let confidence = 0;
    if (hasAttachmentMention) {
      // Base: 0.5 si se menciona adjunto
      confidence = 0.5;

      // Aumentar si hay múltiples menciones
      confidence += Math.min(mentionedWords.length * 0.1, 0.3);

      // Aumentar si hay frases específicas
      const strongPhrases = detectedLanguage === 'es'
        ? ['te adjunto', 'adjunto aquí', 'encontrarás adjunto', 'he adjuntado']
        : ['please find attached', 'see attached', 'i have attached', 'attached is'];

      for (const phrase of strongPhrases) {
        if (fullText.includes(phrase.toLowerCase())) {
          confidence += 0.15;
        }
      }

      confidence = Math.min(confidence, 1);
    }

    // Determinar si falta el adjunto
    const hasMissingAttachment = hasAttachmentMention && (!attachments || attachments.length === 0);

    // Generar sugerencia de acción
    let suggestedAction = '';
    if (hasMissingAttachment) {
      if (detectedLanguage === 'es') {
        if (mentionedWords.length > 0) {
          suggestedAction = `Mencionaste "${mentionedWords[0]}" pero no hay archivos adjuntos. ¿Olvidaste adjuntar el archivo?`;
        } else {
          suggestedAction = 'Parece que mencionas un archivo pero no hay adjuntos. ¿Deseas agregar uno?';
        }
      } else {
        if (mentionedWords.length > 0) {
          suggestedAction = `You mentioned "${mentionedWords[0]}" but no files are attached. Did you forget to attach?`;
        } else {
          suggestedAction = 'It looks like you mentioned a file but nothing is attached. Would you like to add one?';
        }
      }
    }

    return {
      hasAttachmentMention,
      hasMissingAttachment,
      mentionedWords,
      confidence,
      suggestedAction,
      language: detectedLanguage
    };
  }

  /**
   * Verifica el correo antes de enviar
   * Retorna true si está OK, false si falta adjunto
   */
  async preFlightCheck(check: AttachmentCheck): Promise<{
    canSend: boolean;
    warning?: {
      type: 'missing_attachment' | 'empty_subject' | 'empty_body';
      message: string;
      details: string;
    };
  }> {
    const { emailBody, emailSubject, attachments } = check;

    // Verificar asunto vacío
    if (!emailSubject || emailSubject.trim() === '') {
      return {
        canSend: false,
        warning: {
          type: 'empty_subject',
          message: '¿Enviar sin asunto?',
          details: 'No has escrito un asunto para este correo.'
        }
      };
    }

    // Verificar cuerpo vacío
    if (!emailBody || emailBody.trim() === '') {
      return {
        canSend: false,
        warning: {
          type: 'empty_body',
          message: '¿Enviar correo vacío?',
          details: 'El cuerpo del mensaje está vacío.'
        }
      };
    }

    // Verificar adjuntos olvidados
    const detection = this.detectMissingAttachment(check);

    if (detection.hasMissingAttachment && detection.confidence >= 0.5) {
      return {
        canSend: false,
        warning: {
          type: 'missing_attachment',
          message: detection.language === 'es'
            ? '¡Falta el archivo adjunto!'
            : 'Attachment is missing!',
          details: detection.suggestedAction
        }
      };
    }

    return { canSend: true };
  }

  /**
   * Detecta el idioma del texto
   */
  private detectLanguage(text: string): 'es' | 'en' {
    const spanishIndicators = [
      'hola', 'gracias', 'saludos', 'estimado', 'estimada', 'cordialmente',
      'atentamente', 'buenos días', 'buenas tardes', 'por favor', 'adjunto',
      'envío', 'espero', 'necesito', 'solicito', 'según', 'además', 'también'
    ];

    const englishIndicators = [
      'hello', 'thanks', 'thank you', 'regards', 'dear', 'sincerely',
      'please', 'attached', 'looking forward', 'hope', 'need', 'would',
      'could', 'should', 'meeting', 'schedule', 'follow up', 'however'
    ];

    let spanishScore = 0;
    let englishScore = 0;
    const lowerText = text.toLowerCase();

    for (const word of spanishIndicators) {
      if (lowerText.includes(word)) spanishScore++;
    }

    for (const word of englishIndicators) {
      if (lowerText.includes(word)) englishScore++;
    }

    return spanishScore >= englishScore ? 'es' : 'en';
  }

  /**
   * Analiza el contenido para detectar tipos de archivos esperados
   */
  detectExpectedFileTypes(text: string): string[] {
    const fileTypeIndicators: { [key: string]: string[] } = {
      'pdf': ['pdf', 'documento pdf', 'archivo pdf'],
      'image': ['imagen', 'foto', 'captura', 'screenshot', 'pantallazo', 'image', 'photo', 'picture'],
      'excel': ['excel', 'hoja de cálculo', 'spreadsheet', 'xlsx', 'planilla'],
      'word': ['word', 'documento word', 'docx', 'documento de texto'],
      'powerpoint': ['powerpoint', 'presentación', 'pptx', 'slides', 'diapositivas'],
      'video': ['video', 'vídeo', 'grabación', 'clip'],
      'audio': ['audio', 'grabación de voz', 'podcast', 'mp3'],
      'zip': ['zip', 'comprimido', 'rar', 'archivo comprimido']
    };

    const lowerText = text.toLowerCase();
    const expectedTypes: string[] = [];

    for (const [type, indicators] of Object.entries(fileTypeIndicators)) {
      for (const indicator of indicators) {
        if (lowerText.includes(indicator)) {
          if (!expectedTypes.includes(type)) {
            expectedTypes.push(type);
          }
          break;
        }
      }
    }

    return expectedTypes;
  }

  /**
   * Genera sugerencias de archivos basándose en el contexto del correo
   */
  generateFileSuggestions(check: AttachmentCheck): string[] {
    const suggestions: string[] = [];
    const fullText = `${check.emailSubject} ${check.emailBody}`.toLowerCase();

    const contextSuggestions: { [key: string]: string } = {
      'factura': 'Factura.pdf',
      'invoice': 'Invoice.pdf',
      'contrato': 'Contrato.pdf',
      'contract': 'Contract.pdf',
      'presupuesto': 'Presupuesto.xlsx',
      'quote': 'Quote.xlsx',
      'proposal': 'Proposal.pdf',
      'propuesta': 'Propuesta.pdf',
      'curriculum': 'CV.pdf',
      'resume': 'Resume.pdf',
      'cv': 'CV.pdf',
      'informe': 'Informe.pdf',
      'report': 'Report.pdf',
      'presentación': 'Presentacion.pptx',
      'presentation': 'Presentation.pptx'
    };

    for (const [keyword, filename] of Object.entries(contextSuggestions)) {
      if (fullText.includes(keyword) && !suggestions.includes(filename)) {
        suggestions.push(filename);
      }
    }

    return suggestions.slice(0, 3);
  }
}

export default new AttachmentDetectorService();
