import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function PUT(request: Request, { params }: { params: { boardId: string; listId: string; cardId: string } }) {
  try {
    const { cardId } = await params;
    const body = await request.json();
    const { title, content } = body;

    if (title === undefined && content === undefined) {
      return NextResponse.json({ error: "At least one of 'title' or 'content' must be provided." }, { status: 400 });
    }

    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
      },
    });

    return NextResponse.json(updatedCard);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update card." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { boardId: string; listId: string; cardId: string } }) {
  try {
    const { cardId } = await params;

    await prisma.card.delete({
      where: { id: cardId },
    });

    return NextResponse.json({ message: "Card deleted successfully." });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete card." }, { status: 500 });
  }
}
