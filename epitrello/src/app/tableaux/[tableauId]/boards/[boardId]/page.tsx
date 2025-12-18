import { fetchBoard, fetchLists, fetchCards, Card } from "@/app/lib/board-api";
import BoardClient from "@/app/boards/[boardId]/board-client";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ tableauId: string; boardId: string }>;
}) {
  const { tableauId, boardId } = await params;

  const boardData = await fetchBoard(boardId);

  if (!boardData || boardData.tableauId !== tableauId) {
    return (
      <div className="p-6 text-center text-gray-500">
        Board introuvable
      </div>
    );
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
      tableauId={tableauId}
      boardId={boardId}
      initialBoard={initialBoard}
      initialCardsByList={initialCardsByList}
    />
  );
}

