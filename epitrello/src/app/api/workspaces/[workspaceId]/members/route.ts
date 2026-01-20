import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { sendInvitationEmail } from "@/app/lib/email";

import { prisma } from "@/app/lib/prisma";

// POST: Ajouter un membre au workspace
export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
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

  const { workspaceId } = await params;
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { members: true },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Vérifier si l'utilisateur est propriétaire ou Admin
  // (Assuming only owner or ADMIN role can add members)
  const isOwner = workspace.userId === user.id;
  const isWorkspaceAdmin = workspace.members.some(m => m.userId === user.id && m.role === "ADMIN");

  if (!isOwner && !isWorkspaceAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userToInvite = await prisma.user.findUnique({
    where: { email },
  });

  if (!userToInvite) {
    return NextResponse.json({ error: "User to invite not found" }, { status: 404 });
  }

  if (userToInvite.id === workspace.userId) {
    return NextResponse.json({ error: "User is already the owner" }, { status: 400 });
  }

  const isAlreadyMember = workspace.members.some((m) => m.userId === userToInvite.id);
  if (isAlreadyMember) {
    return NextResponse.json({ error: "User is already a member" }, { status: 400 });
  }

  // Ajouter le membre au workspace
  await prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId: userToInvite.id,
      role: "VIEWER", // Default role
    }
  });

  // Ajouter le membre à tous les boards du workspace
  const boards = await prisma.board.findMany({
    where: { workspaceId },
  });

  // Note: Usually we might not auto-add to all boards if permissions are granular, but keeping existing logic.
  // Using explicit BoardMember creation.
  for (const board of boards) {
    // Check if already board member to avoid crash
    const existingBoardMember = await prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId: board.id,
          userId: userToInvite.id
        }
      }
    });

    if (!existingBoardMember) {
      await prisma.boardMember.create({
        data: {
          boardId: board.id,
          userId: userToInvite.id,
          role: "VIEWER"
        }
      });
    }
  }

  // Envoyer l'email d'invitation
  const inviteLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/workspaces/${workspaceId}/boards`;
  sendInvitationEmail(email, user.name || user.email, workspace.title, inviteLink, "VIEWER").catch(console.error);

  return NextResponse.json({ message: "Member added successfully" });
}

// GET: Lister les membres du workspace
export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        select: {
          id: true,
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true,
            }
          }
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImage: true,
        },
      },
    },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const isOwner = workspace.userId === user.id;
  const isMember = workspace.members.some((m) => m.user.id === user.id);

  if (!isOwner && !isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    owner: workspace.user,
    members: workspace.members.map(m => ({
      ...m.user,
      role: m.role,
      memberId: m.id // WorkspaceMember ID
    })),
  });
}

// DELETE: Retirer un membre du workspace
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
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

  const { workspaceId } = await params;
  const { searchParams } = new URL(req.url);
  const userIdToRemove = searchParams.get("userId");

  if (!userIdToRemove) {
    return NextResponse.json({ error: "UserId is required" }, { status: 400 });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { members: true },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Seul le propriétaire ou un Admin peut supprimer un membre
  const isOwner = workspace.userId === user.id;
  const isWorkspaceAdmin = workspace.members.some(m => m.userId === user.id && m.role === "ADMIN");

  if (!isOwner && !isWorkspaceAdmin) {
    // User can allow leaving themselves? Maybe.
    if (userIdToRemove !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Retirer le membre du workspace
  await prisma.workspaceMember.deleteMany({
    where: {
      workspaceId: workspaceId,
      userId: userIdToRemove
    }
  });

  // Retirer le membre des boards du workspace
  const boards = await prisma.board.findMany({
    where: { workspaceId },
  });

  for (const board of boards) {
    await prisma.boardMember.deleteMany({
      where: {
        boardId: board.id,
        userId: userIdToRemove
      }
    });
  }

  return NextResponse.json({ message: "Member removed successfully" });
}

