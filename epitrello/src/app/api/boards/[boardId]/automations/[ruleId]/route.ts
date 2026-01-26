import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ boardId: string; ruleId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { boardId, ruleId } = await params;

        // Verify ownership/permissions (Optional but good practice)
        // For now, assuming if you can access the board logic you can delete.

        await prisma.automationRule.delete({
            where: {
                id: ruleId,
                boardId: boardId // Ensure it belongs to this board
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ boardId: string; ruleId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { boardId, ruleId } = await params;
        const body = await request.json();
        const { triggerType, triggerVal, actionType, actionVal, isActive } = body;

        const updatedRule = await prisma.automationRule.update({
            where: {
                id: ruleId,
                boardId: boardId
            },
            data: {
                triggerType,
                triggerVal,
                actionType,
                actionVal,
                isActive
            }
        });

        return NextResponse.json(updatedRule);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
    }
}
