"use client";
import Link from "next/link";
import { useState } from "react";
import React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

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

async function fetchBoard(boardId: string): Promise<Board | null> {
  const res = await fetch(`/api/boards/${boardId}`, { cache: "no-store" });
  if (!res.ok) return null; // Si 404, retourne null → “Board introuvable”
  return res.json();
}

async function fetchLists(boardId: string): Promise<List[]> {
  const res = await fetch(`/api/boards/${boardId}/lists`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export default function BoardPage({ params }: { params: { boardId: string } }) {
  // ICI ROBIN
  const { boardId } = params;
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // New state variables for rename dialog
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [listToRename, setListToRename] = useState<List | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // New state variables for delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [listToDelete, setListToDelete] = useState<List | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const toggleMenu = (listId: string) => {
    setOpenMenuId(openMenuId === listId ? null : listId);
  };

  const handleRename = (listId: string) => {
    if (!board || !board.lists) return;
    const list = board.lists.find((l) => l.id === listId);
    if (!list) return;
    setListToRename(list);
    setRenameTitle(list.title);
    setRenameError(null);
    setShowRenameDialog(true);
    setOpenMenuId(null);
  };

  const handleRenameCancel = () => {
    setShowRenameDialog(false);
    setRenameTitle("");
    setListToRename(null);
    setRenameError(null);
  };

  const handleRenameConfirm = async () => {
    if (!renameTitle.trim()) {
      setRenameError("Le titre ne peut pas être vide");
      return;
    }
    if (!listToRename) return;
    setRenaming(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/lists/${listToRename.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameTitle }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRenameError(data.error || "Erreur lors du renommage");
        setRenaming(false);
        return;
      }
      const updatedList = await res.json();
      setBoard((prev) => {
        if (!prev || !prev.lists) return prev;
        const newLists = prev.lists.map((l) =>
          l.id === updatedList.id ? updatedList : l
        );
        return { ...prev, lists: newLists };
      });
      setShowRenameDialog(false);
      setRenameTitle("");
      setListToRename(null);
    } catch (err) {
      setRenameError("Erreur réseau");
    }
    setRenaming(false);
  };

  const handleDelete = (listId: string) => {
    if (!board || !board.lists) return;
    const list = board.lists.find((l) => l.id === listId);
    if (!list) return;
    setListToDelete(list);
    setDeleteError(null);
    setShowDeleteDialog(true);
    setOpenMenuId(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setListToDelete(null);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!listToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/lists/${listToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error || "Erreur lors de la suppression");
        setDeleting(false);
        return;
      }
      setBoard((prev) => {
        if (!prev || !prev.lists) return prev;
        const newLists = prev.lists.filter((l) => l.id !== listToDelete.id);
        return { ...prev, lists: newLists };
      });
      setShowDeleteDialog(false);
      setListToDelete(null);
    } catch (err) {
      setDeleteError("Erreur réseau");
    }
    setDeleting(false);
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
              className="w-64 min-w-[16rem] bg-gray-100 rounded-lg p-3 shadow-sm relative"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-semibold text-gray-800">{list.title}</h2>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="text-gray-500 hover:text-gray-700 focus:outline-none"
                      aria-label="Menu"
                      type="button"
                    >
                      &#x22EE;
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleRename(list.id)}>
                      Renommer
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(list.id)}>
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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

      {/* Dialog popup pour renommer une liste */}
      {showRenameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h3 className="text-lg font-semibold mb-3">Renommer la liste</h3>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Nouveau titre"
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              disabled={renaming}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameConfirm();
              }}
            />
            {renameError && (
              <div className="text-red-500 text-sm mb-2">{renameError}</div>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={handleRenameCancel}
                disabled={renaming}
                type="button"
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
                onClick={handleRenameConfirm}
                disabled={renaming}
                type="button"
              >
                {renaming ? "Renommage..." : "Renommer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog popup pour supprimer une liste */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h3 className="text-lg font-semibold mb-3">Supprimer la liste</h3>
            <p className="mb-4">
              Êtes-vous sûr de vouloir supprimer la liste "{listToDelete?.title}" ?
            </p>
            {deleteError && (
              <div className="text-red-500 text-sm mb-2">{deleteError}</div>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={handleDeleteCancel}
                disabled={deleting}
                type="button"
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                type="button"
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}