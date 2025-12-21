import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (email: string, password: string, name: string) =>
    api.post('/auth/register', { email, password, name }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

export const emailApi = {
  getAccounts: () => api.get('/email/accounts'),
  addAccount: (data: any) => api.post('/email/accounts', data),
  fetchEmails: (accountId: string, folder?: string, limit?: number) =>
    api.get(`/email/accounts/${accountId}/fetch`, { params: { folder, limit } }),
  getEmails: (accountId: string) => api.get(`/email/accounts/${accountId}/emails`),
  sendEmail: (accountId: string, data: any) =>
    api.post(`/email/accounts/${accountId}/send`, data),
};

export const geminiApi = {
  generateEmail: (data: any) => api.post('/gemini/generate', data),
  improveDraft: (draft: string, improvements: string) =>
    api.post('/gemini/improve', { draft, improvements }),
  summarizeEmail: (emailBody: string) =>
    api.post('/gemini/summarize', { emailBody }),
  suggestReply: (emailBody: string, tone?: string) =>
    api.post('/gemini/suggest-reply', { emailBody, tone }),
};

export default api;
