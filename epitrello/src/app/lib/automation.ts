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
            });

            console.log(`[Automation] Found ${rules.length} matching rules.`);

            for (const rule of rules) {
                // 2. Check value match
                if (rule.triggerVal === triggerVal) {
                    console.log(`[Automation] Rule ${rule.id} matches. Executing action: ${rule.actionType}`);
                    await this.executeAction(rule, context);
                }
            }
        } catch (error) {
            console.error("[Automation] Error processing trigger:", error);
        }
    }

    private static async executeAction(rule: any, context: { cardId: string }) {
        try {
            if (rule.actionType === ActionType.ARCHIVE_CARD) {
                await prisma.card.update({
                    where: { id: context.cardId },
                    data: { archived: true },
                });

                await this.logExecution(rule.id, "SUCCESS", `Card ${context.cardId} archived.`);
            } else if (rule.actionType === ActionType.MARK_AS_DONE) {
                await prisma.card.update({
                    where: { id: context.cardId },
                    data: { isDone: true },
                });
                await this.logExecution(rule.id, "SUCCESS", `Card ${context.cardId} marked as done.`);

            } else if (rule.actionType === ActionType.ADD_LABEL) {
                if (!rule.actionVal) {
                    throw new Error("Missing label ID in actionVal for ADD_LABEL.");
                }

                // We need to create a CardLabel relation.
                // NOTE: This assumes actionVal is a valid Label ID.
                await prisma.cardLabel.create({
                    data: {
                        cardId: context.cardId,
                        labelId: rule.actionVal,
                    },
                }).catch(() => { /* Ignore duplicate */ });

                await this.logExecution(rule.id, "SUCCESS", `Label ${rule.actionVal} added to card.`);

            } else if (rule.actionType === ActionType.MOVE_CARD) {
                if (!rule.actionVal) throw new Error("Missing List ID for MOVE_CARD");
                await prisma.card.update({
                    where: { id: context.cardId },
                    data: { listId: rule.actionVal }
                });
                await this.logExecution(rule.id, "SUCCESS", `Card moved to list ${rule.actionVal}.`);

            } else if (rule.actionType === ActionType.ASSIGN_MEMBER) {
                // actionVal should be User ID. Special value "ME" could be handled by caller context if needed, 
                // but for now let's assume specific user or current user if logic permits.
                // Or simplified: actionVal is just the User ID.
                if (!rule.actionVal) throw new Error("Missing User ID for ASSIGN_MEMBER");

                await prisma.cardMember.create({
                    data: { cardId: context.cardId, userId: rule.actionVal }
                }).catch(() => { }); // Ignore duplicate

                await this.logExecution(rule.id, "SUCCESS", `User ${rule.actionVal} assigned to card.`);

            } else if (rule.actionType === ActionType.SET_DUE_DATE) {
                // actionVal: "TODAY", "TOMORROW", or ISO String
                let date = new Date();

                if (rule.actionVal === "TOMORROW") {
                    date.setDate(date.getDate() + 1);
                } else if (rule.actionVal && rule.actionVal !== "TODAY") {
                    // Try parsing as specific date
                    const parsed = new Date(rule.actionVal);
                    if (!isNaN(parsed.getTime())) {
                        date = parsed;
                    }
                }

                await prisma.card.update({
                    where: { id: context.cardId },
                    data: { dueDate: date }
                });
                await this.logExecution(rule.id, "SUCCESS", `Due date set to ${rule.actionVal}.`);

            } else if (rule.actionType === ActionType.REMOVE_LABEL) {
                if (!rule.actionVal) throw new Error("Missing Label ID for REMOVE_LABEL");
                await prisma.cardLabel.deleteMany({
                    where: { cardId: context.cardId, labelId: rule.actionVal }
                });
                await this.logExecution(rule.id, "SUCCESS", `Label ${rule.actionVal} removed.`);

            } else {
                await this.logExecution(rule.id, "FAILURE", `Unknown action type: ${rule.actionType}`);
            }
        } catch (error: any) {
            console.error(`[Automation] Action failed for rule ${rule.id}:`, error);
            await this.logExecution(rule.id, "FAILURE", error.message || "Unknown error");
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
