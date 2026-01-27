
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

export async function findCardByName(boardId: string, cardTitle: string) {
    const trimmedTitle = cardTitle.trim();
    console.log(`[AI Action] Finding card: "${trimmedTitle}" in board: ${boardId}`);

    const card = await prisma.card.findFirst({
        where: {
            title: { contains: trimmedTitle, mode: 'insensitive' },
            list: { boardId }
        }
    });

    if (!card) {
        console.log(`[AI Action] Card not found. Searched for "${trimmedTitle}" in board ${boardId}`);
        // Optional: List all cards on board for debugging context in logs
        // const allCards = await prisma.card.findMany({ where: { list: { boardId } }, select: { title: true } });
        // console.log(`[AI Action] Available cards: ${allCards.map(c => c.title).join(", ")}`);
    }

    return card;
}

export async function addLabel(boardId: string, cardTitle: string, labelName: string, color: string = "blue") {
    const card = await findCardByName(boardId, cardTitle);
    if (!card) throw new Error(`Card '${cardTitle}' not found.`);

    // Find or create label
    let label = await prisma.label.findFirst({
        where: {
            boardId,
            name: { contains: labelName, mode: 'insensitive' }
        }
    });

    if (!label) {
        label = await prisma.label.create({
            data: {
                boardId,
                name: labelName,
                color
            }
        });
    }

    // Link label to card if not already linked
    const exists = await prisma.cardLabel.findFirst({
        where: { cardId: card.id, labelId: label.id }
    });

    if (!exists) {
        await prisma.cardLabel.create({
            data: { cardId: card.id, labelId: label.id }
        });
    }

    return label;
}

// Helper to get date for specific day name
function getDateForDay(dayName: string, nextWeek: boolean = false): Date {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const targetDay = days.indexOf(dayName.toLowerCase());
    if (targetDay === -1) return new Date("Invalid");

    const date = new Date();
    const currentDay = date.getDay();
    let daysUntil = (targetDay + 7 - currentDay) % 7;

    if (daysUntil === 0) daysUntil = 7;
    if (nextWeek) daysUntil += 7;

    date.setDate(date.getDate() + daysUntil);
    return date;
}

export async function setDueDate(boardId: string, cardTitle: string, date: string) {
    const card = await findCardByName(boardId, cardTitle);
    if (!card) throw new Error(`Card '${cardTitle}' not found.`);

    let targetDate = new Date();
    const lowerDate = date.toLowerCase().trim();

    if (lowerDate === 'today') {
    } else if (lowerDate === 'tomorrow') {
        targetDate.setDate(targetDate.getDate() + 1);
    } else if (lowerDate.startsWith('next ')) {
        const dayName = lowerDate.replace('next ', '');
        targetDate = getDateForDay(dayName, false);
        // 1. Calculate coming occurrence of Day.
        // 2. If user said "next", add 7 days.
        const comingDate = getDateForDay(dayName);
        if (!isNaN(comingDate.getTime())) {
            targetDate = comingDate;
            // If we want strictly "next week" logic, we might add 7 days.
            // However, often "next monday" is ambiguous. Let's stick to:
            // "Monday" -> coming Monday.
            // "Next Monday" -> 7 days after coming Monday? or just the coming Monday if today is not Monday?
            targetDate.setDate(targetDate.getDate() + 7);
        } else {
            targetDate = new Date(date); // Fallback to standard parse
        }
    } else {
        // Check if it's just a day name
        const dayDate = getDateForDay(lowerDate);
        if (!isNaN(dayDate.getTime())) {
            targetDate = dayDate;
        } else {
            // Try standard parse
            targetDate = new Date(date);
        }
    }

    if (isNaN(targetDate.getTime())) {
        throw new Error(`Invalid date format: ${date}. Try 'YYYY-MM-DD', 'tomorrow', or 'Friday'.`);
    }

    await prisma.card.update({
        where: { id: card.id },
        data: { dueDate: targetDate }
    });
}

export async function assignMember(boardId: string, cardTitle: string, memberName: string) {
    const card = await findCardByName(boardId, cardTitle);
    if (!card) throw new Error(`Card '${cardTitle}' not found.`);

    // Find user by name or email in the board members OR the board owner
    const board = await prisma.board.findUnique({
        where: { id: boardId },
        include: {
            members: { include: { user: true } },
            user: true // The owner
        }
    });

    if (!board) throw new Error("Board not found");

    const allMembers = [
        board.user,
        ...board.members.map(bm => bm.user)
    ];

    const targetMember = allMembers.find(u =>
        u.name?.toLowerCase().includes(memberName.toLowerCase()) ||
        u.email?.toLowerCase().includes(memberName.toLowerCase())
    );

    if (!targetMember) {
        console.log(`[AI Action] Member not found: "${memberName}". Available members: ${allMembers.map(u => u.name || u.email).join(", ")}`);
        throw new Error(`Member '${memberName}' not found on this board.`);
    }

    // Assign
    await prisma.cardMember.create({
        data: { cardId: card.id, userId: targetMember.id }
    }).catch(() => { /* ignore duplicate */ });
}

export async function getBoardMembers(boardId: string) {
    const board = await prisma.board.findUnique({
        where: { id: boardId },
        include: {
            members: { include: { user: true } },
            user: true // The owner
        }
    });

    if (!board) return "Board not found";

    const allMembers = [
        board.user,
        ...board.members.map(bm => bm.user)
    ];

    // Remove duplicates if owner is somehow also in members
    const uniqueMembers = Array.from(new Map(allMembers.map(u => [u.id, u])).values());

    return uniqueMembers.map(u => u.name || u.email || "Unknown").join(", ");
}

export async function setCardDescription(boardId: string, cardTitle: string, description: string) {
    const card = await findCardByName(boardId, cardTitle);
    if (!card) throw new Error(`Card '${cardTitle}' not found.`);

    await prisma.card.update({
        where: { id: card.id },
        data: { content: description }
    });
}

export async function addCardComment(boardId: string, cardTitle: string, comment: string, userId: string) {
    const card = await findCardByName(boardId, cardTitle);
    if (!card) throw new Error(`Card '${cardTitle}' not found.`);

    await prisma.comment.create({
        data: {
            content: comment,
            cardId: card.id,
            userId: userId
        }
    });

    // Optional: Log activity if you want consistency with normal comments
}

export async function moveCard(boardId: string, cardTitle: string, targetListName: string) {
    const card = await findCardByName(boardId, cardTitle);
    if (!card) throw new Error(`Card '${cardTitle}' not found.`);

    const list = await findListByName(boardId, targetListName);
    if (!list) throw new Error(`List '${targetListName}' not found.`);

    // Get max position in new list
    const lastCard = await prisma.card.findFirst({
        where: { listId: list.id },
        orderBy: { position: "desc" },
    });
    const position = lastCard ? lastCard.position + 1 : 0;

    await prisma.card.update({
        where: { id: card.id },
        data: { listId: list.id, position }
    });
}

export async function deleteCard(boardId: string, cardTitle: string) {
    const card = await findCardByName(boardId, cardTitle);
    if (!card) throw new Error(`Card '${cardTitle}' not found.`);

    await prisma.card.delete({
        where: { id: card.id }
    });
}

export async function archiveCard(boardId: string, cardTitle: string) {
    const card = await findCardByName(boardId, cardTitle);
    if (!card) throw new Error(`Card '${cardTitle}' not found.`);

    await prisma.card.update({
        where: { id: card.id },
        data: { archived: true }
    });
}
