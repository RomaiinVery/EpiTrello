import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ workspaceId: string; memberId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, memberId } = await params;

    // 1. Check if user exists
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Check if workspace exists
    const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
    });

    if (!workspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // 3. Check permissions: Only Owner can delete members (for now)
    if (workspace.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden. Only owner can remove members." }, { status: 403 });
    }

    // 4. Check if membership exists
    const membership = await prisma.workspaceMember.findUnique({
        where: { id: memberId },
    });

    if (!membership || membership.workspaceId !== workspaceId) {
        return NextResponse.json({ error: "Membership not found" }, { status: 404 });
    }

    // 5. Delete
    try {
        await prisma.workspaceMember.delete({
            where: { id: memberId }
        });
        return NextResponse.json({ message: "Member removed" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
    }
}
