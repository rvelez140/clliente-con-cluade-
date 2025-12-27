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
  provider: 'gmail' | 'outlook' | 'yahoo' | 'protonmail' | 'custom';
  email: string;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  accessToken?: string;
  refreshToken?: string;
  password?: string;
  useApi?: boolean; // Si true, usar API en lugar de IMAP/SMTP
  publicKey?: string; // Clave pública PGP del usuario
  privateKey?: string; // Clave privada PGP (encriptada)
  createdAt: Date;
  updatedAt: Date;
}

export interface Email {
  id: string;
  accountId: string;
  messageId: string;
  from: string;
  fromName?: string;
  fromAvatar?: string;
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
  // Campos de IA
  category?: string;
  priority?: string;
  isSpam?: boolean;
  isPhishing?: boolean;
  tags?: string[];
  isEncrypted?: boolean;
  aiMetadata?: any;
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
  theme: 'gmail' | 'outlook' | 'yahoo';
  language: string;
  signature?: string;
  autoReply?: boolean;
  autoReplyMessage?: string;
  avatarType?: 'gravatar' | 'initials' | 'custom';
  avatarUrl?: string;
  avatarBackgroundColor?: string;
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

export interface AIClassification {
  category: 'personal' | 'work' | 'finance' | 'social' | 'promotions' | 'spam' | 'important' | 'updates';
  confidence: number;
  suggestedFolder?: string;
  tags?: string[];
}

export interface SpamAnalysis {
  isSpam: boolean;
  isPhishing: boolean;
  confidence: number;
  reasons: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SearchQuery {
  query: string;
  filters?: {
    from?: string;
    to?: string;
    subject?: string;
    dateRange?: {
      start?: Date;
      end?: Date;
    };
    hasAttachment?: boolean;
    isRead?: boolean;
    category?: string;
  };
}

export interface EncryptionKeyPair {
  publicKey: string;
  privateKey: string;
  revocationCertificate: string;
}
