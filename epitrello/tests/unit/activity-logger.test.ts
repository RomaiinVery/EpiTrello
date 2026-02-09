import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logActivity, ActivityType } from '@/app/lib/activity-logger';
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.activity.create).mockResolvedValue(mockActivity as unknown as any);

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
    const activityDataForOptionalFields = {
      type: 'card_updated' as ActivityType,
      description: 'User updated a card',
      userId: 'user-1',
      boardId: 'board-1',
      cardId: 'card-1',
      metadata: { field: 'title', oldValue: 'Old', newValue: 'New' },
    };

    const mockActivity = {
      id: 'activity-2',
      ...activityDataForOptionalFields,
      metadata: JSON.stringify(activityDataForOptionalFields.metadata),
      createdAt: new Date(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.activity.create).mockResolvedValue(mockActivity as unknown as any);

    await logActivity(activityDataForOptionalFields);

    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: {
        ...activityDataForOptionalFields,
        metadata: JSON.stringify(activityDataForOptionalFields.metadata),
      },
    });
  });

  it('should handle errors gracefully', async () => {
    const activityDataForError = {
      type: 'card_moved' as ActivityType, // Fixed case to match allowed types
      description: 'Card moved to Done',
      boardId: 'board-1',
      userId: 'user-1',
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    (prisma.activity.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Database error'));

    // Should not throw, just log
    await logActivity(activityDataForError);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to log activity:',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});
