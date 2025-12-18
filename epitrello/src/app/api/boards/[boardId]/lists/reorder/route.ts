import { NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ListUpdateData = {
  id: string;
  position: number;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;
  const body = await request.json();

  const { lists }: { lists: ListUpdateData[] } = body;

  if (!lists || !Array.isArray(lists)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const transaction = lists.map((list) =>
      prisma.list.update({
        where: {
          id: list.id,
          boardId: boardId,
        },
        data: {
          position: list.position,
        },
      })
    );

    await prisma.$transaction(transaction);
    return NextResponse.json({ message: "Lists reordered successfully" }, { status: 200 });
  } catch (error) {
    console.error("Failed to reorder lists:", error);
    return NextResponse.json({ error: "Failed to reorder lists" }, { status: 500 });
  }
}