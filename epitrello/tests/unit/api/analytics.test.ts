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
import { GET } from '@/app/api/boards/[boardId]/analytics/route';
import { GET as GET_EXPORT } from '@/app/api/boards/[boardId]/analytics/export/route';

describe('Analytics API Routes', () => {
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
        id: 'member-1',
        userId: 'user-1',
        user: mockUser,
      },
    ],
  };

  const mockLists = [
    {
      id: 'list-1',
      title: 'To Do',
      boardId: 'board-1',
      cards: [
        {
          id: 'card-1',
          title: 'Task 1',
          isDone: false,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          members: [{ user: mockUser }],
          labels: [],
        },
      ],
    },
    {
      id: 'list-2',
      title: 'Done',
      boardId: 'board-1',
      cards: [
        {
          id: 'card-2',
          title: 'Task 2',
          isDone: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-03'),
          members: [{ user: mockUser }],
          labels: [],
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('GET /api/boards/[boardId]/analytics', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/analytics');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/boards/board-1/analytics');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/analytics');
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

      const request = new Request('http://localhost/api/boards/board-1/analytics');
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

      const request = new Request('http://localhost/api/boards/board-1/analytics');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return analytics data for board owner', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.list.findMany).mockResolvedValue(mockLists as any);

      const request = new Request('http://localhost/api/boards/board-1/analytics');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalCards).toBe(2);
      expect(data.completedCards).toBe(1);
      expect(data.listDistribution).toHaveLength(2);
      expect(data.memberDistribution).toBeDefined();
      expect(data.timelineData).toBeDefined();
      expect(data.avgCompletionTimeHours).toBeGreaterThanOrEqual(0);
    });

    it('should filter analytics by date range', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.list.findMany).mockResolvedValue(mockLists as any);

      const request = new Request(
        'http://localhost/api/boards/board-1/analytics?startDate=2024-01-01&endDate=2024-01-31'
      );
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.timelineData).toBeDefined();
    });

    it('should handle errors and return 500', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.list.findMany).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/analytics');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch analytics');
    });
  });

  describe('GET /api/boards/[boardId]/analytics/export', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/analytics/export');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET_EXPORT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/analytics/export');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET_EXPORT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/analytics/export');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET_EXPORT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 403 if user is not owner or member', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue({
        ...mockBoard,
        userId: 'different-user',
        members: [],
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, id: 'other-user' } as any);

      const request = new Request('http://localhost/api/boards/board-1/analytics/export');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET_EXPORT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should export analytics data as CSV', async () => {
      const mockListsWithLabels = [
        {
          ...mockLists[0],
          cards: [
            {
              ...mockLists[0].cards[0],
              labels: [
                {
                  label: {
                    id: 'label-1',
                    name: 'Bug',
                  },
                },
              ],
            },
          ],
        },
        mockLists[1],
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.list.findMany).mockResolvedValue(mockListsWithLabels as any);

      const request = new Request('http://localhost/api/boards/board-1/analytics/export');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET_EXPORT(request, { params });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('board-export-board-1.csv');

      const csvContent = await response.text();
      expect(csvContent).toContain('Card ID,Title,List,Status,Created At,Completed At,Assignees,Labels');
      expect(csvContent).toContain('Task 1');
      expect(csvContent).toContain('Task 2');
    });

    it('should handle errors during export and return 500', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.list.findMany).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/analytics/export');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET_EXPORT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to export data');
    });
  });
});
