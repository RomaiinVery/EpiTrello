import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

// POST: Upload cover image for a card
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

    if (card.list.boardId !== boardId) {
      return NextResponse.json({ error: "Card does not belong to this board" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only images are allowed." }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 });
    }

    // Generate unique filename
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const timestamp = Date.now();
    const extension = file.name.split(".").pop();
    const filename = `${cardId}-${timestamp}.${extension}`;
    const filepath = join(process.cwd(), "public", "uploads", filename);

    // Save file
    await writeFile(filepath, buffer);

    // Update card with cover image URL
    const imageUrl = `/uploads/${filename}`;
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: { coverImage: imageUrl },
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

    return NextResponse.json({ coverImage: imageUrl, card: formattedCard });
  } catch (error) {
    console.error("Error uploading cover image:", error);
    return NextResponse.json({ error: "Failed to upload cover image" }, { status: 500 });
  }
}

// DELETE: Remove cover image from a card
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

    // Verify the card exists and belongs to the board
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { list: true },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    if (card.list.boardId !== boardId) {
      return NextResponse.json({ error: "Card does not belong to this board" }, { status: 400 });
    }

    // Delete the file if it exists
    if (card.coverImage) {
      try {
        const { unlink } = await import("fs/promises");
        const { join } = await import("path");
        const filepath = join(process.cwd(), "public", card.coverImage);
        await unlink(filepath);
      } catch (fileError) {
        // File might not exist, continue anyway
        console.warn("Could not delete cover image file:", fileError);
      }
    }

    // Update card to remove cover image
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: { coverImage: null },
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

    return NextResponse.json({ message: "Cover image removed", card: formattedCard });
  } catch (error) {
    console.error("Error removing cover image:", error);
    return NextResponse.json({ error: "Failed to remove cover image" }, { status: 500 });
  }
}

