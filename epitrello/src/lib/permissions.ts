import { prisma } from "@/app/lib/prisma";

export enum Permission {
  READ = "READ",
  EDIT = "EDIT",
  DELETE = "DELETE",
  ADMIN = "ADMIN"
}

interface PermissionResult {
  allowed: boolean;
  role: string | null;
  isOwner: boolean;
}

/**
 * Check if a user has the required permission on a board
 *
 * Permission hierarchy:
 * - OWNER: All permissions (board owner)
 * - ADMIN: All permissions (workspace or board admin)
 * - EDITOR: READ, EDIT (can modify but not delete or manage)
 * - VIEWER: READ only (cannot modify anything)
 *
 * @param userId - The ID of the user to check
 * @param boardId - The ID of the board
 * @param requiredPermission - The permission level required
 * @returns Object with allowed status, user role, and owner status
 */
export async function checkBoardPermission(
  userId: string,
  boardId: string,
  requiredPermission: Permission
): Promise<PermissionResult> {

  try {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        members: {
          where: { userId },
          select: { role: true }
        },
        workspace: {
          include: {
            members: {
              where: { userId },
              select: { role: true }
            }
          }
        }
      }
    });

    if (!board) {
      return { allowed: false, role: null, isOwner: false };
    }

    // Check if user is the board owner
    const isOwner = board.userId === userId;
    if (isOwner) {
      return { allowed: true, role: "OWNER", isOwner: true };
    }

    // Check BoardMember role
    const boardMember = board.members[0];
    if (boardMember) {
      const role = boardMember.role;
      const allowed = hasPermission(role, requiredPermission);
      return { allowed, role, isOwner: false };
    }

    // Check WorkspaceMember role
    const workspaceMember = board.workspace?.members[0];
    if (workspaceMember) {
      const role = workspaceMember.role;
      const allowed = hasPermission(role, requiredPermission);
      return { allowed, role, isOwner: false };
    }

    // User is not a member
    return { allowed: false, role: null, isOwner: false };
  } catch (error) {
    console.error("Error checking board permission:", error);
    return { allowed: false, role: null, isOwner: false };
  }
}

/**
 * Check if a role has the required permission
 */
function hasPermission(role: string, requiredPermission: Permission): boolean {
  switch (role) {
    case "ADMIN":
      // Admin has all permissions
      return true;

    case "EDITOR":
      // Editor can READ and EDIT, but not DELETE or ADMIN
      return requiredPermission === Permission.READ ||
             requiredPermission === Permission.EDIT;

    case "VIEWER":
      // Viewer can only READ
      return requiredPermission === Permission.READ;

    default:
      return false;
  }
}

/**
 * Helper function to get a standardized error message based on role and permission
 */
export function getPermissionErrorMessage(role: string | null, requiredPermission: Permission): string {
  if (!role) {
    return "You do not have access to this board";
  }

  switch (requiredPermission) {
    case Permission.READ:
      return "You do not have permission to view this resource";
    case Permission.EDIT:
      return `${role}s cannot modify this resource`;
    case Permission.DELETE:
      return `${role}s cannot delete this resource`;
    case Permission.ADMIN:
      return `${role}s cannot perform administrative actions`;
    default:
      return "You do not have permission to perform this action";
  }
}
