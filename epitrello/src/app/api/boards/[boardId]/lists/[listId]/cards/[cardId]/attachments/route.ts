import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../../auth/[...nextauth]/route";
import { logActivity } from "@/app/lib/activity-logger";

import { prisma } from "@/app/lib/prisma";

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

        // Verify board access
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
        });

        if (!card) {
            return NextResponse.json({ error: "Card not found" }, { status: 404 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const timestamp = Date.now();
        // Sanitize filename
        const originalName = file.name;

        const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filename = `${cardId}-${timestamp}-${safeName}`;
        const filepath = join(process.cwd(), "public", "uploads", filename);

        await writeFile(filepath, buffer);

        const attachment = await prisma.attachment.create({
            data: {
                name: originalName,
                url: `/uploads/${filename}`,
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
        const { cardId } = await params;
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
