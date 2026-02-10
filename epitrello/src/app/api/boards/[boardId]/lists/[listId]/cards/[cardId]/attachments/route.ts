import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../../auth/[...nextauth]/route";
import { logActivity } from "@/app/lib/activity-logger";
import { v2 as cloudinary } from "cloudinary";

import { prisma } from "@/app/lib/prisma";
import { checkBoardPermission, Permission, getPermissionErrorMessage } from "@/lib/permissions";
import { validateFile, sanitizeFilename } from "@/lib/file-security";

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

        // Check EDIT permission (VIEWERs cannot upload attachments)
        const { allowed, role } = await checkBoardPermission(user.id, boardId, Permission.EDIT);
        if (!allowed) {
            return NextResponse.json({
                error: getPermissionErrorMessage(role, Permission.EDIT)
            }, { status: 403 });
        }

        const card = await prisma.card.findUnique({
            where: { id: cardId },
        });

        if (!card) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate file security
        const validation = await validateFile(file);
        if (!validation.valid) {
            return NextResponse.json({
                error: validation.error || "File validation failed"
            }, { status: 400 });
        }

        // Log warnings if any
        if (validation.warnings && validation.warnings.length > 0) {
            console.warn("File validation warnings:", validation.warnings);
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const originalName = sanitizeFilename(file.name);

        const base64Data = buffer.toString("base64");
        const fileUri = `data:${file.type};base64,${base64Data}`;

        const uploadResponse = await cloudinary.uploader.upload(fileUri, {
            folder: "epitrello/attachments",
            public_id: `card_${cardId}_${Date.now()}`,
            resource_type: "auto",
        });

        const fileUrl = uploadResponse.secure_url;

        const attachment = await prisma.attachment.create({
            data: {
                name: originalName,
                url: fileUrl,
                type: file.type,
                size: file.size,
                cardId: cardId,
                userId: user.id,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profileImage: true,
                    }
                }
            }
        });

        await logActivity({
            type: "attachment_uploaded",
            description: `${user.name || user.email} a ajouté une pièce jointe "${originalName}" à la carte "${card.title}"`,
            userId: user.id,
            boardId,
            cardId,
            metadata: {
                cardTitle: card.title,
                attachmentName: originalName,
                attachmentId: attachment.id
            },
        });

        return NextResponse.json(attachment);
    } catch (error) {
        console.error("Error uploading attachment:", error);
        return NextResponse.json({ error: "Failed to upload attachment" }, { status: 500 });
    }
}

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

        const { boardId, cardId } = await params;

        // Check read permission
        const { allowed, role } = await checkBoardPermission(user.id, boardId, Permission.READ);
        if (!allowed) {
            return NextResponse.json({
                error: getPermissionErrorMessage(role, Permission.READ)
            }, { status: 403 });
        }

        const attachments = await prisma.attachment.findMany({
            where: { cardId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profileImage: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(attachments);
    } catch (error) {
        console.error("Error fetching attachments:", error);
        return NextResponse.json({ error: "Failed to fetch attachments" }, { status: 500 });
    }
}
