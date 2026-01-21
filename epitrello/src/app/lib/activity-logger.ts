import { prisma } from "@/app/lib/prisma";

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
  | "cover_removed"
  | "attachment_uploaded"
  | "attachment_deleted"
  | "board_created"
  | "board_updated"
  | "board_deleted";

interface LogActivityParams {
  type: ActivityType;
  description: string;
  userId: string;
  boardId: string;
  cardId?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
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
    console.error("Failed to log activity:", error);
  }
}


