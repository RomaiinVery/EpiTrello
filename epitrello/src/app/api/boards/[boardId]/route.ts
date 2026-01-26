
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";



export async function GET(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
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

  const { boardId } = await params;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      members: {
        select: {
          id: true,
          role: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              profileImage: true,
            }
          }
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      workspace: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  profileImage: true,
                },
              },
            },
          },
        },
      },
    }
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  const isOwner = board.userId === user.id;
  const isMember = board.members.some(member => member.user.id === user.id);

  if (!isOwner && !isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(board);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
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

  const { boardId } = await params;

  const board = await prisma.board.findUnique({
    where: { id: boardId }
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found or already deleted" }, { status: 404 });
  }

  if (board.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const deletedBoard = await prisma.board.delete({
      where: { id: boardId },
    });
    return NextResponse.json({ message: "Board deleted", board: deletedBoard });
  } catch {
    return NextResponse.json({ error: "Failed to delete board" }, { status: 500 });
  }
}