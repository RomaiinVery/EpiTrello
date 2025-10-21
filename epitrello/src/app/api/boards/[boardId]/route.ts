import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: { boardId: string } }) {
  const { boardId } = await params;
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }
  return NextResponse.json(board);
}

export async function DELETE(req: Request, { params }: { params: { boardId: string } }) {
  const { boardId } = params;

  try {
    const deletedBoard = await prisma.board.delete({
      where: { id: boardId },
    });
    return NextResponse.json({ message: "Board deleted", board: deletedBoard });
  } catch (error) {
    return NextResponse.json({ error: "Board not found or already deleted" }, { status: 404 });
  }
}