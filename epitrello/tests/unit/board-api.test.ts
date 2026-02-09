import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchBoard, fetchLists, fetchCards } from '@/app/lib/board-api';

// Mock the prisma module
vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    board: {
      findUnique: vi.fn(),
    },
    list: {
      findMany: vi.fn(),
    },
    card: {
      findMany: vi.fn(),
    },
  },
}));

// Import prisma after mocking
import { prisma } from '@/app/lib/prisma';

describe('board-api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchBoard', () => {
    it('should fetch a board successfully', async () => {
      const mockBoard = {
        id: 'board-1',
        title: 'Test Board',
        description: 'Test Description',
        workspaceId: 'workspace-1',
        labels: [],
        members: [],
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          profileImage: null,
        },
      };

      vi.mocked(prisma.board.findUnique).mockResolvedValue(mockBoard as any);

      const result = await fetchBoard('board-1');

      expect(result).toEqual(mockBoard);
      expect(prisma.board.findUnique).toHaveBeenCalledWith({
        where: { id: 'board-1' },
        include: {
          labels: true,
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  profileImage: true,
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              profileImage: true,
            }
          }
        }
      });
    });

    it('should return null when board is not found', async () => {
      vi.mocked(prisma.board.findUnique).mockResolvedValue(null);

      const result = await fetchBoard('non-existent');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(prisma.board.findUnique).mockRejectedValue(new Error('Database error'));

      const result = await fetchBoard('board-1');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Erreur fetchBoard:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('fetchLists', () => {
    it('should fetch lists successfully', async () => {
      const mockLists = [
        { id: 'list-1', title: 'To Do', position: 0 },
        { id: 'list-2', title: 'In Progress', position: 1 },
        { id: 'list-3', title: 'Done', position: 2 },
      ];

      vi.mocked(prisma.list.findMany).mockResolvedValue(mockLists as any);

      const result = await fetchLists('board-1');

      expect(result).toEqual(mockLists);
      expect(prisma.list.findMany).toHaveBeenCalledWith({
        where: { boardId: 'board-1' },
        orderBy: { position: 'asc' },
      });
    });

    it('should return empty array when no lists found', async () => {
      vi.mocked(prisma.list.findMany).mockResolvedValue([]);

      const result = await fetchLists('board-1');

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(prisma.list.findMany).mockRejectedValue(new Error('Database error'));

      const result = await fetchLists('board-1');

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Erreur fetchLists:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('fetchCards', () => {
    it('should fetch and format cards successfully', async () => {
      const mockCards = [
        {
          id: 'card-1',
          title: 'Test Card',
          content: 'Test content',
          listId: 'list-1',
          position: 0,
          labels: [
            {
              label: {
                id: 'label-1',
                name: 'Bug',
                color: '#ff0000',
                boardId: 'board-1',
              },
            },
          ],
          members: [
            {
              user: {
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
                profileImage: null,
              },
            },
          ],
          checklists: [
            {
              id: 'checklist-1',
              title: 'Tasks',
              position: 0,
              cardId: 'card-1',
              items: [
                {
                  id: 'item-1',
                  text: 'Task 1',
                  checked: false,
                  position: 0,
                  checklistId: 'checklist-1',
                },
              ],
            },
          ],
        },
      ];

      vi.mocked(prisma.card.findMany).mockResolvedValue(mockCards as any);

      const result = await fetchCards('board-1', 'list-1');

      expect(result).toHaveLength(1);
      expect(result[0].labels).toEqual([mockCards[0].labels[0].label]);
      expect(result[0].members).toEqual([mockCards[0].members[0].user]);
      expect(result[0].checklists).toEqual(mockCards[0].checklists);
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
                  profileImage: true,
                },
              },
            },
          },
          checklists: {
            include: {
              items: {
                orderBy: { position: 'asc' },
              },
            },
            orderBy: { position: 'asc' },
          },
        },
      });
    });

    it('should return empty array when no cards found', async () => {
      vi.mocked(prisma.card.findMany).mockResolvedValue([]);

      const result = await fetchCards('board-1', 'list-1');

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(prisma.card.findMany).mockRejectedValue(new Error('Database error'));

      const result = await fetchCards('board-1', 'list-1');

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Erreur fetchCards:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should handle cards without checklists', async () => {
      const mockCards = [
        {
          id: 'card-1',
          title: 'Test Card',
          listId: 'list-1',
          position: 0,
          labels: [],
          members: [],
          checklists: null,
        },
      ];

      vi.mocked(prisma.card.findMany).mockResolvedValue(mockCards as any);

      const result = await fetchCards('board-1', 'list-1');

      expect(result[0].checklists).toEqual([]);
    });
  });
});
