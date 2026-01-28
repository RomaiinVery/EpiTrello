import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/app/lib/prisma";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session?.user as any)?.id;

  if (!userId && !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: userId ? { id: userId } : { email: session?.user?.email as string },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { userId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      boards: {
        select: { id: true, title: true, description: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },

  });

  return NextResponse.json(workspaces);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session?.user as any)?.id;

  if (!userId && !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: userId ? { id: userId } : { email: session?.user?.email as string },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { title, description, preset } = await req.json();

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const workspace = await prisma.workspace.create({
    data: {
      title,
      description,
      userId: user.id,
    },
  });

  // Handle Preset Logic
  if (preset && preset !== "empty") {
    let boardName = "";
    let lists: string[] = [];
    let labels: { name: string; color: string }[] = [];

    if (preset === "engineering") {
      boardName = "Development";
      lists = ["Backlog", "To Do", "In Progress", "Code Review", "Done"];
      labels = [
        { name: "Bug", color: "#ef4444" },
        { name: "Feature", color: "#22c55e" },
        { name: "Enhancement", color: "#3b82f6" },
        { name: "Docs", color: "#eab308" }
      ];
    } else if (preset === "marketing") {
      boardName = "Marketing Launch";
      lists = ["Ideas", "Content Prep", "In Review", "Scheduled", "Published"];
      labels = [
        { name: "Social", color: "#3b82f6" },
        { name: "Blog", color: "#eab308" },
        { name: "Email", color: "#f97316" },
        { name: "Ads", color: "#a855f7" }
      ];
    } else if (preset === "sales") {
      boardName = "Sales Pipeline";
      lists = ["Leads", "Contacted", "Meeting Scheduled", "Negotiation", "Closed Won", "Closed Lost"];
      labels = [
        { name: "Hot", color: "#ef4444" },
        { name: "Warm", color: "#f97316" },
        { name: "Cold", color: "#3b82f6" }
      ];
    }

    if (boardName) {
      await prisma.board.create({
        data: {
          title: boardName,
          workspaceId: workspace.id,
          userId: user.id,
          background: "#F5F5F5",
          lists: {
            create: lists.map((title, index) => ({ title, position: index }))
          },
          labels: {
            create: labels
          }
        }
      });
    }
  }

  return NextResponse.json(workspace, { status: 201 });
}


