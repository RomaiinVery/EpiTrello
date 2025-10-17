import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const boards = await prisma.board.findMany();
  return NextResponse.json(boards);
}

export async function POST(req: Request) {
  const { title } = await req.json();
  const board = await prisma.board.create({ data: { title } });
  return NextResponse.json(board);
}
