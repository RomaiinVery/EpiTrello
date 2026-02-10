import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../auth/[...nextauth]/route";
import { logActivity } from "@/app/lib/activity-logger";
import { AutomationService, TriggerType } from "@/app/lib/automation";
import { checkBoardPermission, Permission, getPermissionErrorMessage } from "@/lib/permissions";

import { prisma } from "@/app/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ boardId: string; listId: string; cardId: string }> }) {
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

    const { cardId, boardId } = await params;

    // Check READ permission
    const { allowed, role } = await checkBoardPermission(user.id, boardId, Permission.READ);
    if (!allowed) {
      return NextResponse.json({
        error: getPermissionErrorMessage(role, Permission.READ)
      }, { status: 403 });
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: {
          select: {
            id: true,
            title: true,
            boardId: true,
          },
        },
        labels: {
          include: {
            label: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    if (!card.list) {
      return NextResponse.json({ error: "Card list not found" }, { status: 404 });
    }

    if (card.list.boardId !== boardId) {
      return NextResponse.json({ error: "Card does not belong to this board" }, { status: 400 });
    }

    const formattedCard = {
      ...card,
      labels: card.labels.map(cl => cl.label),
      members: card.members.map(cm => cm.user),
    };

    return NextResponse.json(formattedCard);
  } catch (error) {
    console.error("Error fetching card:", error);
    return NextResponse.json({ error: "Failed to fetch card" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ boardId: string; listId: string; cardId: string }> }) {
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

    const { cardId, boardId } = await params;
    const body = await request.json();
    const { title, content, coverImage, dueDate, startDate, isDone } = body;

    // Check EDIT permission (VIEWERs cannot update cards)
    const { allowed, role } = await checkBoardPermission(user.id, boardId, Permission.EDIT);
    if (!allowed) {
      return NextResponse.json({
        error: getPermissionErrorMessage(role, Permission.EDIT)
      }, { status: 403 });
    }

    if (title === undefined && content === undefined && coverImage === undefined && dueDate === undefined && startDate === undefined && isDone === undefined) {
      return NextResponse.json({ error: "No updateable fields provided." }, { status: 400 });
    }

    if (coverImage !== undefined) {
      return NextResponse.json({
        error: "coverImage cannot be updated via PUT. Use POST /cover to upload an image."
      }, { status: 400 });
    }

    const oldCard = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!oldCard) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(isDone !== undefined && { isDone }),
      },
      include: {
        list: {
          select: {
            id: true,
            title: true,
            boardId: true,
          },
        },
        labels: {
          include: {
            label: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const formattedCard = {
      ...updatedCard,
      labels: updatedCard.labels.map(cl => cl.label),
      members: updatedCard.members.map(cm => cm.user),
    };

    const changes: string[] = [];
    if (title !== undefined && title !== oldCard.title) {
      changes.push(`titre de "${oldCard.title}" à "${title}"`);
    }
    if (content !== undefined && content !== oldCard.content) {
      changes.push("description");
    }
    if (dueDate !== undefined && dueDate !== oldCard.dueDate?.toISOString()) {
      changes.push("date d'échéance");
    }
    if (startDate !== undefined && startDate !== oldCard.startDate?.toISOString()) {
      changes.push("date de début");
    }
    if (isDone !== undefined && isDone !== oldCard.isDone) {
      changes.push(isDone ? "marqué comme terminé" : "marqué comme non terminé");
    }

    if (changes.length > 0) {
      await logActivity({
        type: "card_updated",
        description: `${user.name || user.email} a modifié ${changes.join(", ")} de la carte "${updatedCard.title}"`,
        userId: user.id,
        boardId,
        cardId,
        metadata: {
          oldTitle: oldCard.title,
          newTitle: updatedCard.title,
          listTitle: updatedCard.list.title,
        },
      });
    }

    // AUTOMATION TRIGGER
    if (updatedCard.listId !== oldCard.listId) {
      // Fire and forget automation to not block response
      AutomationService.processTrigger(
        boardId,
        TriggerType.CARD_MOVED_TO_LIST,
        updatedCard.listId,
        { cardId: updatedCard.id }
      ).catch(e => console.error("Automation Trigger Error:", e));
    }

    return NextResponse.json(formattedCard);
  } catch (error) {
    console.error("Error updating card:", error);
    return NextResponse.json({ error: "Failed to update card." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ boardId: string; listId: string; cardId: string }> }) {
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

    const { cardId, boardId } = await params;

    // Check DELETE permission (only OWNER and ADMIN can delete)
    const { allowed, role } = await checkBoardPermission(user.id, boardId, Permission.DELETE);
    if (!allowed) {
      return NextResponse.json({
        error: getPermissionErrorMessage(role, Permission.DELETE)
      }, { status: 403 });
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    await prisma.card.delete({
      where: { id: cardId },
    });

    await logActivity({
      type: "card_deleted",
      description: `${user.name || user.email} a supprimé la carte "${card.title}"`,
      userId: user.id,
      boardId,
      cardId: undefined,
      metadata: { cardTitle: card.title, listTitle: card.list.title },
    });

    return NextResponse.json({ message: "Card deleted successfully." });
  } catch (error) {
    console.error("Error deleting card:", error);
    return NextResponse.json({ error: "Failed to delete card." }, { status: 500 });
  }
}
