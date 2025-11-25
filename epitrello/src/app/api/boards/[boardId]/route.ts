import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: { boardId: string } }) {
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

  const { boardId } = await params;

  const board = await prisma.board.findUnique({
    where: { id: boardId }
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  if (board.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(board);
}

export async function DELETE(req: Request, { params }: { params: { boardId: string } }) {
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

  const { boardId } = await params;

  const board = await prisma.board.findUnique({
    where: { id: boardId }
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found or already deleted" }, { status: 404 });
  }

  if (board.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const deletedBoard = await prisma.board.delete({
      where: { id: boardId },
    });
    return NextResponse.json({ message: "Board deleted", board: deletedBoard });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete board" }, { status: 500 });
  }
}