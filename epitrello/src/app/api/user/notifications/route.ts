import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: Request) {
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

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "50");

        // Fetch activities for boards where user is a member or owner
        // AND where the activity was NOT performed by the current user
        const activities = await prisma.activity.findMany({
            where: {
                userId: {
                    not: user.id, // Exclude own activities
                },
                board: {
                    OR: [
                        { userId: user.id },
                        { members: { some: { userId: user.id } } },
                    ],
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        profileImage: true,
                    },
                },
                board: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                card: {
                    select: {
                        id: true,
                        title: true,
                    }
                }
            },
            orderBy: { createdAt: "desc" },
            take: limit,
        });

        // Parse metadata
        const formattedActivities = activities.map((activity) => ({
            ...activity,
            metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
        }));

        return NextResponse.json(formattedActivities);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json(
            { error: "Failed to fetch notifications" },
            { status: 500 }
        );
    }
}
