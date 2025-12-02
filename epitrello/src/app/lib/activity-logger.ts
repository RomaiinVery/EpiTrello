import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type ActivityType =
  | "card_created"
  | "card_updated"
  | "card_moved"
  | "card_deleted"
  | "member_assigned"
  | "member_unassigned"
  | "label_added"
  | "label_removed"
  | "comment_added"
  | "comment_updated"
  | "comment_deleted"
  | "cover_uploaded"
  | "cover_removed";

interface LogActivityParams {
  type: ActivityType;
  description: string;
  userId: string;
  boardId: string;
  cardId?: string;
  metadata?: Record<string, any>;
}

export async function logActivity({
  type,
  description,
  userId,
  boardId,
  cardId,
  metadata,
}: LogActivityParams) {
  try {
    await prisma.activity.create({
      data: {
        type,
        description,
        userId,
        boardId,
        cardId: cardId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error) {
    // Don't fail the main operation if logging fails
    console.error("Failed to log activity:", error);
  }
}

