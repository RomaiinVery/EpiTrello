import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logActivity } from '@/app/lib/activity-logger';
import { prisma } from '@/app/lib/prisma';

vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    activity: {
      create: vi.fn(),
    },
  },
}));

describe('Activity Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log activity with all required fields', async () => {
    const mockActivity = {
      id: 'activity-1',
      type: 'card_created',
      description: 'User created a card',
      userId: 'user-1',
      boardId: 'board-1',
      cardId: null,
      metadata: null,
      createdAt: new Date(),
    };

    vi.mocked(prisma.activity.create).mockResolvedValue(mockActivity as any);

    await logActivity({
      type: 'card_created',
      description: 'User created a card',
      userId: 'user-1',
      boardId: 'board-1',
    });

    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: {
        type: 'card_created',
        description: 'User created a card',
        userId: 'user-1',
        boardId: 'board-1',
        cardId: null,
        metadata: null,
      },
    });
  });

  it('should log activity with optional fields and serialize metadata', async () => {
    const mockActivity = {
      id: 'activity-2',
      type: 'card_updated',
      description: 'User updated a card',
      userId: 'user-1',
      boardId: 'board-1',
      cardId: 'card-1',
      metadata: '{"field":"title","oldValue":"Old","newValue":"New"}',
      createdAt: new Date(),
    };

    vi.mocked(prisma.activity.create).mockResolvedValue(mockActivity as any);

    await logActivity({
      type: 'card_updated',
      description: 'User updated a card',
      userId: 'user-1',
      boardId: 'board-1',
      cardId: 'card-1',
      metadata: { field: 'title', oldValue: 'Old', newValue: 'New' },
    });

    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: {
        type: 'card_updated',
        description: 'User updated a card',
        userId: 'user-1',
        boardId: 'board-1',
        cardId: 'card-1',
        metadata: '{"field":"title","oldValue":"Old","newValue":"New"}',
      },
    });
  });

  it('should handle errors gracefully without throwing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(prisma.activity.create).mockRejectedValue(new Error('Database error'));

    // Should not throw, just log
    await logActivity({
      type: 'card_created',
      description: 'User created a card',
      userId: 'user-1',
      boardId: 'board-1',
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to log activity:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
