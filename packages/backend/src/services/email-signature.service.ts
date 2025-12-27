import crypto from 'crypto';
import { query } from '../config/database';

export interface EmailSignature {
  userId: string;
  name?: string;
  title?: string;
  company?: string;
  phone?: string;
  website?: string;
  customHtml?: string;
  includeAvatar?: boolean;
  avatarUrl?: string;
  backgroundImageUrl?: string;
  backgroundColor?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: string;
  backgroundRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  padding?: string;
  borderRadius?: string;
}

/**
 * Servicio para gestionar firmas de correo electrónico
 */
export class EmailSignatureService {
  /**
   * Obtiene la firma de correo de un usuario desde la configuración
   */
  async getUserSignature(userId: string): Promise<string | null> {
    try {
      const result = await query(
        'SELECT signature FROM user_settings WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length > 0 && result.rows[0].signature) {
        return result.rows[0].signature;
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo firma del usuario:', error);
      return null;
    }
  }

  /**
   * Genera una firma HTML a partir de datos estructurados
   */
  generateSignatureHtml(signature: EmailSignature): string {
    const {
      name,
      title,
      company,
      phone,
      website,
      customHtml,
      includeAvatar,
      avatarUrl,
      backgroundImageUrl,
      backgroundColor,
      backgroundSize = 'cover',
      backgroundPosition = 'center',
      backgroundRepeat = 'no-repeat',
      padding = '15px',
      borderRadius = '0px'
    } = signature;

    // Si hay HTML personalizado, usarlo
    if (customHtml) {
      return customHtml;
    }

    // Construir estilos de fondo
    const backgroundStyles: string[] = [];

    if (backgroundImageUrl) {
      backgroundStyles.push(`background-image: url('${this.escapeHtml(backgroundImageUrl)}')`);
      backgroundStyles.push(`background-size: ${backgroundSize}`);
      backgroundStyles.push(`background-position: ${backgroundPosition}`);
      backgroundStyles.push(`background-repeat: ${backgroundRepeat}`);
    }

    if (backgroundColor) {
      backgroundStyles.push(`background-color: ${backgroundColor}`);
    }

    // Generar firma estándar
    const baseStyles = [
      'font-family: Arial, sans-serif',
      'font-size: 14px',
      'color: #333',
      'margin-top: 20px',
      'border-top: 2px solid #e0e0e0',
      `padding: ${padding}`,
      `border-radius: ${borderRadius}`,
      'position: relative',
      'overflow: hidden'
    ];

    // Si hay imagen de fondo, agregar overlay para mejorar legibilidad
    const hasBackgroundImage = !!backgroundImageUrl;
    let html = `<div style="${[...baseStyles, ...backgroundStyles].join('; ')};">`;

    // Agregar overlay semitransparente si hay imagen de fondo
    if (hasBackgroundImage) {
      html += '<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255, 255, 255, 0.85); z-index: 1;"></div>';
      html += '<div style="position: relative; z-index: 2;">';
    }

    // Agregar avatar si está configurado
    if (includeAvatar && avatarUrl) {
      html += `<img src="${avatarUrl}" alt="Avatar" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 10px; display: block; border: 3px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />`;
    }

    if (name) {
      html += `<strong style="font-size: 16px; color: #000;">${this.escapeHtml(name)}</strong><br/>`;
    }

    if (title) {
      html += `<span style="color: #666;">${this.escapeHtml(title)}</span><br/>`;
    }

    if (company) {
      html += `<span style="color: #666;">${this.escapeHtml(company)}</span><br/>`;
    }

    if (phone) {
      html += `<span style="color: #666;">📞 ${this.escapeHtml(phone)}</span><br/>`;
    }

    if (website) {
      html += `<a href="${this.escapeHtml(website)}" style="color: #0066cc; text-decoration: none;">${this.escapeHtml(website)}</a><br/>`;
    }

    if (hasBackgroundImage) {
      html += '</div>'; // Cerrar div de contenido con z-index
    }

    html += '</div>';

    return html;
  }

  /**
   * Agrega una firma al cuerpo de un correo
   */
  appendSignature(emailBody: string, signature: string): string {
    // Si el cuerpo es HTML
    if (emailBody.includes('</body>') || emailBody.includes('</html>')) {
      // Insertar antes del cierre del body
      return emailBody.replace('</body>', `${signature}</body>`);
    }

    // Si es texto plano o HTML simple, agregar al final
    return `${emailBody}\n\n${signature}`;
  }

  /**
   * Genera un avatar Gravatar basado en el email
   */
  generateGravatarUrl(email: string, size: number = 80): string {
    const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
  }

  /**
   * Genera un avatar con las iniciales del nombre
   */
  generateInitialsAvatar(name: string, backgroundColor?: string): string {
    const initials = this.getInitials(name);
    const bgColor = backgroundColor || this.generateColorFromName(name);

    const svg = `
      <svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
        <rect width="80" height="80" fill="${bgColor}" />
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="32" fill="white" font-weight="bold">
          ${initials}
        </text>
      </svg>
    `;

    // Convertir SVG a data URL
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }

  /**
   * Obtiene las iniciales de un nombre
   */
  private getInitials(name: string): string {
    const parts = name.trim().split(' ').filter(p => p.length > 0);

    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Genera un color consistente basado en el nombre
   */
  private generateColorFromName(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = hash % 360;
    return `hsl(${hue}, 60%, 50%)`;
  }

  /**
   * Escapa caracteres HTML para prevenir XSS
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Actualiza la firma de un usuario
   */
  async updateUserSignature(userId: string, signature: string): Promise<boolean> {
    try {
      const result = await query(
        `UPDATE user_settings
         SET signature = $1, updated_at = NOW()
         WHERE user_id = $2`,
        [signature, userId]
      );

      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Error actualizando firma del usuario:', error);
      return false;
    }
  }

  /**
   * Crea la firma de un usuario si no existe
   */
  async createUserSignature(userId: string, signature: string): Promise<boolean> {
    try {
      // Primero intentar actualizar
      const updateResult = await this.updateUserSignature(userId, signature);

      if (!updateResult) {
        // Si no existe, crear la configuración de usuario
        const result = await query(
          `INSERT INTO user_settings (user_id, signature, theme, language)
           VALUES ($1, $2, 'gmail', 'es')
           ON CONFLICT (user_id)
           DO UPDATE SET signature = $2, updated_at = NOW()`,
          [userId, signature]
        );

        return result.rowCount ? result.rowCount > 0 : false;
      }

      return updateResult;
    } catch (error) {
      console.error('Error creando firma del usuario:', error);
      return false;
    }
  }

  /**
   * Valida si una URL de imagen es válida
   */
  isValidImageUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      // Permitir solo HTTP(S) o data URLs
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:' && !url.startsWith('data:image/')) {
        return false;
      }

      // Validar extensiones de imagen comunes
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
      const pathname = parsedUrl.pathname.toLowerCase();

      // Si es data URL, validar que sea de imagen
      if (url.startsWith('data:image/')) {
        return true;
      }

      // Verificar extensión
      return imageExtensions.some(ext => pathname.endsWith(ext));
    } catch {
      return false;
    }
  }

  /**
   * Genera una firma con imagen de fondo de ejemplo
   */
  generateSampleSignatureWithBackground(
    name: string,
    title: string,
    company: string,
    backgroundImageUrl?: string
  ): string {
    return this.generateSignatureHtml({
      userId: '',
      name,
      title,
      company,
      backgroundImageUrl,
      backgroundColor: backgroundImageUrl ? undefined : '#f8f9fa',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      padding: '20px',
      borderRadius: '8px',
      includeAvatar: false
    });
  }
}

export default new EmailSignatureService();
