import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Servicio de gestión de firmas de correo electrónico
 * Optimizado para crear, editar y personalizar firmas profesionales
 */

interface SignatureTemplate {
  id: string;
  name: string;
  category: 'professional' | 'creative' | 'minimal' | 'corporate' | 'personal';
  html: string;
  variables: string[];
}

interface SignatureData {
  name: string;
  title?: string;
  company?: string;
  department?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  address?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  github?: string;
  facebook?: string;
  youtube?: string;
  slogan?: string;
  pronouns?: string;
  meetingLink?: string;
  bannerImage?: string;
  profileImage?: string;
  logo?: string;
  customFields?: { label: string; value: string }[];
}

interface SignatureStyle {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  separatorStyle: 'line' | 'pipe' | 'dot' | 'none';
  iconStyle: 'colored' | 'monochrome' | 'none';
  imageShape: 'circle' | 'square' | 'rounded';
  layout: 'horizontal' | 'vertical' | 'centered';
}

interface GeneratedSignature {
  html: string;
  plainText: string;
  preview: string;
}

export class EmailSignatureService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  // Plantillas predefinidas
  private templates: SignatureTemplate[] = [
    {
      id: 'professional-modern',
      name: 'Profesional Moderno',
      category: 'professional',
      html: `
        <table cellpadding="0" cellspacing="0" border="0" style="font-family: {{fontFamily}}; font-size: {{fontSize}}; line-height: {{lineHeight}};">
          <tr>
            <td style="padding-right: 15px; vertical-align: top;">
              {{#if profileImage}}
              <img src="{{profileImage}}" alt="{{name}}" width="80" height="80" style="border-radius: {{imageRadius}}; display: block;" />
              {{/if}}
            </td>
            <td style="vertical-align: top; border-left: 3px solid {{primaryColor}}; padding-left: 15px;">
              <div style="margin-bottom: 5px;">
                <strong style="font-size: 16px; color: {{primaryColor}};">{{name}}</strong>
                {{#if pronouns}}<span style="color: #888; font-size: 12px;"> ({{pronouns}})</span>{{/if}}
              </div>
              {{#if title}}
              <div style="color: #555; margin-bottom: 3px;">{{title}}{{#if company}} | {{company}}{{/if}}</div>
              {{/if}}
              <div style="margin-top: 10px; font-size: 13px;">
                {{#if email}}<div>📧 <a href="mailto:{{email}}" style="color: {{primaryColor}}; text-decoration: none;">{{email}}</a></div>{{/if}}
                {{#if phone}}<div>📞 <a href="tel:{{phone}}" style="color: #333; text-decoration: none;">{{phone}}</a></div>{{/if}}
                {{#if website}}<div>🌐 <a href="{{website}}" style="color: {{primaryColor}}; text-decoration: none;">{{website}}</a></div>{{/if}}
              </div>
              {{#if socialLinks}}
              <div style="margin-top: 8px;">{{socialLinks}}</div>
              {{/if}}
            </td>
          </tr>
          {{#if slogan}}
          <tr>
            <td colspan="2" style="padding-top: 10px; font-style: italic; color: #666; font-size: 12px;">
              "{{slogan}}"
            </td>
          </tr>
          {{/if}}
        </table>
      `,
      variables: ['name', 'title', 'company', 'email', 'phone', 'website', 'profileImage', 'slogan', 'pronouns']
    },
    {
      id: 'minimal-clean',
      name: 'Minimalista',
      category: 'minimal',
      html: `
        <table cellpadding="0" cellspacing="0" border="0" style="font-family: {{fontFamily}}; font-size: {{fontSize}}; color: #333;">
          <tr>
            <td>
              <strong style="color: {{primaryColor}};">{{name}}</strong>
              {{#if title}}<span style="color: #666;"> · {{title}}</span>{{/if}}
              <br/>
              {{#if email}}<a href="mailto:{{email}}" style="color: #555; text-decoration: none;">{{email}}</a>{{/if}}
              {{#if phone}}<span style="color: #999;"> · </span><a href="tel:{{phone}}" style="color: #555; text-decoration: none;">{{phone}}</a>{{/if}}
            </td>
          </tr>
        </table>
      `,
      variables: ['name', 'title', 'email', 'phone']
    },
    {
      id: 'corporate-full',
      name: 'Corporativo Completo',
      category: 'corporate',
      html: `
        <table cellpadding="0" cellspacing="0" border="0" style="font-family: {{fontFamily}}; font-size: {{fontSize}}; max-width: 500px;">
          {{#if bannerImage}}
          <tr>
            <td colspan="2" style="padding-bottom: 15px;">
              <img src="{{bannerImage}}" alt="Banner" width="500" style="display: block; max-width: 100%;" />
            </td>
          </tr>
          {{/if}}
          <tr>
            <td style="padding-right: 20px; vertical-align: top; width: 100px;">
              {{#if logo}}
              <img src="{{logo}}" alt="{{company}}" width="90" style="display: block;" />
              {{/if}}
            </td>
            <td style="vertical-align: top;">
              <div style="font-size: 18px; font-weight: bold; color: {{primaryColor}}; margin-bottom: 5px;">{{name}}</div>
              <div style="color: #666; margin-bottom: 8px;">
                {{#if title}}{{title}}{{/if}}
                {{#if department}}<br/>{{department}}{{/if}}
                {{#if company}}<br/><strong>{{company}}</strong>{{/if}}
              </div>
              <table cellpadding="0" cellspacing="0" border="0" style="font-size: 13px;">
                {{#if email}}
                <tr><td style="padding: 2px 0;"><strong style="color: {{primaryColor}};">E:</strong></td><td style="padding: 2px 0 2px 10px;"><a href="mailto:{{email}}" style="color: #333; text-decoration: none;">{{email}}</a></td></tr>
                {{/if}}
                {{#if phone}}
                <tr><td style="padding: 2px 0;"><strong style="color: {{primaryColor}};">T:</strong></td><td style="padding: 2px 0 2px 10px;"><a href="tel:{{phone}}" style="color: #333; text-decoration: none;">{{phone}}</a></td></tr>
                {{/if}}
                {{#if mobile}}
                <tr><td style="padding: 2px 0;"><strong style="color: {{primaryColor}};">M:</strong></td><td style="padding: 2px 0 2px 10px;"><a href="tel:{{mobile}}" style="color: #333; text-decoration: none;">{{mobile}}</a></td></tr>
                {{/if}}
                {{#if website}}
                <tr><td style="padding: 2px 0;"><strong style="color: {{primaryColor}};">W:</strong></td><td style="padding: 2px 0 2px 10px;"><a href="{{website}}" style="color: {{primaryColor}}; text-decoration: none;">{{website}}</a></td></tr>
                {{/if}}
                {{#if address}}
                <tr><td style="padding: 2px 0;"><strong style="color: {{primaryColor}};">A:</strong></td><td style="padding: 2px 0 2px 10px;">{{address}}</td></tr>
                {{/if}}
              </table>
              {{#if meetingLink}}
              <div style="margin-top: 12px;">
                <a href="{{meetingLink}}" style="display: inline-block; padding: 8px 16px; background-color: {{primaryColor}}; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">📅 Agendar reunión</a>
              </div>
              {{/if}}
            </td>
          </tr>
          {{#if socialLinks}}
          <tr>
            <td colspan="2" style="padding-top: 15px; border-top: 1px solid #eee; margin-top: 10px;">
              {{socialLinks}}
            </td>
          </tr>
          {{/if}}
        </table>
      `,
      variables: ['name', 'title', 'company', 'department', 'email', 'phone', 'mobile', 'website', 'address', 'logo', 'bannerImage', 'meetingLink']
    },
    {
      id: 'creative-colorful',
      name: 'Creativo',
      category: 'creative',
      html: `
        <table cellpadding="0" cellspacing="0" border="0" style="font-family: {{fontFamily}}; font-size: {{fontSize}}; background: linear-gradient(135deg, {{primaryColor}}22, {{secondaryColor}}22); padding: 15px; border-radius: 10px;">
          <tr>
            <td style="text-align: center;">
              {{#if profileImage}}
              <img src="{{profileImage}}" alt="{{name}}" width="100" height="100" style="border-radius: 50%; border: 3px solid {{primaryColor}}; display: block; margin: 0 auto 10px;" />
              {{/if}}
              <div style="font-size: 20px; font-weight: bold; color: {{primaryColor}}; margin-bottom: 5px;">{{name}}</div>
              {{#if title}}
              <div style="color: {{secondaryColor}}; font-size: 14px; margin-bottom: 10px;">✨ {{title}} ✨</div>
              {{/if}}
              <div style="margin: 10px 0;">
                {{#if email}}<a href="mailto:{{email}}" style="color: #333; text-decoration: none; margin: 0 5px;">📧</a>{{/if}}
                {{#if phone}}<a href="tel:{{phone}}" style="color: #333; text-decoration: none; margin: 0 5px;">📱</a>{{/if}}
                {{#if website}}<a href="{{website}}" style="color: #333; text-decoration: none; margin: 0 5px;">🌐</a>{{/if}}
                {{#if linkedin}}<a href="{{linkedin}}" style="color: #333; text-decoration: none; margin: 0 5px;">💼</a>{{/if}}
              </div>
              {{#if slogan}}
              <div style="font-style: italic; color: #666; margin-top: 10px; font-size: 12px;">"{{slogan}}"</div>
              {{/if}}
            </td>
          </tr>
        </table>
      `,
      variables: ['name', 'title', 'email', 'phone', 'website', 'linkedin', 'profileImage', 'slogan']
    },
    {
      id: 'personal-casual',
      name: 'Personal Casual',
      category: 'personal',
      html: `
        <table cellpadding="0" cellspacing="0" border="0" style="font-family: {{fontFamily}}; font-size: {{fontSize}};">
          <tr>
            <td>
              <div style="font-size: 16px; color: {{primaryColor}};">
                Saludos,<br/>
                <strong style="font-size: 18px;">{{name}}</strong>
              </div>
              <div style="margin-top: 10px; color: #666; font-size: 13px;">
                {{#if phone}}📱 {{phone}}<br/>{{/if}}
                {{#if email}}✉️ {{email}}<br/>{{/if}}
              </div>
              {{#if socialLinks}}
              <div style="margin-top: 8px;">{{socialLinks}}</div>
              {{/if}}
            </td>
          </tr>
        </table>
      `,
      variables: ['name', 'phone', 'email']
    }
  ];

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * Genera una firma de correo electrónico personalizada
   */
  generateSignature(
    data: SignatureData,
    templateId: string = 'professional-modern',
    style: Partial<SignatureStyle> = {}
  ): GeneratedSignature {
    const template = this.templates.find(t => t.id === templateId) || this.templates[0];

    const defaultStyle: SignatureStyle = {
      primaryColor: '#1a73e8',
      secondaryColor: '#34a853',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      lineHeight: '1.5',
      separatorStyle: 'line',
      iconStyle: 'colored',
      imageShape: 'circle',
      layout: 'horizontal'
    };

    const mergedStyle = { ...defaultStyle, ...style };

    // Procesar HTML con datos y estilo
    let html = template.html;

    // Reemplazar variables de estilo
    html = html.replace(/\{\{fontFamily\}\}/g, mergedStyle.fontFamily);
    html = html.replace(/\{\{fontSize\}\}/g, mergedStyle.fontSize);
    html = html.replace(/\{\{lineHeight\}\}/g, mergedStyle.lineHeight);
    html = html.replace(/\{\{primaryColor\}\}/g, mergedStyle.primaryColor);
    html = html.replace(/\{\{secondaryColor\}\}/g, mergedStyle.secondaryColor);
    html = html.replace(/\{\{imageRadius\}\}/g, mergedStyle.imageShape === 'circle' ? '50%' : mergedStyle.imageShape === 'rounded' ? '10px' : '0');

    // Reemplazar variables de datos
    html = this.processTemplate(html, data, mergedStyle);

    // Generar enlaces de redes sociales
    const socialLinks = this.generateSocialLinks(data, mergedStyle);
    html = html.replace(/\{\{socialLinks\}\}/g, socialLinks);
    html = html.replace(/\{\{#if socialLinks\}\}[\s\S]*?\{\{\/if\}\}/g, socialLinks ? html.match(/\{\{#if socialLinks\}\}([\s\S]*?)\{\{\/if\}\}/)?.[1]?.replace('{{socialLinks}}', socialLinks) || '' : '');

    // Limpiar condicionales no usados
    html = this.cleanUnusedConditionals(html);

    // Generar versión de texto plano
    const plainText = this.generatePlainText(data);

    return {
      html: html.trim(),
      plainText,
      preview: this.generatePreview(html)
    };
  }

  /**
   * Procesa el template con los datos
   */
  private processTemplate(html: string, data: SignatureData, style: SignatureStyle): string {
    // Reemplazar variables simples
    const simpleVars = ['name', 'title', 'company', 'department', 'email', 'phone', 'mobile',
                        'website', 'address', 'linkedin', 'twitter', 'instagram', 'github',
                        'facebook', 'youtube', 'slogan', 'pronouns', 'meetingLink',
                        'bannerImage', 'profileImage', 'logo'];

    for (const varName of simpleVars) {
      const value = (data as any)[varName] || '';
      const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
      html = html.replace(regex, value);

      // Procesar condicionales
      if (value) {
        const ifRegex = new RegExp(`\\{\\{#if ${varName}\\}\\}([\\s\\S]*?)\\{\\{\\/if\\}\\}`, 'g');
        html = html.replace(ifRegex, '$1');
      } else {
        const ifRegex = new RegExp(`\\{\\{#if ${varName}\\}\\}[\\s\\S]*?\\{\\{\\/if\\}\\}`, 'g');
        html = html.replace(ifRegex, '');
      }
    }

    // Procesar campos personalizados
    if (data.customFields && data.customFields.length > 0) {
      let customFieldsHtml = '';
      for (const field of data.customFields) {
        customFieldsHtml += `<tr><td style="padding: 2px 0;"><strong style="color: ${style.primaryColor};">${field.label}:</strong></td><td style="padding: 2px 0 2px 10px;">${field.value}</td></tr>`;
      }
      html = html.replace('{{customFields}}', customFieldsHtml);
    } else {
      html = html.replace('{{customFields}}', '');
    }

    return html;
  }

  /**
   * Genera los iconos de redes sociales
   */
  private generateSocialLinks(data: SignatureData, style: SignatureStyle): string {
    const socialNetworks: { key: keyof SignatureData; icon: string; baseUrl: string }[] = [
      { key: 'linkedin', icon: 'https://cdn-icons-png.flaticon.com/24/174/174857.png', baseUrl: '' },
      { key: 'twitter', icon: 'https://cdn-icons-png.flaticon.com/24/733/733579.png', baseUrl: 'https://twitter.com/' },
      { key: 'instagram', icon: 'https://cdn-icons-png.flaticon.com/24/174/174855.png', baseUrl: 'https://instagram.com/' },
      { key: 'github', icon: 'https://cdn-icons-png.flaticon.com/24/733/733609.png', baseUrl: 'https://github.com/' },
      { key: 'facebook', icon: 'https://cdn-icons-png.flaticon.com/24/733/733547.png', baseUrl: 'https://facebook.com/' },
      { key: 'youtube', icon: 'https://cdn-icons-png.flaticon.com/24/174/174883.png', baseUrl: 'https://youtube.com/' }
    ];

    const links: string[] = [];

    for (const network of socialNetworks) {
      const value = data[network.key] as string | undefined;
      if (value) {
        const url = value.startsWith('http') ? value : network.baseUrl + value;
        if (style.iconStyle === 'none') {
          links.push(`<a href="${url}" style="color: ${style.primaryColor}; margin-right: 10px; text-decoration: none;">${network.key}</a>`);
        } else {
          const filter = style.iconStyle === 'monochrome' ? 'grayscale(100%)' : 'none';
          links.push(`<a href="${url}" target="_blank" style="margin-right: 8px;"><img src="${network.icon}" alt="${network.key}" width="20" height="20" style="filter: ${filter};"/></a>`);
        }
      }
    }

    return links.join('');
  }

  /**
   * Limpia los condicionales no utilizados
   */
  private cleanUnusedConditionals(html: string): string {
    // Eliminar cualquier condicional restante
    return html.replace(/\{\{#if \w+\}\}[\s\S]*?\{\{\/if\}\}/g, '')
               .replace(/\{\{\w+\}\}/g, '')
               .replace(/\n\s*\n/g, '\n');
  }

  /**
   * Genera versión de texto plano de la firma
   */
  private generatePlainText(data: SignatureData): string {
    const lines: string[] = [];

    lines.push('--');
    lines.push(data.name);

    if (data.title) lines.push(data.title);
    if (data.company) lines.push(data.company);
    if (data.department) lines.push(data.department);

    lines.push('');

    if (data.email) lines.push(`Email: ${data.email}`);
    if (data.phone) lines.push(`Tel: ${data.phone}`);
    if (data.mobile) lines.push(`Móvil: ${data.mobile}`);
    if (data.website) lines.push(`Web: ${data.website}`);
    if (data.address) lines.push(`Dirección: ${data.address}`);

    if (data.linkedin || data.twitter || data.github) {
      lines.push('');
      if (data.linkedin) lines.push(`LinkedIn: ${data.linkedin}`);
      if (data.twitter) lines.push(`Twitter: ${data.twitter}`);
      if (data.github) lines.push(`GitHub: ${data.github}`);
    }

    if (data.slogan) {
      lines.push('');
      lines.push(`"${data.slogan}"`);
    }

    return lines.join('\n');
  }

  /**
   * Genera una vista previa simplificada
   */
  private generatePreview(html: string): string {
    // Envolver en un contenedor para preview
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
          .preview-container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; }
        </style>
      </head>
      <body>
        <div class="preview-container">
          ${html}
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Genera una firma usando IA basada en descripción
   */
  async generateWithAI(description: string, data: Partial<SignatureData>): Promise<GeneratedSignature> {
    const prompt = `Basándote en esta descripción, sugiere el mejor estilo de firma de correo y los colores:

Descripción: ${description}
Datos disponibles: ${JSON.stringify(data)}

Responde en JSON con este formato exacto:
{
  "templateId": "professional-modern|minimal-clean|corporate-full|creative-colorful|personal-casual",
  "style": {
    "primaryColor": "#hexcolor",
    "secondaryColor": "#hexcolor",
    "iconStyle": "colored|monochrome|none"
  },
  "suggestions": {
    "slogan": "frase sugerida si aplica",
    "improvements": ["sugerencia 1", "sugerencia 2"]
  }
}`;

    const result = await this.model.generateContent(prompt);
    const responseText = result.response.text();

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiSuggestion = JSON.parse(jsonMatch[0]);

        const enrichedData: SignatureData = {
          name: data.name || 'Tu Nombre',
          ...data,
          slogan: data.slogan || aiSuggestion.suggestions?.slogan
        };

        return this.generateSignature(
          enrichedData,
          aiSuggestion.templateId,
          aiSuggestion.style
        );
      }
    } catch (e) {
      console.error('Error parsing AI response:', e);
    }

    // Fallback a plantilla por defecto
    return this.generateSignature(
      { name: data.name || 'Tu Nombre', ...data },
      'professional-modern'
    );
  }

  /**
   * Obtiene todas las plantillas disponibles
   */
  getTemplates(): SignatureTemplate[] {
    return this.templates.map(t => ({
      ...t,
      html: '' // No exponer el HTML completo
    }));
  }

  /**
   * Obtiene una plantilla específica
   */
  getTemplate(templateId: string): SignatureTemplate | undefined {
    return this.templates.find(t => t.id === templateId);
  }

  /**
   * Valida una firma HTML
   */
  validateSignature(html: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Verificar que sea HTML válido
    if (!html.includes('<table') && !html.includes('<div')) {
      issues.push('La firma debe contener elementos HTML válidos');
    }

    // Verificar tamaño
    if (html.length > 50000) {
      issues.push('La firma es demasiado grande (máximo 50KB)');
    }

    // Verificar scripts maliciosos
    if (html.includes('<script') || html.includes('javascript:')) {
      issues.push('No se permiten scripts en la firma');
    }

    // Verificar iframes
    if (html.includes('<iframe')) {
      issues.push('No se permiten iframes en la firma');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Optimiza una firma para email (inline styles, compatibilidad)
   */
  optimizeForEmail(html: string): string {
    // Las firmas ya están optimizadas con inline styles
    // Agregar mejoras de compatibilidad

    let optimized = html;

    // Asegurar que las tablas tengan los atributos necesarios
    optimized = optimized.replace(/<table/g, '<table role="presentation"');

    // Agregar fallbacks de fuentes
    optimized = optimized.replace(
      /font-family:\s*([^;]+);/g,
      'font-family: $1, Helvetica, Arial, sans-serif;'
    );

    // Asegurar que los enlaces abran en nueva pestaña
    optimized = optimized.replace(
      /<a\s+href=/g,
      '<a target="_blank" rel="noopener noreferrer" href='
    );

    return optimized;
  }
}

export default new EmailSignatureService();
