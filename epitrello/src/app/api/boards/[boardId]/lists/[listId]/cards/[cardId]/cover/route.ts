import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../../auth/[...nextauth]/route";
import { logActivity } from "@/app/lib/activity-logger";
import { v2 as cloudinary } from "cloudinary";

import { prisma } from "@/app/lib/prisma";
import { checkBoardPermission, Permission, getPermissionErrorMessage } from "@/lib/permissions";
import { validateCoverImage } from "@/lib/file-security";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request, { params }: { params: Promise<{ boardId: string; listId: string; cardId: string }> }) {
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

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { members: true },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const isOwner = board.userId === user.id;
    const isMember = board.members.some(member => member.id === user.id);

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { list: true },
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

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only images are allowed." }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString("base64");
    const fileUri = `data:${file.type};base64,${base64Data}`;

    const uploadResponse = await cloudinary.uploader.upload(fileUri, {
      folder: "epitrello/covers",
      public_id: `card_${cardId}_${Date.now()}`,
      transformation: [
        { quality: "auto", fetch_format: "auto" }
      ]
    });

    const imageUrl = uploadResponse.secure_url;
    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: { coverImage: imageUrl },
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

    await logActivity({
      type: "cover_uploaded",
      description: `${user.name || user.email} a ajouté une image de couverture à la carte "${updatedCard.title || card.title}"`,
      userId: user.id,
      boardId,
      cardId,
      metadata: { cardTitle: updatedCard.title || card.title },
    });

    return NextResponse.json({ coverImage: imageUrl, card: formattedCard });
  } catch (error) {
    console.error("Error uploading cover image:", error);
    return NextResponse.json({ error: "Failed to upload cover image" }, { status: 500 });
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

    // Check EDIT permission (VIEWERs cannot remove cover images)
    const { allowed, role } = await checkBoardPermission(user.id, boardId, Permission.EDIT);
    if (!allowed) {
      return NextResponse.json({
        error: getPermissionErrorMessage(role, Permission.EDIT)
      }, { status: 403 });
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { list: true },
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

    if (card.coverImage && card.coverImage.includes("cloudinary")) {
      try {
        const urlParts = card.coverImage.split("/");
        const folderAndFile = urlParts.slice(urlParts.indexOf("epitrello")).join("/").replace(/\.[^.]+$/, "");
        await cloudinary.uploader.destroy(folderAndFile);
      } catch (cloudError) {
        console.warn("Could not delete cover image from Cloudinary:", cloudError);
      }
    }

    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: { coverImage: null },
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

    await logActivity({
      type: "cover_removed",
      description: `${user.name || user.email} a retiré l'image de couverture de la carte "${updatedCard.title || card.title}"`,
      userId: user.id,
      boardId,
      cardId,
      metadata: { cardTitle: updatedCard.title || card.title },
    });

    return NextResponse.json({ message: "Cover image removed", card: formattedCard });
  } catch (error) {
    console.error("Error removing cover image:", error);
    return NextResponse.json({ error: "Failed to remove cover image" }, { status: 500 });
  }
}

