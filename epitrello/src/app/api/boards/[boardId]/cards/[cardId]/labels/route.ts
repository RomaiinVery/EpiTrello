import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../auth/[...nextauth]/route";
import { logActivity } from "@/app/lib/activity-logger";

const prisma = new PrismaClient();

// GET - Get all labels for a card
export async function GET(req: Request, { params }: { params: { boardId: string; cardId: string } }) {
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

    const { boardId, cardId } = await params;

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

    // Get card labels
    const cardLabels = await prisma.cardLabel.findMany({
      where: { cardId },
      include: {
        label: true,
      },
    });

    const labels = cardLabels.map(cl => cl.label);

    return NextResponse.json(labels);
  } catch (error) {
    console.error("Error fetching card labels:", error);
    return NextResponse.json({ error: "Failed to fetch card labels" }, { status: 500 });
  }
}

// POST - Add a label to a card
export async function POST(req: Request, { params }: { params: { boardId: string; cardId: string } }) {
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

    const { boardId, cardId } = await params;
    const { labelId } = await req.json();

    if (!labelId) {
      return NextResponse.json({ error: "Label ID is required" }, { status: 400 });
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

    // Verify label belongs to board
    const label = await prisma.label.findUnique({
      where: { id: labelId },
    });

    if (!label || label.boardId !== boardId) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    // Check if card exists and belongs to board
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { list: true },
    });

    if (!card || card.list.boardId !== boardId) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Check if label is already on card
    const existingCardLabel = await prisma.cardLabel.findUnique({
      where: {
        cardId_labelId: {
          cardId,
          labelId,
        },
      },
    });

    if (existingCardLabel) {
      return NextResponse.json({ error: "Label is already on this card" }, { status: 400 });
    }

    const cardLabel = await prisma.cardLabel.create({
      data: {
        cardId,
        labelId,
      },
      include: {
        label: true,
      },
    });

    // Log activity
    await logActivity({
      type: "label_added",
      description: `${user.name || user.email} a ajouté le label "${label.name}" à la carte "${card.title}"`,
      userId: user.id,
      boardId,
      cardId,
      metadata: { labelName: label.name, labelColor: label.color, cardTitle: card.title },
    });

    return NextResponse.json(cardLabel.label, { status: 201 });
  } catch (error) {
    console.error("Error adding label to card:", error);
    return NextResponse.json({ error: "Failed to add label to card" }, { status: 500 });
  }
}

// DELETE - Remove a label from a card
export async function DELETE(req: Request, { params }: { params: { boardId: string; cardId: string } }) {
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

    const { boardId, cardId } = await params;
    const { searchParams } = new URL(req.url);
    const labelId = searchParams.get("labelId");

    if (!labelId) {
      return NextResponse.json({ error: "Label ID is required" }, { status: 400 });
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

    // Get label and card info for logging
    const label = await prisma.label.findUnique({
      where: { id: labelId },
      select: { name: true, color: true },
    });

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { title: true },
    });

    // Delete the card label relationship
    await prisma.cardLabel.delete({
      where: {
        cardId_labelId: {
          cardId,
          labelId,
        },
      },
    });

    // Log activity
    if (label && card) {
      await logActivity({
        type: "label_removed",
        description: `${user.name || user.email} a retiré le label "${label.name}" de la carte "${card.title}"`,
        userId: user.id,
        boardId,
        cardId,
        metadata: { labelName: label.name, labelColor: label.color, cardTitle: card.title },
      });
    }

    return NextResponse.json({ message: "Label removed from card successfully" });
  } catch (error) {
    console.error("Error removing label from card:", error);
    return NextResponse.json({ error: "Failed to remove label from card" }, { status: 500 });
  }
}

