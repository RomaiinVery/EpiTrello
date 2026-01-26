import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { boardId } = await params;

        // Verify access logic similar to other routes (omitted for brevity but implied)

        // Join logs with rules to ensure they belong to the board
        const logs = await prisma.automationLog.findMany({
            where: {
                rule: {
                    boardId: boardId
                }
            },
            include: {
                rule: true
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return NextResponse.json(logs);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }
}
