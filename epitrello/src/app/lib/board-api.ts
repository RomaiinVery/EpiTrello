// app/lib/board-api.ts

// On exporte les types pour qu'ils soient réutilisables
export type List = {
  id: string;
  title: string;
  position: number;
};

export type Card = {
  id: string;
  title: string;
  content?: string | null;
  listId: string;
  position: number;
};

export type Board = {
  id: string;
  title: string;
  description?: string | null;
  lists?: List[];
};

export async function fetchBoard(boardId: string): Promise<Board | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/boards/${boardId}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchLists(boardId: string): Promise<List[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/boards/${boardId}/lists`, { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()).sort((a: List, b: List) => a.position - b.position);
}

export async function fetchCards(boardId: string, listId: string): Promise<Card[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/boards/${boardId}/lists/${listId}/cards`, { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()).sort((a: Card, b: Card) => a.position - b.position);
}