import { EmailService } from '../email.service';
import { EmailAccount } from '../../types';
import nodemailer from 'nodemailer';
import Imap from 'imap';

// Mock de nodemailer
jest.mock('nodemailer');

// Mock de imap
jest.mock('imap');

describe('EmailService', () => {
  let emailService: EmailService;
  let mockTransporter: any;

  beforeEach(() => {
    emailService = new EmailService();
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-123' }),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    const gmailAccount: EmailAccount = {
      id: 'acc-1',
      userId: 'user-1',
      email: 'test@gmail.com',
      password: 'password123',
      provider: 'gmail',
      displayName: 'Test User',
      isDefault: true,
      isSyncing: false,
      lastSyncAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('debe enviar un email con Gmail correctamente', async () => {
      await emailService.sendEmail(
        gmailAccount,
        ['recipient@example.com'],
        'Test Subject',
        '<p>Test Body</p>'
      );

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: gmailAccount.email,
          pass: gmailAccount.password,
        },
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: gmailAccount.email,
        to: 'recipient@example.com',
        cc: undefined,
        bcc: undefined,
        subject: 'Test Subject',
        html: '<p>Test Body</p>',
        attachments: undefined,
      });
    });

    it('debe enviar email con múltiples destinatarios', async () => {
      await emailService.sendEmail(
        gmailAccount,
        ['recipient1@example.com', 'recipient2@example.com'],
        'Test Subject',
        'Body'
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient1@example.com, recipient2@example.com',
        })
      );
    });

    it('debe enviar email con CC y BCC', async () => {
      await emailService.sendEmail(
        gmailAccount,
        ['to@example.com'],
        'Subject',
        'Body',
        ['cc@example.com'],
        ['bcc@example.com']
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          cc: 'cc@example.com',
          bcc: 'bcc@example.com',
        })
      );
    });

    it('debe enviar email con adjuntos', async () => {
      const attachments = [
        { filename: 'test.pdf', path: '/tmp/test.pdf' },
      ];

      await emailService.sendEmail(
        gmailAccount,
        ['to@example.com'],
        'Subject',
        'Body',
        undefined,
        undefined,
        attachments
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments,
        })
      );
    });

    it('debe configurar SMTP correctamente para Outlook', async () => {
      const outlookAccount: EmailAccount = {
        ...gmailAccount,
        email: 'test@outlook.com',
        provider: 'outlook',
      };

      await emailService.sendEmail(
        outlookAccount,
        ['to@example.com'],
        'Subject',
        'Body'
      );

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        auth: {
          user: outlookAccount.email,
          pass: outlookAccount.password,
        },
      });
    });

    it('debe usar configuración custom para proveedores no estándar', async () => {
      const customAccount: EmailAccount = {
        ...gmailAccount,
        provider: 'custom',
        smtpHost: 'smtp.custom.com',
        smtpPort: 465,
      };

      await emailService.sendEmail(
        customAccount,
        ['to@example.com'],
        'Subject',
        'Body'
      );

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.custom.com',
        port: 465,
        secure: false,
        auth: {
          user: customAccount.email,
          pass: customAccount.password,
        },
      });
    });

    it('debe propagar errores de envío', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

      await expect(
        emailService.sendEmail(
          gmailAccount,
          ['to@example.com'],
          'Subject',
          'Body'
        )
      ).rejects.toThrow('SMTP Error');
    });
  });

  describe('fetchEmails - IMAP Configuration', () => {
    const gmailAccount: EmailAccount = {
      id: 'acc-1',
      userId: 'user-1',
      email: 'test@gmail.com',
      password: 'password123',
      provider: 'gmail',
      displayName: 'Test User',
      isDefault: true,
      isSyncing: false,
      lastSyncAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('debe configurar IMAP correctamente para Gmail', async () => {
      // Mock de la instancia de IMAP
      const mockImap = {
        once: jest.fn((event, callback) => {
          if (event === 'ready') {
            // Simular que IMAP está listo inmediatamente
            setTimeout(() => callback(), 0);
          }
          if (event === 'end') {
            setTimeout(() => callback(), 100);
          }
        }),
        openBox: jest.fn((folder, readOnly, callback) => {
          callback(null, { messages: { total: 0 } });
        }),
        end: jest.fn(),
        connect: jest.fn(),
        seq: {
          fetch: jest.fn(() => ({
            on: jest.fn(),
            once: jest.fn((event, callback) => {
              if (event === 'end') setTimeout(() => callback(), 10);
            }),
          })),
        },
      };

      (Imap as unknown as jest.Mock).mockImplementation(() => mockImap);

      const emails = await emailService.fetchEmails(gmailAccount);

      expect(Imap).toHaveBeenCalledWith({
        user: gmailAccount.email,
        password: gmailAccount.password,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
      });
    });

    it('debe configurar IMAP correctamente para Outlook', async () => {
      const outlookAccount: EmailAccount = {
        ...gmailAccount,
        email: 'test@outlook.com',
        provider: 'outlook',
      };

      const mockImap = {
        once: jest.fn((event, callback) => {
          if (event === 'ready') setTimeout(() => callback(), 0);
          if (event === 'end') setTimeout(() => callback(), 100);
        }),
        openBox: jest.fn((folder, readOnly, callback) => {
          callback(null, { messages: { total: 0 } });
        }),
        end: jest.fn(),
        connect: jest.fn(),
        seq: {
          fetch: jest.fn(() => ({
            on: jest.fn(),
            once: jest.fn((event, callback) => {
              if (event === 'end') setTimeout(() => callback(), 10);
            }),
          })),
        },
      };

      (Imap as unknown as jest.Mock).mockImplementation(() => mockImap);

      await emailService.fetchEmails(outlookAccount);

      expect(Imap).toHaveBeenCalledWith({
        user: outlookAccount.email,
        password: outlookAccount.password,
        host: 'outlook.office365.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
      });
    });

    it('debe usar configuración custom para proveedores no estándar', async () => {
      const customAccount: EmailAccount = {
        ...gmailAccount,
        provider: 'custom',
        imapHost: 'imap.custom.com',
        imapPort: 993,
      };

      const mockImap = {
        once: jest.fn((event, callback) => {
          if (event === 'ready') setTimeout(() => callback(), 0);
          if (event === 'end') setTimeout(() => callback(), 100);
        }),
        openBox: jest.fn((folder, readOnly, callback) => {
          callback(null, { messages: { total: 0 } });
        }),
        end: jest.fn(),
        connect: jest.fn(),
        seq: {
          fetch: jest.fn(() => ({
            on: jest.fn(),
            once: jest.fn((event, callback) => {
              if (event === 'end') setTimeout(() => callback(), 10);
            }),
          })),
        },
      };

      (Imap as unknown as jest.Mock).mockImplementation(() => mockImap);

      await emailService.fetchEmails(customAccount);

      expect(Imap).toHaveBeenCalledWith({
        user: customAccount.email,
        password: customAccount.password,
        host: 'imap.custom.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
      });
    });

    it('debe manejar errores de conexión IMAP', async () => {
      const mockImap = {
        once: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Connection failed')), 0);
          }
        }),
        connect: jest.fn(),
      };

      (Imap as unknown as jest.Mock).mockImplementation(() => mockImap);

      await expect(emailService.fetchEmails(gmailAccount)).rejects.toThrow(
        'Connection failed'
      );
    });
  });
});
