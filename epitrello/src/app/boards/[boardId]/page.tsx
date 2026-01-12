import { redirect } from "next/navigation";
import { fetchBoard } from "@/app/lib/board-api";

export default async function LegacyBoardPage({
  params,
}: {
  params: { boardId: string };
}) {
  const { boardId } = params;

  const boardData = await fetchBoard(boardId);

  if (!boardData || !boardData.workspaceId) {
    return (
      <div className="p-6 text-center text-gray-500">
        Board introuvable
      </div>
    );
  }

  redirect(`/workspaces/${boardData.workspaceId}/boards/${boardId}`);
}