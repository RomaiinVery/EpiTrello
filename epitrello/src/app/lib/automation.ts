import { prisma } from "@/app/lib/prisma";

export enum TriggerType {
    CARD_MOVED_TO_LIST = "CARD_MOVED_TO_LIST",
    CARD_CREATED = "CARD_CREATED",
}

export enum ActionType {
    ARCHIVE_CARD = "ARCHIVE_CARD",
    MARK_AS_DONE = "MARK_AS_DONE",
    ADD_LABEL = "ADD_LABEL",
    MOVE_CARD = "MOVE_CARD",
    ASSIGN_MEMBER = "ASSIGN_MEMBER",
    SET_DUE_DATE = "SET_DUE_DATE",
    REMOVE_LABEL = "REMOVE_LABEL",
}

export class AutomationService {
    static async processTrigger(
        boardId: string,
        triggerType: string,
        triggerVal: string,
        context: { cardId: string; }
    ) {
        console.log(`[Automation] Processing trigger: ${triggerType} on board ${boardId} with value ${triggerVal}`);

        try {
            // 1. Fetch active rules for this board matching the trigger
            const rules = await prisma.automationRule.findMany({
                where: {
                    boardId,
                    triggerType,
                    isActive: true,
                },
                include: { actions: true } // Fetch actions
            });

            console.log(`[Automation] Found ${rules.length} matching rules.`);

            for (const rule of rules) {
                // 2. Check value match
                if (rule.triggerVal === triggerVal) {
                    console.log(`[Automation] Rule ${rule.id} matches. Executing ${rule.actions.length} actions.`);

                    for (const action of rule.actions) {
                        await this.executeAction(rule.id, action, context);
                    }
                } else {
                    console.log(`[Automation] Rule ${rule.id} skipped. TriggerVal '${rule.triggerVal}' !== '${triggerVal}'`);
                }
            }
        } catch (error) {
            console.error("[Automation] Error processing trigger:", error);
        }
    }

    private static async executeAction(ruleId: string, action: any, context: { cardId: string }) {
        try {
            if (action.type === ActionType.ARCHIVE_CARD) {
                await prisma.card.update({
                    where: { id: context.cardId },
                    data: { archived: true },
                });

                await this.logExecution(ruleId, "SUCCESS", `Card ${context.cardId} archived.`);
            } else if (action.type === ActionType.MARK_AS_DONE) {
                await prisma.card.update({
                    where: { id: context.cardId },
                    data: { isDone: true },
                });
                await this.logExecution(ruleId, "SUCCESS", `Card ${context.cardId} marked as done.`);

            } else if (action.type === ActionType.ADD_LABEL) {
                if (!action.value) {
                    throw new Error("Missing label ID in value for ADD_LABEL.");
                }

                await prisma.cardLabel.create({
                    data: {
                        cardId: context.cardId,
                        labelId: action.value,
                    },
                }).catch(() => { /* Ignore duplicate */ });

                await this.logExecution(ruleId, "SUCCESS", `Label ${action.value} added to card.`);

            } else if (action.type === ActionType.MOVE_CARD) {
                if (!action.value) throw new Error("Missing List ID for MOVE_CARD");
                await prisma.card.update({
                    where: { id: context.cardId },
                    data: { listId: action.value }
                });
                await this.logExecution(ruleId, "SUCCESS", `Card moved to list ${action.value}.`);

            } else if (action.type === ActionType.ASSIGN_MEMBER) {
                if (!action.value) throw new Error("Missing User ID for ASSIGN_MEMBER");

                await prisma.cardMember.create({
                    data: { cardId: context.cardId, userId: action.value }
                }).catch(() => { }); // Ignore duplicate

                await this.logExecution(ruleId, "SUCCESS", `User ${action.value} assigned to card.`);

            } else if (action.type === ActionType.SET_DUE_DATE) {
                let date = new Date();

                if (action.value === "TOMORROW") {
                    date.setDate(date.getDate() + 1);
                } else if (action.value && action.value !== "TODAY") {
                    const parsed = new Date(action.value);
                    if (!isNaN(parsed.getTime())) {
                        date = parsed;
                    }
                }

                await prisma.card.update({
                    where: { id: context.cardId },
                    data: { dueDate: date }
                });
                await this.logExecution(ruleId, "SUCCESS", `Due date set to ${action.value}.`);

            } else if (action.type === ActionType.REMOVE_LABEL) {
                if (!action.value) throw new Error("Missing Label ID for REMOVE_LABEL");
                await prisma.cardLabel.deleteMany({
                    where: { cardId: context.cardId, labelId: action.value }
                });
                await this.logExecution(ruleId, "SUCCESS", `Label ${action.value} removed.`);

            } else {
                await this.logExecution(ruleId, "FAILURE", `Unknown action type: ${action.type}`);
            }
        } catch (error: any) {
            console.error(`[Automation] Action failed for rule ${ruleId}:`, error);
            await this.logExecution(ruleId, "FAILURE", error.message || "Unknown error");
        }
    }

    private static async logExecution(ruleId: string, status: string, message: string) {
        await prisma.automationLog.create({
            data: {
                ruleId,
                status,
                message,
            },
        });
    }
}
