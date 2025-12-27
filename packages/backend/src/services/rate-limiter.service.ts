import { createClient, RedisClientType } from 'redis';
import logger from '../config/logger';

export class RateLimiterService {
  private client: RedisClientType | null = null;
  private connected: boolean = false;

  constructor() {
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        logger.info('✓ Conectado a Redis');
        this.connected = true;
      });

      await this.client.connect();
    } catch (error) {
      logger.warn('⚠ Redis no disponible, rate limiting deshabilitado');
      this.connected = false;
    }
  }

  /**
   * Verifica si un usuario ha excedido el límite de envíos
   * @param userId - ID del usuario
   * @param limit - Número máximo de envíos permitidos
   * @param windowSeconds - Ventana de tiempo en segundos
   * @returns true si puede enviar, false si excedió el límite
   */
  async checkLimit(
    userId: string,
    limit: number = 100,
    windowSeconds: number = 3600
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    // Si Redis no está disponible, permitir envío
    if (!this.connected || !this.client) {
      return {
        allowed: true,
        remaining: limit,
        resetAt: new Date(Date.now() + windowSeconds * 1000),
      };
    }

    const key = `rate_limit:${userId}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    try {
      // Eliminar requests antiguos fuera de la ventana
      await this.client.zRemRangeByScore(key, 0, windowStart);

      // Contar requests en la ventana actual
      const count = await this.client.zCount(key, windowStart, now);

      if (count >= limit) {
        // Obtener el timestamp del request más antiguo
        const oldest = await this.client.zRange(key, 0, 0, { REV: false });
        const resetAt = oldest.length > 0
          ? new Date(parseFloat(oldest[0]) + windowSeconds * 1000)
          : new Date(now + windowSeconds * 1000);

        return {
          allowed: false,
          remaining: 0,
          resetAt,
        };
      }

      // Agregar el request actual
      await this.client.zAdd(key, { score: now, value: now.toString() });

      // Configurar expiración de la key
      await this.client.expire(key, windowSeconds);

      return {
        allowed: true,
        remaining: limit - count - 1,
        resetAt: new Date(now + windowSeconds * 1000),
      };
    } catch (error) {
      logger.error('Error verificando rate limit:', error);
      // En caso de error, permitir el envío
      return {
        allowed: true,
        remaining: limit,
        resetAt: new Date(now + windowSeconds * 1000),
      };
    }
  }

  /**
   * Verifica límite de envíos diarios
   */
  async checkDailyLimit(userId: string, limit: number = 1000): Promise<{ allowed: boolean; remaining: number }> {
    return this.checkLimit(userId, limit, 86400); // 24 horas
  }

  /**
   * Verifica límite de envíos por hora
   */
  async checkHourlyLimit(userId: string, limit: number = 100): Promise<{ allowed: boolean; remaining: number }> {
    return this.checkLimit(userId, limit, 3600); // 1 hora
  }

  /**
   * Resetea el límite de un usuario (útil para admin)
   */
  async resetLimit(userId: string): Promise<void> {
    if (!this.connected || !this.client) return;

    try {
      await this.client.del(`rate_limit:${userId}`);
      logger.info(`Rate limit reseteado para usuario ${userId}`);
    } catch (error) {
      logger.error('Error reseteando rate limit:', error);
    }
  }

  /**
   * Obtiene estadísticas de uso para un usuario
   */
  async getUsageStats(userId: string): Promise<{
    hourly: number;
    daily: number;
  }> {
    if (!this.connected || !this.client) {
      return { hourly: 0, daily: 0 };
    }

    const now = Date.now();
    const hourAgo = now - 3600 * 1000;
    const dayAgo = now - 86400 * 1000;
    const key = `rate_limit:${userId}`;

    try {
      const hourly = await this.client.zCount(key, hourAgo, now);
      const daily = await this.client.zCount(key, dayAgo, now);

      return { hourly, daily };
    } catch (error) {
      logger.error('Error obteniendo estadísticas de uso:', error);
      return { hourly: 0, daily: 0 };
    }
  }

  /**
   * Cierra la conexión a Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
      logger.info('Desconectado de Redis');
    }
  }
}

export default new RateLimiterService();
