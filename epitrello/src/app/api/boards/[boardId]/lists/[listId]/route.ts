import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: { boardId: string; listId: string } }) {
  const { listId } = await params;

  const list = await prisma.list.findUnique({
    where: { id: listId },
  });

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  return NextResponse.json(list);
}

export async function PUT(req: Request, { params }: { params: { boardId: string; listId: string } }) {
  const { listId } = await params;
  const { title, position } = await req.json();

  const list = await prisma.list.update({
    where: { id: listId },
    data: {
      ...(title && { title }),
      ...(position !== undefined && { position }),
    },
  });

  return NextResponse.json(list);
}

export async function DELETE(req: Request, { params }: { params: { boardId: string; listId: string } }) {
  const { listId } = await params;

  try {
    const deleted = await prisma.list.delete({
      where: { id: listId },
    });

    return NextResponse.json({ message: "List deleted", list: deleted });
  } catch {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: { params: { boardId: string; listId: string } }) {
  const { listId } = await params;
  const { newPosition } = await req.json();

  if (typeof newPosition !== "number") {
    return NextResponse.json({ error: "Invalid position" }, { status: 400 });
  }

  const updated = await prisma.list.update({
    where: { id: listId },
    data: { position: newPosition },
  });

  return NextResponse.json(updated);
}
