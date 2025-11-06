import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CardUpdateData = {
  id: string;
  position: number;
  listId: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: { boardId: string } }
) {
  const { boardId } = await params;
  const body = await request.json();

  const { cards }: { cards: CardUpdateData[] } = body;

  if (!cards || !Array.isArray(cards)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const transaction = cards.map((card) =>
      prisma.card.update({
        where: {
          id: card.id,
          list: {
            boardId: boardId,
          },
        },
        data: {
          position: card.position,
          listId: card.listId,
        },
      })
    );

    await prisma.$transaction(transaction);
    return NextResponse.json({ message: "Cards reordered successfully" }, { status: 200 });
  } catch (error) {
    console.error("Failed to reorder cards:", error);
    return NextResponse.json({ error: "Failed to reorder cards" }, { status: 500 });
  }
}