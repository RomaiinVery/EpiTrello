import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { checkBoardPermission, Permission, getPermissionErrorMessage } from "@/lib/permissions";

import { prisma } from "@/app/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  try {
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

    // Check READ permission
    const { allowed, role } = await checkBoardPermission(user.id, boardId, Permission.READ);
    if (!allowed) {
      return NextResponse.json({
        error: getPermissionErrorMessage(role, Permission.READ)
      }, { status: 403 });
    }

    const labels = await prisma.label.findMany({
      where: { boardId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(labels);
  } catch (error) {
    console.error("Error fetching labels:", error);
    return NextResponse.json({ error: "Failed to fetch labels" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  try {
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
    const { name, color } = await req.json();

    if (!name || !color) {
      return NextResponse.json({ error: "Name and color are required" }, { status: 400 });
    }

    // Check EDIT permission (VIEWERs cannot create labels)
    const { allowed, role } = await checkBoardPermission(user.id, boardId, Permission.EDIT);
    if (!allowed) {
      return NextResponse.json({
        error: getPermissionErrorMessage(role, Permission.EDIT)
      }, { status: 403 });
    }

    const existingLabel = await prisma.label.findUnique({
      where: {
        boardId_name: {
          boardId,
          name: name.trim(),
        },
      },
    });

    if (existingLabel) {
      return NextResponse.json({ error: "A label with this name already exists" }, { status: 400 });
    }

    const label = await prisma.label.create({
      data: {
        name: name.trim(),
        color,
        boardId,
      },
    });

    return NextResponse.json(label, { status: 201 });
  } catch (error) {
    console.error("Error creating label:", error);
    return NextResponse.json({ error: "Failed to create label" }, { status: 500 });
  }
}


