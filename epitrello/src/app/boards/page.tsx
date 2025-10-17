'use client';
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type Board = { id: string; title: string; description?: string };

export default function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameBoardId, setRenameBoardId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBoardId, setDeleteBoardId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/boards")
      .then((res) => res.json())
      .then((data) => setBoards(data));
  }, []);

  // Show dialog instead of confirm()
  const handleDelete = (id: string) => {
    setDeleteBoardId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteBoardId) return;
    await fetch(`/api/boards/${deleteBoardId}`, { method: "DELETE" });
    setBoards((prev) => prev.filter((b) => b.id !== deleteBoardId));
    setDeleteDialogOpen(false);
    setDeleteBoardId(null);
  };

  const handleRename = async () => {
    if (!renameBoardId || !newTitle) return;

    await fetch(`/api/boards/${renameBoardId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });

    setBoards((prev) =>
      prev.map((b) =>
        b.id === renameBoardId ? { ...b, title: newTitle } : b
      )
    );

    setRenameOpen(false);
    setRenameBoardId(null);
    setNewTitle("");
  };

  const handleCreate = async () => {
    if (!createTitle) return;

    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: createTitle, description: createDescription }),
    });

    if (res.ok) {
      const newBoard = await res.json();
      setBoards((prev) => [...prev, newBoard]);
      setCreateOpen(false);
      setCreateTitle("");
      setCreateDescription("");
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Boards</h1>
        <Button onClick={() => setCreateOpen(true)}>Créer une board</Button>
      </div>
      <ul className="space-y-2">
        {boards.map((b) => (
          <li
            key={b.id}
            className="flex justify-between items-center p-2 border rounded-md hover:bg-gray-50 transition"
          >
            <Link href={`/boards/${b.id}`} className="flex flex-col flex-1 ml-2">
              <span className="font-semibold hover:underline">{b.title}</span>
              {b.description && (
                <span className="text-gray-500 text-sm line-clamp-1">{b.description}</span>
              )}
            </Link>

            {/* Dropdown menu à droite */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-gray-400 hover:text-gray-700 text-xl">
                  ⋯
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setRenameBoardId(b.id);
                  setNewTitle(b.title);
                  setRenameOpen(true);
                }}>
                  Renommer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(b.id)}>
                  Supprimer
                </DropdownMenuItem>
                {/* <DropdownMenuItem>Partager</DropdownMenuItem> */}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>
      {boards.length === 0 && (
        <div className="flex items-center justify-center h-64 text-gray-500">
          Aucune board pour le moment
        </div>
      )}

      {/* Dialog pour renommer */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Renommer la board</DialogTitle>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nouveau nom"
            className="mb-4"
          />
          <DialogFooter>
            <Button onClick={handleRename}>OK</Button>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour créer une nouvelle board */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle board</DialogTitle>
          </DialogHeader>
          <Input
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            placeholder="Titre"
            className="mb-4"
            required
          />
          <Input
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
            placeholder="Description (optionnelle)"
            className="mb-4"
          />
          <DialogFooter>
            <Button onClick={handleCreate} disabled={!createTitle}>OK</Button>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour confirmer la suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) setDeleteBoardId(null);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Supprimer la board</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            Êtes-vous sûr de vouloir supprimer cette board ? Cette action est irréversible.
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={confirmDelete}>
              Supprimer
            </Button>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
