// src/app/api/boards/[boardId]/members/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

import { prisma } from "@/app/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { boardId } = await params;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImage: true
        }
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true
            }
          }
        }
      },
      workspace: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profileImage: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });

  // Check if user has access to this board (owner, board member, or workspace member)
  const hasAccess =
    board.userId === currentUser.id ||
    board.members.some(m => m.userId === currentUser.id) ||
    board.workspace.members.some(m => m.userId === currentUser.id);
  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Combine owner, board members, and workspace members
  const allMembers = [
    { ...board.user, isOwner: true, role: "OWNER" },
    ...board.members.map(member => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      profileImage: member.user.profileImage,
      isOwner: false,
      role: member.role
    })),
    ...board.workspace.members.map(member => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      profileImage: member.user.profileImage,
      isOwner: false,
      role: member.role
    }))
  ].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i); // Remove duplicates

  return NextResponse.json({ members: allMembers });
}

export async function POST(req: Request, { params }: { params: Promise<{ boardId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { boardId } = await params;
  const { email } = await req.json();

  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const board = await prisma.board.findUnique({
    where: { id: boardId }
  });

  if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });
  if (board.userId !== currentUser.id) {
    return NextResponse.json({ error: "Only the owner can invite members" }, { status: 403 });
  }

  const userToInvite = await prisma.user.findUnique({
    where: { email }
  });

  if (!userToInvite) {
    return NextResponse.json({ error: "User with this email does not exist" }, { status: 404 });
  }

  const isAlreadyMember = await prisma.board.findFirst({
    where: {
      id: boardId,
      members: { some: { id: userToInvite.id } }
    }
  });

  if (isAlreadyMember || board.userId === userToInvite.id) {
    return NextResponse.json({ error: "User is already a member" }, { status: 400 });
  }

  await prisma.board.update({
    where: { id: boardId },
    data: {
      members: {
        connect: { id: userToInvite.id }
      }
    }
  });

  return NextResponse.json({ message: "Member added successfully", user: userToInvite });
}