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

const PRESETS = [
  {
    id: "empty",
    name: "Vide (Par défaut)",
    description: "Crée un workspace vide sans tableaux.",
    preview: { board: null, lists: [], labels: [] }
  },
  {
    id: "engineering",
    name: "Ingénierie",
    description: "Pour les équipes de développement logiciel.",
    preview: {
      board: "Development",
      lists: ["Backlog", "To Do", "In Progress", "Code Review", "Done"],
      labels: [
        { name: "Bug", color: "#ef4444" },
        { name: "Feature", color: "#22c55e" },
        { name: "Enhancement", color: "#3b82f6" },
        { name: "Docs", color: "#eab308" }
      ]
    }
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Planification de campagnes et contenu.",
    preview: {
      board: "Marketing Launch",
      lists: ["Ideas", "Content Prep", "In Review", "Scheduled", "Published"],
      labels: [
        { name: "Social", color: "#3b82f6" },
        { name: "Blog", color: "#eab308" },
        { name: "Email", color: "#f97316" },
        { name: "Ads", color: "#a855f7" }
      ]
    }
  },
  {
    id: "sales",
    name: "Ventes",
    description: "Suivi du pipeline de vente.",
    preview: {
      board: "Sales Pipeline",
      lists: ["Leads", "Contacted", "Meeting Scheduled", "Negotiation", "Closed Won", "Closed Lost"],
      labels: [
        { name: "Hot", color: "#ef4444" },
        { name: "Warm", color: "#f97316" },
        { name: "Cold", color: "#3b82f6" }
      ]
    }
  }
];

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameWorkspaceId, setRenameWorkspaceId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPreset, setCreatePreset] = useState("empty");
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
      body: JSON.stringify({ title: createTitle, description: createDescription, preset: createPreset }),
    });

    if (res.ok) {
      const newWorkspace = await res.json();
      setWorkspaces((prev) => [...prev, newWorkspace]);
      setCreateOpen(false);
      setCreateTitle("");
      setCreateDescription("");
      setCreatePreset("empty");
      window.dispatchEvent(new Event("sidebarUpdated"));
    }
  };

  return (
    <div className="p-6">
      <Link href="/" className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors mb-4 inline-block">
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
            className="flex justify-between items-center p-2 border rounded-md hover:bg-muted transition"
          >
            <Link href={`/workspaces/${t.id}/boards`} className="flex flex-col flex-1 ml-2">
              <span className="font-semibold hover:underline">{t.title}</span>
              {t.description && (
                <span className="text-muted-foreground text-sm line-clamp-1">{t.description}</span>
              )}
              {t.boards && t.boards.length > 0 && (
                <span className="text-muted-foreground text-xs mt-1">
                  {t.boards.length} board{t.boards.length > 1 ? "s" : ""}
                </span>
              )}
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-muted-foreground hover:text-gray-700 text-xl">
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
        <div className="flex items-center justify-center h-64 text-muted-foreground">
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

          <div className="space-y-3 mb-4">
            <label className="text-sm font-medium">Préset de démarrage</label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => setCreatePreset(preset.id)}
                  className={`p-3 rounded-md border cursor-pointer transition-all ${createPreset === preset.id
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                      : "border-border hover:border-border hover:bg-muted"
                    }`}
                >
                  <div className="font-semibold text-sm mb-1">{preset.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{preset.description}</div>
                </div>
              ))}
            </div>

            {createPreset !== "empty" && (
              <div className="mt-4 p-3 bg-muted rounded-md border">
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Aperçu du contenu</div>
                {(() => {
                  const preset = PRESETS.find(p => p.id === createPreset);
                  if (!preset || !preset.preview.board) return null;
                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground">Tableau :</span>
                        <span className="font-medium">{preset.preview.board}</span>
                      </div>
                      <div>
                        <span className="text-foreground block mb-1">Listes :</span>
                        <div className="flex flex-wrap gap-1">
                          {preset.preview.lists.map(l => (
                            <span key={l} className="px-2 py-0.5 bg-secondary rounded text-xs">{l}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-foreground block mb-1">Labels :</span>
                        <div className="flex flex-wrap gap-1">
                          {preset.preview.labels.map(l => (
                            <span key={l.name} className="px-2 py-0.5 rounded text-xs text-white" style={{ backgroundColor: l.color }}>{l.name}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
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

