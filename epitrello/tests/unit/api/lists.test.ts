/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules
vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    board: {
      findUnique: vi.fn(),
    },
    list: {
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
import { GET as getLists, POST as createList } from '@/app/api/boards/[boardId]/lists/route';
import { GET as getList, PUT as updateList, DELETE as deleteList, PATCH as patchList } from '@/app/api/boards/[boardId]/lists/[listId]/route';

describe('Lists API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('GET /api/boards/[boardId]/lists', () => {
    it('should return 404 if board not found', async () => {
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await getLists(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
      expect(prisma.board.findUnique).toHaveBeenCalledWith({
        where: { id: 'board-1' },
      });
    });

    it('should return all lists for a board', async () => {
      const mockBoard = {
        id: 'board-1',
        title: 'Test Board',
        userId: 'user-1',
      };

      const mockLists = [
        {
          id: 'list-1',
          title: 'To Do',
          position: 0,
          boardId: 'board-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'list-2',
          title: 'Doing',
          position: 1,
          boardId: 'board-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'list-3',
          title: 'Done',
          position: 2,
          boardId: 'board-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.list.findMany).mockResolvedValue(mockLists as any);

      const request = new Request('http://localhost/api/boards/board-1/lists');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await getLists(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(3);
      expect(data[0].title).toBe('To Do');
      expect(data[1].title).toBe('Doing');
      expect(data[2].title).toBe('Done');
      expect(prisma.list.findMany).toHaveBeenCalledWith({
        where: { boardId: 'board-1' },
      });
    });

    it('should return empty array if no lists found', async () => {
      const mockBoard = {
        id: 'board-1',
        title: 'Test Board',
        userId: 'user-1',
      };

      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.list.findMany).mockResolvedValue([]);

      const request = new Request('http://localhost/api/boards/board-1/lists');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await getLists(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(0);
    });
  });

  describe('POST /api/boards/[boardId]/lists', () => {
    it('should return 400 if title is missing', async () => {
      const request = new Request('http://localhost/api/boards/board-1/lists', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await createList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing or invalid 'title'");
    });

    it('should return 400 if title is not a string', async () => {
      const request = new Request('http://localhost/api/boards/board-1/lists', {
        method: 'POST',
        body: JSON.stringify({ title: 123 }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await createList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing or invalid 'title'");
    });

    it('should return 400 if title is empty string', async () => {
      const request = new Request('http://localhost/api/boards/board-1/lists', {
        method: 'POST',
        body: JSON.stringify({ title: '' }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await createList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing or invalid 'title'");
    });

    it('should return 404 if board not found', async () => {
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists', {
        method: 'POST',
        body: JSON.stringify({ title: 'New List' }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await createList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Board not found');
      expect(prisma.board.findUnique).toHaveBeenCalledWith({
        where: { id: 'board-1' },
      });
    });

    it('should create list successfully with default position', async () => {
      const mockBoard = {
        id: 'board-1',
        title: 'Test Board',
        userId: 'user-1',
      };

      const mockList = {
        id: 'list-1',
        title: 'New List',
        position: 0,
        boardId: 'board-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.list.create).mockResolvedValue(mockList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists', {
        method: 'POST',
        body: JSON.stringify({ title: 'New List' }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await createList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe('New List');
      expect(data.position).toBe(0);
      expect(prisma.list.create).toHaveBeenCalledWith({
        data: {
          title: 'New List',
          position: 0,
          board: { connect: { id: 'board-1' } },
        },
      });
    });

    it('should create list successfully with custom position', async () => {
      const mockBoard = {
        id: 'board-1',
        title: 'Test Board',
        userId: 'user-1',
      };

      const mockList = {
        id: 'list-1',
        title: 'New List',
        position: 5,
        boardId: 'board-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.list.create).mockResolvedValue(mockList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists', {
        method: 'POST',
        body: JSON.stringify({ title: 'New List', position: 5 }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await createList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe('New List');
      expect(data.position).toBe(5);
      expect(prisma.list.create).toHaveBeenCalledWith({
        data: {
          title: 'New List',
          position: 5,
          board: { connect: { id: 'board-1' } },
        },
      });
    });

    it('should create list with position 0 when position is 0', async () => {
      const mockBoard = {
        id: 'board-1',
        title: 'Test Board',
        userId: 'user-1',
      };

      const mockList = {
        id: 'list-1',
        title: 'New List',
        position: 0,
        boardId: 'board-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);
      vi.mocked(prisma.list.create).mockResolvedValue(mockList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists', {
        method: 'POST',
        body: JSON.stringify({ title: 'New List', position: 0 }),
      });

      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await createList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.position).toBe(0);
      expect(prisma.list.create).toHaveBeenCalledWith({
        data: {
          title: 'New List',
          position: 0,
          board: { connect: { id: 'board-1' } },
        },
      });
    });
  });

  describe('GET /api/boards/[boardId]/lists/[listId]', () => {
    it('should return 404 if list not found', async () => {
      vi.mocked(prisma.list.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await getList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('List not found');
      expect(prisma.list.findUnique).toHaveBeenCalledWith({
        where: { id: 'list-1' },
      });
    });

    it('should return list successfully', async () => {
      const mockList = {
        id: 'list-1',
        title: 'To Do',
        position: 0,
        boardId: 'board-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.list.findUnique).mockResolvedValue(mockList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1');
      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await getList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('list-1');
      expect(data.title).toBe('To Do');
      expect(data.position).toBe(0);
    });
  });

  describe('PUT /api/boards/[boardId]/lists/[listId]', () => {
    it('should update list title only', async () => {
      const mockList = {
        id: 'list-1',
        title: 'Updated Title',
        position: 0,
        boardId: 'board-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.list.update).mockResolvedValue(mockList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Title' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await updateList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Title');
      expect(prisma.list.update).toHaveBeenCalledWith({
        where: { id: 'list-1' },
        data: {
          title: 'Updated Title',
        },
      });
    });

    it('should update list position only', async () => {
      const mockList = {
        id: 'list-1',
        title: 'To Do',
        position: 3,
        boardId: 'board-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.list.update).mockResolvedValue(mockList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1', {
        method: 'PUT',
        body: JSON.stringify({ position: 3 }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await updateList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.position).toBe(3);
      expect(prisma.list.update).toHaveBeenCalledWith({
        where: { id: 'list-1' },
        data: {
          position: 3,
        },
      });
    });

    it('should update both title and position', async () => {
      const mockList = {
        id: 'list-1',
        title: 'New Title',
        position: 2,
        boardId: 'board-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.list.update).mockResolvedValue(mockList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'New Title', position: 2 }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await updateList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('New Title');
      expect(data.position).toBe(2);
      expect(prisma.list.update).toHaveBeenCalledWith({
        where: { id: 'list-1' },
        data: {
          title: 'New Title',
          position: 2,
        },
      });
    });

    it('should update position to 0', async () => {
      const mockList = {
        id: 'list-1',
        title: 'To Do',
        position: 0,
        boardId: 'board-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.list.update).mockResolvedValue(mockList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1', {
        method: 'PUT',
        body: JSON.stringify({ position: 0 }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await updateList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.position).toBe(0);
      expect(prisma.list.update).toHaveBeenCalledWith({
        where: { id: 'list-1' },
        data: {
          position: 0,
        },
      });
    });

    it('should not update if no fields provided', async () => {
      const mockList = {
        id: 'list-1',
        title: 'To Do',
        position: 0,
        boardId: 'board-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.list.update).mockResolvedValue(mockList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1', {
        method: 'PUT',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await updateList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.list.update).toHaveBeenCalledWith({
        where: { id: 'list-1' },
        data: {},
      });
    });

    it('should ignore empty title', async () => {
      const mockList = {
        id: 'list-1',
        title: 'To Do',
        position: 0,
        boardId: 'board-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.list.update).mockResolvedValue(mockList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1', {
        method: 'PUT',
        body: JSON.stringify({ title: '' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await updateList(request, { params });

      expect(response.status).toBe(200);
      expect(prisma.list.update).toHaveBeenCalledWith({
        where: { id: 'list-1' },
        data: {},
      });
    });

    it('should handle Prisma error for non-existent list', async () => {
      vi.mocked(prisma.list.update).mockRejectedValue(new Error('Record not found'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-999', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Title' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-999' });

      await expect(updateList(request, { params })).rejects.toThrow('Record not found');
    });
  });

  describe('DELETE /api/boards/[boardId]/lists/[listId]', () => {
    it('should delete list successfully', async () => {
      const mockList = {
        id: 'list-1',
        title: 'To Do',
        position: 0,
        boardId: 'board-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.list.delete).mockResolvedValue(mockList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await deleteList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('List deleted');
      expect(data.list).toBeDefined();
      expect(data.list.id).toBe('list-1');
      expect(prisma.list.delete).toHaveBeenCalledWith({
        where: { id: 'list-1' },
      });
    });

    it('should return 404 if list not found', async () => {
      vi.mocked(prisma.list.delete).mockRejectedValue(new Error('Record not found'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-999', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-999' });
      const response = await deleteList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('List not found');
    });

    it('should handle other deletion errors', async () => {
      vi.mocked(prisma.list.delete).mockRejectedValue(new Error('Foreign key constraint'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await deleteList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('List not found');
    });
  });

  describe('PATCH /api/boards/[boardId]/lists/[listId]', () => {
    it('should return 400 if newPosition is missing', async () => {
      const request = new Request('http://localhost/api/boards/board-1/lists/list-1', {
        method: 'PATCH',
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await patchList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid position');
    });

    it('should return 400 if newPosition is not a number', async () => {
      const request = new Request('http://localhost/api/boards/board-1/lists/list-1', {
        method: 'PATCH',
        body: JSON.stringify({ newPosition: 'invalid' }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await patchList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid position');
    });

    it('should return 400 if newPosition is null', async () => {
      const request = new Request('http://localhost/api/boards/board-1/lists/list-1', {
        method: 'PATCH',
        body: JSON.stringify({ newPosition: null }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await patchList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid position');
    });

    it('should update list position successfully', async () => {
      const mockList = {
        id: 'list-1',
        title: 'To Do',
        position: 3,
        boardId: 'board-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.list.update).mockResolvedValue(mockList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1', {
        method: 'PATCH',
        body: JSON.stringify({ newPosition: 3 }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await patchList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.position).toBe(3);
      expect(prisma.list.update).toHaveBeenCalledWith({
        where: { id: 'list-1' },
        data: { position: 3 },
      });
    });

    it('should update position to 0', async () => {
      const mockList = {
        id: 'list-1',
        title: 'To Do',
        position: 0,
        boardId: 'board-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.list.update).mockResolvedValue(mockList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1', {
        method: 'PATCH',
        body: JSON.stringify({ newPosition: 0 }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await patchList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.position).toBe(0);
      expect(prisma.list.update).toHaveBeenCalledWith({
        where: { id: 'list-1' },
        data: { position: 0 },
      });
    });

    it('should handle negative position', async () => {
      const mockList = {
        id: 'list-1',
        title: 'To Do',
        position: -1,
        boardId: 'board-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.list.update).mockResolvedValue(mockList as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/list-1', {
        method: 'PATCH',
        body: JSON.stringify({ newPosition: -1 }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-1' });
      const response = await patchList(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.position).toBe(-1);
    });

    it('should handle Prisma error for non-existent list', async () => {
      vi.mocked(prisma.list.update).mockRejectedValue(new Error('Record not found'));

      const request = new Request('http://localhost/api/boards/board-1/lists/list-999', {
        method: 'PATCH',
        body: JSON.stringify({ newPosition: 3 }),
      });

      const params = Promise.resolve({ boardId: 'board-1', listId: 'list-999' });

      await expect(patchList(request, { params })).rejects.toThrow('Record not found');
    });
  });
});
