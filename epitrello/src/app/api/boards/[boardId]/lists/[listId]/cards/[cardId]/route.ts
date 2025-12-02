import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../auth/[...nextauth]/route";
import { logActivity } from "@/app/lib/activity-logger";

const prisma = new PrismaClient();

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

    // Get the card with its list information, labels, and members
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

    // Verify the card belongs to the board
    if (card.list.boardId !== boardId) {
      return NextResponse.json({ error: "Card does not belong to this board" }, { status: 400 });
    }

    // Format the response to include labels and members as arrays
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
    const { title, content, coverImage } = body;

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

    if (title === undefined && content === undefined && coverImage !== undefined) {
      return NextResponse.json({ error: "At least one of 'title' or 'content' must be provided." }, { status: 400 });
    }

    // Validate coverImage if provided (prevent XSS by only allowing safe file paths)
    if (coverImage !== undefined) {
      // Only allow coverImage updates through the dedicated /cover endpoint
      // This prevents XSS attacks via data: URLs or malicious paths
      return NextResponse.json({ 
        error: "coverImage cannot be updated via PUT. Use POST /cover to upload an image." 
      }, { status: 400 });
    }

    // Get the old card to compare changes
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

    // Format the response
    const formattedCard = {
      ...updatedCard,
      labels: updatedCard.labels.map(cl => cl.label),
      members: updatedCard.members.map(cm => cm.user),
    };

    // Log activity for changes
    const changes: string[] = [];
    if (title !== undefined && title !== oldCard.title) {
      changes.push(`titre de "${oldCard.title}" à "${title}"`);
    }
    if (content !== undefined && content !== oldCard.content) {
      changes.push("description");
    }

    if (changes.length > 0) {
      await logActivity({
        type: "card_updated",
        description: `${user.name || user.email} a modifié ${changes.join(" et ")} de la carte "${updatedCard.title}"`,
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

    // Get card info before deletion for logging
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

    // Log activity
    await logActivity({
      type: "card_deleted",
      description: `${user.name || user.email} a supprimé la carte "${card.title}"`,
      userId: user.id,
      boardId,
      cardId: null, // Card is deleted, so no cardId
      metadata: { cardTitle: card.title, listTitle: card.list.title },
    });

    return NextResponse.json({ message: "Card deleted successfully." });
  } catch (error) {
    console.error("Error deleting card:", error);
    return NextResponse.json({ error: "Failed to delete card." }, { status: 500 });
  }
}
