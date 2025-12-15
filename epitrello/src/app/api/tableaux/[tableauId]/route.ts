import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ tableauId: string }> }) {
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

  const { tableauId } = await params;

  const tableau = await prisma.tableau.findFirst({
    where: { id: tableauId, userId: user.id },
    include: {
      boards: {
        select: { id: true, title: true, description: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!tableau) {
    return NextResponse.json({ error: "Tableau not found" }, { status: 404 });
  }

  return NextResponse.json(tableau);
}

export async function PUT(req: Request, { params }: { params: Promise<{ tableauId: string }> }) {
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

  const { tableauId } = await params;
  const { title, description } = await req.json();

  const tableau = await prisma.tableau.findFirst({
    where: { id: tableauId, userId: user.id },
  });

  if (!tableau) {
    return NextResponse.json({ error: "Tableau not found" }, { status: 404 });
  }

  const updated = await prisma.tableau.update({
    where: { id: tableauId },
    data: {
      title: title ?? tableau.title,
      description: description ?? tableau.description,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ tableauId: string }> }) {
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

  const { tableauId } = await params;

  const tableau = await prisma.tableau.findFirst({
    where: { id: tableauId, userId: user.id },
  });

  if (!tableau) {
    return NextResponse.json({ error: "Tableau not found" }, { status: 404 });
  }

  await prisma.tableau.delete({
    where: { id: tableauId },
  });

  return NextResponse.json({ message: "Tableau deleted" });
}

