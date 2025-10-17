import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const deletedBoard = await prisma.board.delete({
      where: { id }
    });
    return NextResponse.json({ message: "Board deleted", board: deletedBoard });
  } catch (error) {
    return NextResponse.json({ error: "Board not found or already deleted" }, { status: 404 });
  }
}