import request from 'supertest';
import express from 'express';
import authRoutes from '../auth.routes';
import authService from '../../services/auth.service';

jest.mock('../../services/auth.service');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockToken = 'jwt_token_123';

      (authService.register as jest.Mock).mockResolvedValue({
        user: mockUser,
        token: mockToken,
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token', mockToken);
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          password: 'password123',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if user already exists', async () => {
      (authService.register as jest.Mock).mockRejectedValue(
        new Error('El usuario ya existe')
      );

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test User',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/login', () => {
    it('should login user with valid credentials', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
      };
      const mockToken = 'jwt_token_123';

      (authService.login as jest.Mock).mockResolvedValue({
        user: mockUser,
        token: mockToken,
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token', mockToken);
      expect(authService.login).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
    });

    it('should return 401 for invalid credentials', async () => {
      (authService.login as jest.Mock).mockRejectedValue(
        new Error('Credenciales inválidas')
      );

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          password: 'password123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user if authenticated', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
      };

      (authService.findUserById as jest.Mock).mockResolvedValue(mockUser);
      (authService.verifyToken as jest.Mock).mockReturnValue({
        id: '123',
        email: 'test@example.com',
      });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid_token')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('id', '123');
      expect(response.body).toHaveProperty('email', 'test@example.com');
    });

    it('should return 401 if not authenticated', async () => {
      await request(app).get('/auth/me').expect(401);
    });
  });
});
