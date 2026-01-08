import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/app/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        githubId: true,
        githubUsername: true,
        githubAvatarUrl: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      isLinked: !!user.githubId,
      username: user.githubUsername,
      avatarUrl: user.githubAvatarUrl,
    });
  } catch (error) {
    console.error("Error fetching GitHub status:", error);
    return NextResponse.json(
      { error: "Failed to fetch GitHub status" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        githubId: null,
        githubAccessToken: null,
        githubUsername: null,
        githubAvatarUrl: null,
      },
    });

    return NextResponse.json({ message: "GitHub account unlinked successfully" });
  } catch (error) {
    console.error("Error unlinking GitHub account:", error);
    return NextResponse.json(
      { error: "Failed to unlink GitHub account" },
      { status: 500 }
    );
  }
}

