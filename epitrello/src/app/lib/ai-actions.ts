
import { prisma } from "@/app/lib/prisma";
import { AutomationService, TriggerType } from "@/app/lib/automation";

export async function createList(boardId: string, title: string) {
    // Get max position to append to the end
    const lastList = await prisma.list.findFirst({
        where: { boardId },
        orderBy: { position: "desc" },
    });
    const position = lastList ? lastList.position + 1 : 0;

    return prisma.list.create({
        data: {
            title,
            boardId,
            position,
        },
    });
}

export async function findListByName(boardId: string, name: string) {
    // Simple case-insensitive match
    return prisma.list.findFirst({
        where: {
            boardId,
            title: {
                contains: name,
                mode: 'insensitive',
            },
        },
    });
}

export async function createCard(boardId: string, listName: string, cardTitle: string) {
    const list = await findListByName(boardId, listName);

    if (!list) {
        throw new Error(`List '${listName}' not found. Please create it first.`);
    }

    // Get max position
    const lastCard = await prisma.card.findFirst({
        where: { listId: list.id },
        orderBy: { position: "desc" },
    });
    const position = lastCard ? lastCard.position + 1 : 0;

    const newCard = await prisma.card.create({
        data: {
            title: cardTitle,
            listId: list.id,
            position,
        },
    });

    // Trigger Automation
    await AutomationService.processTrigger(
        boardId,
        TriggerType.CARD_CREATED,
        list.id,
        { cardId: newCard.id }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ).catch((e: any) => console.error("AI Automation Trigger Error:", e));

    return newCard;
}
