import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { checkBoardPermission, Permission, getPermissionErrorMessage } from "@/lib/permissions";

export async function GET(req: Request, { params }: { params: Promise<{ boardId: string; listId: string }> }) {
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

  const { boardId, listId } = await params;

  // Check read permission
  const { allowed, role } = await checkBoardPermission(user.id, boardId, Permission.READ);
  if (!allowed) {
    return NextResponse.json({
      error: getPermissionErrorMessage(role, Permission.READ)
    }, { status: 403 });
  }

  const list = await prisma.list.findUnique({
    where: { id: listId },
  });

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  return NextResponse.json(list);
}

export async function PUT(req: Request, { params }: { params: Promise<{ boardId: string; listId: string }> }) {
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

  const { boardId, listId } = await params;

  // Check edit permission
  const { allowed, role } = await checkBoardPermission(user.id, boardId, Permission.EDIT);
  if (!allowed) {
    return NextResponse.json({
      error: getPermissionErrorMessage(role, Permission.EDIT)
    }, { status: 403 });
  }

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

export async function DELETE(req: Request, { params }: { params: Promise<{ boardId: string; listId: string }> }) {
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

  const { boardId, listId } = await params;

  // Check delete permission
  const { allowed, role } = await checkBoardPermission(user.id, boardId, Permission.DELETE);
  if (!allowed) {
    return NextResponse.json({
      error: getPermissionErrorMessage(role, Permission.DELETE)
    }, { status: 403 });
  }

  try {
    const deleted = await prisma.list.delete({
      where: { id: listId },
    });

    return NextResponse.json({ message: "List deleted", list: deleted });
  } catch {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ boardId: string; listId: string }> }) {
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

  const { boardId, listId } = await params;

  // Check edit permission (reordering is an edit action)
  const { allowed, role } = await checkBoardPermission(user.id, boardId, Permission.EDIT);
  if (!allowed) {
    return NextResponse.json({
      error: getPermissionErrorMessage(role, Permission.EDIT)
    }, { status: 403 });
  }

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
