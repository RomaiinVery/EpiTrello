import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules
vi.mock('@/app/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    workspace: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    workspaceMember: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    board: {
      create: vi.fn(),
    },
  },
}));

vi.mock('next-auth', () => {
  const NextAuth = vi.fn(() => vi.fn());
  return {
    default: NextAuth,
    getServerSession: vi.fn(),
  };
});

import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { GET as getWorkspaces, POST as createWorkspace } from '@/app/api/workspaces/route';
import {
  GET as getWorkspace,
  PUT as updateWorkspace,
  DELETE as deleteWorkspace
} from '@/app/api/workspaces/[workspaceId]/route';
import { GET as getMembers } from '@/app/api/workspaces/[workspaceId]/members/route';
import { DELETE as removeMember } from '@/app/api/workspaces/[workspaceId]/members/[memberId]/route';

describe('Workspace API Routes', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockSession = {
    user: {
      email: 'test@example.com',
      id: 'user-1',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('GET /api/workspaces', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces');
      const response = await getWorkspaces();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as any);

      const response = await getWorkspaces();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const response = await getWorkspaces();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return all workspaces for authenticated user', async () => {
      const mockWorkspaces = [
        {
          id: 'ws-1',
          title: 'Workspace 1',
          description: 'Description 1',
          userId: 'user-1',
          createdAt: new Date(),
          boards: [],
        },
        {
          id: 'ws-2',
          title: 'Workspace 2',
          description: null,
          userId: 'user-1',
          createdAt: new Date(),
          boards: [],
        },
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findMany).mockResolvedValue(mockWorkspaces as any);

      const response = await getWorkspaces();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].title).toBe('Workspace 1');
      expect(data[1].title).toBe('Workspace 2');
      expect(prisma.workspace.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { userId: 'user-1' },
            { members: { some: { userId: 'user-1' } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          boards: {
            select: { id: true, title: true, description: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });

    it('should return empty array if no workspaces found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findMany).mockResolvedValue([]);

      const response = await getWorkspaces();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(0);
    });

    it('should include workspaces where user is a member', async () => {
      const mockWorkspaces = [
        {
          id: 'ws-1',
          title: 'My Workspace',
          userId: 'user-1',
          boards: [],
          createdAt: new Date(),
        },
        {
          id: 'ws-2',
          title: 'Shared Workspace',
          userId: 'user-2',
          boards: [],
          createdAt: new Date(),
        },
      ];

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findMany).mockResolvedValue(mockWorkspaces as any);

      const response = await getWorkspaces();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
    });
  });

  describe('POST /api/workspaces', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Workspace' }),
      });

      const response = await createWorkspace(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Workspace' }),
      });

      const response = await createWorkspace(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 400 if title is missing', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = new Request('http://localhost/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({ description: 'Description' }),
      });

      const response = await createWorkspace(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Title is required');
    });

    it('should create workspace successfully without preset', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        title: 'New Workspace',
        description: 'Test description',
        userId: 'user-1',
        createdAt: new Date(),
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.create).mockResolvedValue(mockWorkspace as any);

      const request = new Request('http://localhost/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Workspace',
          description: 'Test description',
        }),
      });

      const response = await createWorkspace(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe('New Workspace');
      expect(data.description).toBe('Test description');
      expect(prisma.workspace.create).toHaveBeenCalledWith({
        data: {
          title: 'New Workspace',
          description: 'Test description',
          userId: 'user-1',
        },
      });
    });

    it('should create workspace with engineering preset', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        title: 'Engineering Workspace',
        userId: 'user-1',
        createdAt: new Date(),
      };

      const mockBoard = {
        id: 'board-1',
        title: 'Development',
        workspaceId: 'ws-1',
        userId: 'user-1',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.create).mockResolvedValue(mockWorkspace as any);
      vi.mocked(prisma.board.create).mockResolvedValue(mockBoard as any);

      const request = new Request('http://localhost/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Engineering Workspace',
          preset: 'engineering',
        }),
      });

      const response = await createWorkspace(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe('Engineering Workspace');
      expect(prisma.board.create).toHaveBeenCalledWith({
        data: {
          title: 'Development',
          workspaceId: 'ws-1',
          userId: 'user-1',
          background: '#F5F5F5',
          lists: {
            create: [
              { title: 'Backlog', position: 0 },
              { title: 'To Do', position: 1 },
              { title: 'In Progress', position: 2 },
              { title: 'Code Review', position: 3 },
              { title: 'Done', position: 4 },
            ],
          },
          labels: {
            create: [
              { name: 'Bug', color: '#ef4444' },
              { name: 'Feature', color: '#22c55e' },
              { name: 'Enhancement', color: '#3b82f6' },
              { name: 'Docs', color: '#eab308' },
            ],
          },
        },
      });
    });

    it('should create workspace with marketing preset', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        title: 'Marketing Workspace',
        userId: 'user-1',
        createdAt: new Date(),
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.create).mockResolvedValue(mockWorkspace as any);
      vi.mocked(prisma.board.create).mockResolvedValue({} as any);

      const request = new Request('http://localhost/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Marketing Workspace',
          preset: 'marketing',
        }),
      });

      const response = await createWorkspace(request);

      expect(response.status).toBe(201);
      expect(prisma.board.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Marketing Launch',
          lists: {
            create: [
              { title: 'Ideas', position: 0 },
              { title: 'Content Prep', position: 1 },
              { title: 'In Review', position: 2 },
              { title: 'Scheduled', position: 3 },
              { title: 'Published', position: 4 },
            ],
          },
          labels: {
            create: [
              { name: 'Social', color: '#3b82f6' },
              { name: 'Blog', color: '#eab308' },
              { name: 'Email', color: '#f97316' },
              { name: 'Ads', color: '#a855f7' },
            ],
          },
        }),
      });
    });

    it('should create workspace with sales preset', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        title: 'Sales Workspace',
        userId: 'user-1',
        createdAt: new Date(),
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.create).mockResolvedValue(mockWorkspace as any);
      vi.mocked(prisma.board.create).mockResolvedValue({} as any);

      const request = new Request('http://localhost/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Sales Workspace',
          preset: 'sales',
        }),
      });

      const response = await createWorkspace(request);

      expect(response.status).toBe(201);
      expect(prisma.board.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Sales Pipeline',
          lists: {
            create: [
              { title: 'Leads', position: 0 },
              { title: 'Contacted', position: 1 },
              { title: 'Meeting Scheduled', position: 2 },
              { title: 'Negotiation', position: 3 },
              { title: 'Closed Won', position: 4 },
              { title: 'Closed Lost', position: 5 },
            ],
          },
          labels: {
            create: [
              { name: 'Hot', color: '#ef4444' },
              { name: 'Warm', color: '#f97316' },
              { name: 'Cold', color: '#3b82f6' },
            ],
          },
        }),
      });
    });

    it('should create workspace with empty preset', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        title: 'Empty Workspace',
        userId: 'user-1',
        createdAt: new Date(),
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.create).mockResolvedValue(mockWorkspace as any);

      const request = new Request('http://localhost/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Empty Workspace',
          preset: 'empty',
        }),
      });

      const response = await createWorkspace(request);

      expect(response.status).toBe(201);
      expect(prisma.board.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/workspaces/[workspaceId]', () => {
    const paramsPromise = Promise.resolve({ workspaceId: 'ws-1' });

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces/ws-1');
      const response = await getWorkspace(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces/ws-1');
      const response = await getWorkspace(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 if workspace not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces/ws-1');
      const response = await getWorkspace(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Workspace not found');
    });

    it('should return workspace for owner', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        title: 'Test Workspace',
        description: 'Description',
        userId: 'user-1',
        createdAt: new Date(),
        boards: [],
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(mockWorkspace as any);

      const request = new Request('http://localhost/api/workspaces/ws-1');
      const response = await getWorkspace(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Test Workspace');
      expect(data.currentUserRole).toBe('OWNER');
    });

    it('should return workspace for member with correct role', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        title: 'Test Workspace',
        userId: 'user-2',
        createdAt: new Date(),
        boards: [],
        members: [
          {
            id: 'member-1',
            userId: 'user-1',
            role: 'ADMIN',
          },
        ],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(mockWorkspace as any);

      const request = new Request('http://localhost/api/workspaces/ws-1');
      const response = await getWorkspace(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.currentUserRole).toBe('ADMIN');
    });

    it('should verify user has access to workspace', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        title: 'Test Workspace',
        userId: 'user-1',
        boards: [],
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(mockWorkspace as any);

      const request = new Request('http://localhost/api/workspaces/ws-1');
      await getWorkspace(request, { params: paramsPromise });

      expect(prisma.workspace.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'ws-1',
          OR: [
            { userId: 'user-1' },
            { members: { some: { userId: 'user-1' } } },
          ],
        },
        include: {
          boards: {
            select: { id: true, title: true, description: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          },
          members: {
            where: { userId: 'user-1' },
          },
        },
      });
    });
  });

  describe('PUT /api/workspaces/[workspaceId]', () => {
    const paramsPromise = Promise.resolve({ workspaceId: 'ws-1' });

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces/ws-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated' }),
      });

      const response = await updateWorkspace(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces/ws-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated' }),
      });

      const response = await updateWorkspace(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 if workspace not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces/ws-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated' }),
      });

      const response = await updateWorkspace(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Workspace not found');
    });

    it('should update workspace title and description', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        title: 'Original Title',
        description: 'Original Description',
        userId: 'user-1',
      };

      const updatedWorkspace = {
        id: 'ws-1',
        title: 'Updated Title',
        description: 'Updated Description',
        userId: 'user-1',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(mockWorkspace as any);
      vi.mocked(prisma.workspace.update).mockResolvedValue(updatedWorkspace as any);

      const request = new Request('http://localhost/api/workspaces/ws-1', {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Updated Title',
          description: 'Updated Description',
        }),
      });

      const response = await updateWorkspace(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe('Updated Title');
      expect(data.description).toBe('Updated Description');
      expect(prisma.workspace.update).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
        data: {
          title: 'Updated Title',
          description: 'Updated Description',
        },
      });
    });

    it('should only update provided fields', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        title: 'Original Title',
        description: 'Original Description',
        userId: 'user-1',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(mockWorkspace as any);
      vi.mocked(prisma.workspace.update).mockResolvedValue({
        ...mockWorkspace,
        title: 'Updated Title',
      } as any);

      const request = new Request('http://localhost/api/workspaces/ws-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Title' }),
      });

      const response = await updateWorkspace(request, { params: paramsPromise });

      expect(response.status).toBe(200);
      expect(prisma.workspace.update).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
        data: {
          title: 'Updated Title',
          description: 'Original Description',
        },
      });
    });

    it('should only allow owner to update workspace', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        title: 'Test Workspace',
        userId: 'user-2', // Different user
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces/ws-1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated' }),
      });

      const response = await updateWorkspace(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Workspace not found');
      expect(prisma.workspace.findFirst).toHaveBeenCalledWith({
        where: { id: 'ws-1', userId: 'user-1' },
      });
    });
  });

  describe('DELETE /api/workspaces/[workspaceId]', () => {
    const paramsPromise = Promise.resolve({ workspaceId: 'ws-1' });

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces/ws-1', {
        method: 'DELETE',
      });

      const response = await deleteWorkspace(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces/ws-1', {
        method: 'DELETE',
      });

      const response = await deleteWorkspace(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 if workspace not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces/ws-1', {
        method: 'DELETE',
      });

      const response = await deleteWorkspace(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Workspace not found');
    });

    it('should delete workspace successfully', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        title: 'Test Workspace',
        userId: 'user-1',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(mockWorkspace as any);
      vi.mocked(prisma.workspace.delete).mockResolvedValue(mockWorkspace as any);

      const request = new Request('http://localhost/api/workspaces/ws-1', {
        method: 'DELETE',
      });

      const response = await deleteWorkspace(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Workspace deleted');
      expect(prisma.workspace.delete).toHaveBeenCalledWith({
        where: { id: 'ws-1' },
      });
    });

    it('should only allow owner to delete workspace', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findFirst).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces/ws-1', {
        method: 'DELETE',
      });

      const response = await deleteWorkspace(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(prisma.workspace.findFirst).toHaveBeenCalledWith({
        where: { id: 'ws-1', userId: 'user-1' },
      });
    });
  });

  describe('GET /api/workspaces/[workspaceId]/members', () => {
    const paramsPromise = Promise.resolve({ workspaceId: 'ws-1' });

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces/ws-1/members');
      const response = await getMembers(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces/ws-1/members');
      const response = await getMembers(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 if workspace not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces/ws-1/members');
      const response = await getMembers(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Workspace not found');
    });

    it('should return 403 if user is not owner or member', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        userId: 'user-2',
        members: [],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as any);

      const request = new Request('http://localhost/api/workspaces/ws-1/members');
      const response = await getMembers(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return members for workspace owner', async () => {
      const mockOwner = {
        id: 'user-1',
        name: 'Owner User',
        email: 'owner@example.com',
        profileImage: null,
      };

      const mockWorkspace = {
        id: 'ws-1',
        userId: 'user-1',
        members: [
          {
            id: 'member-1',
            userId: 'user-2',
            role: 'ADMIN',
            joinedAt: new Date(),
            user: {
              id: 'user-2',
              name: 'Member User',
              email: 'member@example.com',
              profileImage: null,
            },
          },
        ],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockOwner as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as any);

      const request = new Request('http://localhost/api/workspaces/ws-1/members');
      const response = await getMembers(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.owner).toBeDefined();
      expect(data.owner.role).toBe('OWNER');
      expect(data.owner.email).toBe('owner@example.com');
      expect(data.members).toHaveLength(1);
      expect(data.members[0].role).toBe('ADMIN');
      expect(data.members[0].user.email).toBe('member@example.com');
    });

    it('should return members for workspace member', async () => {
      const mockOwner = {
        id: 'user-2',
        name: 'Owner User',
        email: 'owner@example.com',
        profileImage: null,
      };

      const mockWorkspace = {
        id: 'ws-1',
        userId: 'user-2',
        members: [
          {
            id: 'member-1',
            userId: 'user-1',
            role: 'VIEWER',
            joinedAt: new Date(),
            user: mockUser,
          },
        ],
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockOwner as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as any);

      const request = new Request('http://localhost/api/workspaces/ws-1/members');
      const response = await getMembers(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.owner).toBeDefined();
      expect(data.members).toHaveLength(1);
    });
  });

  describe('DELETE /api/workspaces/[workspaceId]/members/[memberId]', () => {
    const paramsPromise = Promise.resolve({
      workspaceId: 'ws-1',
      memberId: 'member-1'
    });

    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces/ws-1/members/member-1', {
        method: 'DELETE',
      });

      const response = await removeMember(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces/ws-1/members/member-1', {
        method: 'DELETE',
      });

      const response = await removeMember(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 404 if workspace not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces/ws-1/members/member-1', {
        method: 'DELETE',
      });

      const response = await removeMember(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Workspace not found');
    });

    it('should return 403 if user is not owner', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        userId: 'user-2', // Different user
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as any);

      const request = new Request('http://localhost/api/workspaces/ws-1/members/member-1', {
        method: 'DELETE',
      });

      const response = await removeMember(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden. Only owner can remove members.');
    });

    it('should return 404 if membership not found', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        userId: 'user-1',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as any);
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(null);

      const request = new Request('http://localhost/api/workspaces/ws-1/members/member-1', {
        method: 'DELETE',
      });

      const response = await removeMember(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Membership not found');
    });

    it('should return 404 if membership belongs to different workspace', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        userId: 'user-1',
      };

      const mockMembership = {
        id: 'member-1',
        workspaceId: 'ws-2', // Different workspace
        userId: 'user-2',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as any);
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(mockMembership as any);

      const request = new Request('http://localhost/api/workspaces/ws-1/members/member-1', {
        method: 'DELETE',
      });

      const response = await removeMember(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Membership not found');
    });

    it('should remove member successfully', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        userId: 'user-1',
      };

      const mockMembership = {
        id: 'member-1',
        workspaceId: 'ws-1',
        userId: 'user-2',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as any);
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(mockMembership as any);
      vi.mocked(prisma.workspaceMember.delete).mockResolvedValue(mockMembership as any);

      const request = new Request('http://localhost/api/workspaces/ws-1/members/member-1', {
        method: 'DELETE',
      });

      const response = await removeMember(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Member removed');
      expect(prisma.workspaceMember.delete).toHaveBeenCalledWith({
        where: { id: 'member-1' },
      });
    });

    it('should return 500 if deletion fails', async () => {
      const mockWorkspace = {
        id: 'ws-1',
        userId: 'user-1',
      };

      const mockMembership = {
        id: 'member-1',
        workspaceId: 'ws-1',
        userId: 'user-2',
      };

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.workspace.findUnique).mockResolvedValue(mockWorkspace as any);
      vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(mockMembership as any);
      vi.mocked(prisma.workspaceMember.delete).mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost/api/workspaces/ws-1/members/member-1', {
        method: 'DELETE',
      });

      const response = await removeMember(request, { params: paramsPromise });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to remove member');
    });
  });
});
