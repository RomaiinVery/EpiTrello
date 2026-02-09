import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    card: {
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

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { GET } from '@/app/api/search/route';

describe('Search API Routes', () => {
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

  const mockCards = [
    {
      id: 'card-1',
      title: 'Fix authentication bug',
      list: {
        id: 'list-1',
        title: 'In Progress',
        board: {
          id: 'board-1',
          title: 'Development Board',
          workspaceId: 'ws-1',
        },
      },
    },
    {
      id: 'card-2',
      title: 'Update authentication flow',
      list: {
        id: 'list-2',
        title: 'To Do',
        board: {
          id: 'board-1',
          title: 'Development Board',
          workspaceId: 'ws-1',
        },
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('GET /api/search', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/search?q=test');
      const response = await GET(request);

      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/search?q=test');
      const response = await GET(request);

      expect(response.status).toBe(401);
      expect(await response.text()).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/search?q=test');
      const response = await GET(request);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('User not found');
    });

    it('should return empty array if query is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/search');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should return empty array if query is too short', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/search?q=a');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should search cards by title', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.card.findMany).mockResolvedValue(mockCards as any);

      const request = new Request('http://localhost/api/search?q=authentication');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].title).toBe('Fix authentication bug');
      expect(prisma.card.findMany).toHaveBeenCalledWith({
        take: 10,
        where: {
          OR: [
            { title: { contains: 'authentication', mode: 'insensitive' } },
            { content: { contains: 'authentication', mode: 'insensitive' } },
          ],
          list: {
            board: {
              OR: [
                { userId: 'user-1' },
                { members: { some: { userId: 'user-1' } } },
                { workspace: { members: { some: { userId: 'user-1' } } } },
              ],
            },
          },
        },
        select: {
          id: true,
          title: true,
          list: {
            select: {
              id: true,
              title: true,
              board: {
                select: {
                  id: true,
                  title: true,
                  workspaceId: true,
                },
              },
            },
          },
        },
      });
    });

    it('should limit results to 10 cards', async () => {
      const manyCards = Array.from({ length: 15 }, (_, i) => ({
        id: `card-${i}`,
        title: `Card ${i}`,
        list: mockCards[0].list,
      }));

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.card.findMany).mockResolvedValue(manyCards.slice(0, 10) as any);

      const request = new Request('http://localhost/api/search?q=card');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBeLessThanOrEqual(10);
    });

    it('should only return cards from boards user has access to', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.card.findMany).mockResolvedValue(mockCards as any);

      const request = new Request('http://localhost/api/search?q=bug');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            list: {
              board: {
                OR: [
                  { userId: 'user-1' },
                  { members: { some: { userId: 'user-1' } } },
                  { workspace: { members: { some: { userId: 'user-1' } } } },
                ],
              },
            },
          }),
        })
      );
    });

    it('should search cards by content', async () => {
      const cardsWithContent = [
        {
          id: 'card-3',
          title: 'Task',
          list: mockCards[0].list,
        },
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.card.findMany).mockResolvedValue(cardsWithContent as any);

      const request = new Request('http://localhost/api/search?q=important');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'important', mode: 'insensitive' } },
              { content: { contains: 'important', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should handle case-insensitive search', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.card.findMany).mockResolvedValue(mockCards as any);

      const request = new Request('http://localhost/api/search?q=AUTHENTICATION');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prisma.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'AUTHENTICATION', mode: 'insensitive' } },
              { content: { contains: 'AUTHENTICATION', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should return cards with board and list information', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.card.findMany).mockResolvedValue(mockCards as any);

      const request = new Request('http://localhost/api/search?q=authentication');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data[0]).toHaveProperty('list');
      expect(data[0].list).toHaveProperty('board');
      expect(data[0].list.board).toHaveProperty('id');
      expect(data[0].list.board).toHaveProperty('title');
      expect(data[0].list.board).toHaveProperty('workspaceId');
    });

    it('should handle errors and return 500', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.card.findMany).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/search?q=test');
      const response = await GET(request);

      expect(response.status).toBe(500);
      expect(await response.text()).toBe('Internal Error');
    });

    it('should return empty array for no matches', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.card.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/search?q=nonexistent');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });
});
