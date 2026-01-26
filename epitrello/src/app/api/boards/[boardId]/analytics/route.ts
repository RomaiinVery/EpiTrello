
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ boardId: string }> }
) {
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

    // Check access (Owner or Member)
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

    const isOwner = board.userId === user.id;
    const isMember = board.members.some((member) => member.user.id === user.id);

    if (!isOwner && !isMember) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        // Fetch all lists and cards for the board to calculate metrics
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
                    },
                },
            },
        });

        let totalCards = 0;
        let completedCards = 0;

        // List Distribution
        const listDistribution: { name: string; value: number }[] = [];

        // Member Distribution (Map to aggregate counts)
        const memberMap = new Map<string, number>();

        lists.forEach((list) => {
            const cardCount = list.cards.length;
            totalCards += cardCount;
            listDistribution.push({ name: list.title, value: cardCount });

            list.cards.forEach((card) => {
                if (card.isDone) {
                    completedCards++;
                }

                card.members.forEach((m) => {
                    const name = m.user.name || m.user.email || "Unknown";
                    memberMap.set(name, (memberMap.get(name) || 0) + 1);
                });
            });
        });

        const memberDistribution = Array.from(memberMap.entries()).map(
            ([name, value]) => ({ name, value })
        );

        return NextResponse.json({
            totalCards,
            completedCards,
            listDistribution,
            memberDistribution,
        });
    } catch (error) {
        console.error("Error calculating analytics:", error);
        return NextResponse.json(
            { error: "Failed to fetch analytics" },
            { status: 500 }
        );
    }
}
