/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules before importing - using @ aliases to match what the source files use
vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
    invitation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock the special path with square brackets
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

vi.mock('@/app/lib/email', () => ({
  sendInvitationEmail: vi.fn(),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(),
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/app/lib/prisma';
import { sendInvitationEmail } from '@/app/lib/email';
import { nanoid } from 'nanoid';
import { createInvitation, acceptInvitation } from '@/app/actions/invitations';

describe('Invitations Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('createInvitation', () => {
    it('should return error if user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const result = await createInvitation({
        email: 'test@example.com',
        role: 'EDITOR',
        workspaceId: 'workspace-123',
      });

      expect(result).toEqual({ error: 'Non autorisé' });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should return error if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { name: 'Test User' },
      } as any);

      const result = await createInvitation({
        email: 'test@example.com',
        role: 'EDITOR',
        workspaceId: 'workspace-123',
      });

      expect(result).toEqual({ error: 'Non autorisé' });
    });

    it('should return error if user is not found in database', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'owner@example.com', name: 'Owner' },
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await createInvitation({
        email: 'test@example.com',
        role: 'EDITOR',
        workspaceId: 'workspace-123',
      });

      expect(result).toEqual({ error: 'Utilisateur introuvable' });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'owner@example.com' },
      });
    });

    it('should return error if workspace is not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'owner@example.com', name: 'Owner' },
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'owner@example.com',
        name: 'Owner',
      } as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);

      const result = await createInvitation({
        email: 'test@example.com',
        role: 'EDITOR',
        workspaceId: 'workspace-123',
      });

      expect(result).toEqual({ error: 'Workspace introuvable' });
      expect(prisma.workspace.findUnique).toHaveBeenCalledWith({
        where: { id: 'workspace-123' },
        include: { user: true, members: true },
      });
    });

    it('should return error if user is not owner or admin of workspace', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'viewer@example.com', name: 'Viewer' },
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-456',
        email: 'viewer@example.com',
        name: 'Viewer',
      } as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: 'workspace-123',
        userId: 'user-999',
        title: 'Test Workspace',
        members: [
          { userId: 'user-456', role: 'VIEWER' },
        ],
      } as any);

      const result = await createInvitation({
        email: 'test@example.com',
        role: 'EDITOR',
        workspaceId: 'workspace-123',
      });

      expect(result).toEqual({ error: "Vous n'avez pas la permission d'inviter des membres." });
    });

    it('should allow workspace owner to create invitation', async () => {
      const mockToken = 'test-token-123';
      const mockDate = new Date();

      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'owner@example.com', name: 'Owner' },
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'owner@example.com',
        name: 'Owner',
      } as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValueOnce({
        id: 'workspace-123',
        userId: 'user-123',
        title: 'Test Workspace',
        members: [],
      } as any).mockResolvedValueOnce({
        id: 'workspace-123',
        title: 'Test Workspace',
      } as any);
      vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.invitation.create).mockResolvedValue({
        id: 'invitation-1',
        email: 'test@example.com',
        token: mockToken,
        role: 'EDITOR',
      } as any);
      vi.mocked(nanoid).mockReturnValue(mockToken);
      vi.mocked(sendInvitationEmail).mockResolvedValue(true);

      const result = await createInvitation({
        email: 'test@example.com',
        role: 'EDITOR',
        workspaceId: 'workspace-123',
      });

      expect(result).toEqual({ success: true });
      expect(prisma.invitation.create).toHaveBeenCalled();
      expect(sendInvitationEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Owner',
        'Test Workspace',
        expect.stringContaining('/invite/'),
        'EDITOR'
      );
    });

    it('should allow workspace admin to create invitation', async () => {
      const mockToken = 'test-token-456';

      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'admin@example.com', name: 'Admin' },
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-456',
        email: 'admin@example.com',
        name: 'Admin',
      } as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValueOnce({
        id: 'workspace-123',
        userId: 'user-999',
        title: 'Test Workspace',
        members: [
          { userId: 'user-456', role: 'ADMIN' },
        ],
      } as any).mockResolvedValueOnce({
        id: 'workspace-123',
        title: 'Test Workspace',
      } as any);
      vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.invitation.create).mockResolvedValue({
        id: 'invitation-2',
        email: 'newuser@example.com',
        token: mockToken,
        role: 'VIEWER',
      } as any);
      vi.mocked(nanoid).mockReturnValue(mockToken);
      vi.mocked(sendInvitationEmail).mockResolvedValue(true);

      const result = await createInvitation({
        email: 'newuser@example.com',
        role: 'VIEWER',
        workspaceId: 'workspace-123',
      });

      expect(result).toEqual({ success: true });
      expect(prisma.invitation.create).toHaveBeenCalled();
    });

    it('should update existing pending invitation instead of creating new one', async () => {
      const mockToken = 'new-token-789';

      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'owner@example.com', name: 'Owner' },
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'owner@example.com',
        name: 'Owner',
      } as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValueOnce({
        id: 'workspace-123',
        userId: 'user-123',
        title: 'Test Workspace',
        members: [],
      } as any).mockResolvedValueOnce({
        id: 'workspace-123',
        title: 'Test Workspace',
      } as any);
      vi.mocked(prisma.invitation.findFirst).mockResolvedValue({
        id: 'existing-invitation',
        email: 'test@example.com',
        token: 'old-token',
        role: 'VIEWER',
        status: 'PENDING',
      } as any);
      vi.mocked(prisma.invitation.update).mockResolvedValue({
        id: 'existing-invitation',
        email: 'test@example.com',
        token: mockToken,
        role: 'EDITOR',
      } as any);
      vi.mocked(nanoid).mockReturnValue(mockToken);
      vi.mocked(sendInvitationEmail).mockResolvedValue(true);

      const result = await createInvitation({
        email: 'test@example.com',
        role: 'EDITOR',
        workspaceId: 'workspace-123',
      });

      expect(result).toEqual({ success: true });
      expect(prisma.invitation.update).toHaveBeenCalledWith({
        where: { id: 'existing-invitation' },
        data: expect.objectContaining({
          token: mockToken,
          role: 'EDITOR',
        }),
      });
      expect(prisma.invitation.create).not.toHaveBeenCalled();
    });

    it('should generate correct invite link with NEXT_PUBLIC_APP_URL', async () => {
      const originalUrl = process.env.NEXT_PUBLIC_APP_URL;
      process.env.NEXT_PUBLIC_APP_URL = 'https://epitrello.com';

      const mockToken = 'test-token-abc';

      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'owner@example.com', name: 'Owner' },
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'owner@example.com',
        name: 'Owner',
      } as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValueOnce({
        id: 'workspace-123',
        userId: 'user-123',
        title: 'Test Workspace',
        members: [],
      } as any).mockResolvedValueOnce({
        id: 'workspace-123',
        title: 'Test Workspace',
      } as any);
      vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.invitation.create).mockResolvedValue({
        id: 'invitation-1',
        email: 'test@example.com',
        token: mockToken,
        role: 'EDITOR',
      } as any);
      vi.mocked(nanoid).mockReturnValue(mockToken);
      vi.mocked(sendInvitationEmail).mockResolvedValue(true);

      await createInvitation({
        email: 'test@example.com',
        role: 'EDITOR',
        workspaceId: 'workspace-123',
      });

      expect(sendInvitationEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Owner',
        'Test Workspace',
        `https://epitrello.com/invite/${mockToken}`,
        'EDITOR'
      );

      process.env.NEXT_PUBLIC_APP_URL = originalUrl;
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'owner@example.com', name: 'Owner' },
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'owner@example.com',
        name: 'Owner',
      } as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
        id: 'workspace-123',
        userId: 'user-123',
        title: 'Test Workspace',
        members: [],
      } as any);
      vi.mocked(prisma.invitation.findFirst).mockRejectedValue(new Error('Database error'));

      const result = await createInvitation({
        email: 'test@example.com',
        role: 'EDITOR',
        workspaceId: 'workspace-123',
      });

      expect(result).toEqual({ error: "Erreur lors de la création de l'invitation" });
      expect(console.error).toHaveBeenCalled();
    });

    it('should create invitation without workspace (general invitation)', async () => {
      const mockToken = 'general-token-123';

      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'admin@example.com', name: 'Admin' },
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'admin@example.com',
        name: 'Admin',
      } as any);
      vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.invitation.create).mockResolvedValue({
        id: 'invitation-1',
        email: 'test@example.com',
        token: mockToken,
        role: 'EDITOR',
      } as any);
      vi.mocked(nanoid).mockReturnValue(mockToken);
      vi.mocked(sendInvitationEmail).mockResolvedValue(true);

      const result = await createInvitation({
        email: 'test@example.com',
        role: 'EDITOR',
      });

      expect(result).toEqual({ success: true });
      expect(prisma.workspace.findUnique).not.toHaveBeenCalled();
      expect(prisma.invitation.create).toHaveBeenCalled();
    });
  });

  describe('acceptInvitation', () => {
    it('should return error if user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const result = await acceptInvitation('test-token');

      expect(result).toEqual({ error: 'Unauthorized', redirect: true });
      expect(prisma.invitation.findUnique).not.toHaveBeenCalled();
    });

    it('should return error if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { name: 'Test User' },
      } as any);

      const result = await acceptInvitation('test-token');

      expect(result).toEqual({ error: 'Unauthorized', redirect: true });
    });

    it('should return error if invitation is not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'user@example.com', name: 'User' },
      } as any);
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue(null);

      const result = await acceptInvitation('invalid-token');

      expect(result).toEqual({ error: 'Invitation invalide ou introuvable' });
      expect(prisma.invitation.findUnique).toHaveBeenCalledWith({
        where: { token: 'invalid-token' },
      });
    });

    it('should return error if invitation is expired', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day ago

      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'user@example.com', name: 'User' },
      } as any);
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
        id: 'invitation-1',
        email: 'user@example.com',
        token: 'expired-token',
        role: 'EDITOR',
        status: 'PENDING',
        expiresAt: pastDate,
      } as any);

      const result = await acceptInvitation('expired-token');

      expect(result).toEqual({ error: 'Invitation expirée' });
    });

    it('should return error if invitation is not pending', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days from now

      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'user@example.com', name: 'User' },
      } as any);
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
        id: 'invitation-1',
        email: 'user@example.com',
        token: 'accepted-token',
        role: 'EDITOR',
        status: 'ACCEPTED',
        expiresAt: futureDate,
      } as any);

      const result = await acceptInvitation('accepted-token');

      expect(result).toEqual({ error: 'Invitation déjà acceptée' });
    });

    it('should return error if current user is not found', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'user@example.com', name: 'User' },
      } as any);
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
        id: 'invitation-1',
        email: 'user@example.com',
        token: 'valid-token',
        role: 'EDITOR',
        status: 'PENDING',
        expiresAt: futureDate,
        workspaceId: 'workspace-123',
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await acceptInvitation('valid-token');

      expect(result).toEqual({ error: 'Utilisateur courant introuvable' });
    });

    it('should return error if email does not match invitation email', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'different@example.com', name: 'User' },
      } as any);
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
        id: 'invitation-1',
        email: 'invited@example.com',
        token: 'valid-token',
        role: 'EDITOR',
        status: 'PENDING',
        expiresAt: futureDate,
        workspaceId: 'workspace-123',
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'different@example.com',
        name: 'User',
      } as any);

      const result = await acceptInvitation('valid-token');

      expect(result).toEqual({
        error: 'Cette invitation ne correspond pas à votre adresse email actuelle.',
      });
    });

    it('should successfully accept workspace invitation and add user as member', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'user@example.com', name: 'User' },
      } as any);
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
        id: 'invitation-1',
        email: 'user@example.com',
        token: 'valid-token',
        role: 'EDITOR',
        status: 'PENDING',
        expiresAt: futureDate,
        workspaceId: 'workspace-123',
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        name: 'User',
      } as any);
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.workspaceMember.create).mockResolvedValue({
        workspaceId: 'workspace-123',
        userId: 'user-123',
        role: 'EDITOR',
      } as any);
      vi.mocked(prisma.invitation.update).mockResolvedValue({
        id: 'invitation-1',
        status: 'ACCEPTED',
      } as any);

      const result = await acceptInvitation('valid-token');

      expect(result).toEqual({
        success: true,
        redirectUrl: '/workspaces/workspace-123/boards',
      });
      expect(prisma.workspaceMember.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 'workspace-123',
          userId: 'user-123',
          role: 'EDITOR',
        },
      });
      expect(prisma.invitation.update).toHaveBeenCalledWith({
        where: { id: 'invitation-1' },
        data: { status: 'ACCEPTED' },
      });
    });

    it('should not create workspace member if user is already a member', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'user@example.com', name: 'User' },
      } as any);
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
        id: 'invitation-1',
        email: 'user@example.com',
        token: 'valid-token',
        role: 'EDITOR',
        status: 'PENDING',
        expiresAt: futureDate,
        workspaceId: 'workspace-123',
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        name: 'User',
      } as any);
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
        workspaceId: 'workspace-123',
        userId: 'user-123',
        role: 'VIEWER',
      } as any);
      vi.mocked(prisma.invitation.update).mockResolvedValue({
        id: 'invitation-1',
        status: 'ACCEPTED',
      } as any);

      const result = await acceptInvitation('valid-token');

      expect(result).toEqual({
        success: true,
        redirectUrl: '/workspaces/workspace-123/boards',
      });
      expect(prisma.workspaceMember.create).not.toHaveBeenCalled();
      expect(prisma.invitation.update).toHaveBeenCalled();
    });

    it('should redirect to /workspaces if invitation has no workspaceId', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'user@example.com', name: 'User' },
      } as any);
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
        id: 'invitation-1',
        email: 'user@example.com',
        token: 'valid-token',
        role: 'EDITOR',
        status: 'PENDING',
        expiresAt: futureDate,
        workspaceId: null,
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        name: 'User',
      } as any);
      vi.mocked(prisma.invitation.update).mockResolvedValue({
        id: 'invitation-1',
        status: 'ACCEPTED',
      } as any);

      const result = await acceptInvitation('valid-token');

      expect(result).toEqual({
        success: true,
        redirectUrl: '/workspaces',
      });
    });

    it('should handle database errors gracefully', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'user@example.com', name: 'User' },
      } as any);
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
        id: 'invitation-1',
        email: 'user@example.com',
        token: 'valid-token',
        role: 'EDITOR',
        status: 'PENDING',
        expiresAt: futureDate,
        workspaceId: 'workspace-123',
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        name: 'User',
      } as any);
      vi.mocked(prisma.workspaceMember.findUnique).mockRejectedValue(
        new Error('Database error')
      );

      const result = await acceptInvitation('valid-token');

      expect(result).toEqual({ error: "Erreur lors de l'acceptation" });
      expect(console.error).toHaveBeenCalled();
    });

    it('should verify token with nanoid format (32 characters)', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
      const validToken = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'; // 32 chars

      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'user@example.com', name: 'User' },
      } as any);
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
        id: 'invitation-1',
        email: 'user@example.com',
        token: validToken,
        role: 'EDITOR',
        status: 'PENDING',
        expiresAt: futureDate,
        workspaceId: 'workspace-123',
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        name: 'User',
      } as any);
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.workspaceMember.create).mockResolvedValue({
        workspaceId: 'workspace-123',
        userId: 'user-123',
        role: 'EDITOR',
      } as any);
      vi.mocked(prisma.invitation.update).mockResolvedValue({
        id: 'invitation-1',
        status: 'ACCEPTED',
      } as any);

      const result = await acceptInvitation(validToken);

      expect(result).toEqual({
        success: true,
        redirectUrl: '/workspaces/workspace-123/boards',
      });
      expect(prisma.invitation.findUnique).toHaveBeenCalledWith({
        where: { token: validToken },
      });
    });
  });

  describe('Token Generation', () => {
    it('should generate token with 32 character length', () => {
      const mockToken = 'a'.repeat(32);
      vi.mocked(nanoid).mockReturnValue(mockToken);

      const token = nanoid(32);

      expect(token).toHaveLength(32);
      expect(nanoid).toHaveBeenCalledWith(32);
    });
  });

  describe('Expiration Date Calculation', () => {
    it('should set expiration to 7 days from creation', async () => {
      const mockToken = 'test-token';
      const now = Date.now();

      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'owner@example.com', name: 'Owner' },
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        email: 'owner@example.com',
        name: 'Owner',
      } as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValueOnce({
        id: 'workspace-123',
        userId: 'user-123',
        title: 'Test Workspace',
        members: [],
      } as any).mockResolvedValueOnce({
        id: 'workspace-123',
        title: 'Test Workspace',
      } as any);
      vi.mocked(prisma.invitation.findFirst).mockResolvedValue(null);

      let capturedExpiresAt: Date | undefined;
      vi.mocked(prisma.invitation.create).mockImplementation((args: any) => {
        capturedExpiresAt = args.data.expiresAt;
        return Promise.resolve({
          id: 'invitation-1',
          email: 'test@example.com',
          token: mockToken,
          role: 'EDITOR',
          expiresAt: capturedExpiresAt,
        } as any);
      });

      vi.mocked(nanoid).mockReturnValue(mockToken);
      vi.mocked(sendInvitationEmail).mockResolvedValue(true);

      await createInvitation({
        email: 'test@example.com',
        role: 'EDITOR',
        workspaceId: 'workspace-123',
      });

      expect(capturedExpiresAt).toBeDefined();
      if (capturedExpiresAt) {
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
        const expectedTime = now + sevenDaysInMs;
        const actualTime = capturedExpiresAt.getTime();
        // Allow 1 second tolerance for test execution time
        expect(Math.abs(actualTime - expectedTime)).toBeLessThan(1000);
      }
    });
  });
});
