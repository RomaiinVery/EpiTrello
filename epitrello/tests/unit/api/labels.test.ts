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
    label: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    card: {
      findUnique: vi.fn(),
    },
    cardLabel: {
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

import { GET as getLabels, POST as createLabel } from '@/app/api/boards/[boardId]/labels/route';
import { PUT as updateLabel, DELETE as deleteLabel } from '@/app/api/boards/[boardId]/labels/[labelId]/route';
import { GET as getCardLabels, POST as addCardLabel, DELETE as removeCardLabel } from '@/app/api/boards/[boardId]/cards/[cardId]/labels/route';

describe('Labels API Routes', () => {
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

  const mockLabel = {
    id: 'label-1',
    name: 'Bug',
    color: '#ff0000',
    boardId: 'board-1',
    createdAt: new Date('2024-01-01'),
  };

  const mockCard = {
    id: 'card-1',
    title: 'Test Card',
    list: {
      id: 'list-1',
      boardId: 'board-1',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('GET /api/boards/[boardId]/labels', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/labels');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await getLabels(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/boards/board-1/labels');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await getLabels(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/labels');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await getLabels(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/labels');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await getLabels(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
    });

    it('should return 403 if user is not owner or member', async () => {
      const unauthorizedBoard = {
        ...mockBoard,
        userId: 'other-user',
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(unauthorizedBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/labels');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await getLabels(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return all labels for a board', async () => {
      const mockLabels = [
        { id: 'label-1', name: 'Bug', color: '#ff0000', boardId: 'board-1', createdAt: new Date('2024-01-01') },
        { id: 'label-2', name: 'Feature', color: '#00ff00', boardId: 'board-1', createdAt: new Date('2024-01-02') },
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findMany).mockResolvedValue(mockLabels as any);

      const request = new Request('http://localhost/api/boards/board-1/labels');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await getLabels(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe('Bug');
      expect(data[1].name).toBe('Feature');
      expect(prisma.label.findMany).toHaveBeenCalledWith({
        where: { boardId: 'board-1' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return empty array if no labels found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/boards/board-1/labels');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await getLabels(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(0);
    });

    it('should allow board members to view labels', async () => {
      const boardWithMember = {
        ...mockBoard,
        userId: 'other-user',
        members: [{ id: 'user-1' }],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithMember as any);
      vi.mocked(prisma.label.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/boards/board-1/labels');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await getLabels(request, { params });

      expect(response.status).toBe(200);
    });

    it('should handle database errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findMany).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/labels');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await getLabels(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch labels');
      expect(console.error).toHaveBeenCalledWith('Error fetching labels:', expect.any(Error));
    });
  });

  describe('POST /api/boards/[boardId]/labels', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/labels', {
        method: 'POST',
        body: JSON.stringify({ name: 'Bug', color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await createLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/labels', {
        method: 'POST',
        body: JSON.stringify({ name: 'Bug', color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await createLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 400 if name is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/labels', {
        method: 'POST',
        body: JSON.stringify({ color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await createLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name and color are required');
    });

    it('should return 400 if color is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/labels', {
        method: 'POST',
        body: JSON.stringify({ name: 'Bug' }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await createLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name and color are required');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/labels', {
        method: 'POST',
        body: JSON.stringify({ name: 'Bug', color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await createLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
    });

    it('should return 403 if user is not owner or member', async () => {
      const unauthorizedBoard = {
        ...mockBoard,
        userId: 'other-user',
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(unauthorizedBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/labels', {
        method: 'POST',
        body: JSON.stringify({ name: 'Bug', color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await createLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 400 if label with same name exists', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(mockLabel as any);

      const request = new Request('http://localhost/api/boards/board-1/labels', {
        method: 'POST',
        body: JSON.stringify({ name: 'Bug', color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await createLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('A label with this name already exists');
    });

    it('should create label successfully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.label.create).mockResolvedValue(mockLabel as any);

      const request = new Request('http://localhost/api/boards/board-1/labels', {
        method: 'POST',
        body: JSON.stringify({ name: 'Bug', color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await createLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('Bug');
      expect(data.color).toBe('#ff0000');
      expect(prisma.label.create).toHaveBeenCalledWith({
        data: {
          name: 'Bug',
          color: '#ff0000',
          boardId: 'board-1',
        },
      });
    });

    it('should trim label name before creating', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.label.create).mockResolvedValue(mockLabel as any);

      const request = new Request('http://localhost/api/boards/board-1/labels', {
        method: 'POST',
        body: JSON.stringify({ name: '  Bug  ', color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await createLabel(request, { params });

      expect(response.status).toBe(201);
      expect(prisma.label.create).toHaveBeenCalledWith({
        data: {
          name: 'Bug',
          color: '#ff0000',
          boardId: 'board-1',
        },
      });
    });

    it('should allow board members to create labels', async () => {
      const boardWithMember = {
        ...mockBoard,
        userId: 'other-user',
        members: [{ id: 'user-1' }],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(boardWithMember as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.label.create).mockResolvedValue(mockLabel as any);

      const request = new Request('http://localhost/api/boards/board-1/labels', {
        method: 'POST',
        body: JSON.stringify({ name: 'Bug', color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await createLabel(request, { params });

      expect(response.status).toBe(201);
    });

    it('should handle database errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.label.create).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/labels', {
        method: 'POST',
        body: JSON.stringify({ name: 'Bug', color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await createLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create label');
      expect(console.error).toHaveBeenCalledWith('Error creating label:', expect.any(Error));
    });
  });

  describe('PUT /api/boards/[boardId]/labels/[labelId]', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Critical Bug', color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await updateLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Critical Bug', color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await updateLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Critical Bug', color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await updateLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
    });

    it('should return 403 if user is not owner or member', async () => {
      const unauthorizedBoard = {
        ...mockBoard,
        userId: 'other-user',
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(unauthorizedBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Critical Bug', color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await updateLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 404 if label not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Critical Bug', color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await updateLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Label not found');
    });

    it('should return 404 if label does not belong to board', async () => {
      const wrongBoardLabel = {
        ...mockLabel,
        boardId: 'other-board',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(wrongBoardLabel as any);

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Critical Bug', color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await updateLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Label not found');
    });

    it('should return 400 if new name already exists', async () => {
      const duplicateLabel = {
        id: 'label-2',
        name: 'Feature',
        color: '#00ff00',
        boardId: 'board-1',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique)
        .mockResolvedValueOnce(mockLabel as any)
        .mockResolvedValueOnce(duplicateLabel as any);

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Feature', color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await updateLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('A label with this name already exists');
    });

    it('should update label name successfully', async () => {
      const updatedLabel = {
        ...mockLabel,
        name: 'Critical Bug',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique)
        .mockResolvedValueOnce(mockLabel as any)
        .mockResolvedValueOnce(null);
      vi.mocked(prisma.label.update).mockResolvedValue(updatedLabel as any);

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Critical Bug', color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await updateLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Critical Bug');
      expect(prisma.label.update).toHaveBeenCalledWith({
        where: { id: 'label-1' },
        data: {
          name: 'Critical Bug',
          color: '#ff0000',
        },
      });
    });

    it('should update label color only', async () => {
      const updatedLabel = {
        ...mockLabel,
        color: '#00ff00',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(mockLabel as any);
      vi.mocked(prisma.label.update).mockResolvedValue(updatedLabel as any);

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'PUT',
        body: JSON.stringify({ color: '#00ff00' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await updateLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.color).toBe('#00ff00');
      expect(prisma.label.update).toHaveBeenCalledWith({
        where: { id: 'label-1' },
        data: {
          color: '#00ff00',
        },
      });
    });

    it('should trim label name when updating', async () => {
      const updatedLabel = {
        ...mockLabel,
        name: 'Critical Bug',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique)
        .mockResolvedValueOnce(mockLabel as any)
        .mockResolvedValueOnce(null);
      vi.mocked(prisma.label.update).mockResolvedValue(updatedLabel as any);

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'PUT',
        body: JSON.stringify({ name: '  Critical Bug  ' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await updateLabel(request, { params });

      expect(response.status).toBe(200);
      expect(prisma.label.update).toHaveBeenCalledWith({
        where: { id: 'label-1' },
        data: {
          name: 'Critical Bug',
        },
      });
    });

    it('should not check for duplicate if name is unchanged', async () => {
      const updatedLabel = {
        ...mockLabel,
        color: '#00ff00',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(mockLabel as any);
      vi.mocked(prisma.label.update).mockResolvedValue(updatedLabel as any);

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Bug', color: '#00ff00' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await updateLabel(request, { params });

      expect(response.status).toBe(200);
      expect(prisma.label.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Critical Bug', color: '#ff0000' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await updateLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update label');
      expect(console.error).toHaveBeenCalledWith('Error updating label:', expect.any(Error));
    });
  });

  describe('DELETE /api/boards/[boardId]/labels/[labelId]', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await deleteLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await deleteLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await deleteLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
    });

    it('should return 403 if user is not owner or member', async () => {
      const unauthorizedBoard = {
        ...mockBoard,
        userId: 'other-user',
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(unauthorizedBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await deleteLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 404 if label not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await deleteLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Label not found');
    });

    it('should return 404 if label does not belong to board', async () => {
      const wrongBoardLabel = {
        ...mockLabel,
        boardId: 'other-board',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(wrongBoardLabel as any);

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await deleteLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Label not found');
    });

    it('should delete label successfully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(mockLabel as any);
      vi.mocked(prisma.label.delete).mockResolvedValue(mockLabel as any);

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await deleteLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Label deleted successfully');
      expect(prisma.label.delete).toHaveBeenCalledWith({
        where: { id: 'label-1' },
      });
    });

    it('should handle database errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/labels/label-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', labelId: 'label-1' });
      const response = await deleteLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete label');
      expect(console.error).toHaveBeenCalledWith('Error deleting label:', expect.any(Error));
    });
  });

  describe('GET /api/boards/[boardId]/cards/[cardId]/labels', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels');
      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await getCardLabels(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels');
      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await getCardLabels(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels');
      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await getCardLabels(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
    });

    it('should return 403 if user is not owner or member', async () => {
      const unauthorizedBoard = {
        ...mockBoard,
        userId: 'other-user',
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(unauthorizedBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels');
      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await getCardLabels(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return all labels for a card', async () => {
      const mockCardLabels = [
        {
          cardId: 'card-1',
          labelId: 'label-1',
          label: { id: 'label-1', name: 'Bug', color: '#ff0000', boardId: 'board-1' },
        },
        {
          cardId: 'card-1',
          labelId: 'label-2',
          label: { id: 'label-2', name: 'Feature', color: '#00ff00', boardId: 'board-1' },
        },
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.cardLabel.findMany).mockResolvedValue(mockCardLabels as any);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels');
      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await getCardLabels(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe('Bug');
      expect(data[1].name).toBe('Feature');
      expect(prisma.cardLabel.findMany).toHaveBeenCalledWith({
        where: { cardId: 'card-1' },
        include: {
          label: true,
        },
      });
    });

    it('should return empty array if card has no labels', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.cardLabel.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels');
      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await getCardLabels(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.cardLabel.findMany).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels');
      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await getCardLabels(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch card labels');
      expect(console.error).toHaveBeenCalledWith('Error fetching card labels:', expect.any(Error));
    });
  });

  describe('POST /api/boards/[boardId]/cards/[cardId]/labels', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels', {
        method: 'POST',
        body: JSON.stringify({ labelId: 'label-1' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await addCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels', {
        method: 'POST',
        body: JSON.stringify({ labelId: 'label-1' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await addCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 400 if labelId is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await addCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Label ID is required');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels', {
        method: 'POST',
        body: JSON.stringify({ labelId: 'label-1' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await addCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
    });

    it('should return 403 if user is not owner or member', async () => {
      const unauthorizedBoard = {
        ...mockBoard,
        userId: 'other-user',
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(unauthorizedBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels', {
        method: 'POST',
        body: JSON.stringify({ labelId: 'label-1' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await addCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 404 if label not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels', {
        method: 'POST',
        body: JSON.stringify({ labelId: 'label-1' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await addCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Label not found');
    });

    it('should return 404 if label does not belong to board', async () => {
      const wrongBoardLabel = {
        ...mockLabel,
        boardId: 'other-board',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(wrongBoardLabel as any);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels', {
        method: 'POST',
        body: JSON.stringify({ labelId: 'label-1' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await addCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Label not found');
    });

    it('should return 404 if card not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(mockLabel as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels', {
        method: 'POST',
        body: JSON.stringify({ labelId: 'label-1' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await addCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Card not found');
    });

    it('should return 404 if card does not belong to board', async () => {
      const wrongBoardCard = {
        ...mockCard,
        list: {
          id: 'list-1',
          boardId: 'other-board',
        },
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(mockLabel as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(wrongBoardCard as any);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels', {
        method: 'POST',
        body: JSON.stringify({ labelId: 'label-1' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await addCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Card not found');
    });

    it('should return 400 if label is already on card', async () => {
      const existingCardLabel = {
        cardId: 'card-1',
        labelId: 'label-1',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(mockLabel as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.cardLabel.findUnique).mockResolvedValue(existingCardLabel as any);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels', {
        method: 'POST',
        body: JSON.stringify({ labelId: 'label-1' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await addCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Label is already on this card');
    });

    it('should add label to card successfully', async () => {
      const createdCardLabel = {
        cardId: 'card-1',
        labelId: 'label-1',
        label: mockLabel,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(mockLabel as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.cardLabel.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.cardLabel.create).mockResolvedValue(createdCardLabel as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels', {
        method: 'POST',
        body: JSON.stringify({ labelId: 'label-1' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await addCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('Bug');
      expect(data.color).toBe('#ff0000');
      expect(prisma.cardLabel.create).toHaveBeenCalledWith({
        data: {
          cardId: 'card-1',
          labelId: 'label-1',
        },
        include: {
          label: true,
        },
      });
      expect(logActivity).toHaveBeenCalledWith({
        type: 'label_added',
        description: 'Test User a ajouté le label "Bug" à la carte "Test Card"',
        userId: 'user-1',
        boardId: 'board-1',
        cardId: 'card-1',
        metadata: {
          labelName: 'Bug',
          labelColor: '#ff0000',
          cardTitle: 'Test Card',
        },
      });
    });

    it('should handle database errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(mockLabel as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.cardLabel.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.cardLabel.create).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels', {
        method: 'POST',
        body: JSON.stringify({ labelId: 'label-1' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await addCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to add label to card');
      expect(console.error).toHaveBeenCalledWith('Error adding label to card:', expect.any(Error));
    });
  });

  describe('DELETE /api/boards/[boardId]/cards/[cardId]/labels', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels?labelId=label-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await removeCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels?labelId=label-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await removeCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 400 if labelId is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await removeCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Label ID is required');
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels?labelId=label-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await removeCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
    });

    it('should return 403 if user is not owner or member', async () => {
      const unauthorizedBoard = {
        ...mockBoard,
        userId: 'other-user',
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(unauthorizedBoard as any);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels?labelId=label-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await removeCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should remove label from card successfully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(mockLabel as any);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(mockCard as any);
      vi.mocked(prisma.cardLabel.delete).mockResolvedValue({} as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels?labelId=label-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await removeCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Label removed from card successfully');
      expect(prisma.cardLabel.delete).toHaveBeenCalledWith({
        where: {
          cardId_labelId: {
            cardId: 'card-1',
            labelId: 'label-1',
          },
        },
      });
      expect(logActivity).toHaveBeenCalledWith({
        type: 'label_removed',
        description: 'Test User a retiré le label "Bug" de la carte "Test Card"',
        userId: 'user-1',
        boardId: 'board-1',
        cardId: 'card-1',
        metadata: {
          labelName: 'Bug',
          labelColor: '#ff0000',
          cardTitle: 'Test Card',
        },
      });
    });

    it('should remove label even if label or card data is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.card.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.cardLabel.delete).mockResolvedValue({} as any);
      vi.mocked(logActivity).mockResolvedValue(undefined);

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels?labelId=label-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await removeCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Label removed from card successfully');
      expect(logActivity).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.label.findUnique).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/cards/card-1/labels?labelId=label-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', cardId: 'card-1' });
      const response = await removeCardLabel(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to remove label from card');
      expect(console.error).toHaveBeenCalledWith('Error removing label from card:', expect.any(Error));
    });
  });
});
