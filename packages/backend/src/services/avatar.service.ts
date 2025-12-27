import crypto from 'crypto';
import { query } from '../config/database';

export interface AvatarConfig {
  email: string;
  name?: string;
  type: 'gravatar' | 'initials' | 'custom';
  customUrl?: string;
  size?: number;
  backgroundColor?: string;
}

/**
 * Servicio para gestionar avatares de correo electrónico
 */
export class AvatarService {
  /**
   * Genera la URL del avatar basado en la configuración
   */
  generateAvatarUrl(config: AvatarConfig): string {
    const { type, email, name, customUrl, size = 80, backgroundColor } = config;

    switch (type) {
      case 'gravatar':
        return this.generateGravatarUrl(email, size);

      case 'initials':
        if (!name) {
          // Si no hay nombre, usar email
          return this.generateInitialsAvatar(this.getNameFromEmail(email), size, backgroundColor);
        }
        return this.generateInitialsAvatar(name, size, backgroundColor);

      case 'custom':
        if (customUrl) {
          return customUrl;
        }
        // Fallback a gravatar si no hay URL personalizada
        return this.generateGravatarUrl(email, size);

      default:
        return this.generateGravatarUrl(email, size);
    }
  }

  /**
   * Genera un avatar Gravatar basado en el email
   */
  generateGravatarUrl(email: string, size: number = 80): string {
    const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
  }

  /**
   * Genera un avatar SVG con las iniciales del nombre
   */
  generateInitialsAvatar(name: string, size: number = 80, backgroundColor?: string): string {
    const initials = this.getInitials(name);
    const bgColor = backgroundColor || this.generateColorFromName(name);
    const fontSize = Math.floor(size * 0.4);

    const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${bgColor}" rx="${size * 0.1}" />
  <text x="50%" y="50%" text-anchor="middle" dy="${fontSize * 0.15}" font-family="Arial, sans-serif" font-size="${fontSize}" fill="white" font-weight="bold">${this.escapeXml(initials)}</text>
</svg>`;

    // Convertir SVG a data URL
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }

  /**
   * Obtiene las iniciales de un nombre
   */
  private getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(p => p.length > 0);

    if (parts.length === 0) return '?';
    if (parts.length === 1) {
      // Si solo hay una palabra, tomar las primeras 2 letras
      return parts[0].substring(0, 2).toUpperCase();
    }

    // Tomar primera letra del primer y último nombre
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Extrae un nombre probable del email
   */
  private getNameFromEmail(email: string): string {
    const localPart = email.split('@')[0];
    // Reemplazar puntos y guiones con espacios
    const name = localPart.replace(/[._-]/g, ' ');
    // Capitalizar cada palabra
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Genera un color consistente basado en el nombre
   */
  private generateColorFromName(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generar un color HSL con saturación y brillo consistentes
    const hue = Math.abs(hash % 360);
    const saturation = 65;
    const lightness = 50;

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  /**
   * Obtiene la configuración de avatar de un usuario
   */
  async getUserAvatarConfig(userId: string): Promise<AvatarConfig | null> {
    try {
      const result = await query(
        `SELECT u.email, u.name, us.avatar_type, us.avatar_url, us.avatar_background_color
         FROM users u
         LEFT JOIN user_settings us ON u.id = us.user_id
         WHERE u.id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      return {
        email: row.email,
        name: row.name,
        type: row.avatar_type || 'gravatar',
        customUrl: row.avatar_url,
        backgroundColor: row.avatar_background_color,
      };
    } catch (error) {
      console.error('Error obteniendo configuración de avatar:', error);
      return null;
    }
  }

  /**
   * Actualiza la configuración de avatar de un usuario
   */
  async updateUserAvatarConfig(
    userId: string,
    type: 'gravatar' | 'initials' | 'custom',
    customUrl?: string,
    backgroundColor?: string
  ): Promise<boolean> {
    try {
      const result = await query(
        `UPDATE user_settings
         SET avatar_type = $1, avatar_url = $2, avatar_background_color = $3, updated_at = NOW()
         WHERE user_id = $4`,
        [type, customUrl, backgroundColor, userId]
      );

      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Error actualizando configuración de avatar:', error);
      return false;
    }
  }

  /**
   * Genera el HTML de un avatar para incluir en un correo
   */
  generateAvatarHtml(avatarUrl: string, name: string, size: number = 80): string {
    return `<img src="${this.escapeHtml(avatarUrl)}" alt="${this.escapeHtml(name)}" width="${size}" height="${size}" style="border-radius: 50%; display: block;" />`;
  }

  /**
   * Genera un avatar inline para correos (embedded en el HTML)
   */
  generateInlineAvatar(email: string, name?: string, size: number = 40): string {
    const avatarUrl = this.generateAvatarUrl({
      email,
      name,
      type: name ? 'initials' : 'gravatar',
      size,
    });

    return `<img src="${avatarUrl}" alt="Avatar" width="${size}" height="${size}" style="border-radius: 50%; vertical-align: middle; margin-right: 8px;" />`;
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
   * Escapa caracteres XML para SVG
   */
  private escapeXml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;'
    };

    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Valida si una URL de avatar es válida
   */
  isValidAvatarUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      // Permitir solo HTTP(S) o data URLs
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' || url.startsWith('data:image/');
    } catch {
      return false;
    }
  }
}

export default new AvatarService();
