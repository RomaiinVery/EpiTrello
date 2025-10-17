"use client";
import Link from "next/link";
import { useState } from "react";
import React from "react";

type List = {
  id: string;
  title: string;
  position: number;
};

type Board = {
  id: string;
  title: string;
  description?: string | null;
  lists?: List[];
};

async function fetchBoard(id: string): Promise<Board | null> {
  // Appel API pour récupérer la board sans les listes
  const res = await fetch(`/api/boards/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function fetchLists(boardId: string): Promise<List[]> {
  const res = await fetch(`/api/boards/${boardId}/lists`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const boardId = unwrappedParams.id;
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    let ignore = false;
    setLoading(true);
    async function loadBoardAndLists() {
      const boardData = await fetchBoard(boardId);
      if (ignore) return;
      if (!boardData) {
        setBoard(null);
        setLoading(false);
        return;
      }
      const listsData = await fetchLists(boardId);
      if (ignore) return;
      setBoard({ ...boardData, lists: listsData });
      setLoading(false);
    }
    loadBoardAndLists();
    return () => {
      ignore = true;
    };
  }, [boardId]);

  const handleAddListClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowDialog(true);
    setNewListTitle("");
    setError(null);
  };

  const handleDialogCancel = () => {
    setShowDialog(false);
    setNewListTitle("");
    setError(null);
  };

  const handleDialogConfirm = async () => {
    if (!newListTitle.trim()) {
      setError("Le titre ne peut pas être vide");
      return;
    }
    setAddingList(true);
    setError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newListTitle }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur lors de l'ajout de la liste");
        setAddingList(false);
        return;
      }
      const newList = await res.json();
      setBoard((prev) =>
        prev
          ? { ...prev, lists: [...(prev.lists || []), newList] }
          : prev
      );
      setShowDialog(false);
      setNewListTitle("");
    } catch (err) {
      setError("Erreur réseau");
    }
    setAddingList(false);
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        Chargement...
      </div>
    );
  }
  if (!board) {
    return (
      <div className="p-6 text-center text-gray-500">
        Board introuvable
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Bouton retour */}
      <Link
        href="/boards"
        className="text-gray-500 hover:text-gray-700 mb-4 inline-block"
      >
        ← Back
      </Link>

      {/* Infos de la board */}
      <h1 className="text-2xl font-bold mb-2">{board.title}</h1>
      {board.description && (
        <p className="text-gray-600 mb-4">{board.description}</p>
      )}

      <hr className="my-4" />

      {/* Zone des listes */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {board.lists && board.lists.length > 0 ? (
          board.lists.map((list) => (
            <div
              key={list.id}
              className="w-64 min-w-[16rem] bg-gray-100 rounded-lg p-3 shadow-sm"
            >
              <h2 className="font-semibold text-gray-800 mb-2">{list.title}</h2>
              <p className="text-sm text-gray-500 italic">Aucune carte pour l’instant</p>
            </div>
          ))
        ) : (
          <div className="text-gray-400 italic">
            Aucune liste pour le moment
          </div>
        )}

        {/* Bouton ajouter une liste */}
        <div className="w-64 min-w-[16rem]">
          <button
            onClick={handleAddListClick}
            className="flex items-center justify-center h-full w-full border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
            type="button"
          >
            + Ajouter une liste
          </button>
        </div>
      </div>

      {/* Dialog popup pour ajouter une liste */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h3 className="text-lg font-semibold mb-3">Ajouter une liste</h3>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Titre de la liste"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              disabled={addingList}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleDialogConfirm();
              }}
            />
            {error && (
              <div className="text-red-500 text-sm mb-2">{error}</div>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={handleDialogCancel}
                disabled={addingList}
                type="button"
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
                onClick={handleDialogConfirm}
                disabled={addingList}
                type="button"
              >
                {addingList ? "Ajout..." : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}