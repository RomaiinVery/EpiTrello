import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await params;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const isOwner = workspace.userId === user.id;
  const isMember = workspace.members.some((member) => member.userId === user.id);

  if (!isOwner && !isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get owner details
  const owner = await prisma.user.findUnique({
    where: { id: workspace.userId },
    select: {
      id: true,
      name: true,
      email: true,
      profileImage: true,
    },
  });

  // Map members to a cleaner format if needed, or send as is
  // The 'user' inside 'members' is already selected.
  // We construct a specific 'Members' list including roles.

  const members = workspace.members.map(m => ({
    id: m.id, // Membership ID
    userId: m.userId,
    role: m.role,
    user: m.user,
    joinedAt: m.joinedAt
  }));

  return NextResponse.json({
    owner: owner ? { ...owner, role: 'OWNER' } : null,
    members: members
  });
}
