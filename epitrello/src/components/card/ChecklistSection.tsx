"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckSquare, Edit2, Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Checklist } from "@/types";

interface ChecklistSectionProps {
    boardId: string;
    listId: string;
    cardId: string;
    onUpdate: () => void;
    onActivityUpdate: () => void;
}


export function ChecklistSection({
    boardId,
    listId,
    cardId,
    onUpdate,
    onActivityUpdate,
}: ChecklistSectionProps) {
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [loading, setLoading] = useState(false);
    const [newChecklistTitle, setNewChecklistTitle] = useState("");
    const [creatingChecklist, setCreatingChecklist] = useState(false);
    const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
    const [editingChecklistTitle, setEditingChecklistTitle] = useState("");
    const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchChecklists();
    }, [boardId, listId, cardId]);

    const fetchChecklists = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/checklists`
            );
            if (res.ok) {
                const checklistsData = await res.json();
                setChecklists(checklistsData);
            }
        } catch (err) {
            console.error("Error fetching checklists:", err);
        } finally {
            setLoading(false);
        }
    }, [boardId, listId, cardId]);

    const handleCreateChecklist = async () => {
        if (!newChecklistTitle.trim()) return;

        setCreatingChecklist(true);
        setError(null);

        try {
            const res = await fetch(
                `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/checklists`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: newChecklistTitle.trim() }),
                }
            );

            if (!res.ok) {
                throw new Error("Erreur lors de la création de la checklist");
            }

            const newChecklist = await res.json();
            setChecklists([...checklists, newChecklist]);
            setNewChecklistTitle("");
            onUpdate();
            onActivityUpdate();
        } catch (err) {
            setError("Erreur lors de la création de la checklist");
            console.error(err);
        } finally {
            setCreatingChecklist(false);
        }
    };

    const handleUpdateChecklist = async (checklistId: string) => {
        if (!editingChecklistTitle.trim()) return;

        try {
            const res = await fetch(
                `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/checklists/${checklistId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: editingChecklistTitle.trim() }),
                }
            );

            if (!res.ok) {
                throw new Error("Erreur lors de la modification de la checklist");
            }

            const updatedChecklist = await res.json();
            setChecklists(
                checklists.map((c) => (c.id === checklistId ? updatedChecklist : c))
            );
            setEditingChecklistId(null);
            setEditingChecklistTitle("");
            onUpdate();
            onActivityUpdate();
        } catch (err) {
            setError("Erreur lors de la modification de la checklist");
            console.error(err);
        }
    };

    const handleDeleteChecklist = async (checklistId: string) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cette checklist ?")) return;

        try {
            const res = await fetch(
                `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/checklists/${checklistId}`,
                {
                    method: "DELETE",
                }
            );

            if (!res.ok) {
                throw new Error("Erreur lors de la suppression de la checklist");
            }

            setChecklists(checklists.filter((c) => c.id !== checklistId));
            onUpdate();
            onActivityUpdate();
        } catch (err) {
            setError("Erreur lors de la suppression de la checklist");
            console.error(err);
        }
    };

    const handleCreateItem = async (checklistId: string) => {
        const text = newItemTexts[checklistId];
        if (!text || !text.trim()) return;

        try {
            const res = await fetch(
                `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/checklists/${checklistId}/items`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: text.trim() }),
                }
            );

            if (!res.ok) {
                throw new Error("Erreur lors de l'ajout de l'élément");
            }

            const newItem = await res.json();
            setChecklists(
                checklists.map((checklist) =>
                    checklist.id === checklistId
                        ? { ...checklist, items: [...checklist.items, newItem] }
                        : checklist
                )
            );
            setNewItemTexts({ ...newItemTexts, [checklistId]: "" });
            onUpdate();
            onActivityUpdate();
        } catch (err) {
            setError("Erreur lors de l'ajout de l'élément");
            console.error(err);
        }
    };

    const handleToggleItem = async (
        checklistId: string,
        itemId: string,
        checked: boolean
    ) => {
        try {
            const res = await fetch(
                `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/checklists/${checklistId}/items/${itemId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ checked: !checked }),
                }
            );

            if (!res.ok) {
                throw new Error("Erreur lors de la modification de l'élément");
            }

            const updatedItem = await res.json();
            setChecklists(
                checklists.map((checklist) =>
                    checklist.id === checklistId
                        ? {
                            ...checklist,
                            items: checklist.items.map((item) =>
                                item.id === itemId ? updatedItem : item
                            ),
                        }
                        : checklist
                )
            );
            onUpdate();
            onActivityUpdate(); // Might not need for check, but safe to add
        } catch (err) {
            setError("Erreur lors de la modification de l'élément");
            console.error(err);
        }
    };

    const handleDeleteItem = async (checklistId: string, itemId: string) => {
        try {
            const res = await fetch(
                `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/checklists/${checklistId}/items/${itemId}`,
                {
                    method: "DELETE",
                }
            );

            if (!res.ok) {
                throw new Error("Erreur lors de la suppression de l'élément");
            }

            setChecklists(
                checklists.map((checklist) =>
                    checklist.id === checklistId
                        ? {
                            ...checklist,
                            items: checklist.items.filter((item) => item.id !== itemId),
                        }
                        : checklist
                )
            );
            onUpdate();
            onActivityUpdate();
        } catch (err) {
            setError("Erreur lors de la suppression de l'élément");
            console.error(err);
        }
    };

    return (
        <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-4">
                <CheckSquare className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">Checklists</h3>
            </div>

            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

            {loading ? (
                <p className="text-sm text-gray-400 italic text-center py-4">
                    Chargement...
                </p>
            ) : (
                <div className="space-y-4">
                    {checklists.map((checklist) => {
                        const checkedCount = checklist.items.filter(
                            (item) => item.checked
                        ).length;
                        const totalCount = checklist.items.length;
                        const progress =
                            totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

                        return (
                            <div key={checklist.id} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    {editingChecklistId === checklist.id ? (
                                        <div className="flex-1 flex items-center gap-2">
                                            <Input
                                                value={editingChecklistTitle}
                                                onChange={(e) => setEditingChecklistTitle(e.target.value)}
                                                className="flex-1 text-sm"
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        handleUpdateChecklist(checklist.id);
                                                    } else if (e.key === "Escape") {
                                                        setEditingChecklistId(null);
                                                        setEditingChecklistTitle("");
                                                    }
                                                }}
                                                autoFocus
                                            />
                                            <Button
                                                size="sm"
                                                onClick={() => handleUpdateChecklist(checklist.id)}
                                                disabled={!editingChecklistTitle.trim()}
                                            >
                                                Enregistrer
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    setEditingChecklistId(null);
                                                    setEditingChecklistTitle("");
                                                }}
                                            >
                                                Annuler
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-medium text-gray-700">
                                                        {checklist.title}
                                                    </h4>
                                                    <span className="text-xs text-gray-500">
                                                        ({checkedCount}/{totalCount})
                                                    </span>
                                                </div>
                                                {totalCount > 0 && (
                                                    <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                                                        <div
                                                            className="bg-blue-500 h-1.5 rounded-full transition-all"
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => {
                                                        setEditingChecklistId(checklist.id);
                                                        setEditingChecklistTitle(checklist.title);
                                                    }}
                                                    className="text-gray-400 hover:text-blue-600 transition-colors"
                                                    aria-label="Modifier"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteChecklist(checklist.id)}
                                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                                    aria-label="Supprimer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Items */}
                                <div className="space-y-1 mt-2">
                                    {checklist.items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-2 text-sm"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={item.checked}
                                                onChange={() =>
                                                    handleToggleItem(checklist.id, item.id, item.checked)
                                                }
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                            />
                                            <span
                                                className={`flex-1 ${item.checked
                                                    ? "line-through text-gray-400"
                                                    : "text-gray-700"
                                                    }`}
                                            >
                                                {item.text}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteItem(checklist.id, item.id)}
                                                className="text-gray-400 hover:text-red-600 transition-colors"
                                                aria-label="Supprimer"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Add Item */}
                                <div className="mt-2 flex items-center gap-2">
                                    <Input
                                        value={newItemTexts[checklist.id] || ""}
                                        onChange={(e) =>
                                            setNewItemTexts({
                                                ...newItemTexts,
                                                [checklist.id]: e.target.value,
                                            })
                                        }
                                        placeholder="Ajouter un élément..."
                                        className="flex-1 text-sm"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleCreateItem(checklist.id);
                                            }
                                        }}
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => handleCreateItem(checklist.id)}
                                        disabled={!newItemTexts[checklist.id]?.trim()}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}

                    {/* Create New Checklist */}
                    <div className="border border-dashed border-gray-300 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                            <Input
                                value={newChecklistTitle}
                                onChange={(e) => setNewChecklistTitle(e.target.value)}
                                placeholder="Ajouter une checklist..."
                                className="flex-1 text-sm"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleCreateChecklist();
                                    }
                                }}
                                disabled={creatingChecklist}
                            />
                            <Button
                                size="sm"
                                onClick={handleCreateChecklist}
                                disabled={creatingChecklist || !newChecklistTitle.trim()}
                            >
                                {creatingChecklist ? (
                                    "Création..."
                                ) : (
                                    <Plus className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
