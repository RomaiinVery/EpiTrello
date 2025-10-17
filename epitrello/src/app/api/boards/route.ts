import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const boards = await prisma.board.findMany();
  return NextResponse.json(boards);
}

export async function POST(req: Request) {
  const { title, description } = await req.json();

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const board = await prisma.board.create({
    data: {
      title,
      description,
      lists: {
        create: [
          { title: "À faire", position: 0 },
          { title: "En cours", position: 1 },
          { title: "Terminé", position: 2 },
        ],
      },
    },
    include: {
      lists: true,
    },
  });

  return NextResponse.json(board, { status: 201 });
}
