import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(_request: NextRequest, { params }: { params: { boardId: string; listId: string } }) {
  const { listId } = await params;

  if (!listId) {
    return NextResponse.json({ error: 'Missing listId parameter' }, { status: 400 });
  }

  try {
    const cards = await prisma.card.findMany({
      where: { listId },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(cards, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve cards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { boardId: string; listId: string } }) {
  const { listId } = await params;

  if (!listId) {
    return NextResponse.json({ error: 'Missing listId parameter' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { title, content } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required and must be a string' }, { status: 400 });
    }

    const lastCard = await prisma.card.findFirst({
      where: { listId },
      orderBy: { position: 'desc' },
    });

    const nextPosition = lastCard ? lastCard.position + 1 : 0;

    const newCard = await prisma.card.create({
      data: {
        title,
        content: content ?? null,
        position: nextPosition,
        listId,
      },
    });

    return NextResponse.json(newCard, { status: 201 });
  } catch (error) {
    console.error("Error creating card:", error);
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}
