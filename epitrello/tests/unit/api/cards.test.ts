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
    list: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    card: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
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

vi.mock('@/app/lib/automation', () => ({
  TriggerType: {
    CARD_CREATED: 'CARD_CREATED',
    CARD_MOVED_TO_LIST: 'CARD_MOVED_TO_LIST',
  },
  ActionType: {
    ARCHIVE_CARD: 'ARCHIVE_CARD',
    MARK_AS_DONE: 'MARK_AS_DONE',
    ADD_LABEL: 'ADD_LABEL',
    MOVE_CARD: 'MOVE_CARD',
    ASSIGN_MEMBER: 'ASSIGN_MEMBER',
    SET_DUE_DATE: 'SET_DUE_DATE',
    REMOVE_LABEL: 'REMOVE_LABEL',
  },
  AutomationService: {
    processTrigger: vi.fn(),
  },
}));

import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { logActivity } from '@/app/lib/activity-logger';
import { AutomationService, TriggerType } from '@/app/lib/automation';

import { GET as getCards, POST as createCard } from '@/app/api/boards/[boardId]/lists/[listId]/cards/route';
import { GET as getCard, PUT as updateCard, DELETE as deleteCard } from '@/app/api/boards/[boardId]/lists/[listId]/cards/[cardId]/route';
import { PATCH as reorderCards } from '@/app/api/boards/[boardId]/cards/reorder/route';

describe('Cards API Routes', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    githubAccessToken: null,
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
    githubRepo: null,
    githubBranch: null,
    members: [],
    workspace: {
      userId: 'user-1',
      members: [],
    },
  };

  const mockList = {
    id: 'list-1',
    title: 'To Do',
    position: 0,
    boardId: 'board-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('GET /api/boards/[boardId]/lists/[listId]/cards', () => {
    it('should return 400 if listId is missing', async () => {
      const request = new Request('http://localhost/api/boards/board-1/lists//cards');
      const params = Promise.resolve({ boardId: 'board-1', listId: '' });
      const response = await getCards(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing listId parameter');
    });

    it('should return all cards for a list', async () => {
      const mockCards = [
        {
          id: 'card-1',
          title: 'Card 1',
          content: 'Content 1',
          position: 0,
          listId: 'list-1',
          labels: [
            {
              label: {
                id: 'label-1',
                name: 'Bug',
                color: '#ff0000',
              },
            },
          ],
          members: [
            {
              user: {
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
              },
            },
          ],
        },
        {
          id: 'card-2',
          title: 'Card 2',
          content: null,
          position: 1,
          listId: 'list-1',
          labels: [],
          members: [],
        },
      ];

      vi.mocked(prisma.card.findMany).mockResolvedValue(mockCards as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await getCards(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].title).toBe('Card 1');
      expect(data[0].labels).toHaveLength(1);
      expect(data[0].labels[0].name).toBe('Bug');
      expect(data[0].members).toHaveLength(1);
      expect(data[0].members[0].email).toBe('test@example.com');
      expect(data[1].title).toBe('Card 2');
      expect(data[1].labels).toHaveLength(0);
      expect(data[1].members).toHaveLength(0);
      expect(prisma.card.findMany).toHaveBeenCalledWith({
        where: { listId: 'list-1' },
        orderBy: { position: 'asc' },
        include: {
          labels: {
            include: {
              label: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    it('should return empty array if no cards found', async () => {
      vi.mocked(prisma.card.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await getCards(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      vi.mocked(prisma.card.findMany).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await getCards(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to retrieve cards');
    });
  });

  describe('POST /api/boards/[boardId]/lists/[listId]/cards', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await createCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await createCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await createCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 400 if listId is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/lists//cards', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: '' });
      const response = await createCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing listId parameter');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await createCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this board');
    });

    it('should return 403 if user is not authorized', async () => {
      const unauthorizedBoard = {
        ...mockBoard,
        userId: 'other-user',
        members: [],
        workspace: {
          userId: 'other-user',
          members: [],
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(unauthorizedBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await createCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this board');
    });

    it('should return 404 if list not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.list.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await createCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('List not found or does not belong to this board');
    });

    it('should return 404 if list does not belong to board', async () => {
      const wrongList = {
        ...mockList,
        boardId: 'other-board',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.list.findUnique).mockResolvedValue(wrongList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await createCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('List not found or does not belong to this board');
    });

    it('should return 400 if title is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.list.findUnique).mockResolvedValue(mockList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await createCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Title is required and must be a string');
    });

    it('should return 400 if title is not a string', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.list.findUnique).mockResolvedValue(mockList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards', {
        method: 'POST',
        body: JSON.stringify({ title: 123 }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await createCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Title is required and must be a string');
    });

    it('should create card successfully with title only', async () => {
      const mockCard = {
        id: 'card-1',
        title: 'New Card',
        content: null,
        position: 0,
        listId: 'list-1',
        githubIssueNumber: null,
        githubIssueUrl: null,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.list.findUnique).mockResolvedValue(mockList as any);
      vi.mocked(prisma.card.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.card.create).mockResolvedValue(mockCard as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);
      vi.mocked(AutomationService.processTrigger).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await createCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe('New Card');
      expect(data.position).toBe(0);
      expect(prisma.card.findFirst).toHaveBeenCalledWith({
        where: { listId: 'list-1' },
        orderBy: { position: 'desc' },
      });
      expect(prisma.card.create).toHaveBeenCalledWith({
        data: {
          title: 'New Card',
          content: null,
          position: 0,
          listId: 'list-1',
          githubIssueNumber: null,
          githubIssueUrl: null,
        },
      });
      expect(logActivity).toHaveBeenCalledWith({
        type: 'card_created',
        description: 'Test User a créé la carte "New Card"',
        userId: 'user-1',
        boardId: 'board-1',
        cardId: 'card-1',
        metadata: { listTitle: 'To Do' },
      });
      expect(AutomationService.processTrigger).toHaveBeenCalledWith(
        'board-1',
        TriggerType.CARD_CREATED,
        'list-1',
        { cardId: 'card-1' }
      );
    });

    it('should create card with title and content', async () => {
      const mockCard = {
        id: 'card-1',
        title: 'New Card',
        content: 'Card description',
        position: 0,
        listId: 'list-1',
        githubIssueNumber: null,
        githubIssueUrl: null,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.list.findUnique).mockResolvedValue(mockList as any);
      vi.mocked(prisma.card.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.card.create).mockResolvedValue(mockCard as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);
      vi.mocked(AutomationService.processTrigger).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Card', content: 'Card description' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await createCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe('New Card');
      expect(data.content).toBe('Card description');
      expect(prisma.card.create).toHaveBeenCalledWith({
        data: {
          title: 'New Card',
          content: 'Card description',
          position: 0,
          listId: 'list-1',
          githubIssueNumber: null,
          githubIssueUrl: null,
        },
      });
    });

    it('should create card with correct position when other cards exist', async () => {
      const lastCard = {
        id: 'card-last',
        position: 5,
      };

      const mockCard = {
        id: 'card-1',
        title: 'New Card',
        content: null,
        position: 6,
        listId: 'list-1',
        githubIssueNumber: null,
        githubIssueUrl: null,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.list.findUnique).mockResolvedValue(mockList as any);
      vi.mocked(prisma.card.findFirst).mockResolvedValue(lastCard as any);
      vi.mocked(prisma.card.create).mockResolvedValue(mockCard as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);
      vi.mocked(AutomationService.processTrigger).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await createCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.position).toBe(6);
      expect(prisma.card.create).toHaveBeenCalledWith({
        data: {
          title: 'New Card',
          content: null,
          position: 6,
          listId: 'list-1',
          githubIssueNumber: null,
          githubIssueUrl: null,
        },
      });
    });

    it('should allow board member to create card', async () => {
      const boardWithMember = {
        ...mockBoard,
        userId: 'other-user',
        members: [{ userId: 'user-1', role: 'EDITOR' }],
      };

      const mockCard = {
        id: 'card-1',
        title: 'New Card',
        content: null,
        position: 0,
        listId: 'list-1',
        githubIssueNumber: null,
        githubIssueUrl: null,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithMember as any);
      vi.mocked(prisma.list.findUnique).mockResolvedValue(mockList as any);
      vi.mocked(prisma.card.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.card.create).mockResolvedValue(mockCard as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);
      vi.mocked(AutomationService.processTrigger).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await createCard(request, { params });

      expect(response.status).toBe(201);
    });

    it('should allow workspace member to create card', async () => {
      const boardWithWorkspaceMember = {
        ...mockBoard,
        userId: 'other-user',
        members: [],
        workspace: {
          userId: 'other-user',
          members: [{ userId: 'user-1', role: 'EDITOR' }],
        },
      };

      const mockCard = {
        id: 'card-1',
        title: 'New Card',
        content: null,
        position: 0,
        listId: 'list-1',
        githubIssueNumber: null,
        githubIssueUrl: null,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithWorkspaceMember as any);
      vi.mocked(prisma.list.findUnique).mockResolvedValue(mockList as any);
      vi.mocked(prisma.card.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.card.create).mockResolvedValue(mockCard as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);
      vi.mocked(AutomationService.processTrigger).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await createCard(request, { params });

      expect(response.status).toBe(201);
    });

    it('should handle automation trigger errors gracefully', async () => {
      const mockCard = {
        id: 'card-1',
        title: 'New Card',
        content: null,
        position: 0,
        listId: 'list-1',
        githubIssueNumber: null,
        githubIssueUrl: null,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.list.findUnique).mockResolvedValue(mockList as any);
      vi.mocked(prisma.card.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.card.create).mockResolvedValue(mockCard as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);
      vi.mocked(AutomationService.processTrigger).mockRejectedValue(new Error('Automation error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await createCard(request, { params });

      expect(response.status).toBe(201);
      expect(console.error).toHaveBeenCalledWith('Automation Trigger Error (Create):', expect.any(Error));
    });

    it('should handle database errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.list.findUnique).mockResolvedValue(mockList as any);
      vi.mocked(prisma.card.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.card.create).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await createCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create card');
      expect(console.error).toHaveBeenCalledWith('Error creating card:', expect.any(Error));
    });
  });

  describe('GET /api/boards/[boardId]/lists/[listId]/cards/[cardId]', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this board');
    });

    it('should return 403 if user is not authorized', async () => {
      const unauthorizedBoard = {
        ...mockBoard,
        userId: 'other-user',
        members: [],
        workspace: {
          userId: 'other-user',
          members: [],
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(unauthorizedBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this board');
    });

    it('should return 404 if card not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Card not found');
    });

    it('should return 404 if card list not found', async () => {
      const cardWithoutList = {
        id: 'card-1',
        title: 'Card 1',
        list: null,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(cardWithoutList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Card list not found');
    });

    it('should return 400 if card does not belong to board', async () => {
      const mockCard = {
        id: 'card-1',
        title: 'Card 1',
        content: 'Content',
        position: 0,
        listId: 'list-1',
        list: {
          id: 'list-1',
          title: 'To Do',
          boardId: 'other-board',
        },
        labels: [],
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Card does not belong to this board');
    });

    it('should return card successfully', async () => {
      const mockCard = {
        id: 'card-1',
        title: 'Card 1',
        content: 'Content',
        position: 0,
        listId: 'list-1',
        list: {
          id: 'list-1',
          title: 'To Do',
          boardId: 'board-1',
        },
        labels: [
          {
            label: {
              id: 'label-1',
              name: 'Bug',
              color: '#ff0000',
            },
          },
        ],
        members: [
          {
            user: {
              id: 'user-1',
              email: 'test@example.com',
              name: 'Test User',
            },
          },
        ],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('card-1');
      expect(data.title).toBe('Card 1');
      expect(data.labels).toHaveLength(1);
      expect(data.labels[0].name).toBe('Bug');
      expect(data.members).toHaveLength(1);
      expect(data.members[0].email).toBe('test@example.com');
    });

    it('should handle database errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await getCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch card');
      expect(console.error).toHaveBeenCalledWith('Error fetching card:', expect.any(Error));
    });
  });

  describe('PUT /api/boards/[boardId]/lists/[listId]/cards/[cardId]', () => {
    const oldCard = {
      id: 'card-1',
      title: 'Old Title',
      content: 'Old content',
      dueDate: new Date('2024-01-01'),
      startDate: new Date('2023-12-01'),
      isDone: false,
      listId: 'list-1',
      list: {
        title: 'To Do',
      },
    };

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await updateCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await updateCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await updateCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this board');
    });

    it('should return 403 if user is not authorized', async () => {
      const unauthorizedBoard = {
        ...mockBoard,
        userId: 'other-user',
        members: [],
        workspace: {
          userId: 'other-user',
          members: [],
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(unauthorizedBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await updateCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this board');
    });

    it('should return 403 if user is a viewer', async () => {
      const boardWithViewer = {
        ...mockBoard,
        userId: 'other-user',
        members: [{ userId: 'user-1', role: 'VIEWER' }],
        workspace: {
          userId: 'other-user',
          members: [],
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithViewer as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await updateCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('VIEWERs cannot modify this resource');
    });

    it('should return 400 if no updateable fields provided', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await updateCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No updateable fields provided.');
    });

    it('should return 400 if trying to update coverImage via PUT', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify({ coverImage: 'http://example.com/image.jpg' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await updateCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('coverImage cannot be updated via PUT. Use POST /cover to upload an image.');
    });

    it('should return 404 if card not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await updateCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Card not found');
    });

    it('should update card title successfully', async () => {
      const updatedCard = {
        id: 'card-1',
        title: 'Updated Title',
        content: 'Old content',
        dueDate: new Date('2024-01-01'),
        startDate: new Date('2023-12-01'),
        isDone: false,
        listId: 'list-1',
        list: {
          id: 'list-1',
          title: 'To Do',
          boardId: 'board-1',
        },
        labels: [],
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(oldCard as any);
      vi.mocked(prisma.card.update).mockResolvedValue(updatedCard as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Title' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await updateCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Title');
      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: {
          title: 'Updated Title',
        },
        include: {
          list: {
            select: {
              id: true,
              title: true,
              boardId: true,
            },
          },
          labels: {
            include: {
              label: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      });
      expect(logActivity).toHaveBeenCalledWith({
        type: 'card_updated',
        description: expect.stringContaining('titre de "Old Title" à "Updated Title"'),
        userId: 'user-1',
        boardId: 'board-1',
        cardId: 'card-1',
        metadata: {
          oldTitle: 'Old Title',
          newTitle: 'Updated Title',
          listTitle: 'To Do',
        },
      });
    });

    it('should update card content successfully', async () => {
      const updatedCard = {
        id: 'card-1',
        title: 'Old Title',
        content: 'Updated content',
        listId: 'list-1',
        list: {
          id: 'list-1',
          title: 'To Do',
          boardId: 'board-1',
        },
        labels: [],
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(oldCard as any);
      vi.mocked(prisma.card.update).mockResolvedValue(updatedCard as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated content' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await updateCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toBe('Updated content');
      expect(prisma.card.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            content: 'Updated content',
          },
        })
      );
    });

    it('should update card dueDate successfully', async () => {
      const newDueDate = '2024-12-31T00:00:00.000Z';
      const updatedCard = {
        id: 'card-1',
        title: 'Old Title',
        content: 'Old content',
        dueDate: new Date(newDueDate),
        listId: 'list-1',
        list: {
          id: 'list-1',
          title: 'To Do',
          boardId: 'board-1',
        },
        labels: [],
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(oldCard as any);
      vi.mocked(prisma.card.update).mockResolvedValue(updatedCard as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify({ dueDate: newDueDate }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await updateCard(request, { params });

      expect(response.status).toBe(200);
      expect(prisma.card.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            dueDate: expect.any(Date),
          },
        })
      );
    });

    it('should update card startDate successfully', async () => {
      const newStartDate = '2024-01-01T00:00:00.000Z';
      const updatedCard = {
        id: 'card-1',
        title: 'Old Title',
        content: 'Old content',
        startDate: new Date(newStartDate),
        listId: 'list-1',
        list: {
          id: 'list-1',
          title: 'To Do',
          boardId: 'board-1',
        },
        labels: [],
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(oldCard as any);
      vi.mocked(prisma.card.update).mockResolvedValue(updatedCard as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify({ startDate: newStartDate }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await updateCard(request, { params });

      expect(response.status).toBe(200);
      expect(prisma.card.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            startDate: expect.any(Date),
          },
        })
      );
    });

    it('should update card isDone successfully', async () => {
      const updatedCard = {
        id: 'card-1',
        title: 'Old Title',
        content: 'Old content',
        isDone: true,
        listId: 'list-1',
        list: {
          id: 'list-1',
          title: 'To Do',
          boardId: 'board-1',
        },
        labels: [],
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(oldCard as any);
      vi.mocked(prisma.card.update).mockResolvedValue(updatedCard as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify({ isDone: true }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await updateCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isDone).toBe(true);
      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('marqué comme terminé'),
        })
      );
    });

    it('should update multiple fields at once', async () => {
      const updatedCard = {
        id: 'card-1',
        title: 'New Title',
        content: 'New content',
        isDone: true,
        listId: 'list-1',
        list: {
          id: 'list-1',
          title: 'To Do',
          boardId: 'board-1',
        },
        labels: [],
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(oldCard as any);
      vi.mocked(prisma.card.update).mockResolvedValue(updatedCard as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify({
          title: 'New Title',
          content: 'New content',
          isDone: true,
        }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await updateCard(request, { params });

      expect(response.status).toBe(200);
      expect(prisma.card.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            title: 'New Title',
            content: 'New content',
            isDone: true,
          },
        })
      );
    });

    it('should handle database errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Card' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await updateCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update card.');
      expect(console.error).toHaveBeenCalledWith('Error updating card:', expect.any(Error));
    });
  });

  describe('DELETE /api/boards/[boardId]/lists/[listId]/cards/[cardId]', () => {
    const mockCard = {
      id: 'card-1',
      title: 'Card to Delete',
      list: {
        title: 'To Do',
      },
    };

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await deleteCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await deleteCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await deleteCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this board');
    });

    it('should return 403 if user is not authorized', async () => {
      const unauthorizedBoard = {
        ...mockBoard,
        userId: 'other-user',
        members: [],
        workspace: {
          userId: 'other-user',
          members: [],
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(unauthorizedBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await deleteCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this board');
    });

    it('should return 403 if user is a viewer', async () => {
      const boardWithViewer = {
        ...mockBoard,
        userId: 'other-user',
        members: [{ userId: 'user-1', role: 'VIEWER' }],
        workspace: {
          userId: 'other-user',
          members: [],
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithViewer as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await deleteCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('VIEWERs cannot delete this resource');
    });

    it('should return 404 if card not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await deleteCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Card not found');
    });

    it('should delete card successfully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.card.delete).mockResolvedValue(mockCard as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await deleteCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Card deleted successfully.');
      expect(prisma.card.delete).toHaveBeenCalledWith({
        where: { id: 'card-1' },
      });
      expect(logActivity).toHaveBeenCalledWith({
        type: 'card_deleted',
        description: 'Test User a supprimé la carte "Card to Delete"',
        userId: 'user-1',
        boardId: 'board-1',
        cardId: undefined,
        metadata: { cardTitle: 'Card to Delete', listTitle: 'To Do' },
      });
    });

    it('should handle database errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.card.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1/cards/card-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1', cardId: 'card-1' });
      const response = await deleteCard(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete card.');
      expect(console.error).toHaveBeenCalledWith('Error deleting card:', expect.any(Error));
    });
  });

  describe('PATCH /api/boards/[boardId]/cards/reorder', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/cards/reorder', {
        method: 'PATCH',
        body: JSON.stringify({
          cards: [
            { id: 'card-1', position: 0, listId: 'list-1' },
          ],
        }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await reorderCards(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/cards/reorder', {
        method: 'PATCH',
        body: JSON.stringify({
          cards: [
            { id: 'card-1', position: 0, listId: 'list-1' },
          ],
        }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await reorderCards(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 400 if cards array is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/cards/reorder', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await reorderCards(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 400 if cards is not an array', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/cards/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ cards: 'not-an-array' }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await reorderCards(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/cards/reorder', {
        method: 'PATCH',
        body: JSON.stringify({
          cards: [
            { id: 'card-1', position: 0, listId: 'list-1' },
          ],
        }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await reorderCards(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this board');
    });

    it('should return 403 if user is not authorized', async () => {
      const unauthorizedBoard = {
        id: 'board-1',
        userId: 'other-user',
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(unauthorizedBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/cards/reorder', {
        method: 'PATCH',
        body: JSON.stringify({
          cards: [
            { id: 'card-1', position: 0, listId: 'list-1' },
          ],
        }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await reorderCards(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You do not have access to this board');
    });

    it('should reorder cards successfully within same list', async () => {
      const boardWithMember = {
        id: 'board-1',
        userId: 'user-1',
        members: [],
      };

      const oldCards = [
        {
          id: 'card-1',
          title: 'Card 1',
          listId: 'list-1',
          list: { id: 'list-1', title: 'To Do' },
        },
        {
          id: 'card-2',
          title: 'Card 2',
          listId: 'list-1',
          list: { id: 'list-1', title: 'To Do' },
        },
      ];

      const newLists = [
        { id: 'list-1', title: 'To Do' },
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithMember as any);
      vi.mocked(prisma.card.findMany).mockResolvedValue(oldCards as any);
      vi.mocked(prisma.list.findMany).mockResolvedValue(newLists as any);
      vi.mocked(prisma.$transaction).mockImplementation(async (transactions: any) => {
        return transactions.map(() => ({}));
      });

      const request = new Request('http://localhost/api/boards/board-1/cards/reorder', {
        method: 'PATCH',
        body: JSON.stringify({
          cards: [
            { id: 'card-2', position: 0, listId: 'list-1' },
            { id: 'card-1', position: 1, listId: 'list-1' },
          ],
        }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await reorderCards(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Cards reordered successfully');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should reorder cards and move to different list', async () => {
      const boardWithMember = {
        id: 'board-1',
        userId: 'user-1',
        members: [],
      };

      const oldCards = [
        {
          id: 'card-1',
          title: 'Card 1',
          listId: 'list-1',
          list: { id: 'list-1', title: 'To Do' },
        },
      ];

      const newLists = [
        { id: 'list-1', title: 'To Do' },
        { id: 'list-2', title: 'Doing' },
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithMember as any);
      vi.mocked(prisma.card.findMany).mockResolvedValue(oldCards as any);
      vi.mocked(prisma.list.findMany).mockResolvedValue(newLists as any);
      vi.mocked(prisma.$transaction).mockImplementation(async (transactions: any) => {
        return transactions.map(() => ({}));
      });
      vi.mocked(logActivity).mockResolvedValue(undefined);
      vi.mocked(AutomationService.processTrigger).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/cards/reorder', {
        method: 'PATCH',
        body: JSON.stringify({
          cards: [
            { id: 'card-1', position: 0, listId: 'list-2' },
          ],
        }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await reorderCards(request, { params });

      expect(response.status).toBe(200);
      expect(logActivity).toHaveBeenCalledWith({
        type: 'card_moved',
        description: 'Test User a déplacé la carte "Card 1" de "To Do" vers "Doing"',
        userId: 'user-1',
        boardId: 'board-1',
        cardId: 'card-1',
        metadata: {
          cardTitle: 'Card 1',
          oldListId: 'list-1',
          oldListTitle: 'To Do',
          newListId: 'list-2',
          newListTitle: 'Doing',
        },
      });
      expect(AutomationService.processTrigger).toHaveBeenCalledWith(
        'board-1',
        TriggerType.CARD_MOVED_TO_LIST,
        'list-2',
        { cardId: 'card-1' }
      );
    });

    it('should handle automation trigger errors gracefully', async () => {
      const boardWithMember = {
        id: 'board-1',
        userId: 'user-1',
        members: [],
      };

      const oldCards = [
        {
          id: 'card-1',
          title: 'Card 1',
          listId: 'list-1',
          list: { id: 'list-1', title: 'To Do' },
        },
      ];

      const newLists = [
        { id: 'list-1', title: 'To Do' },
        { id: 'list-2', title: 'Doing' },
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithMember as any);
      vi.mocked(prisma.card.findMany).mockResolvedValue(oldCards as any);
      vi.mocked(prisma.list.findMany).mockResolvedValue(newLists as any);
      vi.mocked(prisma.$transaction).mockImplementation(async (transactions: any) => {
        return transactions.map(() => ({}));
      });
      vi.mocked(logActivity).mockResolvedValue(undefined);
      vi.mocked(AutomationService.processTrigger).mockRejectedValue(new Error('Automation error'));

      const request = new Request('http://localhost/api/boards/board-1/cards/reorder', {
        method: 'PATCH',
        body: JSON.stringify({
          cards: [
            { id: 'card-1', position: 0, listId: 'list-2' },
          ],
        }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await reorderCards(request, { params });

      expect(response.status).toBe(200);
      expect(console.error).toHaveBeenCalledWith('Automation Trigger Error:', expect.any(Error));
    });

    it('should handle database transaction errors', async () => {
      const boardWithMember = {
        id: 'board-1',
        userId: 'user-1',
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithMember as any);
      vi.mocked(prisma.card.findMany).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/cards/reorder', {
        method: 'PATCH',
        body: JSON.stringify({
          cards: [
            { id: 'card-1', position: 0, listId: 'list-1' },
          ],
        }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await reorderCards(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to reorder cards');
      expect(console.error).toHaveBeenCalledWith('Failed to reorder cards:', expect.any(Error));
    });
  });
});
