import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules
vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    automationRule: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    automationLog: {
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
import { GET, POST } from '@/app/api/boards/[boardId]/automations/route';
import { DELETE, PUT } from '@/app/api/boards/[boardId]/automations/[ruleId]/route';
import { GET as GET_LOGS } from '@/app/api/boards/[boardId]/automations/logs/route';

describe('Automations API Routes', () => {
  const mockSession = {
    user: {
      email: 'test@example.com',
    },
  };

  const mockRule = {
    id: 'rule-1',
    boardId: 'board-1',
    triggerType: 'CARD_MOVED_TO_LIST',
    triggerVal: 'list-1',
    isActive: true,
    createdAt: new Date(),
    actions: [
      {
        id: 'action-1',
        type: 'ARCHIVE_CARD',
        value: null,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('GET /api/boards/[boardId]/automations', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/automations');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const request = new Request('http://localhost/api/boards/board-1/automations');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return all automation rules for a board', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.automationRule.findMany).mockResolvedValue([mockRule] as any);

      const request = new Request('http://localhost/api/boards/board-1/automations');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('rule-1');
      expect(prisma.automationRule.findMany).toHaveBeenCalledWith({
        where: { boardId: 'board-1' },
        include: { actions: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle errors and return 500', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.automationRule.findMany).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/automations');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch rules');
    });
  });

  describe('POST /api/boards/[boardId]/automations', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/automations', {
        method: 'POST',
        body: JSON.stringify({
          triggerType: 'CARD_MOVED_TO_LIST',
          triggerVal: 'list-1',
          actions: [{ type: 'ARCHIVE_CARD' }],
        }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should create a new automation rule', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.automationRule.create).mockResolvedValue(mockRule as any);

      const request = new Request('http://localhost/api/boards/board-1/automations', {
        method: 'POST',
        body: JSON.stringify({
          triggerType: 'CARD_MOVED_TO_LIST',
          triggerVal: 'list-1',
          actions: [{ type: 'ARCHIVE_CARD', value: null }],
        }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('rule-1');
      expect(prisma.automationRule.create).toHaveBeenCalledWith({
        data: {
          boardId: 'board-1',
          triggerType: 'CARD_MOVED_TO_LIST',
          triggerVal: 'list-1',
          actions: {
            create: [{ type: 'ARCHIVE_CARD', value: null }],
          },
        },
        include: { actions: true },
      });
    });

    it('should handle errors and return 500', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.automationRule.create).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/automations', {
        method: 'POST',
        body: JSON.stringify({
          triggerType: 'CARD_MOVED_TO_LIST',
          triggerVal: 'list-1',
          actions: [],
        }),
      });
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create rule');
    });
  });

  describe('DELETE /api/boards/[boardId]/automations/[ruleId]', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/automations/rule-1', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ boardId: 'board-1', ruleId: 'rule-1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should delete an automation rule', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.automationRule.delete).mockResolvedValue(mockRule as any);

      const request = new Request('http://localhost/api/boards/board-1/automations/rule-1', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ boardId: 'board-1', ruleId: 'rule-1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.automationRule.delete).toHaveBeenCalledWith({
        where: {
          id: 'rule-1',
          boardId: 'board-1',
        },
      });
    });

    it('should handle errors and return 500', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.automationRule.delete).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/automations/rule-1', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ boardId: 'board-1', ruleId: 'rule-1' });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete rule');
    });
  });

  describe('PUT /api/boards/[boardId]/automations/[ruleId]', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/automations/rule-1', {
        method: 'PUT',
        body: JSON.stringify({
          triggerType: 'CARD_MOVED_TO_LIST',
          triggerVal: 'list-2',
          actions: [{ type: 'MARK_AS_DONE' }],
          isActive: false,
        }),
      });
      const params = Promise.resolve({ boardId: 'board-1', ruleId: 'rule-1' });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should update an automation rule', async () => {
      const updatedRule = {
        ...mockRule,
        triggerVal: 'list-2',
        isActive: false,
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.automationRule.update).mockResolvedValue(updatedRule as any);

      const request = new Request('http://localhost/api/boards/board-1/automations/rule-1', {
        method: 'PUT',
        body: JSON.stringify({
          triggerType: 'CARD_MOVED_TO_LIST',
          triggerVal: 'list-2',
          actions: [{ type: 'MARK_AS_DONE', value: null }],
          isActive: false,
        }),
      });
      const params = Promise.resolve({ boardId: 'board-1', ruleId: 'rule-1' });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.triggerVal).toBe('list-2');
      expect(data.isActive).toBe(false);
      expect(prisma.automationRule.update).toHaveBeenCalledWith({
        where: {
          id: 'rule-1',
          boardId: 'board-1',
        },
        data: {
          triggerType: 'CARD_MOVED_TO_LIST',
          triggerVal: 'list-2',
          isActive: false,
          actions: {
            deleteMany: {},
            create: [{ type: 'MARK_AS_DONE', value: null }],
          },
        },
        include: { actions: true },
      });
    });

    it('should handle errors and return 500', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.automationRule.update).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/automations/rule-1', {
        method: 'PUT',
        body: JSON.stringify({
          triggerType: 'CARD_MOVED_TO_LIST',
          triggerVal: 'list-2',
          actions: [],
          isActive: true,
        }),
      });
      const params = Promise.resolve({ boardId: 'board-1', ruleId: 'rule-1' });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update rule');
    });
  });

  describe('GET /api/boards/[boardId]/automations/logs', () => {
    const mockLogs = [
      {
        id: 'log-1',
        ruleId: 'rule-1',
        status: 'SUCCESS',
        message: 'Card archived successfully',
        createdAt: new Date(),
        rule: mockRule,
      },
      {
        id: 'log-2',
        ruleId: 'rule-1',
        status: 'FAILURE',
        message: 'Failed to archive card',
        createdAt: new Date(),
        rule: mockRule,
      },
    ];

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/boards/board-1/automations/logs');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET_LOGS(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return automation logs for a board', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.automationLog.findMany).mockResolvedValue(mockLogs as any);

      const request = new Request('http://localhost/api/boards/board-1/automations/logs');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET_LOGS(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].status).toBe('SUCCESS');
      expect(data[1].status).toBe('FAILURE');
    });

    it('should handle errors and return 500', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.automationLog.findMany).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/boards/board-1/automations/logs');
      const params = Promise.resolve({ boardId: 'board-1' });
      const response = await GET_LOGS(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch logs');
    });
  });
});
