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
    activity: {
      findMany: vi.fn(),
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
import { GET } from '@/app/api/boards/[boardId]/activities/route';

describe('Activities API Routes', () => {
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
    members: [
      {
        id: 'user-1',
        userId: 'user-1',
      },
    ],
  };

  const mockActivities = [
    {
      id: 'activity-1',
      type: 'card_created',
      description: 'Created card "Task 1"',
      userId: 'user-1',
      boardId: 'board-1',
      cardId: 'card-1',
      createdAt: new Date('2024-01-01'),
      metadata: JSON.stringify({ cardTitle: 'Task 1' }),
      user: mockUser,
    },
    {
      id: 'activity-2',
      type: 'card_moved',
      description: 'Moved card "Task 1" to "In Progress"',
      userId: 'user-1',
      boardId: 'board-1',
      cardId: 'card-1',
      createdAt: new Date('2024-01-02'),
      metadata: JSON.stringify({ cardTitle: 'Task 1', listTitle: 'In Progress' }),
      user: mockUser,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('GET /api/boards/[boardId]/activities', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/activities');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/boards/board-1/activities');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/activities');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/activities');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
    });

    it('should return 403 if user is not owner or member', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, id: 'other-user' } as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue({
        ...mockBoard,
        userId: 'different-user',
        members: [],
      } as any);

      const request = new Request('http://localhost/api/boards/board-1/activities');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return all activities for a board', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.activity.findMany).mockResolvedValue(mockActivities as any);

      const request = new Request('http://localhost/api/boards/board-1/activities');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].type).toBe('card_created');
      expect(data[0].metadata).toEqual({ cardTitle: 'Task 1' });
      expect(data[1].type).toBe('card_moved');
      expect(prisma.activity.findMany).toHaveBeenCalledWith({
        where: { boardId: 'board-1' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should filter activities by cardId', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.activity.findMany).mockResolvedValue([mockActivities[0]] as any);

      const request = new Request('http://localhost/api/boards/board-1/activities?cardId=card-1');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.activity.findMany).toHaveBeenCalledWith({
        where: { boardId: 'board-1', cardId: 'card-1' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should respect custom limit parameter', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.activity.findMany).mockResolvedValue(mockActivities as any);

      const request = new Request('http://localhost/api/boards/board-1/activities?limit=10');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      expect(prisma.activity.findMany).toHaveBeenCalledWith({
        where: { boardId: 'board-1' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });

    it('should handle activities with null metadata', async () => {
      const activitiesWithNullMetadata = [
        {
          ...mockActivities[0],
          metadata: null,
        },
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.activity.findMany).mockResolvedValue(activitiesWithNullMetadata as any);

      const request = new Request('http://localhost/api/boards/board-1/activities');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data[0].metadata).toBeNull();
    });

    it('should handle errors and return 500', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.activity.findMany).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/activities');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch activities');
    });

    it('should allow board members to access activities', async () => {
      const memberUser = { ...mockUser, id: 'user-2' };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(memberUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue({
        ...mockBoard,
        userId: 'user-1',
        members: [{ id: 'user-2', userId: 'user-2' }],
      } as any);
      vi.mocked(prisma.activity.findMany).mockResolvedValue(mockActivities as any);

      const request = new Request('http://localhost/api/boards/board-1/activities');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
    });
  });
});
