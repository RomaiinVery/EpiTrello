import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { checkBoardPermission, Permission, getPermissionErrorMessage } from "@/lib/permissions";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ boardId: string; ruleId: string }> }
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

        const { boardId, ruleId } = await params;

        // Check delete permission (ADMIN/OWNER only, not EDITOR or VIEWER)
        const { allowed, role } = await checkBoardPermission(user.id, boardId, Permission.DELETE);
        if (!allowed) {
            return NextResponse.json({
                error: getPermissionErrorMessage(role, Permission.DELETE)
            }, { status: 403 });
        }

        await prisma.automationRule.delete({
            where: {
                id: ruleId,
                boardId: boardId // Ensure it belongs to this board
            }
        });

        return NextResponse.json({ success: true });
    } catch {
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

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { boardId, ruleId } = await params;

        // Check edit permission
        const { allowed, role } = await checkBoardPermission(user.id, boardId, Permission.EDIT);
        if (!allowed) {
            return NextResponse.json({
                error: getPermissionErrorMessage(role, Permission.EDIT)
            }, { status: 403 });
        }

        const body = await request.json();
        const { triggerType, triggerVal, actions, isActive } = body;

        const updatedRule = await prisma.automationRule.update({
            where: {
                id: ruleId,
                boardId: boardId
            },
            data: {
                triggerType,
                triggerVal,
                isActive,
                actions: {
                    deleteMany: {},
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    create: actions.map((action: any) => ({
                        type: action.type,
                        value: action.value
                    }))
                }
            },
            include: { actions: true }
        });

        return NextResponse.json(updatedRule);
    } catch {
        return NextResponse.json({ error: "Failed to update rule" }, { status: 500 });
    }
}
