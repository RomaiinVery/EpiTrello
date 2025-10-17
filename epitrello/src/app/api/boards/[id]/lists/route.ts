import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const boardId = params.id;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const lists = await prisma.list.findMany({
    where: { boardId },
  });

  return NextResponse.json(lists);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const boardId = params.id;
  const { title, position } = await request.json();

  if (!title || typeof title !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'title'" },
      { status: 400 }
    );
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const list = await prisma.list.create({
    data: {
      title,
      position: position ?? 0,
      board: { connect: { id: boardId } },
    },
  });

  return NextResponse.json(list, { status: 201 });
}