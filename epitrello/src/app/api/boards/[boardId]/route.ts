
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
      labels: true,
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

export async function PUT(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
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
  const { title, description, background } = await req.json();

  const board = await prisma.board.findUnique({
    where: { id: boardId }
  });

  if (!board) {
    return NextResponse.json({ error: "Board not found" }, { status: 404 });
  }

  // Check permissions (Owner or Admin/Editor member)
  const isOwner = board.userId === user.id;
  // We should ideally check standard member permissions if not owner,
  // but for simplicity let's stick to Owner for critical updates or existing logic.
  // The GET logic allowed members. Let's start with Owner check for updates to be safe,
  // or allow if member. Let's stick to Owner for now as per DELETE.
  // Actually, standard Trello allows members to change background usually.
  // Let's copy the check from DELETE for consistency first, or verify if we want to allow members.
  // The DELETE allows only Owner. Let's loosen it for PUT if we want members to edit.
  // But for now let's strict to Owner to match DELETE logic in this file, or check BoardMember role?
  // Let's allow Owner for now.

  if (!isOwner) {
    // Check if user is a board member with sufficient role?
    // For now, let's enforce owner for simplicity as per DELETE.
    // If we want to allow members, we need to query BoardMember.
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const updatedBoard = await prisma.board.update({
      where: { id: boardId },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        background: background !== undefined ? background : undefined,
      },
    });
    return NextResponse.json(updatedBoard);
  } catch {
    return NextResponse.json({ error: "Failed to update board" }, { status: 500 });
  }
}