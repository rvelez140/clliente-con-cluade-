import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { User } from '../types';
import { config } from '../config';

export class AuthService {
  async register(email: string, password: string, name: string): Promise<{ user: User; token: string }> {
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new Error('El usuario ya existe');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const result = await query(
      'INSERT INTO users (id, email, password, name) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, email, hashedPassword, name]
    );

    const user = result.rows[0];
    const token = this.generateToken(user);

    await query(
      'INSERT INTO user_settings (id, user_id, theme, language) VALUES ($1, $2, $3, $4)',
      [uuidv4(), userId, 'gmail', 'es']
    );

    return { user, token };
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Credenciales inválidas');
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async findUserById(id: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  private generateToken(user: User): string {
    return jwt.sign(
      { id: user.id, email: user.email },
      config.jwtSecret as string,
      { expiresIn: config.jwtExpiration as string }
    );
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, config.jwtSecret);
    } catch (error) {
      throw new Error('Token inválido');
    }
  }
}

export default new AuthService();
