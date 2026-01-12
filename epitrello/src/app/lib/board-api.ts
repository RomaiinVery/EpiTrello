import { prisma } from "./prisma";

export type List = {
  id: string;
  title: string;
  position: number;
};

export type Label = {
  id: string;
  name: string;
  color: string;
  boardId: string;
};

export type User = {
  id: string;
  email: string;
  name?: string | null;
  profileImage?: string | null;
};

export type ChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
  position: number;
  checklistId: string;
};

export type Checklist = {
  id: string;
  title: string;
  position: number;
  cardId: string;
  items: ChecklistItem[];
};

export type Card = {
  id: string;
  title: string;
  content?: string | null;
  listId: string;
  position: number;
  coverImage?: string | null;
  dueDate?: Date | null;
  isDone?: boolean;
  labels?: Label[];
  members?: User[];
  checklists?: Checklist[];
  githubIssueNumber?: number | null;
  githubIssueUrl?: string | null;
};

export type Board = {
  id: string;
  title: string;
  description?: string | null;
  tableauId: string;
  lists?: List[];
};


export async function fetchBoard(boardId: string): Promise<Board | null> {
  try {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });
    return board;
  } catch (error) {
    console.error("Erreur fetchBoard:", error);
    return null;
  }
}

export async function fetchLists(boardId: string): Promise<List[]> {
  try {
    const lists = await prisma.list.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
    });
    return lists;
  } catch (error) {
    console.error("Erreur fetchLists:", error);
    return [];
  }
}

export async function fetchCards(boardId: string, listId: string): Promise<Card[]> {
  try {
    const cards = await prisma.card.findMany({
      where: { listId },
      orderBy: { position: 'asc' },
      include: {
        labels: {
          include: {
            label: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                profileImage: true,
              },
            },
          },
        },
        checklists: {
          include: {
            items: {
              orderBy: { position: 'asc' },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    // Format cards to include labels, members, and checklists as arrays
    return cards.map(card => ({
      ...card,
      labels: card.labels.map(cl => cl.label),
      members: card.members.map(cm => cm.user),
      checklists: card.checklists || [],
    }));
  } catch (error) {
    console.error("Erreur fetchCards:", error);
    return [];
  }
}