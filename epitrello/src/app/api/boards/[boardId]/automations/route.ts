import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { boardId } = await params;

        const rules = await prisma.automationRule.findMany({
            where: { boardId },
            include: { actions: true },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(rules);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ boardId: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { boardId } = await params;
        const body = await request.json();
        const { triggerType, triggerVal, actions } = body;

        const rule = await prisma.automationRule.create({
            data: {
                boardId,
                triggerType,
                triggerVal,
                actions: {
                    create: actions.map((action: any) => ({
                        type: action.type,
                        value: action.value
                    }))
                }
            },
            include: { actions: true }
        });

        return NextResponse.json(rule, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
    }
}
