import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreatePullRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { title: string; head: string; base: string; draft: boolean }) => void;
    boardId: string;
    cardTitle: string;
    repoName: string;
    isCreating: boolean;
}

export function CreatePullRequestModal({
    isOpen,
    onClose,
    onConfirm,
    boardId,
    cardTitle,
    repoName,
    isCreating
}: CreatePullRequestModalProps) {

    const [title, setTitle] = useState(cardTitle);
    const [head, setHead] = useState("");
    const [base, setBase] = useState("main");
    const [draft, setDraft] = useState(false);

    const [branches, setBranches] = useState<{ name: string }[]>([]);
    const [loadingBranches, setLoadingBranches] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBranches = useCallback(async () => {
        setLoadingBranches(true);
        setError(null);
        try {
            const res = await fetch(`/api/boards/${boardId}/github/branches`);
            if (res.ok) {
                const data = await res.json();
                setBranches(data);
                // Try to auto-select a branch if it matches "issue-" or similar?
                // simple default: none
            } else {
                setError("Impossible de charger les branches.");
            }
        } catch {
            setError("Erreur réseau.");
        } finally {
            setLoadingBranches(false);
        }
    }, [boardId]);

    useEffect(() => {
        if (isOpen) {
            setTitle(cardTitle);
            fetchBranches();
        }
    }, [isOpen, cardTitle, fetchBranches]);

    const handleConfirm = () => {
        if (!title || !head || !base) return;
        onConfirm({ title, head, base, draft });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Créer une Pull Request</DialogTitle>
                    <p className="text-xs text-gray-500">Pour {repoName}</p>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div className="space-y-1">
                        <label className="text-sm font-medium">Titre de la PR</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Titre de la PR"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium">Source (Head)</label>
                            {loadingBranches ? (
                                <div className="text-xs text-gray-400 py-2">Chargement...</div>
                            ) : (
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={head}
                                    onChange={(e) => setHead(e.target.value)}
                                >
                                    <option value="">Choisir une branche...</option>
                                    {branches.map(b => (
                                        <option key={b.name} value={b.name}>{b.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium">Cible (Base)</label>
                            {loadingBranches ? (
                                <div className="text-xs text-gray-400 py-2">Chargement...</div>
                            ) : (
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={base}
                                    onChange={(e) => setBase(e.target.value)}
                                >
                                    <option value="main">main</option>
                                    {branches.map(b => (
                                        <option key={b.name} value={b.name}>{b.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <input
                            type="checkbox"
                            id="draftPr"
                            className="h-4 w-4 rounded border-gray-300"
                            checked={draft}
                            onChange={(e) => setDraft(e.target.checked)}
                        />
                        <label htmlFor="draftPr" className="text-sm">Créer en tant que Draft</label>
                    </div>

                    <div className="bg-blue-50 p-3 rounded text-xs text-blue-700">
                        ℹ️ L&apos;issue associée à cette carte sera automatiquement liée (&quot;Closes #...&quot;) dans la description de la PR.
                    </div>

                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isCreating}>Annuler le déplacement</Button>
                    <Button onClick={handleConfirm} disabled={!head || !title || loadingBranches || isCreating}>
                        {isCreating ? "Création en cours..." : "Créer la PR"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
