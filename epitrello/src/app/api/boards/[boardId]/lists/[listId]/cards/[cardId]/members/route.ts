import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../../auth/[...nextauth]/route";
import { logActivity } from "@/app/lib/activity-logger";

const prisma = new PrismaClient();

// GET: Get all members assigned to a card
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

    // Get card members
    const cardMembers = await prisma.cardMember.findMany({
      where: { cardId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            profileImage: true,
          },
        },
      },
    });

    const members = cardMembers.map(cm => cm.user);

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching card members:", error);
    return NextResponse.json({ error: "Failed to fetch card members" }, { status: 500 });
  }
}

// POST: Assign a member to a card
export async function POST(request: Request, { params }: { params: Promise<{ boardId: string; listId: string; cardId: string }> }) {
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
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
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

    // Verify the user to assign is a member of the board (owner or member)
    const userToAssignIsOwner = board.userId === userId;
    const userToAssignIsMember = board.members.some(m => m.id === userId);
    if (!userToAssignIsOwner && !userToAssignIsMember) {
      return NextResponse.json({ error: "User is not a member of this board" }, { status: 400 });
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { list: true },
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

    // Check if already assigned
    const existing = await prisma.cardMember.findUnique({
      where: {
        cardId_userId: {
          cardId,
          userId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "User is already assigned to this card" }, { status: 400 });
    }

    // Get user to assign info
    const userToAssign = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // Assign the member
    const cardMember = await prisma.cardMember.create({
      data: {
        cardId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            profileImage: true,
          },
        },
      },
    });

    // Log activity
    await logActivity({
      type: "member_assigned",
      description: `${user.name || user.email} a assigné ${userToAssign?.name || userToAssign?.email || "un membre"} à la carte "${card?.title || ""}"`,
      userId: user.id,
      boardId,
      cardId,
      metadata: {
        assignedUserId: userId,
        assignedUserName: userToAssign?.name || userToAssign?.email,
        cardTitle: card?.title,
      },
    });

    return NextResponse.json(cardMember.user);
  } catch (error) {
    console.error("Error assigning member to card:", error);
    return NextResponse.json({ error: "Failed to assign member to card" }, { status: 500 });
  }
}

// DELETE: Unassign a member from a card
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
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

    // Verify the card exists and belongs to the board
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { list: true },
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

    // Get user to unassign info
    const userToUnassign = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // Remove the assignment
    await prisma.cardMember.delete({
      where: {
        cardId_userId: {
          cardId,
          userId,
        },
      },
    });

    // Log activity
    await logActivity({
      type: "member_unassigned",
      description: `${user.name || user.email} a retiré ${userToUnassign?.name || userToUnassign?.email || "un membre"} de la carte "${card.title}"`,
      userId: user.id,
      boardId,
      cardId,
      metadata: {
        unassignedUserId: userId,
        unassignedUserName: userToUnassign?.name || userToUnassign?.email,
        cardTitle: card.title,
      },
    });

    return NextResponse.json({ message: "Member unassigned successfully" });
  } catch (error) {
    console.error("Error unassigning member from card:", error);
    return NextResponse.json({ error: "Failed to unassign member from card" }, { status: 500 });
  }
}

