import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import logger from '../config/logger';

export interface EmailNotification {
  type: 'email_sent' | 'email_failed' | 'email_received' | 'email_scheduled';
  userId: string;
  data: any;
  timestamp: Date;
}

export class WebSocketService {
  private io: Server | null = null;
  private userSockets: Map<string, Set<string>> = new Map();

  /**
   * Inicializa el servidor WebSocket
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      },
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info(`Cliente conectado: ${socket.id}`);

      // Autenticar y asociar socket con usuario
      socket.on('authenticate', (data: { userId: string }) => {
        this.registerUserSocket(data.userId, socket.id);
        socket.join(`user:${data.userId}`);
        logger.info(`Usuario ${data.userId} autenticado en socket ${socket.id}`);

        socket.emit('authenticated', { success: true });
      });

      socket.on('disconnect', () => {
        this.unregisterUserSocket(socket.id);
        logger.info(`Cliente desconectado: ${socket.id}`);
      });

      // Ping/Pong para mantener conexión alive
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });

    logger.info('✓ Servidor WebSocket inicializado');
  }

  /**
   * Registra un socket para un usuario
   */
  private registerUserSocket(userId: string, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  /**
   * Des-registra un socket
   */
  private unregisterUserSocket(socketId: string): void {
    for (const [userId, sockets] of this.userSockets.entries()) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  /**
   * Envía notificación a un usuario específico
   */
  notifyUser(userId: string, notification: EmailNotification): void {
    if (!this.io) {
      logger.warn('WebSocket no inicializado');
      return;
    }

    this.io.to(`user:${userId}`).emit('notification', notification);
    logger.debug(`Notificación enviada a usuario ${userId}: ${notification.type}`);
  }

  /**
   * Envía notificación de email enviado
   */
  notifyEmailSent(userId: string, emailData: any): void {
    this.notifyUser(userId, {
      type: 'email_sent',
      userId,
      data: emailData,
      timestamp: new Date(),
    });
  }

  /**
   * Envía notificación de email fallido
   */
  notifyEmailFailed(userId: string, emailData: any, error: string): void {
    this.notifyUser(userId, {
      type: 'email_failed',
      userId,
      data: { ...emailData, error },
      timestamp: new Date(),
    });
  }

  /**
   * Envía notificación de email recibido
   */
  notifyEmailReceived(userId: string, emailData: any): void {
    this.notifyUser(userId, {
      type: 'email_received',
      userId,
      data: emailData,
      timestamp: new Date(),
    });
  }

  /**
   * Envía notificación de email programado
   */
  notifyEmailScheduled(userId: string, emailData: any): void {
    this.notifyUser(userId, {
      type: 'email_scheduled',
      userId,
      data: emailData,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast a todos los usuarios conectados
   */
  broadcast(event: string, data: any): void {
    if (!this.io) {
      logger.warn('WebSocket no inicializado');
      return;
    }

    this.io.emit(event, data);
    logger.debug(`Broadcast enviado: ${event}`);
  }

  /**
   * Obtiene número de usuarios conectados
   */
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Verifica si un usuario está conectado
   */
  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  /**
   * Obtiene sockets de un usuario
   */
  getUserSockets(userId: string): Set<string> {
    return this.userSockets.get(userId) || new Set();
  }
}

export default new WebSocketService();
