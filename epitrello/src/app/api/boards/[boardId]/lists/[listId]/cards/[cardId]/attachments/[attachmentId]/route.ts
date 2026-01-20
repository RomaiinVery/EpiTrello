import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../../../auth/[...nextauth]/route";
import { logActivity } from "@/app/lib/activity-logger";

import { prisma } from "@/app/lib/prisma";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ boardId: string; listId: string; cardId: string; attachmentId: string }> }
) {
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

        const { cardId, boardId, attachmentId } = await params;

        // Verify access
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

        const attachment = await prisma.attachment.findUnique({
            where: { id: attachmentId },
        });

        if (!attachment) {
            return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
        }

        if (attachment.cardId !== cardId) {
            return NextResponse.json({ error: "Attachment does not belong to this card" }, { status: 400 });
        }

        // Delete file from disk
        try {
            const { unlink } = await import("fs/promises");
            const { join } = await import("path");

            // url is like /uploads/filename.ext
            const relativePath = attachment.url.startsWith('/') ? attachment.url.slice(1) : attachment.url;
            const filepath = join(process.cwd(), "public", relativePath);

            await unlink(filepath);
        } catch (fileError) {
            console.warn("Could not delete attachment file:", fileError);
            // Continue to delete record from DB even if file delete fails (orphaned check later?)
        }

        // Delete from DB
        await prisma.attachment.delete({
            where: { id: attachmentId },
        });

        const card = await prisma.card.findUnique({ where: { id: cardId } });

        await logActivity({
            type: "attachment_deleted",
            description: `${user.name || user.email} a supprimé la pièce jointe "${attachment.name}"`,
            userId: user.id,
            boardId,
            cardId,
            metadata: {
                cardTitle: card?.title || "",
                attachmentName: attachment.name
            },
        });

        return NextResponse.json({ message: "Attachment deleted" });
    } catch (error) {
        console.error("Error deleting attachment:", error);
        return NextResponse.json({ error: "Failed to delete attachment" }, { status: 500 });
    }
}
