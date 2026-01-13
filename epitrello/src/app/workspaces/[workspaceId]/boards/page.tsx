'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

type Board = { id: string; title: string; description?: string };
type Workspace = { id: string; title: string };

export default function BoardsByWorkspacePage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const workspaceId = params.workspaceId;

  const [boards, setBoards] = useState<Board[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameBoardId, setRenameBoardId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [linkGithub, setLinkGithub] = useState(false);
  const [githubRepo, setGithubRepo] = useState("");
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [githubBranch, setGithubBranch] = useState("main");
  /* eslint-enable @typescript-eslint/no-unused-vars */

  const [isGithubLinked, setIsGithubLinked] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [repos, setRepos] = useState<any[]>([]); // Keeping any for now to minimize changes, but could be typed
  const [reposLoading, setReposLoading] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteBoardId, setDeleteBoardId] = useState<string | null>(null);

  // Invitation state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;

    fetch(`/api/workspaces/${workspaceId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) {
          router.replace("/workspaces");
          return;
        }
        setWorkspace({ id: data.id, title: data.title });
      });

    fetch(`/api/boards?workspaceId=${workspaceId}`)
      .then((res) => res.json())
      .then((data) => setBoards(data));

    fetch("/api/user/github")
      .then((res) => res.json())
      .then((data) => {
        if (data.isLinked) setIsGithubLinked(true);
      })
      .catch(() => { });
  }, [workspaceId, router]);

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
    window.dispatchEvent(new Event("sidebarUpdated"));
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
    window.dispatchEvent(new Event("sidebarUpdated"));
  };

  const handleCreate = async () => {
    if (!createTitle || !workspaceId) return;

    const payload: { title: string; description: string; workspaceId: string; githubRepo?: string; githubBranch?: string } = {
      title: createTitle,
      description: createDescription,
      workspaceId,
    };

    if (linkGithub && githubRepo) {
      payload.githubRepo = githubRepo;
      payload.githubBranch = githubBranch || "main";
    }

    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const newBoard = await res.json();
      setBoards((prev) => [...prev, newBoard]);
      setCreateOpen(false);
      setCreateTitle("");
      setCreateDescription("");
      setLinkGithub(false);
      setGithubRepo("");
      window.dispatchEvent(new Event("sidebarUpdated"));
    }
  };

  const fetchRepos = async () => {
    setReposLoading(true);
    try {
      const res = await fetch("/api/user/github/repos");
      if (res.ok) {
        const data = await res.json();
        setRepos(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setReposLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !workspaceId) return;

    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });

      if (res.ok) {
        setInviteSuccess(true);
        setInviteEmail("");
        setTimeout(() => {
          setInviteOpen(false);
          setInviteSuccess(false);
        }, 1500);
      } else {
        const data = await res.json();
        setInviteError(data.error || "Une erreur est survenue");
      }
    } catch (err) {
      console.error(err);
      setInviteError("Erreur réseau");
    }
    setInviting(false);
  };

  if (!workspaceId) return null;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link href="/workspaces" className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors mb-2 inline-block">
            ← Retour aux workspaces
          </Link>
          <div className="flex items-center gap-4 mt-2">
            <h1 className="text-2xl font-semibold">{workspace?.title || "Workspace"}</h1>
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
              Inviter un membre
            </Button>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Créer une board</Button>
      </div>
      <ul className="space-y-2">
        {boards.map((b) => (
          <li
            key={b.id}
            className="flex justify-between items-center p-2 border rounded-md hover:bg-gray-50 transition"
          >
            <Link href={`/workspaces/${workspaceId}/boards/${b.id}`} className="flex flex-col flex-1 ml-2">
              <span className="font-semibold hover:underline">{b.title}</span>
              {b.description && (
                <span className="text-gray-500 text-sm line-clamp-1">{b.description}</span>
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
                  setRenameBoardId(b.id);
                  setNewTitle(b.title);
                  setRenameOpen(true);
                }}>
                  Renommer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(b.id)}>
                  Supprimer
                </DropdownMenuItem>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="Titre"
              required
            />
            <Input
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Description (optionnelle)"
            />

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="linkGithub"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={linkGithub}
                onChange={(e) => setLinkGithub(e.target.checked)}
                disabled={!isGithubLinked}
              />
              <label
                htmlFor="linkGithub"
                className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${!isGithubLinked ? "text-gray-400" : "text-gray-700"}`}
              >
                Lier à un dépôt GitHub
              </label>
            </div>

            {!isGithubLinked && (
              <p className="text-xs text-orange-500 ml-6">
                Vous devez d&apos;abord lier votre compte GitHub dans les paramètres.
              </p>
            )}

            {linkGithub && isGithubLinked && (
              <div className="ml-6 space-y-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Dépôt GitHub</label>
                  {reposLoading ? (
                    <div className="text-xs text-gray-400 py-2">Chargement des dépôts...</div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Filtrer les dépôts..."
                          value={repoSearch}
                          onChange={(e) => setRepoSearch(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={fetchRepos}
                          disabled={reposLoading}
                          title="Actualiser la liste"
                          className="h-8 w-8"
                        >
                          ↻
                        </Button>
                      </div>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={githubRepo}
                        onChange={(e) => setGithubRepo(e.target.value)}
                      >
                        <option value="">Sélectionner un dépôt...</option>
                        {repos
                          .filter(r => r.full_name.toLowerCase().includes(repoSearch.toLowerCase()))
                          .map((repo) => (
                            <option key={repo.id} value={repo.full_name}>
                              {repo.full_name} {repo.private && "🔒"}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
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

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Inviter un membre au workspace</DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">
              Le membre aura accès à toutes les boards de ce workspace.
            </p>
            <Input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email du membre"
              type="email"
            />
            {inviteError && (
              <p className="text-red-500 text-sm mt-2">{inviteError}</p>
            )}
            {inviteSuccess && (
              <p className="text-green-500 text-sm mt-2">Invitation envoyée avec succès !</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleInvite} disabled={!inviteEmail || inviting}>
              {inviting ? "Envoi..." : "Inviter"}
            </Button>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
