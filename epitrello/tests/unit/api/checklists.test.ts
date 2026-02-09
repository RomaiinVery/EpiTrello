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
    checklist: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    checklistItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
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

import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { GET as getChecklists, POST as createChecklist } from '@/app/api/boards/[boardId]/lists/[listId]/cards/[cardId]/checklists/route';
import { PUT as updateChecklist, DELETE as deleteChecklist } from '@/app/api/boards/[boardId]/lists/[listId]/cards/[cardId]/checklists/[checklistId]/route';
import { GET as getChecklistItems, POST as createChecklistItem } from '@/app/api/boards/[boardId]/lists/[listId]/cards/[cardId]/checklists/[checklistId]/items/route';
import { PUT as updateChecklistItem, DELETE as deleteChecklistItem } from '@/app/api/boards/[boardId]/lists/[listId]/cards/[cardId]/checklists/[checklistId]/items/[itemId]/route';

describe('Checklists API Routes', () => {
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

  const mockChecklist = {
    id: 'checklist-1',
    title: 'Test Checklist',
    position: 0,
    cardId: 'card-1',
    items: [],
  };

  const mockChecklistItem = {
    id: 'item-1',
    text: 'Test Item',
    checked: false,
    position: 0,
    checklistId: 'checklist-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('GET /api/boards/[boardId]/lists/[listId]/cards/[cardId]/checklists', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getChecklists(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getChecklists(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getChecklists(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getChecklists(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
    });

    it('should return 403 if user is not board owner or member', async () => {
      const unauthorizedBoard = {
        ...mockBoard,
        userId: 'other-user',
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(unauthorizedBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getChecklists(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 404 if card not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getChecklists(request, { params });
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

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getChecklists(request, { params });
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

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getChecklists(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Card does not belong to this board');
    });

    it('should return all checklists for a card when user is board owner', async () => {
      const mockChecklists = [
        { ...mockChecklist, items: [mockChecklistItem] },
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.checklist.findMany).mockResolvedValue(mockChecklists as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getChecklists(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe('Test Checklist');
      expect(data[0].items).toHaveLength(1);
      expect(prisma.checklist.findMany).toHaveBeenCalledWith({
        where: { cardId: 'card-1' },
        include: {
          items: {
            orderBy: { position: 'asc' },
          },
        },
        orderBy: { position: 'asc' },
      });
    });

    it('should return all checklists when user is board member', async () => {
      const boardWithMember = {
        ...mockBoard,
        userId: 'other-user',
        members: [{ id: 'user-1' }],
      };
      const mockChecklists = [mockChecklist];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithMember as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.checklist.findMany).mockResolvedValue(mockChecklists as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getChecklists(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
    });

    it('should return empty array if no checklists found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.checklist.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getChecklists(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(0);
    });

    it('should handle server errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getChecklists(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch checklists');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('POST /api/boards/[boardId]/lists/[listId]/cards/[cardId]/checklists', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Checklist' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Checklist' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Checklist' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 400 if title is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Checklist title is required');
    });

    it('should return 400 if title is not a string', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists', {
        method: 'POST',
        body: JSON.stringify({ title: 123 }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Checklist title is required');
    });

    it('should return 400 if title is empty string', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists', {
        method: 'POST',
        body: JSON.stringify({ title: '' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Checklist title is required');
    });

    it('should return 400 if title is only whitespace', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists', {
        method: 'POST',
        body: JSON.stringify({ title: '   ' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Checklist title is required');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Checklist' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
    });

    it('should return 403 if user is not board owner or member', async () => {
      const unauthorizedBoard = {
        ...mockBoard,
        userId: 'other-user',
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(unauthorizedBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Checklist' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 404 if card not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Checklist' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createChecklist(request, { params });
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

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Checklist' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createChecklist(request, { params });
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

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Checklist' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Card does not belong to this board');
    });

    it('should create checklist successfully when user is board owner', async () => {
      const newChecklist = { ...mockChecklist, items: [] };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.checklist.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.checklist.create).mockResolvedValue(newChecklist as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Checklist' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe('Test Checklist');
      expect(data.position).toBe(0);
      expect(prisma.checklist.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Checklist',
          position: 0,
          cardId: 'card-1',
        },
        include: {
          items: {
            orderBy: { position: 'asc' },
          },
        },
      });
    });

    it('should create checklist successfully when user is board member', async () => {
      const boardWithMember = {
        ...mockBoard,
        userId: 'other-user',
        members: [{ id: 'user-1' }],
      };
      const newChecklist = { ...mockChecklist, items: [] };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithMember as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.checklist.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.checklist.create).mockResolvedValue(newChecklist as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Checklist' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createChecklist(request, { params });

      expect(response.status).toBe(201);
    });

    it('should create checklist with correct position when other checklists exist', async () => {
      const lastChecklist = {
        id: 'checklist-last',
        position: 5,
      };
      const newChecklist = { ...mockChecklist, position: 6, items: [] };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.checklist.findFirst).mockResolvedValue(lastChecklist as any);
      vi.mocked(prisma.checklist.create).mockResolvedValue(newChecklist as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Checklist' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.position).toBe(6);
      expect(prisma.checklist.findFirst).toHaveBeenCalledWith({
        where: { cardId: 'card-1' },
        orderBy: { position: 'desc' },
      });
    });

    it('should trim whitespace from title', async () => {
      const newChecklist = { ...mockChecklist, items: [] };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.checklist.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.checklist.create).mockResolvedValue(newChecklist as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists', {
        method: 'POST',
        body: JSON.stringify({ title: '  Test Checklist  ' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      await createChecklist(request, { params });

      expect(prisma.checklist.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Test Checklist',
          }),
        })
      );
    });

    it('should handle server errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Checklist' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await createChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create checklist');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('PUT /api/boards/[boardId]/lists/[listId]/cards/[cardId]/checklists/[checklistId]', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Checklist' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await updateChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if title is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1', {
        method: 'PUT',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await updateChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Checklist title is required');
    });

    it('should return 404 if checklist not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklist.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Checklist' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await updateChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Checklist not found');
    });

    it('should return 400 if checklist does not belong to card', async () => {
      const checklistWithDifferentCard = {
        ...mockChecklist,
        cardId: 'other-card',
        card: mockCard,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklist.findUnique).mockResolvedValue(checklistWithDifferentCard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Checklist' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await updateChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Checklist does not belong to this card');
    });

    it('should update checklist successfully', async () => {
      const checklistWithCard = {
        ...mockChecklist,
        card: mockCard,
      };
      const updatedChecklist = {
        ...mockChecklist,
        title: 'Updated Checklist',
        items: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklist.findUnique).mockResolvedValue(checklistWithCard as any);
      vi.mocked(prisma.checklist.update).mockResolvedValue(updatedChecklist as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Checklist' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await updateChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Checklist');
      expect(prisma.checklist.update).toHaveBeenCalledWith({
        where: { id: 'checklist-1' },
        data: { title: 'Updated Checklist' },
        include: {
          items: {
            orderBy: { position: 'asc' },
          },
        },
      });
    });

    it('should handle server errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Checklist' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await updateChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update checklist');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/boards/[boardId]/lists/[listId]/cards/[cardId]/checklists/[checklistId]', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await deleteChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if checklist not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklist.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await deleteChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Checklist not found');
    });

    it('should delete checklist successfully', async () => {
      const checklistWithCard = {
        ...mockChecklist,
        card: mockCard,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklist.findUnique).mockResolvedValue(checklistWithCard as any);
      vi.mocked(prisma.checklist.delete).mockResolvedValue(mockChecklist as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await deleteChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Checklist deleted successfully');
      expect(prisma.checklist.delete).toHaveBeenCalledWith({
        where: { id: 'checklist-1' },
      });
    });

    it('should handle server errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await deleteChecklist(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete checklist');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('GET /api/boards/[boardId]/lists/[listId]/cards/[cardId]/checklists/[checklistId]/items', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await getChecklistItems(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if checklist not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklist.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await getChecklistItems(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Checklist not found');
    });

    it('should return all items for a checklist', async () => {
      const checklistWithCard = {
        ...mockChecklist,
        card: mockCard,
      };
      const items = [mockChecklistItem];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklist.findUnique).mockResolvedValue(checklistWithCard as any);
      vi.mocked(prisma.checklistItem.findMany).mockResolvedValue(items as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await getChecklistItems(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].text).toBe('Test Item');
      expect(prisma.checklistItem.findMany).toHaveBeenCalledWith({
        where: { checklistId: 'checklist-1' },
        orderBy: { position: 'asc' },
      });
    });

    it('should return empty array if no items found', async () => {
      const checklistWithCard = {
        ...mockChecklist,
        card: mockCard,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklist.findUnique).mockResolvedValue(checklistWithCard as any);
      vi.mocked(prisma.checklistItem.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await getChecklistItems(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(0);
    });

    it('should handle server errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await getChecklistItems(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch checklist items');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('POST /api/boards/[boardId]/lists/[listId]/cards/[cardId]/checklists/[checklistId]/items', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items', {
        method: 'POST',
        body: JSON.stringify({ text: 'New Item' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await createChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if text is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await createChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Item text is required');
    });

    it('should return 400 if text is not a string', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items', {
        method: 'POST',
        body: JSON.stringify({ text: 123 }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await createChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Item text is required');
    });

    it('should return 400 if text is empty or whitespace', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items', {
        method: 'POST',
        body: JSON.stringify({ text: '   ' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await createChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Item text is required');
    });

    it('should return 404 if checklist not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklist.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items', {
        method: 'POST',
        body: JSON.stringify({ text: 'New Item' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await createChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Checklist not found');
    });

    it('should return 400 if checklist does not belong to card', async () => {
      const checklistWithDifferentCard = {
        ...mockChecklist,
        cardId: 'other-card',
        card: mockCard,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklist.findUnique).mockResolvedValue(checklistWithDifferentCard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items', {
        method: 'POST',
        body: JSON.stringify({ text: 'New Item' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await createChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Checklist does not belong to this card');
    });

    it('should create checklist item successfully', async () => {
      const checklistWithCard = {
        ...mockChecklist,
        card: mockCard,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklist.findUnique).mockResolvedValue(checklistWithCard as any);
      vi.mocked(prisma.checklistItem.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.checklistItem.create).mockResolvedValue(mockChecklistItem as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items', {
        method: 'POST',
        body: JSON.stringify({ text: 'Test Item' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await createChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.text).toBe('Test Item');
      expect(data.checked).toBe(false);
      expect(prisma.checklistItem.create).toHaveBeenCalledWith({
        data: {
          text: 'Test Item',
          position: 0,
          checklistId: 'checklist-1',
        },
      });
    });

    it('should create item with correct position when other items exist', async () => {
      const checklistWithCard = {
        ...mockChecklist,
        card: mockCard,
      };
      const lastItem = {
        id: 'item-last',
        position: 5,
      };
      const newItem = { ...mockChecklistItem, position: 6 };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklist.findUnique).mockResolvedValue(checklistWithCard as any);
      vi.mocked(prisma.checklistItem.findFirst).mockResolvedValue(lastItem as any);
      vi.mocked(prisma.checklistItem.create).mockResolvedValue(newItem as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items', {
        method: 'POST',
        body: JSON.stringify({ text: 'Test Item' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await createChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.position).toBe(6);
      expect(prisma.checklistItem.findFirst).toHaveBeenCalledWith({
        where: { checklistId: 'checklist-1' },
        orderBy: { position: 'desc' },
      });
    });

    it('should trim whitespace from text', async () => {
      const checklistWithCard = {
        ...mockChecklist,
        card: mockCard,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklist.findUnique).mockResolvedValue(checklistWithCard as any);
      vi.mocked(prisma.checklistItem.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.checklistItem.create).mockResolvedValue(mockChecklistItem as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items', {
        method: 'POST',
        body: JSON.stringify({ text: '  Test Item  ' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      await createChecklistItem(request, { params });

      expect(prisma.checklistItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            text: 'Test Item',
          }),
        })
      );
    });

    it('should handle server errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items', {
        method: 'POST',
        body: JSON.stringify({ text: 'Test Item' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1' });
      const response = await createChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create checklist item');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('PUT /api/boards/[boardId]/lists/[listId]/cards/[cardId]/checklists/[checklistId]/items/[itemId]', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items/item-1', {
        method: 'PUT',
        body: JSON.stringify({ text: 'Updated Item' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1', itemId: 'item-1' });
      const response = await updateChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if item not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklistItem.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items/item-1', {
        method: 'PUT',
        body: JSON.stringify({ text: 'Updated Item' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1', itemId: 'item-1' });
      const response = await updateChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Item not found');
    });

    it('should return 400 if item does not belong to checklist', async () => {
      const itemWithDifferentChecklist = {
        ...mockChecklistItem,
        checklistId: 'other-checklist',
        checklist: {
          ...mockChecklist,
          card: mockCard,
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklistItem.findUnique).mockResolvedValue(itemWithDifferentChecklist as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items/item-1', {
        method: 'PUT',
        body: JSON.stringify({ text: 'Updated Item' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1', itemId: 'item-1' });
      const response = await updateChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Item does not belong to this checklist');
    });

    it('should return 400 if no updateable fields provided', async () => {
      const itemWithChecklist = {
        ...mockChecklistItem,
        checklist: {
          ...mockChecklist,
          card: mockCard,
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklistItem.findUnique).mockResolvedValue(itemWithChecklist as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items/item-1', {
        method: 'PUT',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1', itemId: 'item-1' });
      const response = await updateChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("At least one of 'text' or 'checked' must be provided");
    });

    it('should return 400 if text is empty string', async () => {
      const itemWithChecklist = {
        ...mockChecklistItem,
        checklist: {
          ...mockChecklist,
          card: mockCard,
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklistItem.findUnique).mockResolvedValue(itemWithChecklist as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items/item-1', {
        method: 'PUT',
        body: JSON.stringify({ text: '' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1', itemId: 'item-1' });
      const response = await updateChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Item text cannot be empty');
    });

    it('should return 400 if checked is not a boolean', async () => {
      const itemWithChecklist = {
        ...mockChecklistItem,
        checklist: {
          ...mockChecklist,
          card: mockCard,
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklistItem.findUnique).mockResolvedValue(itemWithChecklist as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items/item-1', {
        method: 'PUT',
        body: JSON.stringify({ checked: 'true' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1', itemId: 'item-1' });
      const response = await updateChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Checked must be a boolean');
    });

    it('should update item text successfully', async () => {
      const itemWithChecklist = {
        ...mockChecklistItem,
        checklist: {
          ...mockChecklist,
          card: mockCard,
        },
      };
      const updatedItem = {
        ...mockChecklistItem,
        text: 'Updated Item',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklistItem.findUnique).mockResolvedValue(itemWithChecklist as any);
      vi.mocked(prisma.checklistItem.update).mockResolvedValue(updatedItem as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items/item-1', {
        method: 'PUT',
        body: JSON.stringify({ text: 'Updated Item' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1', itemId: 'item-1' });
      const response = await updateChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe('Updated Item');
      expect(prisma.checklistItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { text: 'Updated Item' },
      });
    });

    it('should toggle item checked status successfully', async () => {
      const itemWithChecklist = {
        ...mockChecklistItem,
        checklist: {
          ...mockChecklist,
          card: mockCard,
        },
      };
      const updatedItem = {
        ...mockChecklistItem,
        checked: true,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklistItem.findUnique).mockResolvedValue(itemWithChecklist as any);
      vi.mocked(prisma.checklistItem.update).mockResolvedValue(updatedItem as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items/item-1', {
        method: 'PUT',
        body: JSON.stringify({ checked: true }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1', itemId: 'item-1' });
      const response = await updateChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.checked).toBe(true);
      expect(prisma.checklistItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { checked: true },
      });
    });

    it('should update both text and checked status', async () => {
      const itemWithChecklist = {
        ...mockChecklistItem,
        checklist: {
          ...mockChecklist,
          card: mockCard,
        },
      };
      const updatedItem = {
        ...mockChecklistItem,
        text: 'Updated Item',
        checked: true,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklistItem.findUnique).mockResolvedValue(itemWithChecklist as any);
      vi.mocked(prisma.checklistItem.update).mockResolvedValue(updatedItem as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items/item-1', {
        method: 'PUT',
        body: JSON.stringify({ text: 'Updated Item', checked: true }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1', itemId: 'item-1' });
      const response = await updateChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe('Updated Item');
      expect(data.checked).toBe(true);
      expect(prisma.checklistItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { text: 'Updated Item', checked: true },
      });
    });

    it('should handle server errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items/item-1', {
        method: 'PUT',
        body: JSON.stringify({ text: 'Updated Item' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1', itemId: 'item-1' });
      const response = await updateChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update checklist item');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/boards/[boardId]/lists/[listId]/cards/[cardId]/checklists/[checklistId]/items/[itemId]', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items/item-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1', itemId: 'item-1' });
      const response = await deleteChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if item not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklistItem.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items/item-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1', itemId: 'item-1' });
      const response = await deleteChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Item not found');
    });

    it('should return 400 if item does not belong to checklist', async () => {
      const itemWithDifferentChecklist = {
        ...mockChecklistItem,
        checklistId: 'other-checklist',
        checklist: {
          ...mockChecklist,
          card: mockCard,
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklistItem.findUnique).mockResolvedValue(itemWithDifferentChecklist as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items/item-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1', itemId: 'item-1' });
      const response = await deleteChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Item does not belong to this checklist');
    });

    it('should delete item successfully', async () => {
      const itemWithChecklist = {
        ...mockChecklistItem,
        checklist: {
          ...mockChecklist,
          card: mockCard,
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.checklistItem.findUnique).mockResolvedValue(itemWithChecklist as any);
      vi.mocked(prisma.checklistItem.delete).mockResolvedValue(mockChecklistItem as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items/item-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1', itemId: 'item-1' });
      const response = await deleteChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Item deleted successfully');
      expect(prisma.checklistItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });

    it('should handle server errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1/checklists/checklist-1/items/item-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1', checklistId: 'checklist-1', itemId: 'item-1' });
      const response = await deleteChecklistItem(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete checklist item');
      expect(console.error).toHaveBeenCalled();
    });
  });
});
