
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

    const url = new URL(req.url);
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");

    let dateFilter = {};
    if (startDateParam && endDateParam) {
        dateFilter = {
            createdAt: {
                gte: new Date(startDateParam),
                lte: new Date(endDateParam),
            },
        };
    }

    try {
        // Fetch all lists and cards
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
        let totalCompletionTimeMs = 0;
        let completedCardsWithTime = 0;

        // List Distribution
        const listDistribution: { name: string; value: number }[] = [];

        // Member Distribution
        const memberMap = new Map<string, number>();

        // Timeline Data: key = YYYY-MM-DD
        const timelineMap = new Map<string, { date: string; created: number; completed: number }>();

        lists.forEach((list) => {
            const cardCount = list.cards.length;
            totalCards += cardCount;
            listDistribution.push({ name: list.title, value: cardCount });

            list.cards.forEach((card) => {
                // Member stats
                card.members.forEach((m) => {
                    const name = m.user.name || m.user.email || "Unknown";
                    memberMap.set(name, (memberMap.get(name) || 0) + 1);
                });

                // Completion stats
                if (card.isDone) {
                    completedCards++;
                    const completionTime = new Date(card.updatedAt).getTime() - new Date(card.createdAt).getTime();
                    if (completionTime > 0) {
                        totalCompletionTimeMs += completionTime;
                        completedCardsWithTime++;
                    }
                }

                // Timeline population
                const createdDate = new Date(card.createdAt).toISOString().split("T")[0];
                if (!timelineMap.has(createdDate)) {
                    timelineMap.set(createdDate, { date: createdDate, created: 0, completed: 0 });
                }
                timelineMap.get(createdDate)!.created++;

                if (card.isDone) {
                    const doneDate = new Date(card.updatedAt).toISOString().split("T")[0];
                    if (!timelineMap.has(doneDate)) {
                        timelineMap.set(doneDate, { date: doneDate, created: 0, completed: 0 });
                    }
                    timelineMap.get(doneDate)!.completed++;
                }
            });
        });

        const memberDistribution = Array.from(memberMap.entries()).map(
            ([name, value]) => ({ name, value })
        );

        // Filter and Sort Timeline
        let timelineData = Array.from(timelineMap.values()).sort((a, b) =>
            a.date.localeCompare(b.date)
        );

        // Filter timeline by requested date range if provided
        if (startDateParam && endDateParam) {
            const startStr = new Date(startDateParam).toISOString().split("T")[0];
            const endStr = new Date(endDateParam).toISOString().split("T")[0];
            timelineData = timelineData.filter(d => d.date >= startStr && d.date <= endStr);
        } else {
            // Default limit to last 30 entries if no filter to avoid huge payload
            timelineData = timelineData.slice(-30);
        }


        // Avg Completion Time
        const avgCompletionTimeHours =
            completedCardsWithTime > 0
                ? Math.round((totalCompletionTimeMs / completedCardsWithTime) / (1000 * 60 * 60))
                : 0;

        return NextResponse.json({
            totalCards,
            completedCards,
            listDistribution,
            memberDistribution,
            timelineData,
            avgCompletionTimeHours
        });
    } catch (error) {
        console.error("Error calculating analytics:", error);
        return NextResponse.json(
            { error: "Failed to fetch analytics" },
            { status: 500 }
        );
    }
}
