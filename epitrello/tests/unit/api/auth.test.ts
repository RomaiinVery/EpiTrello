/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// Mock modules before importing
vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('@/app/lib/email', () => ({
  sendVerificationCode: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(),
  },
}));

import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendVerificationCode, sendPasswordResetEmail } from '@/app/lib/email';
import crypto from 'crypto';

// Import route handlers
import { POST as registerPOST } from '@/app/api/register/route';
import { POST as verifyPOST } from '@/app/api/verify/route';
import { POST as forgotPasswordPOST } from '@/app/api/auth/forgot-password/route';
import { POST as resetPasswordPOST } from '@/app/api/auth/reset-password/route';

describe('Authentication API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('POST /api/register', () => {
    it('should create a new user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
        verificationCode: '123456',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser as any);
      vi.mocked(sendVerificationCode).mockResolvedValue(true);

      const request = new Request('http://localhost/api/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe('Account created. Please verify your email.');
      expect(data.email).toBe('test@example.com');
      expect(data.verificationNeeded).toBe(true);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(sendVerificationCode).toHaveBeenCalled();
    });

    it('should return 400 if email is missing', async () => {
      const request = new Request('http://localhost/api/register', {
        method: 'POST',
        body: JSON.stringify({
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Request email and password');
    });

    it('should return 400 if password is missing', async () => {
      const request = new Request('http://localhost/api/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          name: 'Test User',
        }),
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Request email and password');
    });

    it('should return 400 if email already exists', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Existing User',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser as any);

      const request = new Request('http://localhost/api/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email already taken');
    });

    it('should create user even if email sending fails', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
        verificationCode: '123456',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser as any);
      vi.mocked(sendVerificationCode).mockResolvedValue(false);

      const request = new Request('http://localhost/api/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(console.error).toHaveBeenCalledWith('Failed to send verification email');
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/register', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Error creating account');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('POST /api/verify', () => {
    it('should verify email successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        verificationCode: '123456',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '123456',
        }),
      });

      const response = await verifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Email verified successfully');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        data: {
          verificationCode: null,
          emailVerified: expect.any(Date),
        },
      });
    });

    it('should return 400 if email is missing', async () => {
      const request = new Request('http://localhost/api/verify', {
        method: 'POST',
        body: JSON.stringify({
          code: '123456',
        }),
      });

      const response = await verifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email and code are required');
    });

    it('should return 400 if code is missing', async () => {
      const request = new Request('http://localhost/api/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      const response = await verifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email and code are required');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '123456',
        }),
      });

      const response = await verifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 400 if verification code is invalid', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        verificationCode: '123456',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '654321',
        }),
      });

      const response = await verifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid verification code');
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          code: '123456',
        }),
      });

      const response = await verifyPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Error verifying email');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
      };

      const mockToken = 'a'.repeat(64);
      vi.mocked(crypto.randomBytes).mockReturnValue({
        toString: () => mockToken,
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);
      vi.mocked(sendPasswordResetEmail).mockResolvedValue(true);

      const request = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      const response = await forgotPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('un lien de réinitialisation a été envoyé');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        data: {
          resetToken: mockToken,
          resetTokenExpiry: expect.any(Date),
        },
      });
      expect(sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should return 400 if email is missing', async () => {
      const request = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await forgotPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email requis');
    });

    it('should return success even if user not found (prevent email enumeration)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
        }),
      });

      const response = await forgotPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('un lien de réinitialisation a été envoyé');
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      const response = await forgotPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Une erreur est survenue');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password successfully', async () => {
      const futureDate = new Date(Date.now() + 3600000);
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        resetToken: 'valid-token',
        resetTokenExpiry: futureDate,
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);
      vi.mocked(bcrypt.hash).mockResolvedValue('new-hashed-password' as never);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid-token',
          password: 'newpassword123',
        }),
      });

      const response = await resetPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Mot de passe réinitialisé avec succès');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 12);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          password: 'new-hashed-password',
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
    });

    it('should return 400 if token is missing', async () => {
      const request = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          password: 'newpassword123',
        }),
      });

      const response = await resetPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Token et mot de passe requis');
    });

    it('should return 400 if password is missing', async () => {
      const request = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid-token',
        }),
      });

      const response = await resetPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Token et mot de passe requis');
    });

    it('should return 400 if token is invalid', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const request = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'invalid-token',
          password: 'newpassword123',
        }),
      });

      const response = await resetPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Lien invalide ou expiré');
    });

    it('should return 400 if token is expired', async () => {
      const pastDate = new Date(Date.now() - 3600000);
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        resetToken: 'expired-token',
        resetTokenExpiry: pastDate,
      };

      // The query will not find this user because resetTokenExpiry > new Date()
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const request = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'expired-token',
          password: 'newpassword123',
        }),
      });

      const response = await resetPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Lien invalide ou expiré');
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.user.findFirst).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid-token',
          password: 'newpassword123',
        }),
      });

      const response = await resetPasswordPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Une erreur est survenue');
      expect(console.error).toHaveBeenCalled();
    });
  });
});
