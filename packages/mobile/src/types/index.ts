export interface User {
  id: string;
  email: string;
  name: string;
}

export interface EmailAccount {
  id: string;
  provider: 'gmail' | 'outlook' | 'custom';
  email: string;
}

export interface Email {
  id: string;
  accountId: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  htmlBody?: string;
  isRead: boolean;
  isStarred: boolean;
  receivedAt: string;
}

export interface Theme {
  name: 'gmail' | 'outlook';
  dark: boolean;
}
