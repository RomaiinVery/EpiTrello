import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../../../auth/[...nextauth]/route";
import { logActivity } from "@/app/lib/activity-logger";

import { prisma } from "@/app/lib/prisma";

export async function PUT(request: Request, { params }: { params: Promise<{ boardId: string; listId: string; cardId: string; commentId: string }> }) {
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

    const { cardId, boardId, commentId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
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

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        card: {
          include: { list: true },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.cardId !== cardId) {
      return NextResponse.json({ error: "Comment does not belong to this card" }, { status: 400 });
    }

    if (!comment.card || !comment.card.list) {
      return NextResponse.json({ error: "Comment card or list not found" }, { status: 404 });
    }

    if (comment.card.list.boardId !== boardId) {
      return NextResponse.json({ error: "Comment does not belong to this board" }, { status: 400 });
    }

    if (comment.userId !== user.id) {
      return NextResponse.json({ error: "You can only edit your own comments" }, { status: 403 });
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { title: true },
    });

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    await logActivity({
      type: "comment_updated",
      description: `${user.name || user.email} a modifié un commentaire sur la carte "${card?.title || ""}"`,
      userId: user.id,
      boardId,
      cardId,
      metadata: { cardTitle: card?.title },
    });

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ boardId: string; listId: string; cardId: string; commentId: string }> }) {
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

    const { cardId, boardId, commentId } = await params;

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

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        card: {
          include: { list: true },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.cardId !== cardId) {
      return NextResponse.json({ error: "Comment does not belong to this card" }, { status: 400 });
    }

    if (!comment.card || !comment.card.list) {
      return NextResponse.json({ error: "Comment card or list not found" }, { status: 404 });
    }

    if (comment.card.list.boardId !== boardId) {
      return NextResponse.json({ error: "Comment does not belong to this board" }, { status: 400 });
    }

    if (comment.userId !== user.id) {
      return NextResponse.json({ error: "You can only delete your own comments" }, { status: 403 });
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { title: true },
    });

    await prisma.comment.delete({
      where: { id: commentId },
    });

    await logActivity({
      type: "comment_deleted",
      description: `${user.name || user.email} a supprimé un commentaire sur la carte "${card?.title || ""}"`,
      userId: user.id,
      boardId,
      cardId,
      metadata: { cardTitle: card?.title },
    });

    return NextResponse.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}

