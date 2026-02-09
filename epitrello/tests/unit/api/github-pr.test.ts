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
    card: {
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

import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { POST } from '@/app/api/boards/[boardId]/lists/[listId]/cards/[cardId]/github/pr/route';

// Mock global fetch
global.fetch = vi.fn();

describe('GitHub PR API Route', () => {
  const mockUser = {
    id: 'user-1',
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
    githubRepo: 'owner/repo',
  };

  const mockCard = {
    id: 'card-1',
    title: 'Test Card',
    githubIssueNumber: 42,
  };

  const mockPRResponse = {
    id: 1,
    number: 123,
    title: 'Test PR',
    html_url: 'https://github.com/owner/repo/pull/123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('POST /api/boards/[boardId]/lists/[listId]/cards/[cardId]/github/pr', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/github/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test PR', head: 'feature', base: 'main' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/github/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test PR', head: 'feature', base: 'main' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/github/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test PR', head: 'feature', base: 'main' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('GitHub not connected');
    });

    it('should return 401 if user has no GitHub access token', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        githubAccessToken: null,
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/github/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test PR', head: 'feature', base: 'main' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('GitHub not connected');
    });

    it('should return 400 if board not linked to GitHub', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue({
        id: 'board-1',
        githubRepo: null,
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/github/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test PR', head: 'feature', base: 'main' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Board not linked to GitHub');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/github/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test PR', head: 'feature', base: 'main' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Board not linked to GitHub');
    });

    it('should return 404 if card not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/github/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test PR', head: 'feature', base: 'main' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Card not found');
    });

    it('should return 400 if missing required fields', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/github/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ head: 'feature' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 if missing head field', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/github/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test PR', base: 'main' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 if missing base field', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/github/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test PR', head: 'feature' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should successfully create PR without issue number', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue({ ...mockCard, githubIssueNumber: null } as any);

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockPRResponse,
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/github/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test PR',
          head: 'feature',
          base: 'main',
          body: 'PR description',
        }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockPRResponse);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/pulls',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer github-token-123',
          }),
          body: JSON.stringify({
            title: 'Test PR',
            head: 'feature',
            base: 'main',
            body: 'PR description',
            draft: false,
          }),
        })
      );
    });

    it('should successfully create PR with issue number', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockPRResponse,
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/github/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test PR',
          head: 'feature',
          base: 'main',
          body: 'PR description',
        }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockPRResponse);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/pulls',
        expect.objectContaining({
          body: JSON.stringify({
            title: 'Test PR',
            head: 'feature',
            base: 'main',
            body: 'PR description\n\nCloses #42',
            draft: false,
          }),
        })
      );
    });

    it('should create draft PR when draft flag is true', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockPRResponse,
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/github/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test PR',
          head: 'feature',
          base: 'main',
          draft: true,
        }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"draft":true'),
        })
      );
    });

    it('should handle GitHub API errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ message: 'Validation Failed' }),
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/github/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test PR',
          head: 'feature',
          base: 'main',
        }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.error).toBe('Validation Failed');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);

      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/github/pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test PR',
          head: 'feature',
          base: 'main',
        }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
      expect(console.error).toHaveBeenCalled();
    });
  });
});
