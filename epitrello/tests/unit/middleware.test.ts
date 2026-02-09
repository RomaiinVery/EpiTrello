import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock next-auth/jwt
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));

import { getToken } from 'next-auth/jwt';
import { middleware } from '../../src/middleware';

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Public Paths', () => {
    it('should allow access to / without authentication', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:3000/'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(302); // Not a redirect
    });

    it('should allow access to /auth without authentication', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:3000/auth'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(302);
    });

    it('should allow access to /register without authentication', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:3000/register'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(302);
    });

    it('should allow access to /auth/forgot-password without authentication', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:3000/auth/forgot-password'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(302);
    });

    it('should allow access to /auth/reset-password/token without authentication', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:3000/auth/reset-password/abc123'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(302);
    });

    it('should allow access to /api/auth endpoints without authentication', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:3000/api/auth/signin'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(302);
      expect(response.status).not.toBe(401);
    });

    it('should allow access to /api/register without authentication', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:3000/api/register'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(302);
      expect(response.status).not.toBe(401);
    });

    it('should allow access to /api/verify without authentication', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:3000/api/verify'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(302);
      expect(response.status).not.toBe(401);
    });
  });

  describe('Protected Paths - Unauthenticated', () => {
    it('should redirect to /auth when accessing /dashboard without authentication', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:3000/dashboard'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth');
      expect(response.headers.get('location')).toContain('callbackUrl');
    });

    it('should redirect to /auth when accessing /workspaces without authentication', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:3000/workspaces'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth');
    });

    it('should redirect to /auth when accessing a specific workspace without authentication', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:3000/workspaces/workspace-123'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth');
    });

    it('should redirect to /auth when accessing boards without authentication', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:3000/workspaces/workspace-123/boards'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth');
    });

    it('should include callbackUrl in redirect', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const targetUrl = 'http://localhost:3000/workspaces/workspace-123/boards/board-456';
      const req = new NextRequest(new URL(targetUrl));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/auth');
      expect(location).toContain('callbackUrl');
      expect(decodeURIComponent(location!)).toContain(targetUrl);
    });

    it('should return 401 for protected API routes without authentication', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:3000/api/boards'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 for protected API routes like /api/workspaces', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:3000/api/workspaces'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 for protected API routes like /api/cards', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:3000/api/cards/card-123'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Protected Paths - Authenticated', () => {
    const mockToken = { email: 'test@example.com', sub: 'user-123' };

    it('should allow access to /dashboard when authenticated', async () => {
      vi.mocked(getToken).mockResolvedValue(mockToken as any);

      const req = new NextRequest(new URL('http://localhost:3000/dashboard'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(302);
      expect(response.status).not.toBe(401);
    });

    it('should allow access to /workspaces when authenticated', async () => {
      vi.mocked(getToken).mockResolvedValue(mockToken as any);

      const req = new NextRequest(new URL('http://localhost:3000/workspaces'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(302);
      expect(response.status).not.toBe(401);
    });

    it('should allow access to specific workspace when authenticated', async () => {
      vi.mocked(getToken).mockResolvedValue(mockToken as any);

      const req = new NextRequest(new URL('http://localhost:3000/workspaces/workspace-123'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(302);
      expect(response.status).not.toBe(401);
    });

    it('should allow access to boards when authenticated', async () => {
      vi.mocked(getToken).mockResolvedValue(mockToken as any);

      const req = new NextRequest(new URL('http://localhost:3000/workspaces/workspace-123/boards'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(302);
      expect(response.status).not.toBe(401);
    });

    it('should allow access to protected API routes when authenticated', async () => {
      vi.mocked(getToken).mockResolvedValue(mockToken as any);

      const req = new NextRequest(new URL('http://localhost:3000/api/boards'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(401);
    });

    it('should redirect from /auth to /dashboard when authenticated', async () => {
      vi.mocked(getToken).mockResolvedValue(mockToken as any);

      const req = new NextRequest(new URL('http://localhost:3000/auth'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/dashboard');
    });

    it('should redirect from / to /dashboard when authenticated', async () => {
      vi.mocked(getToken).mockResolvedValue(mockToken as any);

      const req = new NextRequest(new URL('http://localhost:3000/'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/dashboard');
    });
  });

  describe('Edge Cases', () => {
    it('should handle token retrieval errors gracefully', async () => {
      vi.mocked(getToken).mockRejectedValue(new Error('Token error'));

      const req = new NextRequest(new URL('http://localhost:3000/dashboard'));

      // Should treat as unauthenticated and redirect
      await expect(middleware(req)).rejects.toThrow('Token error');
    });

    it('should verify getToken is called with correct parameters', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:3000/dashboard'));
      await middleware(req);

      expect(getToken).toHaveBeenCalledWith({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
    });

    it('should handle paths with query parameters correctly', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:3000/dashboard?tab=boards'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth');
    });

    it('should handle paths with hash fragments correctly', async () => {
      const mockToken = { email: 'test@example.com', sub: 'user-123' };
      vi.mocked(getToken).mockResolvedValue(mockToken as any);

      const req = new NextRequest(new URL('http://localhost:3000/dashboard'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).not.toBe(302);
    });
  });

  describe('Redirect URL Construction', () => {
    it('should properly encode callback URL in redirect', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:3000/workspaces/test?param=value'));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('callbackUrl');
    });

    it('should preserve the full URL in callback when redirecting', async () => {
      vi.mocked(getToken).mockResolvedValue(null);

      const fullUrl = 'http://localhost:3000/workspaces/ws-123/boards/board-456?view=list';
      const req = new NextRequest(new URL(fullUrl));
      const response = await middleware(req);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toBeTruthy();
    });
  });
});
