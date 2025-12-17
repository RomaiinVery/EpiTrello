import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { sendInvitationEmail } from "@/app/lib/email";

const prisma = new PrismaClient();

// POST: Ajouter un membre au tableau
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tableauId: string }> }
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

  const { tableauId } = await params;
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const tableau = await prisma.tableau.findUnique({
    where: { id: tableauId },
    include: { members: true },
  });

  if (!tableau) {
    return NextResponse.json({ error: "Tableau not found" }, { status: 404 });
  }

  // Vérifier si l'utilisateur est propriétaire
  if (tableau.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userToInvite = await prisma.user.findUnique({
    where: { email },
  });

  if (!userToInvite) {
    return NextResponse.json({ error: "User to invite not found" }, { status: 404 });
  }

  if (userToInvite.id === tableau.userId) {
    return NextResponse.json({ error: "User is already the owner" }, { status: 400 });
  }

  const isAlreadyMember = tableau.members.some((m) => m.id === userToInvite.id);
  if (isAlreadyMember) {
    return NextResponse.json({ error: "User is already a member" }, { status: 400 });
  }

  // Ajouter le membre au tableau
  await prisma.tableau.update({
    where: { id: tableauId },
    data: {
      members: {
        connect: { id: userToInvite.id },
      },
    },
  });

  // Ajouter le membre à tous les boards du tableau
  const boards = await prisma.board.findMany({
    where: { tableauId },
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
  const inviteLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/tableaux/${tableauId}/boards`;
  sendInvitationEmail(email, user.name || user.email, tableau.title, inviteLink).catch(console.error);

  return NextResponse.json({ message: "Member added successfully" });
}

// GET: Lister les membres du tableau
export async function GET(
  req: Request,
  { params }: { params: Promise<{ tableauId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tableauId } = await params;

  const tableau = await prisma.tableau.findUnique({
    where: { id: tableauId },
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

  if (!tableau) {
    return NextResponse.json({ error: "Tableau not found" }, { status: 404 });
  }

  // Vérifier l'accès (propriétaire ou membre)
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const isOwner = tableau.userId === user.id;
  const isMember = tableau.members.some((m) => m.id === user.id);

  if (!isOwner && !isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    owner: tableau.user,
    members: tableau.members,
  });
}

// DELETE: Retirer un membre du tableau
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ tableauId: string }> }
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
  
    const { tableauId } = await params;
    const { searchParams } = new URL(req.url);
    const userIdToRemove = searchParams.get("userId");
  
    if (!userIdToRemove) {
      return NextResponse.json({ error: "UserId is required" }, { status: 400 });
    }
  
    const tableau = await prisma.tableau.findUnique({
      where: { id: tableauId },
      include: { members: true },
    });
  
    if (!tableau) {
      return NextResponse.json({ error: "Tableau not found" }, { status: 404 });
    }
  
    // Seul le propriétaire peut supprimer un membre (ou le membre lui-même pour se retirer ?)
    if (tableau.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  
    // Retirer le membre du tableau
    await prisma.tableau.update({
      where: { id: tableauId },
      data: {
        members: {
          disconnect: { id: userIdToRemove },
        },
      },
    });

    // Retirer le membre des boards du tableau ?
    // Logique : si on perd l'accès au tableau, on perd l'accès aux boards hérités.
    // Mais si l'utilisateur a été invité spécifiquement à un board, doit-il garder l'accès ?
    // Pour simplifier : on retire l'accès à tous les boards du tableau.
    // (Si on voulait garder l'accès board-specific, il faudrait une table de liaison séparée pour "accès par héritage" vs "accès direct", ce qui complexifie).
    
    const boards = await prisma.board.findMany({
        where: { tableauId },
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

