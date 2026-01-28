import { fetchBoard, fetchLists, fetchCards, Card } from "@/app/lib/board-api";
import BoardClient from "@/app/boards/[boardId]/board-client";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; boardId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { workspaceId, boardId } = await params;
  const { cardId } = await searchParams;
  const initialCardId = typeof cardId === 'string' ? cardId : undefined;
  const session = await getServerSession(authOptions);

  const boardData = await fetchBoard(boardId);

  if (!boardData || boardData.workspaceId !== workspaceId) {
    return (
      <div className="p-6 text-center text-gray-500">
        Board introuvable
      </div>
    );
  }

  // Determine Role
  let currentUserRole = "VIEWER";
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (user) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: { members: true }
      });

      if (workspace) {
        if (workspace.userId === user.id) {
          currentUserRole = "OWNER";
        } else {
          // Check workspace member role
          const wsMember = workspace.members.find(m => m.userId === user.id);
          if (wsMember) {
            currentUserRole = wsMember.role; // EDITOR, ADMIN, VIEWER
          }
          // Check board member role override if we want to be specific, 
          // but usually workspace role is the base. 
          // Let's stick to workspace role as the primary driver for now, 
          // or check if BoardMember exists explicitly. 
          // The invite system adds to BoardMember too. 
          // Let's trust workspace member role for simplicity as per current 'InviteMemberModal' logic 
          // which sets workspace member role.
        }
      }
    }
  }

  const listsData = await fetchLists(boardId);

  const cardsData: Record<string, Card[]> = {};
  for (const list of listsData) {
    const cards = await fetchCards(boardId, list.id);
    cardsData[list.id] = cards.map((c) => ({ ...c, listId: list.id }));
  }

  const initialBoard = { ...boardData, lists: listsData };
  const initialCardsByList = cardsData;

  return (
    <BoardClient
      workspaceId={workspaceId}
      boardId={boardId}
      initialBoard={initialBoard}
      initialCardsByList={initialCardsByList}
      currentUserRole={currentUserRole}
      initialCardId={initialCardId}
    />
  );
}

