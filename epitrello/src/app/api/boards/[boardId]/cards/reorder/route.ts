import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { logActivity } from "@/app/lib/activity-logger";

const prisma = new PrismaClient();

type CardUpdateData = {
  id: string;
  position: number;
  listId: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { boardId } = await params;
    const body = await request.json();

    const { cards }: { cards: CardUpdateData[] } = body;

    if (!cards || !Array.isArray(cards)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { members: true },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const isOwner = board.userId === user.id;
    const isMember = board.members.some(member => member.id === user.id);

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const oldCards = await prisma.card.findMany({
      where: {
        id: { in: cards.map(c => c.id) },
      },
      include: {
        list: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    const oldCardsMap = new Map(oldCards.map(c => [c.id, c]));

    const newLists = await prisma.list.findMany({
      where: {
        id: { in: cards.map(c => c.listId) },
      },
      select: {
        id: true,
        title: true,
      },
    });

    const newListsMap = new Map(newLists.map(l => [l.id, l]));
    const transaction = cards.map((card) =>
      prisma.card.update({
        where: {
          id: card.id,
        },
        data: {
          position: card.position,
          listId: card.listId,
          isDone: newListsMap.get(card.listId)?.title === "Done" ? true : false,
        },
      })
    );

    await prisma.$transaction(transaction);

    for (const card of cards) {
      const oldCard = oldCardsMap.get(card.id);
      if (oldCard && oldCard.listId !== card.listId) {
        const oldList = oldCard.list;
        const newList = newListsMap.get(card.listId);
        if (oldList && newList) {
          await logActivity({
            type: "card_moved",
            description: `${user.name || user.email} a déplacé la carte "${oldCard.title}" de "${oldList.title}" vers "${newList.title}"`,
            userId: user.id,
            boardId,
            cardId: card.id,
            metadata: {
              cardTitle: oldCard.title,
              oldListId: oldCard.listId,
              oldListTitle: oldList.title,
              newListId: card.listId,
              newListTitle: newList.title,
            },
          });
        }
      }
    }

    return NextResponse.json({ message: "Cards reordered successfully" }, { status: 200 });
  } catch (error) {
    console.error("Failed to reorder cards:", error);
    return NextResponse.json({ error: "Failed to reorder cards" }, { status: 500 });
  }
}