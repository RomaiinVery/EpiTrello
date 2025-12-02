import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../auth/[...nextauth]/route";
import { logActivity } from "@/app/lib/activity-logger";

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
      include: {
        labels: {
          include: {
            label: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Format cards to include labels and members as arrays
    const formattedCards = cards.map(card => ({
      ...card,
      labels: card.labels.map(cl => cl.label),
      members: card.members.map(cm => cm.user),
    }));

    return NextResponse.json(formattedCards, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve cards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ boardId: string; listId: string }> }) {
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

    const { listId, boardId } = await params;

    if (!listId) {
      return NextResponse.json({ error: 'Missing listId parameter' }, { status: 400 });
    }

    // Verify user has access to the board
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

    // Verify the list belongs to the board
    const list = await prisma.list.findUnique({
      where: { id: listId },
    });

    if (!list || list.boardId !== boardId) {
      return NextResponse.json({ error: "List not found or does not belong to this board" }, { status: 404 });
    }

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

    // Log activity
    await logActivity({
      type: "card_created",
      description: `${user.name || user.email} a créé la carte "${title}"`,
      userId: user.id,
      boardId,
      cardId: newCard.id,
      metadata: { listTitle: list.title },
    });

    return NextResponse.json(newCard, { status: 201 });
  } catch (error) {
    console.error("Error creating card:", error);
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}
