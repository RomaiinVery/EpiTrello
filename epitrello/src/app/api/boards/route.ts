import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function GET(req: Request) {
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

  const { searchParams } = new URL(req.url);
  const tableauId = searchParams.get("tableauId") || undefined;

  const boards = await prisma.board.findMany({
    where: {
      tableauId,
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

  const { title, description, tableauId, githubRepo, githubBranch } = await req.json();

  if (!title || !tableauId) {
    return NextResponse.json({ error: "Title and tableauId are required" }, { status: 400 });
  }

  const tableau = await prisma.tableau.findFirst({
    where: { id: tableauId, userId: user.id },
  });

  if (!tableau) {
    return NextResponse.json({ error: "Tableau introuvable ou non autorisé" }, { status: 404 });
  }

  const board = await prisma.board.create({
    data: {
      title,
      description,
      tableauId,
      userId: user.id,
      githubRepo: githubRepo || null,
      githubBranch: githubBranch || null,
      lists: {
        create: [
          { title: "To Do", position: 0 },
          { title: "Doing", position: 1 },
          { title: "Done", position: 2 },
        ],
      },
    },
    include: {
      lists: true,
    },
  });

  return NextResponse.json(board, { status: 201 });
}