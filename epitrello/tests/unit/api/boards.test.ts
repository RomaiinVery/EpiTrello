/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules
vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    board: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    workspace: {
      findFirst: vi.fn(),
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
import { GET, POST } from '@/app/api/boards/route';

describe('Board API Routes', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('GET /api/boards', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/boards');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return all boards for authenticated user', async () => {
      const mockBoards = [
        {
          id: 'board-1',
          title: 'Board 1',
          userId: 'user-1',
          workspaceId: 'ws-1',
          members: [],
          user: mockUser,
        },
        {
          id: 'board-2',
          title: 'Board 2',
          userId: 'user-1',
          workspaceId: 'ws-1',
          members: [],
          user: mockUser,
        },
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findMany).mockResolvedValue(mockBoards as any);

      const request = new Request('http://localhost/api/boards');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].title).toBe('Board 1');
      expect(prisma.board.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: undefined,
          OR: [
            { userId: 'user-1' },
            { members: { some: { userId: 'user-1' } } },
            { workspace: { members: { some: { userId: 'user-1' } } } },
            { workspace: { userId: 'user-1' } },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          members: {
            select: {
              id: true,
              role: true,
              user: {
                select: { id: true, name: true, email: true, profileImage: true },
              },
            },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    });

    it('should filter boards by workspaceId', async () => {
      const mockBoards = [
        {
          id: 'board-1',
          title: 'Board 1',
          userId: 'user-1',
          workspaceId: 'ws-1',
          members: [],
          user: mockUser,
        },
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findMany).mockResolvedValue(mockBoards as any);

      const request = new Request('http://localhost/api/boards?workspaceId=ws-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(prisma.board.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: 'ws-1',
          }),
        })
      );
    });

    it('should return empty array if no boards found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/boards');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(0);
    });
  });

  describe('POST /api/boards', () => {
    const mockWorkspace = {
      id: 'ws-1',
      name: 'Workspace 1',
      userId: 'user-1',
    };

    const mockBoard = {
      id: 'board-1',
      title: 'New Board',
      description: 'Test description',
      userId: 'user-1',
      workspaceId: 'ws-1',
      lists: [
        { id: 'list-1', title: 'To Do', position: 0 },
        { id: 'list-2', title: 'Doing', position: 1 },
        { id: 'list-3', title: 'Done', position: 2 },
      ],
    };

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Board',
          workspaceId: 'ws-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Board',
          workspaceId: 'ws-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 400 if title is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: 'ws-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Title and workspaceId are required');
    });

    it('should return 400 if workspaceId is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Board',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Title and workspaceId are required');
    });

    it('should return 404 if workspace not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Board',
          workspaceId: 'ws-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Workspace introuvable ou vous n'avez pas les droits de création");
    });

    it('should create board successfully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(mockWorkspace as any);
      vi.mocked(prisma.board.create).mockResolvedValue(mockBoard as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Board',
          description: 'Test description',
          workspaceId: 'ws-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe('New Board');
      expect(data.lists).toHaveLength(3);
      expect(prisma.board.create).toHaveBeenCalledWith({
        data: {
          title: 'New Board',
          description: 'Test description',
          workspaceId: 'ws-1',
          userId: 'user-1',
          githubRepo: null,
          githubBranch: null,
          background: null,
          lists: {
            create: [
              { title: 'To Do', position: 0 },
              { title: 'Doing', position: 1 },
              { title: 'Done', position: 2 },
            ],
          },
        },
        include: {
          lists: true,
        },
      });
      expect(logActivity).toHaveBeenCalledWith({
        type: 'board_created',
        description: 'Test User a créé le tableau "New Board"',
        userId: 'user-1',
        boardId: 'board-1',
      });
    });

    it('should create board with optional fields', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(mockWorkspace as any);
      vi.mocked(prisma.board.create).mockResolvedValue({
        ...mockBoard,
        githubRepo: 'owner/repo',
        githubBranch: 'main',
        background: 'blue',
      } as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Board',
          description: 'Test description',
          workspaceId: 'ws-1',
          githubRepo: 'owner/repo',
          githubBranch: 'main',
          background: 'blue',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.githubRepo).toBe('owner/repo');
      expect(data.githubBranch).toBe('main');
      expect(data.background).toBe('blue');
    });

    it('should verify workspace permissions', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(mockWorkspace as any);
      vi.mocked(prisma.board.create).mockResolvedValue(mockBoard as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Board',
          workspaceId: 'ws-1',
        }),
      });

      await POST(request);

      expect(prisma.workspace.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'ws-1',
          OR: [
            { userId: 'user-1' },
            {
              members: {
                some: {
                  userId: 'user-1',
                  role: { in: ['ADMIN', 'EDITOR'] },
                },
              },
            },
          ],
        },
      });
    });
  });
});
