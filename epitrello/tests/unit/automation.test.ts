/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutomationService, TriggerType, ActionType } from '@/app/lib/automation';

// Mock the prisma module
vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    automationRule: {
      findMany: vi.fn(),
    },
    card: {
      update: vi.fn(),
    },
    cardLabel: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    cardMember: {
      create: vi.fn(),
    },
    automationLog: {
      create: vi.fn(),
    },
  },
}));

import { prisma } from '@/app/lib/prisma';

describe('AutomationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('TriggerType enum', () => {
    it('should have correct trigger types', () => {
      expect(TriggerType.CARD_MOVED_TO_LIST).toBe('CARD_MOVED_TO_LIST');
      expect(TriggerType.CARD_CREATED).toBe('CARD_CREATED');
    });
  });

  describe('ActionType enum', () => {
    it('should have correct action types', () => {
      expect(ActionType.ARCHIVE_CARD).toBe('ARCHIVE_CARD');
      expect(ActionType.MARK_AS_DONE).toBe('MARK_AS_DONE');
      expect(ActionType.ADD_LABEL).toBe('ADD_LABEL');
      expect(ActionType.MOVE_CARD).toBe('MOVE_CARD');
      expect(ActionType.ASSIGN_MEMBER).toBe('ASSIGN_MEMBER');
      expect(ActionType.SET_DUE_DATE).toBe('SET_DUE_DATE');
      expect(ActionType.REMOVE_LABEL).toBe('REMOVE_LABEL');
    });
  });

  describe('processTrigger', () => {
    it('should process matching rules', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          triggerVal: 'list-1',
          actions: [
            { type: ActionType.ARCHIVE_CARD },
          ],
        },
      ];

      vi.mocked(prisma.automationRule.findMany).mockResolvedValue(mockRules as any);
      vi.mocked(prisma.card.update).mockResolvedValue({} as any);
      vi.mocked(prisma.automationLog.create).mockResolvedValue({} as any);

      await AutomationService.processTrigger(
        'board-1',
        TriggerType.CARD_MOVED_TO_LIST,
        'list-1',
        { cardId: 'card-1' }
      );

      expect(prisma.automationRule.findMany).toHaveBeenCalledWith({
        where: {
          boardId: 'board-1',
          triggerType: TriggerType.CARD_MOVED_TO_LIST,
          isActive: true,
        },
        include: { actions: true },
      });

      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { archived: true },
      });
    });

    it('should skip rules with non-matching trigger values', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          triggerVal: 'list-2',
          actions: [{ type: ActionType.ARCHIVE_CARD }],
        },
      ];

      vi.mocked(prisma.automationRule.findMany).mockResolvedValue(mockRules as any);

      await AutomationService.processTrigger(
        'board-1',
        TriggerType.CARD_MOVED_TO_LIST,
        'list-1',
        { cardId: 'card-1' }
      );

      expect(prisma.card.update).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.automationRule.findMany).mockRejectedValue(new Error('Database error'));

      await AutomationService.processTrigger(
        'board-1',
        TriggerType.CARD_MOVED_TO_LIST,
        'list-1',
        { cardId: 'card-1' }
      );

      expect(console.error).toHaveBeenCalledWith(
        '[Automation] Error processing trigger:',
        expect.any(Error)
      );
    });
  });

  describe('executeAction - ARCHIVE_CARD', () => {
    it('should archive a card', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          triggerVal: 'list-1',
          actions: [{ type: ActionType.ARCHIVE_CARD }],
        },
      ];

      vi.mocked(prisma.automationRule.findMany).mockResolvedValue(mockRules as any);
      vi.mocked(prisma.card.update).mockResolvedValue({} as any);
      vi.mocked(prisma.automationLog.create).mockResolvedValue({} as any);

      await AutomationService.processTrigger(
        'board-1',
        TriggerType.CARD_MOVED_TO_LIST,
        'list-1',
        { cardId: 'card-1' }
      );

      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { archived: true },
      });

      expect(prisma.automationLog.create).toHaveBeenCalledWith({
        data: {
          ruleId: 'rule-1',
          status: 'SUCCESS',
          message: 'Card card-1 archived.',
        },
      });
    });
  });

  describe('executeAction - MARK_AS_DONE', () => {
    it('should mark card as done', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          triggerVal: 'list-1',
          actions: [{ type: ActionType.MARK_AS_DONE }],
        },
      ];

      vi.mocked(prisma.automationRule.findMany).mockResolvedValue(mockRules as any);
      vi.mocked(prisma.card.update).mockResolvedValue({} as any);
      vi.mocked(prisma.automationLog.create).mockResolvedValue({} as any);

      await AutomationService.processTrigger(
        'board-1',
        TriggerType.CARD_MOVED_TO_LIST,
        'list-1',
        { cardId: 'card-1' }
      );

      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { isDone: true },
      });
    });
  });

  describe('executeAction - ADD_LABEL', () => {
    it('should add label to card', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          triggerVal: 'list-1',
          actions: [{ type: ActionType.ADD_LABEL, value: 'label-1' }],
        },
      ];

      vi.mocked(prisma.automationRule.findMany).mockResolvedValue(mockRules as any);
      vi.mocked(prisma.cardLabel.create).mockResolvedValue({} as any);
      vi.mocked(prisma.automationLog.create).mockResolvedValue({} as any);

      await AutomationService.processTrigger(
        'board-1',
        TriggerType.CARD_MOVED_TO_LIST,
        'list-1',
        { cardId: 'card-1' }
      );

      expect(prisma.cardLabel.create).toHaveBeenCalledWith({
        data: {
          cardId: 'card-1',
          labelId: 'label-1',
        },
      });
    });

    it('should handle duplicate label gracefully', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          triggerVal: 'list-1',
          actions: [{ type: ActionType.ADD_LABEL, value: 'label-1' }],
        },
      ];

      vi.mocked(prisma.automationRule.findMany).mockResolvedValue(mockRules as any);
      vi.mocked(prisma.cardLabel.create).mockRejectedValue(new Error('Duplicate'));
      vi.mocked(prisma.automationLog.create).mockResolvedValue({} as any);

      await AutomationService.processTrigger(
        'board-1',
        TriggerType.CARD_MOVED_TO_LIST,
        'list-1',
        { cardId: 'card-1' }
      );

      expect(prisma.automationLog.create).toHaveBeenCalledWith({
        data: {
          ruleId: 'rule-1',
          status: 'SUCCESS',
          message: 'Label label-1 added to card.',
        },
      });
    });
  });

  describe('executeAction - MOVE_CARD', () => {
    it('should move card to another list', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          triggerVal: 'list-1',
          actions: [{ type: ActionType.MOVE_CARD, value: 'list-2' }],
        },
      ];

      vi.mocked(prisma.automationRule.findMany).mockResolvedValue(mockRules as any);
      vi.mocked(prisma.card.update).mockResolvedValue({} as any);
      vi.mocked(prisma.automationLog.create).mockResolvedValue({} as any);

      await AutomationService.processTrigger(
        'board-1',
        TriggerType.CARD_MOVED_TO_LIST,
        'list-1',
        { cardId: 'card-1' }
      );

      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { listId: 'list-2' },
      });
    });
  });

  describe('executeAction - ASSIGN_MEMBER', () => {
    it('should assign member to card', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          triggerVal: 'list-1',
          actions: [{ type: ActionType.ASSIGN_MEMBER, value: 'user-1' }],
        },
      ];

      vi.mocked(prisma.automationRule.findMany).mockResolvedValue(mockRules as any);
      vi.mocked(prisma.cardMember.create).mockResolvedValue({} as any);
      vi.mocked(prisma.automationLog.create).mockResolvedValue({} as any);

      await AutomationService.processTrigger(
        'board-1',
        TriggerType.CARD_MOVED_TO_LIST,
        'list-1',
        { cardId: 'card-1' }
      );

      expect(prisma.cardMember.create).toHaveBeenCalledWith({
        data: { cardId: 'card-1', userId: 'user-1' },
      });
    });
  });

  describe('executeAction - SET_DUE_DATE', () => {
    it('should set due date to today', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          triggerVal: 'list-1',
          actions: [{ type: ActionType.SET_DUE_DATE, value: 'TODAY' }],
        },
      ];

      vi.mocked(prisma.automationRule.findMany).mockResolvedValue(mockRules as any);
      vi.mocked(prisma.card.update).mockResolvedValue({} as any);
      vi.mocked(prisma.automationLog.create).mockResolvedValue({} as any);

      await AutomationService.processTrigger(
        'board-1',
        TriggerType.CARD_MOVED_TO_LIST,
        'list-1',
        { cardId: 'card-1' }
      );

      expect(prisma.card.update).toHaveBeenCalledWith({
        where: { id: 'card-1' },
        data: { dueDate: expect.any(Date) },
      });
    });

    it('should set due date to tomorrow', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          triggerVal: 'list-1',
          actions: [{ type: ActionType.SET_DUE_DATE, value: 'TOMORROW' }],
        },
      ];

      vi.mocked(prisma.automationRule.findMany).mockResolvedValue(mockRules as any);
      vi.mocked(prisma.card.update).mockResolvedValue({} as any);
      vi.mocked(prisma.automationLog.create).mockResolvedValue({} as any);

      const beforeTest = new Date();
      beforeTest.setDate(beforeTest.getDate() + 1);

      await AutomationService.processTrigger(
        'board-1',
        TriggerType.CARD_MOVED_TO_LIST,
        'list-1',
        { cardId: 'card-1' }
      );

      expect(prisma.card.update).toHaveBeenCalled();
      const callArgs = vi.mocked(prisma.card.update).mock.calls[0][0];
      const dueDate = callArgs.data.dueDate as Date;
      expect(dueDate.getDate()).toBe(beforeTest.getDate());
    });

    it('should set custom due date', async () => {
      const customDate = new Date('2024-12-25');
      const mockRules = [
        {
          id: 'rule-1',
          triggerVal: 'list-1',
          actions: [{ type: ActionType.SET_DUE_DATE, value: customDate.toISOString() }],
        },
      ];

      vi.mocked(prisma.automationRule.findMany).mockResolvedValue(mockRules as any);
      vi.mocked(prisma.card.update).mockResolvedValue({} as any);
      vi.mocked(prisma.automationLog.create).mockResolvedValue({} as any);

      await AutomationService.processTrigger(
        'board-1',
        TriggerType.CARD_MOVED_TO_LIST,
        'list-1',
        { cardId: 'card-1' }
      );

      expect(prisma.card.update).toHaveBeenCalled();
    });
  });

  describe('executeAction - REMOVE_LABEL', () => {
    it('should remove label from card', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          triggerVal: 'list-1',
          actions: [{ type: ActionType.REMOVE_LABEL, value: 'label-1' }],
        },
      ];

      vi.mocked(prisma.automationRule.findMany).mockResolvedValue(mockRules as any);
      vi.mocked(prisma.cardLabel.deleteMany).mockResolvedValue({} as any);
      vi.mocked(prisma.automationLog.create).mockResolvedValue({} as any);

      await AutomationService.processTrigger(
        'board-1',
        TriggerType.CARD_MOVED_TO_LIST,
        'list-1',
        { cardId: 'card-1' }
      );

      expect(prisma.cardLabel.deleteMany).toHaveBeenCalledWith({
        where: { cardId: 'card-1', labelId: 'label-1' },
      });
    });
  });

  describe('executeAction - Unknown Action', () => {
    it('should log failure for unknown action type', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          triggerVal: 'list-1',
          actions: [{ type: 'UNKNOWN_ACTION' }],
        },
      ];

      vi.mocked(prisma.automationRule.findMany).mockResolvedValue(mockRules as any);
      vi.mocked(prisma.automationLog.create).mockResolvedValue({} as any);

      await AutomationService.processTrigger(
        'board-1',
        TriggerType.CARD_MOVED_TO_LIST,
        'list-1',
        { cardId: 'card-1' }
      );

      expect(prisma.automationLog.create).toHaveBeenCalledWith({
        data: {
          ruleId: 'rule-1',
          status: 'FAILURE',
          message: 'Unknown action type: UNKNOWN_ACTION',
        },
      });
    });
  });

  describe('executeAction - Error Handling', () => {
    it('should log failure when action throws error', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          triggerVal: 'list-1',
          actions: [{ type: ActionType.ADD_LABEL, value: null }],
        },
      ];

      vi.mocked(prisma.automationRule.findMany).mockResolvedValue(mockRules as any);
      vi.mocked(prisma.automationLog.create).mockResolvedValue({} as any);

      await AutomationService.processTrigger(
        'board-1',
        TriggerType.CARD_MOVED_TO_LIST,
        'list-1',
        { cardId: 'card-1' }
      );

      expect(prisma.automationLog.create).toHaveBeenCalledWith({
        data: {
          ruleId: 'rule-1',
          status: 'FAILURE',
          message: 'Missing label ID in value for ADD_LABEL.',
        },
      });
    });
  });
});
