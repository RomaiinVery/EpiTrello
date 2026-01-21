'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";
import { sendInvitationEmail } from "@/app/lib/email";
import { Role } from "@prisma/client";
import { nanoid } from "nanoid";


export async function createInvitation({
    email,
    role,
    workspaceId,
    boardId,
}: {
    email: string;
    role: Role;
    workspaceId?: string;
    boardId?: string;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return { error: "Non autorisé" };
    }

    const currentUserEmail = session.user.email;
    const user = await prisma.user.findUnique({
        where: { email: currentUserEmail },
    });

    if (!user) {
        return { error: "Utilisateur introuvable" };
    }

    // Permission Check
    if (workspaceId) {
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { user: true, members: true },
        });
        if (!workspace) return { error: "Workspace introuvable" };

        // Only Owner (userId) or Admins (if we implemented Admin role fully) can invite
        // For now, strict: Only Owner or Admin role.
        const isOwner = workspace.userId === user.id;
        const isMemberAdmin = workspace.members.some(
            (m) => m.userId === user.id && m.role === "ADMIN"
        );

        if (!isOwner && !isMemberAdmin) {
            return { error: "Vous n'avez pas la permission d'inviter des membres." };
        }
    }

    // Generate Token
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    try {
        // Check if pending invitation exists
        const existingInvite = await prisma.invitation.findFirst({
            where: {
                email,
                workspaceId: workspaceId || null,
                boardId: boardId || null,
                status: 'PENDING'
            }
        });

        if (existingInvite) {
            // Update existing invite
            await prisma.invitation.update({
                where: { id: existingInvite.id },
                data: { token, role, expiresAt }
            });
        } else {
            await prisma.invitation.create({
                data: {
                    email,
                    token,
                    role,
                    workspaceId,
                    boardId,
                    inviterId: user.id,
                    expiresAt,
                },
            });
        }

        // Send Email
        // Construct link: http://localhost:3000/invite/{token}
        // TODO: Use Env var for BASE_URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const inviteLink = `${baseUrl}/invite/${token}`;

        let resourceTitle = "Workspace";
        if (workspaceId) {
            const w = await prisma.workspace.findUnique({ where: { id: workspaceId } });
            resourceTitle = w?.title || "Workspace";
        }

        await sendInvitationEmail(
            email,
            user.name || "Un utilisateur",
            resourceTitle,
            inviteLink,
            role
        );

        return { success: true };
    } catch (error) {
        console.error("Error creating invitation:", error);
        return { error: "Erreur lors de la création de l'invitation" };
    }
}

export async function acceptInvitation(token: string) {
    const session = await getServerSession(authOptions);
    // User must be logged in to accept
    if (!session?.user?.email) {
        return { error: "Unauthorized", redirect: true };
    }

    const invite = await prisma.invitation.findUnique({
        where: { token },
    });

    if (!invite) {
        return { error: "Invitation invalide ou introuvable" };
    }

    if (invite.expiresAt < new Date()) {
        return { error: "Invitation expirée" };
    }

    if (invite.status !== "PENDING") {
        return { error: "Invitation déjà acceptée" };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) return { error: "Utilisateur courant introuvable" };

        // Verify email matches (Optional: allow different email? Security preference. Usually enforce same email)
        // For simplicity, let's allow any logged in user to claim it IF they have the link? 
        // NO, should match email for security unless it's a "public link". This is email invite.
        if (invite.email !== user.email) {
            return { error: "Cette invitation ne correspond pas à votre adresse email actuelle." };
        }

        if (invite.workspaceId) {
            // Check if already member
            const existingMember = await prisma.workspaceMember.findUnique({
                where: {
                    workspaceId_userId: {
                        workspaceId: invite.workspaceId,
                        userId: user.id
                    }
                }
            });

            if (!existingMember) {
                await prisma.workspaceMember.create({
                    data: {
                        workspaceId: invite.workspaceId,
                        userId: user.id,
                        role: invite.role
                    }
                });
            }
        }

        // Add similar logic for BoardId if we support board-level invites later

        // Update Invite Status
        await prisma.invitation.update({
            where: { id: invite.id },
            data: { status: "ACCEPTED" }
        });

        // Return destination path
        if (invite.workspaceId) {
            return { success: true, redirectUrl: `/workspaces/${invite.workspaceId}/boards` };
        }

        return { success: true, redirectUrl: `/workspaces` };

    } catch (e) {
        console.error(e);
        return { error: "Erreur lors de l'acceptation" };
    }
}
