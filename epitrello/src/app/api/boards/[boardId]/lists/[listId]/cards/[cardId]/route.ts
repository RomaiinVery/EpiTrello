import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../auth/[...nextauth]/route";
import { logActivity } from "@/app/lib/activity-logger";

import { prisma } from "@/app/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ boardId: string; listId: string; cardId: string }> }) {
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

    const { cardId, boardId } = await params;

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        members: true,
        workspace: { include: { members: true } }
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const isOwner = board.userId === user.id;
    const isBoardMember = board.members.some(member => member.userId === user.id);
    const isWorkspaceMember = board.workspace?.members.some(member => member.userId === user.id);

    if (!isOwner && !isBoardMember && !isWorkspaceMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: {
          select: {
            id: true,
            title: true,
            boardId: true,
          },
        },
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

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    if (!card.list) {
      return NextResponse.json({ error: "Card list not found" }, { status: 404 });
    }

    if (card.list.boardId !== boardId) {
      return NextResponse.json({ error: "Card does not belong to this board" }, { status: 400 });
    }

    const formattedCard = {
      ...card,
      labels: card.labels.map(cl => cl.label),
      members: card.members.map(cm => cm.user),
    };

    return NextResponse.json(formattedCard);
  } catch (error) {
    console.error("Error fetching card:", error);
    return NextResponse.json({ error: "Failed to fetch card" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ boardId: string; listId: string; cardId: string }> }) {
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

    const { cardId, boardId } = await params;
    const body = await request.json();
    const { title, content, coverImage, dueDate, startDate, isDone } = body;

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        members: true,
        workspace: { include: { members: true } }
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const isOwner = board.userId === user.id;
    const boardMember = board.members.find(member => member.userId === user.id);
    const workspaceMember = board.workspace?.members.find(member => member.userId === user.id);

    if (!isOwner && !boardMember && !workspaceMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const role = boardMember?.role || workspaceMember?.role || "VIEWER";
    if (!isOwner && role === "VIEWER") {
      return NextResponse.json({ error: "Forbidden: Viewers cannot update content" }, { status: 403 });
    }

    if (title === undefined && content === undefined && coverImage === undefined && dueDate === undefined && startDate === undefined && isDone === undefined) {
      return NextResponse.json({ error: "No updateable fields provided." }, { status: 400 });
    }

    if (coverImage !== undefined) {
      return NextResponse.json({
        error: "coverImage cannot be updated via PUT. Use POST /cover to upload an image."
      }, { status: 400 });
    }

    const oldCard = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!oldCard) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(isDone !== undefined && { isDone }),
      },
      include: {
        list: {
          select: {
            id: true,
            title: true,
            boardId: true,
          },
        },
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

    const formattedCard = {
      ...updatedCard,
      labels: updatedCard.labels.map(cl => cl.label),
      members: updatedCard.members.map(cm => cm.user),
    };

    const changes: string[] = [];
    if (title !== undefined && title !== oldCard.title) {
      changes.push(`titre de "${oldCard.title}" à "${title}"`);
    }
    if (content !== undefined && content !== oldCard.content) {
      changes.push("description");
    }
    if (dueDate !== undefined && dueDate !== oldCard.dueDate?.toISOString()) {
      changes.push("date d'échéance");
    }
    if (startDate !== undefined && startDate !== oldCard.startDate?.toISOString()) {
      changes.push("date de début");
    }
    if (isDone !== undefined && isDone !== oldCard.isDone) {
      changes.push(isDone ? "marqué comme terminé" : "marqué comme non terminé");
    }

    if (changes.length > 0) {
      await logActivity({
        type: "card_updated",
        description: `${user.name || user.email} a modifié ${changes.join(", ")} de la carte "${updatedCard.title}"`,
        userId: user.id,
        boardId,
        cardId,
        metadata: {
          oldTitle: oldCard.title,
          newTitle: updatedCard.title,
          listTitle: updatedCard.list.title,
        },
      });
    }

    return NextResponse.json(formattedCard);
  } catch (error) {
    console.error("Error updating card:", error);
    return NextResponse.json({ error: "Failed to update card." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ boardId: string; listId: string; cardId: string }> }) {
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

    const { cardId, boardId } = await params;

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        members: true,
        workspace: { include: { members: true } }
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const isOwner = board.userId === user.id;
    const boardMember = board.members.find(member => member.userId === user.id);
    const workspaceMember = board.workspace?.members.find(member => member.userId === user.id);

    if (!isOwner && !boardMember && !workspaceMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const role = boardMember?.role || workspaceMember?.role || "VIEWER";
    if (!isOwner && role === "VIEWER") {
      return NextResponse.json({ error: "Forbidden: Viewers cannot modify content" }, { status: 403 });
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    await prisma.card.delete({
      where: { id: cardId },
    });

    await logActivity({
      type: "card_deleted",
      description: `${user.name || user.email} a supprimé la carte "${card.title}"`,
      userId: user.id,
      boardId,
      cardId: undefined,
      metadata: { cardTitle: card.title, listTitle: card.list.title },
    });

    return NextResponse.json({ message: "Card deleted successfully." });
  } catch (error) {
    console.error("Error deleting card:", error);
    return NextResponse.json({ error: "Failed to delete card." }, { status: 500 });
  }
}
