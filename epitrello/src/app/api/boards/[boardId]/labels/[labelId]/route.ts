import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { checkBoardPermission, Permission, getPermissionErrorMessage } from "@/lib/permissions";

import { prisma } from "@/app/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ boardId: string; labelId: string }> }) {
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

    const { boardId, labelId } = await params;
    const { name, color } = await req.json();

    // Check EDIT permission (VIEWERs cannot update labels)
    const { allowed, role } = await checkBoardPermission(user.id, boardId, Permission.EDIT);
    if (!allowed) {
      return NextResponse.json({
        error: getPermissionErrorMessage(role, Permission.EDIT)
      }, { status: 403 });
    }

    const existingLabel = await prisma.label.findUnique({
      where: { id: labelId },
    });

    if (!existingLabel || existingLabel.boardId !== boardId) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    if (name && name.trim() !== existingLabel.name) {
      const duplicateLabel = await prisma.label.findUnique({
        where: {
          boardId_name: {
            boardId,
            name: name.trim(),
          },
        },
      });

      if (duplicateLabel) {
        return NextResponse.json({ error: "A label with this name already exists" }, { status: 400 });
      }
    }

    const updatedLabel = await prisma.label.update({
      where: { id: labelId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
      },
    });

    return NextResponse.json(updatedLabel);
  } catch (error) {
    console.error("Error updating label:", error);
    return NextResponse.json({ error: "Failed to update label" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ boardId: string; labelId: string }> }) {
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

    const { boardId, labelId } = await params;

    // Check DELETE permission (only OWNER and ADMIN can delete)
    const { allowed, role } = await checkBoardPermission(user.id, boardId, Permission.DELETE);
    if (!allowed) {
      return NextResponse.json({
        error: getPermissionErrorMessage(role, Permission.DELETE)
      }, { status: 403 });
    }

    const existingLabel = await prisma.label.findUnique({
      where: { id: labelId },
    });

    if (!existingLabel || existingLabel.boardId !== boardId) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    await prisma.label.delete({
      where: { id: labelId },
    });

    return NextResponse.json({ message: "Label deleted successfully" });
  } catch (error) {
    console.error("Error deleting label:", error);
    return NextResponse.json({ error: "Failed to delete label" }, { status: 500 });
  }
}


