import { Request, Response, NextFunction } from 'express';
import { authenticateToken, AuthRequest } from '../auth.middleware';
import authService from '../../services/auth.service';

jest.mock('../../services/auth.service');

describe('Auth Middleware - authenticateToken', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  it('should pass with valid token', async () => {
    const token = 'valid_token';
    const decoded = { id: '123', email: 'test@example.com' };

    mockRequest.headers = {
      authorization: `Bearer ${token}`,
    };

    (authService.verifyToken as jest.Mock).mockReturnValue(decoded);

    await authenticateToken(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(authService.verifyToken).toHaveBeenCalledWith(token);
    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.user).toEqual(decoded);
  });

  it('should return 401 if no token provided', async () => {
    mockRequest.headers = {};

    await authenticateToken(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Token no proporcionado',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if authorization header is missing token', async () => {
    mockRequest.headers = {
      authorization: 'Bearer',
    };

    await authenticateToken(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Token no proporcionado',
    });
  });

  it('should return 403 if token verification fails', async () => {
    const token = 'invalid_token';

    mockRequest.headers = {
      authorization: `Bearer ${token}`,
    };

    (authService.verifyToken as jest.Mock).mockImplementation(() => {
      throw new Error('Token inválido');
    });

    await authenticateToken(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Token inválido',
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should extract token from Bearer format correctly', async () => {
    const token = 'my_secret_token_123';
    const decoded = { id: '456', email: 'user@example.com' };

    mockRequest.headers = {
      authorization: `Bearer ${token}`,
    };

    (authService.verifyToken as jest.Mock).mockReturnValue(decoded);

    await authenticateToken(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(authService.verifyToken).toHaveBeenCalledWith(token);
    expect(mockRequest.user).toEqual(decoded);
  });
});
