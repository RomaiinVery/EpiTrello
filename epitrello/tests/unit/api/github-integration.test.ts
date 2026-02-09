/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules
vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    board: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('next-auth', () => {
  const NextAuth = vi.fn(() => vi.fn());
  return {
    default: NextAuth,
    getServerSession: vi.fn(),
  };
});

// Mock global fetch
global.fetch = vi.fn();

import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { GET } from '@/app/api/boards/[boardId]/github/branches/route';
import { POST } from '@/app/api/github/issues/batch/route';

describe('GitHub Integration API Routes', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    githubAccessToken: 'github-token-123',
  };

  const mockSession = {
    user: {
      email: 'test@example.com',
    },
  };

  const mockBoard = {
    id: 'board-1',
    title: 'Test Board',
    userId: 'user-1',
    githubRepo: 'owner/repo',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('GET /api/boards/[boardId]/github/branches', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/github/branches');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/boards/board-1/github/branches');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if user has no GitHub token', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        githubAccessToken: null,
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/github/branches');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('GitHub not connected');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/github/branches');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
    });

    it('should return 400 if board not linked to GitHub', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue({
        ...mockBoard,
        githubRepo: null,
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/github/branches');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Board not linked to GitHub');
    });

    it('should return branches from GitHub', async () => {
      const mockBranches = [
        { name: 'main', commit: { sha: 'abc123' } },
        { name: 'develop', commit: { sha: 'def456' } },
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockBranches,
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/github/branches');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockBranches);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/branches',
        {
          headers: {
            Authorization: 'Bearer github-token-123',
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
    });

    it('should handle GitHub API errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/github/branches');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Failed to fetch branches from GitHub');
    });

    it('should handle network errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const request = new Request('http://localhost/api/boards/board-1/github/branches');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });
  });

  describe('POST /api/github/issues/batch', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/github/issues/batch', {
        method: 'POST',
        body: JSON.stringify({ issues: [] }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/github/issues/batch', {
        method: 'POST',
        body: JSON.stringify({ issues: [] }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if user has no GitHub token', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        githubAccessToken: null,
      } as any);

      const request = new Request('http://localhost/api/github/issues/batch', {
        method: 'POST',
        body: JSON.stringify({ issues: [] }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('GitHub not connected');
    });

    it('should return 400 for invalid body', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/github/issues/batch', {
        method: 'POST',
        body: JSON.stringify({ invalid: 'data' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid body');
    });

    it('should return 400 if issues is not an array', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/github/issues/batch', {
        method: 'POST',
        body: JSON.stringify({ issues: 'not-an-array' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid body');
    });

    it('should fetch status for multiple issues', async () => {
      const issues = [
        { id: 'issue-1', owner: 'owner1', repo: 'repo1', number: 1 },
        { id: 'issue-2', owner: 'owner2', repo: 'repo2', number: 2 },
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ state: 'open' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ state: 'closed' }),
        } as any);

      const request = new Request('http://localhost/api/github/issues/batch', {
        method: 'POST',
        body: JSON.stringify({ issues }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.statuses).toEqual({
        'issue-1': 'open',
        'issue-2': 'closed',
      });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle failed issue fetches', async () => {
      const issues = [
        { id: 'issue-1', owner: 'owner1', repo: 'repo1', number: 1 },
        { id: 'issue-2', owner: 'owner2', repo: 'repo2', number: 2 },
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ state: 'open' }),
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as any);

      const request = new Request('http://localhost/api/github/issues/batch', {
        method: 'POST',
        body: JSON.stringify({ issues }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.statuses).toEqual({
        'issue-1': 'open',
      });
    });

    it('should handle errors during fetch', async () => {
      const issues = [
        { id: 'issue-1', owner: 'owner1', repo: 'repo1', number: 1 },
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      const request = new Request('http://localhost/api/github/issues/batch', {
        method: 'POST',
        body: JSON.stringify({ issues }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.statuses).toEqual({});
    });

    it('should use correct GitHub API endpoint and headers', async () => {
      const issues = [
        { id: 'issue-1', owner: 'testowner', repo: 'testrepo', number: 42 },
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ state: 'open' }),
      } as any);

      const request = new Request('http://localhost/api/github/issues/batch', {
        method: 'POST',
        body: JSON.stringify({ issues }),
      });
      await POST(request);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/testowner/testrepo/issues/42',
        {
          headers: {
            Authorization: 'Bearer github-token-123',
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
    });

    it('should handle general errors and return 500', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      // Create a request with invalid JSON to trigger the catch block
      const request = new Request('http://localhost/api/github/issues/batch', {
        method: 'POST',
        body: 'invalid json',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });

    it('should return empty statuses object for empty issues array', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/github/issues/batch', {
        method: 'POST',
        body: JSON.stringify({ issues: [] }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.statuses).toEqual({});
    });
  });
});
