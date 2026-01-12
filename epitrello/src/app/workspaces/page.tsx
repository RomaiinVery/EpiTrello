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

type Workspace = {
  id: string;
  title: string;
  description?: string | null;
  boards?: { id: string; title: string }[];
};

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameWorkspaceId, setRenameWorkspaceId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteWorkspaceId, setDeleteWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWorkspaces(data);
        } else if (data && Array.isArray(data.workspaces)) {
          setWorkspaces(data.workspaces);
        } else {
          setWorkspaces([]);
        }
      })
      .catch(() => setWorkspaces([]));
  }, []);

  const handleDelete = (id: string) => {
    setDeleteWorkspaceId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteWorkspaceId) return;
    await fetch(`/api/workspaces/${deleteWorkspaceId}`, { method: "DELETE" });
    setWorkspaces((prev) => prev.filter((t) => t.id !== deleteWorkspaceId));
    setDeleteDialogOpen(false);
    setDeleteWorkspaceId(null);
    window.dispatchEvent(new Event("sidebarUpdated"));
  };

  const handleRename = async () => {
    if (!renameWorkspaceId || !newTitle) return;

    await fetch(`/api/workspaces/${renameWorkspaceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });

    setWorkspaces((prev) =>
      prev.map((t) =>
        t.id === renameWorkspaceId ? { ...t, title: newTitle } : t
      )
    );

    setRenameOpen(false);
    setRenameWorkspaceId(null);
    setNewTitle("");
    window.dispatchEvent(new Event("sidebarUpdated"));
  };

  const handleCreate = async () => {
    if (!createTitle) return;

    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: createTitle, description: createDescription }),
    });

    if (res.ok) {
      const newWorkspace = await res.json();
      setWorkspaces((prev) => [...prev, newWorkspace]);
      setCreateOpen(false);
      setCreateTitle("");
      setCreateDescription("");
      window.dispatchEvent(new Event("sidebarUpdated"));
    }
  };

  return (
    <div className="p-6">
      <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors mb-4 inline-block">
        ← Retour à l&apos;accueil
      </Link>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Workspaces</h1>
        <Button onClick={() => setCreateOpen(true)}>Créer un workspace</Button>
      </div>
      <ul className="space-y-2">
        {workspaces.map((t) => (
          <li
            key={t.id}
            className="flex justify-between items-center p-2 border rounded-md hover:bg-gray-50 transition"
          >
            <Link href={`/workspaces/${t.id}/boards`} className="flex flex-col flex-1 ml-2">
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
                  setRenameWorkspaceId(t.id);
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
      {workspaces.length === 0 && (
        <div className="flex items-center justify-center h-64 text-gray-500">
          Aucun workspace pour le moment
        </div>
      )}

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Renommer le workspace</DialogTitle>
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
            <DialogTitle>Créer un nouveau workspace</DialogTitle>
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
        if (!open) setDeleteWorkspaceId(null);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Supprimer le workspace</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            Êtes-vous sûr de vouloir supprimer ce workspace ? Cette action est irréversible.
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

