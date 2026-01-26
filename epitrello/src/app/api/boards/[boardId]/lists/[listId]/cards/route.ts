import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../auth/[...nextauth]/route";
import { logActivity } from "@/app/lib/activity-logger";

import { prisma } from "@/app/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ boardId: string; listId: string }> }) {
  const { listId } = await params;

  if (!listId) {
    return NextResponse.json({ error: 'Missing listId parameter' }, { status: 400 });
  }

  try {
    const cards = await prisma.card.findMany({
      where: { listId },
      orderBy: { position: 'asc' },
      include: {
        labels: {
          include: {
            label: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const formattedCards = cards.map(card => ({
      ...card,
      labels: card.labels.map(cl => cl.label),
      members: card.members.map(cm => cm.user),
    }));

    return NextResponse.json(formattedCards, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Failed to retrieve cards' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ boardId: string; listId: string }> }) {
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

    const { listId, boardId } = await params;

    if (!listId) {
      return NextResponse.json({ error: 'Missing listId parameter' }, { status: 400 });
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        members: true,
        workspace: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const isBoardOwner = board.userId === user.id;
    const isBoardMember = board.members.some(member => member.userId === user.id);
    const isWorkspaceOwner = board.workspace.userId === user.id;
    const isWorkspaceMember = board.workspace.members.some(member => member.userId === user.id);

    console.log("DEBUG PERMISSION:", {
      userId: user.id,
      boardOwnerId: board.userId,
      isBoardOwner,
      isBoardMember,
      isWorkspaceOwner,
      isWorkspaceMember,
    });

    if (!isBoardOwner && !isBoardMember && !isWorkspaceOwner && !isWorkspaceMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const list = await prisma.list.findUnique({
      where: { id: listId },
    });

    if (!list || list.boardId !== boardId) {
      return NextResponse.json({ error: "List not found or does not belong to this board" }, { status: 404 });
    }

    const body = await request.json();
    const { title, content } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required and must be a string' }, { status: 400 });
    }

    const lastCard = await prisma.card.findFirst({
      where: { listId },
      orderBy: { position: 'desc' },
    });

    const nextPosition = lastCard ? lastCard.position + 1 : 0;

    let githubIssueNumber = null;
    let githubIssueUrl = null;

    // GitHub Integration
    console.log("DEBUG GITHUB: Checking integration...");
    console.log("DEBUG GITHUB: Board Repo:", board.githubRepo);
    console.log("DEBUG GITHUB: User Token Present:", !!user.githubAccessToken);

    if (board.githubRepo && user.githubAccessToken) {
      try {
        console.log("DEBUG GITHUB: Attempting to create issue...");
        const githubRes = await fetch(`https://api.github.com/repos/${board.githubRepo}/issues`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.githubAccessToken}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: title,
            body: content || "",
            labels: ["epitrello"]
          }),
        });

        console.log("DEBUG GITHUB: Response Status:", githubRes.status);

        if (githubRes.ok) {
          const issueData = await githubRes.json();
          console.log("DEBUG GITHUB: Issue Created:", issueData.html_url);
          githubIssueNumber = issueData.number;
          githubIssueUrl = issueData.html_url;
        } else {
          const errorText = await githubRes.text();
          console.error("DEBUG GITHUB: Failed -", errorText);
        }
      } catch (error) {
        console.error("DEBUG GITHUB: Exception -", error);
      }
    } else {
      console.log("DEBUG GITHUB: Skipping integration. Missing repo or token.");
    }

    const newCard = await prisma.card.create({
      data: {
        title,
        content: content ?? null,
        position: nextPosition,
        listId,
        githubIssueNumber,
        githubIssueUrl,
      },
    });

    await logActivity({
      type: "card_created",
      description: `${user.name || user.email} a créé la carte "${title}"`,
      userId: user.id,
      boardId,
      cardId: newCard.id,
      metadata: { listTitle: list.title },
    });

    return NextResponse.json(newCard, { status: 201 });
  } catch (error) {
    console.error("Error creating card:", error);
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
}
