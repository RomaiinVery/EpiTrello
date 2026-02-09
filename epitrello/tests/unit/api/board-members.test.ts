import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules
vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    board: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
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
import { POST } from '@/app/api/boards/[boardId]/members/route';

describe('Board Members API Routes', () => {
  const mockUser = {
    id: 'user-1',
    email: 'owner@example.com',
    name: 'Owner User',
  };

  const mockInvitedUser = {
    id: 'user-2',
    email: 'invited@example.com',
    name: 'Invited User',
  };

  const mockSession = {
    user: {
      email: 'owner@example.com',
    },
  };

  const mockBoard = {
    id: 'board-1',
    title: 'Test Board',
    userId: 'user-1',
    workspaceId: 'ws-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('POST /api/boards/[boardId]/members', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/members', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/boards/board-1/members', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if current user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/members', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 400 if email is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/members', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email required');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/members', {
        method: 'POST',
        body: JSON.stringify({ email: 'invited@example.com' }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
    });

    it('should return 403 if user is not the board owner', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue({
        ...mockBoard,
        userId: 'other-user',
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/members', {
        method: 'POST',
        body: JSON.stringify({ email: 'invited@example.com' }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only the owner can invite members');
    });

    it('should return 404 if invited user does not exist', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(null);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/members', {
        method: 'POST',
        body: JSON.stringify({ email: 'nonexistent@example.com' }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User with this email does not exist');
    });

    it('should return 400 if user is already a member', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockInvitedUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.board.findFirst).mockResolvedValue(mockBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/members', {
        method: 'POST',
        body: JSON.stringify({ email: 'invited@example.com' }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User is already a member');
    });

    it('should return 400 if invited user is the board owner', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.board.findFirst).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/members', {
        method: 'POST',
        body: JSON.stringify({ email: 'owner@example.com' }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User is already a member');
    });

    it('should successfully add member to board', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockInvitedUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.board.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.board.update).mockResolvedValue({
        ...mockBoard,
        members: [{ id: 'user-2' }],
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/members', {
        method: 'POST',
        body: JSON.stringify({ email: 'invited@example.com' }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Member added successfully');
      expect(data.user).toEqual(mockInvitedUser);
      expect(prisma.board.update).toHaveBeenCalledWith({
        where: { id: 'board-1' },
        data: {
          members: {
            connect: { id: 'user-2' },
          },
        },
      });
    });
  });
});
