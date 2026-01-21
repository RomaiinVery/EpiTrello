import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
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

    try {
        // 1. Active Boards: Boards where user is owner OR member OR workspace member (simplified: using same logic as boards list usually uses, or strictly access)
        // For stats, let's count boards where the user has explicit access or is owner.
        const activeBoardsCount = await prisma.board.count({
            where: {
                OR: [
                    { userId: user.id },
                    { members: { some: { userId: user.id } } },
                    { workspace: { members: { some: { userId: user.id } } } },
                    { workspace: { userId: user.id } }
                ]
            }
        });

        // 2. Tasks Assigned: Incomplete tasks assigned to user
        const tasksAssignedCount = await prisma.card.count({
            where: {
                members: { some: { userId: user.id } },
                isDone: false,
                archived: false
            }
        });

        // 3. Overdue Tasks (replacing "Pending Review"): Incomplete tasks past due date
        const overdueTasksCount = await prisma.card.count({
            where: {
                members: { some: { userId: user.id } },
                isDone: false,
                archived: false,
                dueDate: {
                    lt: new Date()
                }
            }
        });

        // 4. Completed Tasks (replacing "Productivity"): Completed tasks assigned to user
        const completedTasksCount = await prisma.card.count({
            where: {
                members: { some: { userId: user.id } },
                isDone: true,
                archived: false
            }
        });

        return NextResponse.json({
            activeBoards: activeBoardsCount,
            tasksAssigned: tasksAssignedCount,
            overdueTasks: overdueTasksCount,
            completedTasks: completedTasksCount
        });

    } catch (error) {
        console.error("Error fetching user stats:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
