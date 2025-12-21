export interface User {
  id: string;
  email: string;
  name: string;
}

export interface EmailAccount {
  id: string;
  provider: 'gmail' | 'outlook' | 'custom';
  email: string;
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
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
  isRead: boolean;
  isStarred: boolean;
  folder: string;
  receivedAt: string;
}

export interface Theme {
  name: 'gmail' | 'outlook';
  mode: 'light' | 'dark';
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    hover: string;
  };
}
