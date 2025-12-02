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

export type Card = {
  id: string;
  title: string;
  content?: string | null;
  listId: string;
  position: number;
  labels?: Label[];
};

export type Board = {
  id: string;
  title: string;
  description?: string | null;
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
    });
    return cards;
  } catch (error) {
    console.error("Erreur fetchCards:", error);
    return [];
  }
}