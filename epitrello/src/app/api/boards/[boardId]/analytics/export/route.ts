
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ boardId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId } = await params;

    const board = await prisma.board.findUnique({
        where: { id: boardId },
        include: {
            members: {
                include: {
                    user: true,
                },
            },
        },
    });

    if (!board) {
        return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isOwner = board.userId === user.id;
    const isMember = board.members.some((member) => member.user.id === user.id);

    if (!isOwner && !isMember) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const lists = await prisma.list.findMany({
            where: { boardId },
            include: {
                cards: {
                    include: {
                        members: {
                            include: {
                                user: true,
                            },
                        },
                        labels: {
                            include: {
                                label: true
                            }
                        }
                    },
                },
            },
            orderBy: {
                position: 'asc'
            }
        });

        // CSV Header
        const header = ["Card ID", "Title", "List", "Status", "Created At", "Completed At", "Assignees", "Labels"].join(",");

        // CSV Rows
        const rows: string[] = [];

        lists.forEach(list => {
            list.cards.forEach(card => {
                const status = card.isDone ? "Completed" : "Active";
                const completedAt = card.isDone ? new Date(card.updatedAt).toISOString() : "";
                const assignees = card.members.map(m => m.user.name || m.user.email).join("; ");
                const labels = card.labels.map(l => l.label.name).join("; ");

                // Escape fields that might contain commas
                const escape = (text: string | null) => text ? `"${text.replace(/"/g, '""')}"` : "";

                rows.push([
                    card.id,
                    escape(card.title),
                    escape(list.title),
                    status,
                    new Date(card.createdAt).toISOString(),
                    completedAt,
                    escape(assignees),
                    escape(labels)
                ].join(","));
            });
        });

        const csvContent = [header, ...rows].join("\n");

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="board-export-${boardId}.csv"`,
            },
        });

    } catch (error) {
        console.error("Export failed", error);
        return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
    }
}
