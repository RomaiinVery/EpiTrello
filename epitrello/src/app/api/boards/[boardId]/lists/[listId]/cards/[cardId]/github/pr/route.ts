import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/app/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ boardId: string; listId: string; cardId: string }> }
) {
    const { boardId, cardId } = await params;

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

    if (!board || !board.githubRepo) {
        return NextResponse.json({ error: "Board not linked to GitHub" }, { status: 400 });
    }

    const card = await prisma.card.findUnique({
        where: { id: cardId },
    });

    if (!card) {
        return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    try {
        const { title, head, base, draft, body } = await request.json();

        if (!head || !base || !title) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // append "Closes #issueNumber" if issue exists
        let description = body || "";
        if (card.githubIssueNumber) {
            description += `\n\nCloses #${card.githubIssueNumber}`;
        }

        const res = await fetch(`https://api.github.com/repos/${board.githubRepo}/pulls`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${user.githubAccessToken}`,
                Accept: "application/vnd.github.v3+json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                title,
                head, // source branch
                base, // target branch
                body: description,
                draft: !!draft
            }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            console.error("GitHub PR Creation Error:", errorData);
            return NextResponse.json({ error: errorData.message || "Failed to create PR" }, { status: res.status });
        }

        const pr = await res.json();

        return NextResponse.json(pr, { status: 201 });

    } catch (error) {
        console.error("GitHub API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
