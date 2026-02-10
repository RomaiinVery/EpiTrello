import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "../../lib/prisma";
import { logActivity } from "@/app/lib/activity-logger";

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId") || undefined;

    const boards = await prisma.board.findMany({
      where: {
        workspaceId,
        OR: [
          { userId: user.id },
          { members: { some: { userId: user.id } } },
          { workspace: { members: { some: { userId: user.id } } } },
          { workspace: { userId: user.id } }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        members: {
          select: {
            id: true,
            role: true,
            user: {
              select: { id: true, name: true, email: true, profileImage: true }
            }
          }
        },
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json(boards);
  } catch (error) {
    console.error('Error in GET /api/boards:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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

    const { title, description, workspaceId, githubRepo, githubBranch, background } = await req.json();

    if (!title || !workspaceId) {
      return NextResponse.json({ error: "Title and workspaceId are required" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          { userId: user.id },
          {
            members: {
              some: {
                userId: user.id,
                role: { in: ["ADMIN", "EDITOR"] }
              }
            }
          }
        ]
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace introuvable ou vous n'avez pas les droits de création" }, { status: 404 });
    }

    const board = await prisma.board.create({
      data: {
        title,
        description,
        workspaceId,
        userId: user.id,
        githubRepo: githubRepo || null,
        githubBranch: githubBranch || null,
        background: background || null,
        lists: {
          create: [
            { title: "To Do", position: 0 },
            { title: "Doing", position: 1 },
            { title: "Done", position: 2 },
          ],
        },
      },
      include: {
        lists: true,
      },
    });

    await logActivity({
      type: "board_created",
      description: `${user.name || user.email} a créé le tableau "${title}"`,
      userId: user.id,
      boardId: board.id,
    });

    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/boards:', error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}