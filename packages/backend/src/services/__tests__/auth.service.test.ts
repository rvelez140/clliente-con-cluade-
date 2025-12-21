import { AuthService } from '../auth.service';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../../config/database';

// Mock de dependencias
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('../../config/database');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

describe('AuthService', () => {
  let authService: AuthService;
  const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
  const mockJwt = jwt as jest.Mocked<typeof jwt>;
  const mockQuery = query as jest.MockedFunction<typeof query>;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const name = 'Test User';
      const hashedPassword = 'hashed_password';
      const token = 'jwt_token';

      // Mock: usuario no existe
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      // Mock: hash password
      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);

      // Mock: insert user
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'mock-uuid-123', email, password: hashedPassword, name }],
      } as any);

      // Mock: generate token
      mockJwt.sign.mockReturnValue(token as never);

      // Mock: insert settings
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const result = await authService.register(email, password, name);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token', token);
      expect(result.user.email).toBe(email);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    it('should throw error if user already exists', async () => {
      const email = 'existing@example.com';
      const password = 'password123';
      const name = 'Test User';

      // Mock: usuario ya existe
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: '1', email }],
      } as any);

      await expect(authService.register(email, password, name)).rejects.toThrow(
        'El usuario ya existe'
      );
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = 'hashed_password';
      const token = 'jwt_token';

      // Mock: encontrar usuario
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: '1', email, password: hashedPassword }],
      } as any);

      // Mock: comparar password
      mockBcrypt.compare.mockResolvedValue(true as never);

      // Mock: generar token
      mockJwt.sign.mockReturnValue(token as never);

      const result = await authService.login(email, password);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token', token);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should throw error if user not found', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password123';

      // Mock: usuario no encontrado
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      await expect(authService.login(email, password)).rejects.toThrow(
        'Credenciales inválidas'
      );
    });

    it('should throw error if password is invalid', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';
      const hashedPassword = 'hashed_password';

      // Mock: encontrar usuario
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: '1', email, password: hashedPassword }],
      } as any);

      // Mock: comparar password (falla)
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(authService.login(email, password)).rejects.toThrow(
        'Credenciales inválidas'
      );
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      const email = 'test@example.com';
      const mockUser = { id: '1', email, name: 'Test User' };

      mockQuery.mockResolvedValueOnce({ rows: [mockUser] } as any);

      const result = await authService.findUserByEmail(email);

      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
    });

    it('should return null if user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);

      const result = await authService.findUserByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findUserById', () => {
    it('should find user by id', async () => {
      const userId = '123';
      const mockUser = { id: userId, email: 'test@example.com' };

      mockQuery.mockResolvedValueOnce({ rows: [mockUser] } as any);

      const result = await authService.findUserById(userId);

      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const token = 'valid_token';
      const decoded = { id: '1', email: 'test@example.com' };

      mockJwt.verify.mockReturnValue(decoded as never);

      const result = authService.verifyToken(token);

      expect(result).toEqual(decoded);
    });

    it('should throw error for invalid token', () => {
      const token = 'invalid_token';

      mockJwt.verify.mockImplementation(() => {
        throw new Error('Token error');
      });

      expect(() => authService.verifyToken(token)).toThrow('Token inválido');
    });
  });
});
