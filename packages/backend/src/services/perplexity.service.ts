import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Servicio de integración con Perplexity para búsquedas en internet
 * Implementa las mejores prácticas de la guía de Perplexity
 */

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  relevanceScore: number;
  source: string;
  publishedDate?: string;
}

interface PerplexitySearchOptions {
  query: string;
  maxResults?: number;
  searchType?: 'web' | 'academic' | 'news' | 'images';
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
  language?: string;
  safeSearch?: boolean;
  includeAnswers?: boolean;
  focusAreas?: string[];
}

interface SearchResponse {
  results: SearchResult[];
  answer?: string;
  relatedQueries?: string[];
  totalResults: number;
  searchTime: number;
  sources: string[];
}

interface LinkMetadata {
  url: string;
  title: string;
  description?: string;
  favicon?: string;
  type: 'google-drive' | 'dropbox' | 'onedrive' | 'github' | 'notion' | 'generic';
  fileName?: string;
  fileType?: string;
  fileSize?: string;
  sharedBy?: string;
  lastModified?: string;
  previewUrl?: string;
}

export class PerplexityService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private perplexityApiKey: string | undefined;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY;
  }

  /**
   * Realiza una búsqueda inteligente en internet usando Perplexity
   */
  async search(options: PerplexitySearchOptions): Promise<SearchResponse> {
    const startTime = Date.now();
    const {
      query,
      maxResults = 10,
      searchType = 'web',
      timeRange = 'all',
      language = 'es',
      safeSearch = true,
      includeAnswers = true,
      focusAreas = []
    } = options;

    try {
      // Si tenemos API key de Perplexity, usar directamente
      if (this.perplexityApiKey) {
        return await this.searchWithPerplexity(options);
      }

      // Fallback: usar Gemini con capacidades de búsqueda mejoradas
      return await this.searchWithGemini(options);
    } catch (error) {
      console.error('Error en búsqueda:', error);
      throw new Error('Error al realizar la búsqueda');
    }
  }

  /**
   * Búsqueda directa con API de Perplexity
   */
  private async searchWithPerplexity(options: PerplexitySearchOptions): Promise<SearchResponse> {
    const startTime = Date.now();

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.perplexityApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: `Eres un asistente de búsqueda experto. Proporciona respuestas precisas y bien estructuradas.
                      Idioma preferido: ${options.language || 'es'}
                      Tipo de búsqueda: ${options.searchType || 'web'}
                      ${options.focusAreas?.length ? `Áreas de enfoque: ${options.focusAreas.join(', ')}` : ''}`
          },
          {
            role: 'user',
            content: options.query
          }
        ],
        max_tokens: 2048,
        temperature: 0.2,
        top_p: 0.9,
        search_domain_filter: options.searchType === 'academic'
          ? ['scholar.google.com', 'pubmed.ncbi.nlm.nih.gov', 'arxiv.org']
          : undefined,
        return_citations: true,
        return_related_questions: true,
        search_recency_filter: options.timeRange !== 'all' ? options.timeRange : undefined
      })
    });

    if (!response.ok) {
      throw new Error(`Error de Perplexity: ${response.statusText}`);
    }

    const data = await response.json();
    const searchTime = Date.now() - startTime;

    // Parsear la respuesta de Perplexity
    const answer = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    const results: SearchResult[] = citations.map((citation: any, index: number) => ({
      title: citation.title || `Resultado ${index + 1}`,
      snippet: citation.snippet || citation.text || '',
      url: citation.url,
      relevanceScore: 1 - (index * 0.1),
      source: new URL(citation.url).hostname,
      publishedDate: citation.published_date
    }));

    return {
      results: results.slice(0, options.maxResults || 10),
      answer: answer,
      relatedQueries: data.related_questions || [],
      totalResults: results.length,
      searchTime,
      sources: [...new Set(results.map(r => r.source))]
    };
  }

  /**
   * Búsqueda usando Gemini como fallback
   */
  private async searchWithGemini(options: PerplexitySearchOptions): Promise<SearchResponse> {
    const startTime = Date.now();

    const prompt = `Actúa como un motor de búsqueda avanzado. Proporciona información actualizada y precisa sobre:

"${options.query}"

Tipo de búsqueda: ${options.searchType}
Idioma: ${options.language}
${options.focusAreas?.length ? `Áreas de enfoque: ${options.focusAreas.join(', ')}` : ''}

Responde en formato JSON con esta estructura:
{
  "answer": "respuesta concisa y directa a la consulta",
  "results": [
    {
      "title": "título del resultado",
      "snippet": "descripción relevante",
      "url": "URL probable del contenido",
      "source": "nombre del sitio",
      "relevanceScore": 0.95
    }
  ],
  "relatedQueries": ["consulta relacionada 1", "consulta relacionada 2"]
}

Proporciona información precisa, actual y útil.`;

    const result = await this.model.generateContent(prompt);
    const responseText = result.response.text();

    try {
      // Extraer JSON de la respuesta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const searchTime = Date.now() - startTime;

        return {
          results: parsed.results?.slice(0, options.maxResults) || [],
          answer: parsed.answer,
          relatedQueries: parsed.relatedQueries || [],
          totalResults: parsed.results?.length || 0,
          searchTime,
          sources: [...new Set((parsed.results || []).map((r: any) => r.source))]
        };
      }
    } catch (e) {
      // Si no es JSON válido, crear respuesta estructurada
    }

    const searchTime = Date.now() - startTime;
    return {
      results: [],
      answer: responseText,
      relatedQueries: [],
      totalResults: 0,
      searchTime,
      sources: []
    };
  }

  /**
   * Extrae metadatos de un enlace del portapapeles
   * Convierte enlaces largos en nombres de archivo legibles
   */
  async extractLinkMetadata(url: string): Promise<LinkMetadata> {
    const linkType = this.detectLinkType(url);

    try {
      switch (linkType) {
        case 'google-drive':
          return await this.extractGoogleDriveMetadata(url);
        case 'dropbox':
          return await this.extractDropboxMetadata(url);
        case 'onedrive':
          return await this.extractOneDriveMetadata(url);
        case 'github':
          return await this.extractGitHubMetadata(url);
        case 'notion':
          return await this.extractNotionMetadata(url);
        default:
          return await this.extractGenericMetadata(url);
      }
    } catch (error) {
      console.error('Error extrayendo metadatos:', error);
      return this.createFallbackMetadata(url, linkType);
    }
  }

  /**
   * Detecta el tipo de enlace basándose en la URL
   */
  private detectLinkType(url: string): LinkMetadata['type'] {
    const lowerUrl = url.toLowerCase();

    if (lowerUrl.includes('drive.google.com') || lowerUrl.includes('docs.google.com')) {
      return 'google-drive';
    }
    if (lowerUrl.includes('dropbox.com')) {
      return 'dropbox';
    }
    if (lowerUrl.includes('onedrive.live.com') || lowerUrl.includes('1drv.ms') || lowerUrl.includes('sharepoint.com')) {
      return 'onedrive';
    }
    if (lowerUrl.includes('github.com') || lowerUrl.includes('raw.githubusercontent.com')) {
      return 'github';
    }
    if (lowerUrl.includes('notion.so') || lowerUrl.includes('notion.site')) {
      return 'notion';
    }

    return 'generic';
  }

  /**
   * Extrae metadatos de enlaces de Google Drive
   */
  private async extractGoogleDriveMetadata(url: string): Promise<LinkMetadata> {
    // Extraer el ID del archivo de la URL
    const fileIdMatch = url.match(/[-\w]{25,}/);
    const fileId = fileIdMatch ? fileIdMatch[0] : null;

    // Determinar el tipo de archivo basándose en la URL
    let fileType = 'archivo';
    let fileName = 'Documento de Google';

    if (url.includes('/document/')) {
      fileType = 'document';
      fileName = 'Documento de Google Docs';
    } else if (url.includes('/spreadsheets/')) {
      fileType = 'spreadsheet';
      fileName = 'Hoja de cálculo de Google Sheets';
    } else if (url.includes('/presentation/')) {
      fileType = 'presentation';
      fileName = 'Presentación de Google Slides';
    } else if (url.includes('/folders/')) {
      fileType = 'folder';
      fileName = 'Carpeta de Google Drive';
    } else if (url.includes('/forms/')) {
      fileType = 'form';
      fileName = 'Formulario de Google Forms';
    } else if (url.includes('/drawings/')) {
      fileType = 'drawing';
      fileName = 'Dibujo de Google Drawings';
    }

    // Intentar obtener metadatos reales si hay API key configurada
    if (process.env.GOOGLE_API_KEY && fileId) {
      try {
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?key=${process.env.GOOGLE_API_KEY}&fields=name,mimeType,size,modifiedTime,owners`
        );

        if (response.ok) {
          const data = await response.json();
          return {
            url,
            title: data.name,
            fileName: data.name,
            fileType: this.mimeTypeToFileType(data.mimeType),
            fileSize: this.formatFileSize(parseInt(data.size || '0')),
            lastModified: data.modifiedTime,
            sharedBy: data.owners?.[0]?.displayName,
            type: 'google-drive',
            favicon: 'https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png',
            previewUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`
          };
        }
      } catch (e) {
        // Fallback a metadatos básicos
      }
    }

    return {
      url,
      title: fileName,
      fileName,
      fileType,
      type: 'google-drive',
      favicon: 'https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png'
    };
  }

  /**
   * Extrae metadatos de enlaces de Dropbox
   */
  private async extractDropboxMetadata(url: string): Promise<LinkMetadata> {
    // Extraer nombre del archivo de la URL si está disponible
    const pathMatch = url.match(/\/([^/?]+)(?:\?|$)/);
    const fileName = pathMatch ? decodeURIComponent(pathMatch[1]) : 'Archivo de Dropbox';

    return {
      url,
      title: fileName,
      fileName,
      type: 'dropbox',
      favicon: 'https://cfl.dropboxstatic.com/static/images/favicon-vfl8lUR9B.ico',
      description: 'Archivo compartido desde Dropbox'
    };
  }

  /**
   * Extrae metadatos de enlaces de OneDrive/SharePoint
   */
  private async extractOneDriveMetadata(url: string): Promise<LinkMetadata> {
    const fileName = 'Archivo de OneDrive';

    return {
      url,
      title: fileName,
      fileName,
      type: 'onedrive',
      favicon: 'https://res-1.cdn.office.net/files/fabric-cdn-prod_20221209.001/assets/brand-icons/product/svg/onedrive_32x1.svg',
      description: 'Archivo compartido desde OneDrive'
    };
  }

  /**
   * Extrae metadatos de enlaces de GitHub
   */
  private async extractGitHubMetadata(url: string): Promise<LinkMetadata> {
    // Parsear la URL de GitHub
    const pathParts = url.replace('https://github.com/', '').split('/');
    const owner = pathParts[0];
    const repo = pathParts[1];
    const type = pathParts[2]; // blob, tree, pull, issues, etc.
    const fileName = pathParts[pathParts.length - 1];

    let title = `${owner}/${repo}`;
    if (type === 'blob') {
      title = fileName;
    } else if (type === 'pull') {
      title = `PR #${pathParts[3]} - ${repo}`;
    } else if (type === 'issues') {
      title = `Issue #${pathParts[3]} - ${repo}`;
    }

    // Intentar obtener más información de la API de GitHub
    if (type === 'blob' && owner && repo) {
      try {
        const branch = pathParts[3] || 'main';
        const filePath = pathParts.slice(4).join('/');
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;

        const response = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            ...(process.env.GITHUB_TOKEN ? { 'Authorization': `token ${process.env.GITHUB_TOKEN}` } : {})
          }
        });

        if (response.ok) {
          const data = await response.json();
          return {
            url,
            title: data.name,
            fileName: data.name,
            fileType: this.getFileExtension(data.name),
            fileSize: this.formatFileSize(data.size),
            type: 'github',
            favicon: 'https://github.githubassets.com/favicons/favicon.svg',
            description: `${owner}/${repo}`
          };
        }
      } catch (e) {
        // Fallback
      }
    }

    return {
      url,
      title,
      fileName: type === 'blob' ? fileName : undefined,
      type: 'github',
      favicon: 'https://github.githubassets.com/favicons/favicon.svg'
    };
  }

  /**
   * Extrae metadatos de enlaces de Notion
   */
  private async extractNotionMetadata(url: string): Promise<LinkMetadata> {
    // Los enlaces de Notion tienen el título codificado en la URL
    const pathMatch = url.match(/notion\.(?:so|site)\/([^?#]+)/);
    let title = 'Página de Notion';

    if (pathMatch) {
      const path = pathMatch[1];
      // El título suele estar antes del ID de la página
      const parts = path.split('-');
      if (parts.length > 1) {
        // Remover el ID (últimos 32 caracteres hexadecimales)
        parts.pop();
        title = parts.join(' ').replace(/-/g, ' ');
        // Capitalizar primera letra
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }
    }

    return {
      url,
      title,
      type: 'notion',
      favicon: 'https://www.notion.so/images/favicon.ico',
      description: 'Página de Notion'
    };
  }

  /**
   * Extrae metadatos genéricos de cualquier URL
   */
  private async extractGenericMetadata(url: string): Promise<LinkMetadata> {
    try {
      // Intentar hacer una petición HEAD para obtener metadatos básicos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GeminiMail/1.0)'
        }
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      const contentDisposition = response.headers.get('content-disposition') || '';
      const contentLength = response.headers.get('content-length');

      // Extraer nombre del archivo del header Content-Disposition
      let fileName: string | undefined;
      const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (fileNameMatch) {
        fileName = fileNameMatch[1].replace(/['"]/g, '');
      } else {
        // Extraer del path de la URL
        const urlPath = new URL(url).pathname;
        const pathFileName = urlPath.split('/').pop();
        if (pathFileName && pathFileName.includes('.')) {
          fileName = decodeURIComponent(pathFileName);
        }
      }

      const hostname = new URL(url).hostname;

      return {
        url,
        title: fileName || hostname,
        fileName,
        fileType: fileName ? this.getFileExtension(fileName) : undefined,
        fileSize: contentLength ? this.formatFileSize(parseInt(contentLength)) : undefined,
        type: 'generic',
        favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
      };
    } catch (error) {
      return this.createFallbackMetadata(url, 'generic');
    }
  }

  /**
   * Crea metadatos básicos cuando falla la extracción
   */
  private createFallbackMetadata(url: string, type: LinkMetadata['type']): LinkMetadata {
    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      hostname = url;
    }

    return {
      url,
      title: hostname,
      type,
      favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
    };
  }

  /**
   * Procesa múltiples enlaces del portapapeles
   */
  async processClipboardLinks(text: string): Promise<LinkMetadata[]> {
    // Detectar URLs en el texto
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
    const urls = text.match(urlRegex) || [];

    // Procesar en paralelo con límite de concurrencia
    const results: LinkMetadata[] = [];
    const batchSize = 5;

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(url => this.extractLinkMetadata(url))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Formatea el enlace para mostrar de forma amigable en el correo
   */
  formatLinkForEmail(metadata: LinkMetadata): string {
    const displayName = metadata.fileName || metadata.title;
    const icon = this.getTypeEmoji(metadata.type);

    // Crear HTML con el nombre del archivo como enlace
    return `<a href="${metadata.url}" style="color: #1a73e8; text-decoration: none;">
      ${icon} ${displayName}
      ${metadata.fileSize ? `<span style="color: #5f6368; font-size: 12px;">(${metadata.fileSize})</span>` : ''}
    </a>`;
  }

  /**
   * Formatea el enlace para texto plano
   */
  formatLinkForPlainText(metadata: LinkMetadata): string {
    const displayName = metadata.fileName || metadata.title;
    return `[${displayName}](${metadata.url})${metadata.fileSize ? ` (${metadata.fileSize})` : ''}`;
  }

  /**
   * Convierte MIME type a tipo de archivo legible
   */
  private mimeTypeToFileType(mimeType: string): string {
    const typeMap: { [key: string]: string } = {
      'application/vnd.google-apps.document': 'Documento',
      'application/vnd.google-apps.spreadsheet': 'Hoja de cálculo',
      'application/vnd.google-apps.presentation': 'Presentación',
      'application/vnd.google-apps.folder': 'Carpeta',
      'application/vnd.google-apps.form': 'Formulario',
      'application/pdf': 'PDF',
      'image/png': 'Imagen PNG',
      'image/jpeg': 'Imagen JPEG',
      'application/zip': 'Archivo ZIP',
      'text/plain': 'Texto',
      'application/msword': 'Word',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
      'application/vnd.ms-excel': 'Excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
      'application/vnd.ms-powerpoint': 'PowerPoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint'
    };

    return typeMap[mimeType] || mimeType.split('/').pop() || 'Archivo';
  }

  /**
   * Obtiene la extensión del archivo
   */
  private getFileExtension(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ext || '';
  }

  /**
   * Formatea el tamaño del archivo
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Obtiene emoji según el tipo de enlace
   */
  private getTypeEmoji(type: LinkMetadata['type']): string {
    const emojis: { [key: string]: string } = {
      'google-drive': '📁',
      'dropbox': '📦',
      'onedrive': '☁️',
      'github': '🐙',
      'notion': '📝',
      'generic': '🔗'
    };
    return emojis[type] || '🔗';
  }

  /**
   * Búsqueda contextual para emails
   * Busca información relacionada con el contenido del email
   */
  async contextualEmailSearch(emailContent: {
    subject: string;
    body: string;
    from: string;
  }): Promise<SearchResponse> {
    // Extraer temas y entidades del email
    const prompt = `Analiza el siguiente correo y extrae los temas principales para búsqueda:

Asunto: ${emailContent.subject}
De: ${emailContent.from}
Contenido: ${emailContent.body.substring(0, 500)}

Responde solo con una query de búsqueda optimizada (máximo 10 palabras).`;

    const result = await this.model.generateContent(prompt);
    const searchQuery = result.response.text().trim();

    return await this.search({
      query: searchQuery,
      maxResults: 5,
      includeAnswers: true
    });
  }

  /**
   * Auto-completar con búsqueda en tiempo real
   */
  async autoComplete(partialQuery: string): Promise<string[]> {
    if (partialQuery.length < 3) return [];

    const prompt = `Sugiere 5 autocompletados de búsqueda para: "${partialQuery}"

Responde solo con las sugerencias, una por línea, sin numeración ni explicaciones.`;

    const result = await this.model.generateContent(prompt);
    const suggestions = result.response.text()
      .split('\n')
      .filter((s: string) => s.trim())
      .slice(0, 5);

    return suggestions;
  }
}

export default new PerplexityService();
