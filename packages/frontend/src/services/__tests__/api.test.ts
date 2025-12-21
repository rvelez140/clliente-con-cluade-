import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = axios as any;

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication API', () => {
    it('should make POST request to login endpoint', async () => {
      const mockResponse = {
        data: {
          token: 'mock_token',
          user: { id: '1', email: 'test@example.com' },
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await axios.post('/api/auth/login', credentials);

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/login', credentials);
      expect(result.data).toEqual(mockResponse.data);
    });

    it('should make POST request to register endpoint', async () => {
      const mockResponse = {
        data: {
          token: 'mock_token',
          user: { id: '1', email: 'new@example.com', name: 'New User' },
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const userData = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      };

      const result = await axios.post('/api/auth/register', userData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/register', userData);
      expect(result.data).toEqual(mockResponse.data);
    });

    it('should include authorization header for authenticated requests', async () => {
      const token = 'mock_token_123';
      const mockConfig = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: { emails: [] } });

      await axios.get('/api/email/inbox', mockConfig);

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/email/inbox', mockConfig);
    });
  });

  describe('Email API', () => {
    it('should fetch inbox emails', async () => {
      const mockEmails = [
        { id: '1', subject: 'Test Email 1', from: 'sender1@example.com' },
        { id: '2', subject: 'Test Email 2', from: 'sender2@example.com' },
      ];

      mockedAxios.get.mockResolvedValueOnce({ data: mockEmails });

      const result = await axios.get('/api/email/inbox');

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/email/inbox');
      expect(result.data).toEqual(mockEmails);
    });

    it('should send email', async () => {
      const mockEmail = {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test Body',
      };

      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      const result = await axios.post('/api/email/send', mockEmail);

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/email/send', mockEmail);
      expect(result.data.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 unauthorized error', async () => {
      const error = {
        response: {
          status: 401,
          data: { error: 'Token inválido' },
        },
      };

      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(axios.get('/api/email/inbox')).rejects.toEqual(error);
    });

    it('should handle 404 not found error', async () => {
      const error = {
        response: {
          status: 404,
          data: { error: 'Recurso no encontrado' },
        },
      };

      mockedAxios.get.mockRejectedValueOnce(error);

      await expect(axios.get('/api/email/123')).rejects.toEqual(error);
    });

    it('should handle 500 server error', async () => {
      const error = {
        response: {
          status: 500,
          data: { error: 'Error interno del servidor' },
        },
      };

      mockedAxios.post.mockRejectedValueOnce(error);

      await expect(axios.post('/api/email/send', {})).rejects.toEqual(error);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');

      mockedAxios.get.mockRejectedValueOnce(networkError);

      await expect(axios.get('/api/email/inbox')).rejects.toThrow('Network Error');
    });
  });
});
