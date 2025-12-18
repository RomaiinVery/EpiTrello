'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tableau = {
  id: string;
  title: string;
  description?: string | null;
  boards?: { id: string; title: string }[];
};

export default function TableauxPage() {
  const [tableaux, setTableaux] = useState<Tableau[]>([]);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTableauId, setRenameTableauId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTableauId, setDeleteTableauId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tableaux")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTableaux(data);
        } else if (data && Array.isArray(data.tableaux)) {
          setTableaux(data.tableaux);
        } else {
          setTableaux([]);
        }
      })
      .catch(() => setTableaux([]));
  }, []);

  const handleDelete = (id: string) => {
    setDeleteTableauId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTableauId) return;
    await fetch(`/api/tableaux/${deleteTableauId}`, { method: "DELETE" });
    setTableaux((prev) => prev.filter((t) => t.id !== deleteTableauId));
    setDeleteDialogOpen(false);
    setDeleteTableauId(null);
  };

  const handleRename = async () => {
    if (!renameTableauId || !newTitle) return;

    await fetch(`/api/tableaux/${renameTableauId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });

    setTableaux((prev) =>
      prev.map((t) =>
        t.id === renameTableauId ? { ...t, title: newTitle } : t
      )
    );

    setRenameOpen(false);
    setRenameTableauId(null);
    setNewTitle("");
  };

  const handleCreate = async () => {
    if (!createTitle) return;

    const res = await fetch("/api/tableaux", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: createTitle, description: createDescription }),
    });

    if (res.ok) {
      const newTableau = await res.json();
      setTableaux((prev) => [...prev, newTableau]);
      setCreateOpen(false);
      setCreateTitle("");
      setCreateDescription("");
    }
  };

  return (
    <div className="p-6">
      <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors mb-4 inline-block">
        ← Retour à l&apos;accueil
      </Link>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Tableaux</h1>
        <Button onClick={() => setCreateOpen(true)}>Créer un tableau</Button>
      </div>
      <ul className="space-y-2">
        {tableaux.map((t) => (
          <li
            key={t.id}
            className="flex justify-between items-center p-2 border rounded-md hover:bg-gray-50 transition"
          >
            <Link href={`/tableaux/${t.id}/boards`} className="flex flex-col flex-1 ml-2">
              <span className="font-semibold hover:underline">{t.title}</span>
              {t.description && (
                <span className="text-gray-500 text-sm line-clamp-1">{t.description}</span>
              )}
              {t.boards && t.boards.length > 0 && (
                <span className="text-gray-400 text-xs mt-1">
                  {t.boards.length} board{t.boards.length > 1 ? "s" : ""}
                </span>
              )}
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-gray-400 hover:text-gray-700 text-xl">
                  ⋯
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setRenameTableauId(t.id);
                  setNewTitle(t.title);
                  setRenameOpen(true);
                }}>
                  Renommer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(t.id)}>
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>
      {tableaux.length === 0 && (
        <div className="flex items-center justify-center h-64 text-gray-500">
          Aucun tableau pour le moment
        </div>
      )}

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Renommer le tableau</DialogTitle>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Créer un nouveau tableau</DialogTitle>
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

      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) setDeleteTableauId(null);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Supprimer le tableau</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            Êtes-vous sûr de vouloir supprimer ce tableau ? Cette action est irréversible.
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

