import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../../../../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function PUT(request: Request, { params }: { params: Promise<{ boardId: string; listId: string; cardId: string; checklistId: string; itemId: string }> }) {
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

    const { cardId, boardId, checklistId, itemId } = await params;
    const body = await request.json();
    const { text, checked } = body;

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

    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        checklist: {
          include: {
            card: {
              include: { list: true },
            },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.checklistId !== checklistId) {
      return NextResponse.json({ error: "Item does not belong to this checklist" }, { status: 400 });
    }

    if (item.checklist.cardId !== cardId) {
      return NextResponse.json({ error: "Item does not belong to this card" }, { status: 400 });
    }

    if (!item.checklist.card.list) {
      return NextResponse.json({ error: "Card list not found" }, { status: 404 });
    }

    if (item.checklist.card.list.boardId !== boardId) {
      return NextResponse.json({ error: "Item does not belong to this board" }, { status: 400 });
    }

    const updateData: { text?: string; checked?: boolean } = {};
    if (text !== undefined) {
      if (typeof text !== 'string' || text.trim().length === 0) {
        return NextResponse.json({ error: "Item text cannot be empty" }, { status: 400 });
      }
      updateData.text = text.trim();
    }
    if (checked !== undefined) {
      if (typeof checked !== 'boolean') {
        return NextResponse.json({ error: "Checked must be a boolean" }, { status: 400 });
      }
      updateData.checked = checked;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "At least one of 'text' or 'checked' must be provided" }, { status: 400 });
    }

    const updatedItem = await prisma.checklistItem.update({
      where: { id: itemId },
      data: updateData,
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Error updating checklist item:", error);
    return NextResponse.json({ error: "Failed to update checklist item" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ boardId: string; listId: string; cardId: string; checklistId: string; itemId: string }> }) {
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

    const { cardId, boardId, checklistId, itemId } = await params;

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

    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        checklist: {
          include: {
            card: {
              include: { list: true },
            },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.checklistId !== checklistId) {
      return NextResponse.json({ error: "Item does not belong to this checklist" }, { status: 400 });
    }

    if (item.checklist.cardId !== cardId) {
      return NextResponse.json({ error: "Item does not belong to this card" }, { status: 400 });
    }

    if (!item.checklist.card.list) {
      return NextResponse.json({ error: "Card list not found" }, { status: 404 });
    }

    if (item.checklist.card.list.boardId !== boardId) {
      return NextResponse.json({ error: "Item does not belong to this board" }, { status: 400 });
    }

    await prisma.checklistItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting checklist item:", error);
    return NextResponse.json({ error: "Failed to delete checklist item" }, { status: 500 });
  }
}

