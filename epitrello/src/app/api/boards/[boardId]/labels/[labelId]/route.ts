import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function PUT(req: Request, { params }: { params: { boardId: string; labelId: string } }) {
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

    const { boardId, labelId } = await params;
    const { name, color } = await req.json();

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

    const existingLabel = await prisma.label.findUnique({
      where: { id: labelId },
    });

    if (!existingLabel || existingLabel.boardId !== boardId) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    if (name && name.trim() !== existingLabel.name) {
      const duplicateLabel = await prisma.label.findUnique({
        where: {
          boardId_name: {
            boardId,
            name: name.trim(),
          },
        },
      });

      if (duplicateLabel) {
        return NextResponse.json({ error: "A label with this name already exists" }, { status: 400 });
      }
    }

    const updatedLabel = await prisma.label.update({
      where: { id: labelId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
      },
    });

    return NextResponse.json(updatedLabel);
  } catch (error) {
    console.error("Error updating label:", error);
    return NextResponse.json({ error: "Failed to update label" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { boardId: string; labelId: string } }) {
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

    const { boardId, labelId } = await params;

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

    const existingLabel = await prisma.label.findUnique({
      where: { id: labelId },
    });

    if (!existingLabel || existingLabel.boardId !== boardId) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    await prisma.label.delete({
      where: { id: labelId },
    });

    return NextResponse.json({ message: "Label deleted successfully" });
  } catch (error) {
    console.error("Error deleting label:", error);
    return NextResponse.json({ error: "Failed to delete label" }, { status: 500 });
  }
}


