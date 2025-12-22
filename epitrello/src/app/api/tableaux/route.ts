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

  const tableaux = await prisma.tableau.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      boards: {
        select: { id: true, title: true, description: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
    
  });

  return NextResponse.json(tableaux);
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

  const tableau = await prisma.tableau.create({
    data: {
      title,
      description,
      userId: user.id,
    },
  });

  return NextResponse.json(tableau, { status: 201 });
}


