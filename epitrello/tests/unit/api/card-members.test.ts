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
    card: {
      findUnique: vi.fn(),
    },
    cardMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
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

vi.mock('@/app/lib/activity-logger', () => ({
  logActivity: vi.fn(),
}));

import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { logActivity } from '@/app/lib/activity-logger';
import { GET, POST, DELETE } from '@/app/api/boards/[boardId]/lists/[listId]/cards/[cardId]/members/route';

describe('Card Members API Routes', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
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
    members: [],
    workspace: {
      members: []
    },
  };

  const mockCard = {
    id: 'card-1',
    title: 'Test Card',
    listId: 'list-1',
    list: {
      id: 'list-1',
      boardId: 'board-1',
    },
  };

  const mockMember = {
    id: 'user-2',
    email: 'member@example.com',
    name: 'Member User',
    profileImage: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('GET /api/boards/[boardId]/lists/[listId]/cards/[cardId]/members', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this board');
    });

    it('should return 403 if user is not owner or member', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, id: 'other-user' } as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue({
        ...mockBoard,
        userId: 'different-user',
        members: [],
        workspace: {
          members: []
        },
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this board');
    });

    it('should return card members when user is board owner', async () => {
      const cardMembers = [
        {
          id: 'cm-1',
          cardId: 'card-1',
          userId: 'user-2',
          user: mockMember,
        },
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.cardMember.findMany).mockResolvedValue(cardMembers as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0]).toEqual(mockMember);
      expect(prisma.cardMember.findMany).toHaveBeenCalledWith({
        where: { cardId: 'card-1' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              profileImage: true,
            },
          },
        },
      });
    });

    it('should return card members when user is board member', async () => {
      const boardWithMember = {
        ...mockBoard,
        userId: 'other-user',
        members: [{ userId: 'user-1', role: 'VIEWER' }],
        workspace: {
          members: []
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithMember as any);
      vi.mocked(prisma.cardMember.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should handle server errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch card members');
    });
  });

  describe('POST /api/boards/[boardId]/lists/[listId]/cards/[cardId]/members', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-2' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-2' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-2' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 400 if userId is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('userId is required');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-2' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this board');
    });

    it('should return 403 if user is not owner or member', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, id: 'other-user' } as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue({
        ...mockBoard,
        userId: 'different-user',
        members: [],
        workspace: {
          members: []
        },
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-2' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this board');
    });

    it('should return 400 if user to assign is not a member of board or workspace', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-2' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User is not a member of this board or workspace');
    });

    it('should return 404 if card not found', async () => {
      const boardWithMembers = {
        ...mockBoard,
        members: [{ id: 'user-1', role: 'EDITOR' }, { id: 'user-2', role: 'VIEWER' }],
        workspace: {
          members: []
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithMembers as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-2' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Card not found');
    });

    it('should return 404 if card list not found', async () => {
      const boardWithMembers = {
        ...mockBoard,
        members: [{ id: 'user-1', role: 'EDITOR' }, { id: 'user-2', role: 'VIEWER' }],
        workspace: {
          members: []
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithMembers as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue({ ...mockCard, list: null } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-2' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Card list not found');
    });

    it('should return 400 if card does not belong to board', async () => {
      const boardWithMembers = {
        ...mockBoard,
        members: [{ id: 'user-1', role: 'EDITOR' }, { id: 'user-2', role: 'VIEWER' }],
        workspace: {
          members: []
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithMembers as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue({
        ...mockCard,
        list: { ...mockCard.list, boardId: 'other-board' },
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-2' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Card does not belong to this board');
    });

    it('should return 400 if user is already assigned to card', async () => {
      const boardWithMembers = {
        ...mockBoard,
        members: [{ id: 'user-1', role: 'EDITOR' }, { id: 'user-2', role: 'VIEWER' }],
        workspace: {
          members: []
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithMembers as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.cardMember.findUnique).mockResolvedValue({ id: 'cm-1' } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-2' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User is already assigned to this card');
    });

    it('should successfully assign member when user is board owner', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      // First call for requesting user, second for user to assign info
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockMember as any);
      // Board owner is user-1 (mockUser), and we're assigning user-2 who is the board owner
      vi.mocked(prisma.board.findUnique).mockResolvedValue({
        ...mockBoard,
        userId: 'user-1', // This is the board owner
        members: [{ id: 'user-2', role: 'VIEWER' }], // user-2 is also a member
        workspace: {
          members: []
        },
      } as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.cardMember.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.cardMember.create).mockResolvedValue({
        id: 'cm-1',
        cardId: 'card-1',
        userId: 'user-2',
        user: mockMember,
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-2' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockMember);
      expect(prisma.cardMember.create).toHaveBeenCalledWith({
        data: {
          cardId: 'card-1',
          userId: 'user-2',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              profileImage: true,
            },
          },
        },
      });
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'member_assigned',
          userId: 'user-1',
          boardId: 'board-1',
          cardId: 'card-1',
        })
      );
    });

    it('should successfully assign member when user is board member', async () => {
      const boardWithMembers = {
        ...mockBoard,
        userId: 'other-user',
        members: [{ id: 'user-1', role: 'EDITOR' }, { id: 'user-2', role: 'VIEWER' }],
        workspace: {
          members: []
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      // First call for requesting user, second for user to assign info
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockMember as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithMembers as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.cardMember.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.cardMember.create).mockResolvedValue({
        id: 'cm-1',
        cardId: 'card-1',
        userId: 'user-2',
        user: mockMember,
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-2' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });

      expect(response.status).toBe(200);
    });

    it('should successfully assign workspace member', async () => {
      const boardWithWorkspace = {
        ...mockBoard,
        userId: 'user-1', // Requester is the board owner
        members: [],
        workspace: {
          id: 'workspace-1',
          members: [{ userId: 'user-2' }],
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      // First call for requesting user, second for user to assign info
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockMember as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithWorkspace as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.cardMember.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.cardMember.create).mockResolvedValue({
        id: 'cm-1',
        cardId: 'card-1',
        userId: 'user-2',
        user: mockMember,
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-2' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });

      expect(response.status).toBe(200);
    });

    it('should handle server errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-2' }),
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to assign member to card');
    });
  });

  describe('DELETE /api/boards/[boardId]/lists/[listId]/cards/[cardId]/members', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members?userId=user-2', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members?userId=user-2', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members?userId=user-2', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 400 if userId is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('userId is required');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members?userId=user-2', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this board');
    });

    it('should return 403 if user is not owner or member', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, id: 'other-user' } as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue({
        ...mockBoard,
        userId: 'different-user',
        members: [],
        workspace: {
          members: []
        },
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members?userId=user-2', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this board');
    });

    it('should return 404 if card not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members?userId=user-2', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Card not found');
    });

    it('should return 404 if card list not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue({ ...mockCard, list: null } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members?userId=user-2', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Card list not found');
    });

    it('should return 400 if card does not belong to board', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue({
        ...mockCard,
        list: { ...mockCard.list, boardId: 'other-board' },
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members?userId=user-2', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Card does not belong to this board');
    });

    it('should successfully unassign member', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      // First call for the requesting user, second for the user to unassign
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockMember as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.cardMember.delete).mockResolvedValue({} as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members?userId=user-2', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Member unassigned successfully');
      expect(prisma.cardMember.delete).toHaveBeenCalledWith({
        where: {
          cardId_userId: {
            cardId: 'card-1',
            userId: 'user-2',
          },
        },
      });
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'member_unassigned',
          userId: 'user-1',
          boardId: 'board-1',
          cardId: 'card-1',
        })
      );
    });

    it('should handle server errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/members?userId=user-2', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to unassign member from card');
    });
  });
});
