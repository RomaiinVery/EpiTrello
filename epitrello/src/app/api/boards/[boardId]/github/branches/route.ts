import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/app/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ boardId: string }> }
) {
    const { boardId } = await params;

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, githubAccessToken: true }
    });

    if (!user || !user.githubAccessToken) {
        return NextResponse.json({ error: "GitHub not connected" }, { status: 401 });
    }

    const board = await prisma.board.findUnique({
        where: { id: boardId },
    });

    if (!board) {
        return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    if (!board.githubRepo) {
        return NextResponse.json({ error: "Board not linked to GitHub" }, { status: 400 });
    }

    try {
        const res = await fetch(`https://api.github.com/repos/${board.githubRepo}/branches`, {
            headers: {
                Authorization: `Bearer ${user.githubAccessToken}`,
                Accept: "application/vnd.github.v3+json",
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error("GitHub Branches Fetch Error:", errorText);
            return NextResponse.json({ error: "Failed to fetch branches from GitHub" }, { status: res.status });
        }

        const branches = await res.json();
        return NextResponse.json(branches);

    } catch (error) {
        console.error("GitHub API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
