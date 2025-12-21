export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailAccount {
  id: string;
  userId: string;
  provider: 'gmail' | 'outlook' | 'custom';
  email: string;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  accessToken?: string;
  refreshToken?: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Email {
  id: string;
  accountId: string;
  messageId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  attachments?: Attachment[];
  isRead: boolean;
  isStarred: boolean;
  folder: string;
  receivedAt: Date;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  theme: 'gmail' | 'outlook';
  language: string;
  signature?: string;
  autoReply?: boolean;
  autoReplyMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeminiRequest {
  prompt: string;
  context?: string;
  tone?: 'formal' | 'casual' | 'friendly' | 'professional';
  length?: 'short' | 'medium' | 'long';
}

export interface GeminiResponse {
  text: string;
  suggestions?: string[];
}
