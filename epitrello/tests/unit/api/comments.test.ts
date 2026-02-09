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
    comment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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
import { GET as getComments, POST as createComment } from '@/app/api/boards/[boardId]/lists/[listId]/cards/[cardId]/comments/route';
import { PUT as updateComment, DELETE as deleteComment } from '@/app/api/boards/[boardId]/lists/[listId]/cards/[cardId]/comments/[commentId]/route';

describe('Comments API Routes', () => {
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

  const mockComment = {
    id: 'comment-1',
    content: 'Test comment',
    cardId: 'card-1',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('GET /api/boards/[boardId]/lists/[listId]/cards/[cardId]/comments', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getComments(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getComments(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getComments(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getComments(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
    });

    it('should return 403 if user is not board owner or member', async () => {
      const boardWithDifferentOwner = {
        ...mockBoard,
        userId: 'other-user',
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithDifferentOwner as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getComments(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 404 if card not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getComments(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Card not found');
    });

    it('should return 404 if card list not found', async () => {
      const cardWithoutList = { ...mockCard, list: null };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(cardWithoutList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getComments(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Card list not found');
    });

    it('should return 400 if card does not belong to board', async () => {
      const cardWithDifferentBoard = {
        ...mockCard,
        list: {
          ...mockCard.list,
          boardId: 'other-board',
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(cardWithDifferentBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getComments(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Card does not belong to this board');
    });

    it('should return all comments for a card when user is board owner', async () => {
      const mockComments = [mockComment];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.comment.findMany).mockResolvedValue(mockComments as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getComments(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].content).toBe('Test comment');
      expect(prisma.comment.findMany).toHaveBeenCalledWith({
        where: { cardId: 'card-1' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return all comments when user is board member', async () => {
      const boardWithMember = {
        ...mockBoard,
        userId: 'other-user',
        members: [{ id: 'user-1' }],
      };
      const mockComments = [mockComment];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithMember as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.comment.findMany).mockResolvedValue(mockComments as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getComments(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
    });

    it('should return empty array if no comments found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.comment.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getComments(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(0);
    });

    it('should handle server errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getComments(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch comments');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('POST /api/boards/[boardId]/lists/[listId]/cards/[cardId]/comments', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 400 if content is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Comment content is required');
    });

    it('should return 400 if content is not a string', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 123 }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Comment content is required');
    });

    it('should return 400 if content is empty string', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: '' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Comment content is required');
    });

    it('should return 400 if content is only whitespace', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: '   ' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Comment content is required');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
    });

    it('should return 403 if user is not board owner or member', async () => {
      const boardWithDifferentOwner = {
        ...mockBoard,
        userId: 'other-user',
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithDifferentOwner as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 404 if card not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Card not found');
    });

    it('should return 404 if card list not found', async () => {
      const cardWithoutList = { ...mockCard, list: null };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(cardWithoutList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Card list not found');
    });

    it('should return 400 if card does not belong to board', async () => {
      const cardWithDifferentBoard = {
        ...mockCard,
        list: {
          ...mockCard.list,
          boardId: 'other-board',
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(cardWithDifferentBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Card does not belong to this board');
    });

    it('should create comment successfully when user is board owner', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.comment.create).mockResolvedValue(mockComment as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.content).toBe('Test comment');
      expect(data.user.id).toBe('user-1');
      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          content: 'Test comment',
          cardId: 'card-1',
          userId: 'user-1',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
      expect(logActivity).toHaveBeenCalledWith({
        type: 'comment_added',
        description: 'Test User a ajouté un commentaire à la carte "Test Card"',
        userId: 'user-1',
        boardId: 'board-1',
        cardId: 'card-1',
        metadata: { cardTitle: 'Test Card' },
      });
    });

    it('should create comment successfully when user is board member', async () => {
      const boardWithMember = {
        ...mockBoard,
        userId: 'other-user',
        members: [{ id: 'user-1' }],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithMember as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.comment.create).mockResolvedValue(mockComment as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.content).toBe('Test comment');
    });

    it('should trim whitespace from comment content', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.comment.create).mockResolvedValue(mockComment as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: '  Test comment  ' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      await createComment(request, { params });

      expect(prisma.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: 'Test comment',
          }),
        })
      );
    });

    it('should log activity with user email when name is not available', async () => {
      const userWithoutName = {
        ...mockUser,
        name: null,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(userWithoutName as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.comment.create).mockResolvedValue(mockComment as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      await createComment(request, { params });

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'test@example.com a ajouté un commentaire à la carte "Test Card"',
        })
      );
    });

    it('should handle server errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create comment');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('PUT /api/boards/[boardId]/lists/[listId]/cards/[cardId]/comments/[commentId]', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await updateComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await updateComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await updateComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 400 if content is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await updateComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Comment content is required');
    });

    it('should return 400 if content is not a string', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ content: 123 }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await updateComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Comment content is required');
    });

    it('should return 400 if content is empty', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ content: '' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await updateComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Comment content is required');
    });

    it('should return 400 if content is only whitespace', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ content: '   ' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await updateComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Comment content is required');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await updateComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
    });

    it('should return 403 if user is not board owner or member', async () => {
      const boardWithDifferentOwner = {
        ...mockBoard,
        userId: 'other-user',
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithDifferentOwner as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await updateComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 404 if comment not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await updateComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Comment not found');
    });

    it('should return 400 if comment does not belong to card', async () => {
      const commentWithDifferentCard = {
        ...mockComment,
        cardId: 'other-card',
        card: mockCard,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(commentWithDifferentCard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await updateComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Comment does not belong to this card');
    });

    it('should return 404 if comment card not found', async () => {
      const commentWithoutCard = {
        ...mockComment,
        card: null,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(commentWithoutCard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await updateComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Comment card or list not found');
    });

    it('should return 404 if comment card list not found', async () => {
      const commentWithCardWithoutList = {
        ...mockComment,
        card: {
          ...mockCard,
          list: null,
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(commentWithCardWithoutList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await updateComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Comment card or list not found');
    });

    it('should return 400 if comment does not belong to board', async () => {
      const commentWithDifferentBoard = {
        ...mockComment,
        card: {
          ...mockCard,
          list: {
            ...mockCard.list,
            boardId: 'other-board',
          },
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(commentWithDifferentBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await updateComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Comment does not belong to this board');
    });

    it('should return 403 if user is not comment owner', async () => {
      const commentWithDifferentOwner = {
        ...mockComment,
        userId: 'other-user',
        card: mockCard,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(commentWithDifferentOwner as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await updateComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You can only edit your own comments');
    });

    it('should update comment successfully', async () => {
      const updatedComment = {
        ...mockComment,
        content: 'Updated comment',
      };
      const commentWithCard = {
        ...mockComment,
        card: mockCard,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(commentWithCard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.comment.update).mockResolvedValue(updatedComment as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await updateComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toBe('Updated comment');
      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: { content: 'Updated comment' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
      expect(logActivity).toHaveBeenCalledWith({
        type: 'comment_updated',
        description: 'Test User a modifié un commentaire sur la carte "Test Card"',
        userId: 'user-1',
        boardId: 'board-1',
        cardId: 'card-1',
        metadata: { cardTitle: 'Test Card' },
      });
    });

    it('should trim whitespace from updated content', async () => {
      const commentWithCard = {
        ...mockComment,
        card: mockCard,
      };
      const updatedComment = {
        ...mockComment,
        content: 'Updated comment',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(commentWithCard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.comment.update).mockResolvedValue(updatedComment as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ content: '  Updated comment  ' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      await updateComment(request, { params });

      expect(prisma.comment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { content: 'Updated comment' },
        })
      );
    });

    it('should handle server errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated comment' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await updateComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update comment');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/boards/[boardId]/lists/[listId]/cards/[cardId]/comments/[commentId]', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await deleteComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await deleteComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await deleteComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await deleteComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
    });

    it('should return 403 if user is not board owner or member', async () => {
      const boardWithDifferentOwner = {
        ...mockBoard,
        userId: 'other-user',
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithDifferentOwner as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await deleteComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 404 if comment not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await deleteComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Comment not found');
    });

    it('should return 400 if comment does not belong to card', async () => {
      const commentWithDifferentCard = {
        ...mockComment,
        cardId: 'other-card',
        card: mockCard,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(commentWithDifferentCard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await deleteComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Comment does not belong to this card');
    });

    it('should return 404 if comment card not found', async () => {
      const commentWithoutCard = {
        ...mockComment,
        card: null,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(commentWithoutCard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await deleteComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Comment card or list not found');
    });

    it('should return 404 if comment card list not found', async () => {
      const commentWithCardWithoutList = {
        ...mockComment,
        card: {
          ...mockCard,
          list: null,
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(commentWithCardWithoutList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await deleteComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Comment card or list not found');
    });

    it('should return 400 if comment does not belong to board', async () => {
      const commentWithDifferentBoard = {
        ...mockComment,
        card: {
          ...mockCard,
          list: {
            ...mockCard.list,
            boardId: 'other-board',
          },
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(commentWithDifferentBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await deleteComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Comment does not belong to this board');
    });

    it('should return 403 if user is not comment owner', async () => {
      const commentWithDifferentOwner = {
        ...mockComment,
        userId: 'other-user',
        card: mockCard,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(commentWithDifferentOwner as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await deleteComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You can only delete your own comments');
    });

    it('should delete comment successfully', async () => {
      const commentWithCard = {
        ...mockComment,
        card: mockCard,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.comment.findUnique).mockResolvedValue(commentWithCard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.comment.delete).mockResolvedValue(mockComment as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await deleteComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Comment deleted successfully');
      expect(prisma.comment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
      });
      expect(logActivity).toHaveBeenCalledWith({
        type: 'comment_deleted',
        description: 'Test User a supprimé un commentaire sur la carte "Test Card"',
        userId: 'user-1',
        boardId: 'board-1',
        cardId: 'card-1',
        metadata: { cardTitle: 'Test Card' },
      });
    });

    it('should handle server errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/comments/comment-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', commentId: 'comment-1' });
      const response = await deleteComment(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete comment');
      expect(console.error).toHaveBeenCalled();
    });
  });
});
