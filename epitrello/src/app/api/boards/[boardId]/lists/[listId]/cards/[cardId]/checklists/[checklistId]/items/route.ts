import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../../../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

// GET: Get all items for a checklist
export async function GET(request: Request, { params }: { params: Promise<{ boardId: string; listId: string; cardId: string; checklistId: string }> }) {
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

    const { cardId, boardId, checklistId } = await params;

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

    // Verify the checklist exists and belongs to the card
    const checklist = await prisma.checklist.findUnique({
      where: { id: checklistId },
      include: {
        card: {
          include: { list: true },
        },
      },
    });

    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    if (checklist.cardId !== cardId) {
      return NextResponse.json({ error: "Checklist does not belong to this card" }, { status: 400 });
    }

    if (!checklist.card.list) {
      return NextResponse.json({ error: "Card list not found" }, { status: 404 });
    }

    if (checklist.card.list.boardId !== boardId) {
      return NextResponse.json({ error: "Checklist does not belong to this board" }, { status: 400 });
    }

    // Get items
    const items = await prisma.checklistItem.findMany({
      where: { checklistId },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching checklist items:", error);
    return NextResponse.json({ error: "Failed to fetch checklist items" }, { status: 500 });
  }
}

// POST: Create a new checklist item
export async function POST(request: Request, { params }: { params: Promise<{ boardId: string; listId: string; cardId: string; checklistId: string }> }) {
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

    const { cardId, boardId, checklistId } = await params;
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: "Item text is required" }, { status: 400 });
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

    // Verify the checklist exists and belongs to the card
    const checklist = await prisma.checklist.findUnique({
      where: { id: checklistId },
      include: {
        card: {
          include: { list: true },
        },
      },
    });

    if (!checklist) {
      return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
    }

    if (checklist.cardId !== cardId) {
      return NextResponse.json({ error: "Checklist does not belong to this card" }, { status: 400 });
    }

    if (!checklist.card.list) {
      return NextResponse.json({ error: "Card list not found" }, { status: 404 });
    }

    if (checklist.card.list.boardId !== boardId) {
      return NextResponse.json({ error: "Checklist does not belong to this board" }, { status: 400 });
    }

    // Get the last item position
    const lastItem = await prisma.checklistItem.findFirst({
      where: { checklistId },
      orderBy: { position: 'desc' },
    });

    const nextPosition = lastItem ? lastItem.position + 1 : 0;

    // Create the item
    const item = await prisma.checklistItem.create({
      data: {
        text: text.trim(),
        position: nextPosition,
        checklistId,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating checklist item:", error);
    return NextResponse.json({ error: "Failed to create checklist item" }, { status: 500 });
  }
}

