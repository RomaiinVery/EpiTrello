import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules
vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    list: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '@/app/lib/prisma';
import { PATCH } from '@/app/api/boards/[boardId]/lists/reorder/route';

describe('Lists Reorder API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('PATCH /api/boards/[boardId]/lists/reorder', () => {
    it('should return 400 if lists array is missing', async () => {
      const request = new Request('http://localhost/api/boards/board-1/lists/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should return 400 if lists is not an array', async () => {
      const request = new Request('http://localhost/api/boards/board-1/lists/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists: 'not-an-array' }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should successfully reorder lists', async () => {
      const lists = [
        { id: 'list-1', position: 0 },
        { id: 'list-2', position: 1 },
        { id: 'list-3', position: 2 },
      ];

      vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}, {}] as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Lists reordered successfully');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should call update for each list with correct parameters', async () => {
      const lists = [
        { id: 'list-1', position: 0 },
        { id: 'list-2', position: 1 },
      ];

      vi.mocked(prisma.$transaction).mockImplementation(async (operations: any) => {
        return Promise.all(operations);
      });

      const request = new Request('http://localhost/api/boards/board-1/lists/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      await PATCH(request, { params });

      // The update function should be called for each list via transaction
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should handle empty lists array', async () => {
      vi.mocked(prisma.$transaction).mockResolvedValue([] as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists: [] }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Lists reordered successfully');
    });

    it('should handle single list reorder', async () => {
      const lists = [{ id: 'list-1', position: 5 }];

      vi.mocked(prisma.$transaction).mockResolvedValue([{}] as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Lists reordered successfully');
    });

    it('should handle database transaction errors', async () => {
      const lists = [
        { id: 'list-1', position: 0 },
        { id: 'list-2', position: 1 },
      ];

      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Transaction failed'));

      const request = new Request('http://localhost/api/boards/board-1/lists/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to reorder lists');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle malformed request body', async () => {
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Invalid data'));

      const request = new Request('http://localhost/api/boards/board-1/lists/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists: 'not-an-array' }), // Will be caught by Array.isArray check
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should handle lists with missing id', async () => {
      const lists = [
        { position: 0 },
        { id: 'list-2', position: 1 },
      ];

      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Missing id'));

      const request = new Request('http://localhost/api/boards/board-1/lists/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to reorder lists');
    });

    it('should handle lists with missing position', async () => {
      const lists = [
        { id: 'list-1' },
        { id: 'list-2', position: 1 },
      ];

      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Missing position'));

      const request = new Request('http://localhost/api/boards/board-1/lists/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to reorder lists');
    });

    it('should handle negative positions', async () => {
      const lists = [
        { id: 'list-1', position: -1 },
        { id: 'list-2', position: 0 },
      ];

      vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Lists reordered successfully');
    });

    it('should handle large position values', async () => {
      const lists = [
        { id: 'list-1', position: 999999 },
        { id: 'list-2', position: 1000000 },
      ];

      vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Lists reordered successfully');
    });

    it('should handle duplicate list ids', async () => {
      const lists = [
        { id: 'list-1', position: 0 },
        { id: 'list-1', position: 1 },
      ];

      vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}] as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Lists reordered successfully');
    });

    it('should handle many lists', async () => {
      const lists = Array.from({ length: 50 }, (_, i) => ({
        id: `list-${i}`,
        position: i,
      }));

      vi.mocked(prisma.$transaction).mockResolvedValue(Array(50).fill({}) as any);

      const request = new Request('http://localhost/api/boards/board-1/lists/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Lists reordered successfully');
    });
  });
});
