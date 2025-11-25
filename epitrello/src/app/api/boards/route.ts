import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function GET() {
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

  const boards = await prisma.board.findMany({
    where: {
      OR: [
        { userId: user.id },
        { members: { some: { id: user.id } } }
      ]
    },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      members: {
        select: { id: true, name: true, email: true }
      },
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  return NextResponse.json(boards);
}

export async function POST(req: Request) {
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

  const { title, description } = await req.json();

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const board = await prisma.board.create({
    data: {
      title,
      description,
      userId: user.id,
      lists: {
        create: [
          { title: "Todo", position: 0 },
          { title: "Pending", position: 1 },
          { title: "Finished", position: 2 },
        ],
      },
    },
    include: {
      lists: true,
    },
  });

  return NextResponse.json(board, { status: 201 });
}