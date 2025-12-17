import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function PUT(request: Request, { params }: { params: Promise<{ boardId: string; listId: string; cardId: string; checklistId: string }> }) {
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
    const { title } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: "Checklist title is required" }, { status: 400 });
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
    const updatedChecklist = await prisma.checklist.update({
      where: { id: checklistId },
      data: { title: title.trim() },
      include: {
        items: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return NextResponse.json(updatedChecklist);
  } catch (error) {
    console.error("Error updating checklist:", error);
    return NextResponse.json({ error: "Failed to update checklist" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ boardId: string; listId: string; cardId: string; checklistId: string }> }) {
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

    await prisma.checklist.delete({
      where: { id: checklistId },
    });

    return NextResponse.json({ message: "Checklist deleted successfully" });
  } catch (error) {
    console.error("Error deleting checklist:", error);
    return NextResponse.json({ error: "Failed to delete checklist" }, { status: 500 });
  }
}

