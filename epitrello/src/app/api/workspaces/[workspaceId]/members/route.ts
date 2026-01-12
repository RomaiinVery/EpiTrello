import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { sendInvitationEmail } from "@/app/lib/email";

const prisma = new PrismaClient();

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

  // Vérifier si l'utilisateur est propriétaire
  if (workspace.userId !== user.id) {
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

  const isAlreadyMember = workspace.members.some((m) => m.id === userToInvite.id);
  if (isAlreadyMember) {
    return NextResponse.json({ error: "User is already a member" }, { status: 400 });
  }

  // Ajouter le membre au workspace
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      members: {
        connect: { id: userToInvite.id },
      },
    },
  });

  // Ajouter le membre à tous les boards du workspace
  const boards = await prisma.board.findMany({
    where: { workspaceId },
  });

  for (const board of boards) {
    await prisma.board.update({
      where: { id: board.id },
      data: {
        members: {
          connect: { id: userToInvite.id },
        },
      },
    });
  }

  // Envoyer l'email d'invitation
  // On ne bloque pas la réponse si l'email échoue
  const inviteLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/workspaces/${workspaceId}/boards`;
  sendInvitationEmail(email, user.name || user.email, workspace.title, inviteLink).catch(console.error);

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
          name: true,
          email: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Vérifier l'accès (propriétaire ou membre)
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const isOwner = workspace.userId === user.id;
  const isMember = workspace.members.some((m) => m.id === user.id);

  if (!isOwner && !isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    owner: workspace.user,
    members: workspace.members,
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

  // Seul le propriétaire peut supprimer un membre (ou le membre lui-même pour se retirer ?)
  if (workspace.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Retirer le membre du workspace
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      members: {
        disconnect: { id: userIdToRemove },
      },
    },
  });

  // Retirer le membre des boards du workspace ?
  // Logique : si on perd l'accès au workspace, on perd l'accès aux boards hérités.

  const boards = await prisma.board.findMany({
    where: { workspaceId },
  });

  for (const board of boards) {
    await prisma.board.update({
      where: { id: board.id },
      data: {
        members: {
          disconnect: { id: userIdToRemove },
        },
      },
    });
  }

  return NextResponse.json({ message: "Member removed successfully" });
}

