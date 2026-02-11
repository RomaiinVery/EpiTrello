import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendInvitationEmail,
  sendVerificationCode,
  sendPasswordResetEmail,
  sendEmailChangeVerification,
} from '@/app/lib/email';

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    })),
  },
}));

describe('Email Service', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  const originalEnv = process.env;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.env = originalEnv;
  });

  describe('sendInvitationEmail', () => {
    it('should send invitation email successfully with SMTP configured', async () => {
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'test@test.com';
      process.env.SMTP_PASSWORD = 'password';

      const result = await sendInvitationEmail(
        'user@example.com',
        'John Doe',
        'Test Workspace',
        'https://example.com/invite/abc123',
        'EDITOR'
      );

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith('==================================================');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('INVITE LINK: https://example.com/invite/abc123')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('Role: EDITOR');
      expect(consoleLogSpy).toHaveBeenCalledWith('Sent to: user@example.com');
    });

    it('should simulate success when SMTP is not configured', async () => {
      delete process.env.SMTP_HOST;

      const result = await sendInvitationEmail(
        'user@example.com',
        'John Doe',
        'Test Workspace',
        'https://example.com/invite/abc123',
        'VIEWER'
      );

      expect(result).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ SMTP_HOST not defined. Email will not be sent via Nodemailer.'
      );
    });

    it('should log invitation details to console', async () => {
      delete process.env.SMTP_HOST;

      await sendInvitationEmail(
        'user@example.com',
        'Jane Smith',
        'My Workspace',
        'https://example.com/invite/xyz789',
        'VIEWER'
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('INVITE LINK: https://example.com/invite/xyz789')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('Role: VIEWER');
    });
  });

  describe('sendVerificationCode', () => {
    it('should send verification code successfully with SMTP configured', async () => {
      process.env.SMTP_HOST = 'smtp.test.com';

      const result = await sendVerificationCode('user@example.com', '123456');

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('VERIFICATION CODE: 123456')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('Sent to: user@example.com');
    });

    it('should simulate success when SMTP is not configured', async () => {
      delete process.env.SMTP_HOST;

      const result = await sendVerificationCode('user@example.com', '654321');

      expect(result).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ SMTP_HOST not defined. Email will not be sent via Nodemailer.'
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully with SMTP configured', async () => {
      process.env.SMTP_HOST = 'smtp.test.com';

      const result = await sendPasswordResetEmail(
        'user@example.com',
        'https://example.com/reset/token123'
      );

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('RESET LINK: https://example.com/reset/token123')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('Sent to: user@example.com');
    });

    it('should simulate success when SMTP is not configured', async () => {
      delete process.env.SMTP_HOST;

      const result = await sendPasswordResetEmail(
        'user@example.com',
        'https://example.com/reset/token456'
      );

      expect(result).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ SMTP_HOST not defined. Email will not be sent via Nodemailer.'
      );
    });
  });

  describe('sendEmailChangeVerification', () => {
    it('should send email change verification code successfully with SMTP configured', async () => {
      process.env.SMTP_HOST = 'smtp.test.com';

      const result = await sendEmailChangeVerification('newemail@example.com', '789012');

      expect(result).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('EMAIL CHANGE CODE: 789012')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('Sent to: newemail@example.com');
    });

    it('should simulate success when SMTP is not configured', async () => {
      delete process.env.SMTP_HOST;

      const result = await sendEmailChangeVerification('newemail@example.com', '111222');

      expect(result).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ SMTP_HOST not defined. Email will not be sent via Nodemailer.'
      );
    });
  });
});
