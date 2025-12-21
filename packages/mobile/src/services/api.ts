import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://your-api-url.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
  getEmails: (accountId: string) => api.get(`/email/accounts/${accountId}/emails`),
  sendEmail: (accountId: string, data: any) =>
    api.post(`/email/accounts/${accountId}/send`, data),
};

export const geminiApi = {
  generateEmail: (data: any) => api.post('/gemini/generate', data),
  improveDraft: (draft: string, improvements: string) =>
    api.post('/gemini/improve', { draft, improvements }),
  suggestReply: (emailBody: string, tone?: string) =>
    api.post('/gemini/suggest-reply', { emailBody, tone }),
};

export default api;
