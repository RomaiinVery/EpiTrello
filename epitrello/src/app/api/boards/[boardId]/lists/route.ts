import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { checkBoardPermission, Permission, getPermissionErrorMessage } from "@/lib/permissions";



export async function GET(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
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

  // Check read permission
  const { allowed, role } = await checkBoardPermission(user.id, boardId, Permission.READ);
  if (!allowed) {
    return NextResponse.json({
      error: getPermissionErrorMessage(role, Permission.READ)
    }, { status: 403 });
  }

  const lists = await prisma.list.findMany({
    where: { boardId },
  });

  return NextResponse.json(lists);
}

export async function POST(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
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
  const { title, position } = await request.json();

  if (!title || typeof title !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid 'title'" },
      { status: 400 }
    );
  }

  // Check edit permission
  const { allowed, role } = await checkBoardPermission(user.id, boardId, Permission.EDIT);
  if (!allowed) {
    return NextResponse.json({
      error: getPermissionErrorMessage(role, Permission.EDIT)
    }, { status: 403 });
  }

  const list = await prisma.list.create({
    data: {
      title,
      position: position ?? 0,
      board: { connect: { id: boardId } },
    },
  });

  return NextResponse.json(list, { status: 201 });
}