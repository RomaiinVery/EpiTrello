import { useState, useEffect } from "react";
import { AlignLeft } from "lucide-react";

import { CardDetail } from "@/types";

interface DescriptionEditorProps {
    boardId: string;
    listId: string;
    cardId: string;
    initialDescription?: string | null;
    onUpdate: () => void;
    onCardUpdate: (newCard: CardDetail) => void;
    readOnly?: boolean;
}

export function DescriptionEditor({
    boardId,
    listId,
    cardId,
    initialDescription,
    onUpdate,
    onCardUpdate,
    readOnly = false,
}: DescriptionEditorProps) {
    const [description, setDescription] = useState(initialDescription || "");
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setDescription(initialDescription || "");
    }, [initialDescription]);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(
                `/api/boards/${boardId}/lists/${listId}/cards/${cardId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: description.trim() || null }),
                }
            );

            if (!res.ok) {
                throw new Error("Failed to update description");
            }

            const updatedCard = await res.json();
            onCardUpdate(updatedCard);
            setIsEditing(false);
            onUpdate();
        } catch (err) {
            setError("Erreur lors de la mise à jour de la description");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            handleSave();
        } else if (e.key === "Escape") {
            setIsEditing(false);
            setDescription(initialDescription || "");
        }
    };

    if (readOnly) {
        return (
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <AlignLeft className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-700">Description</h3>
                </div>
                <div className="min-h-[60px] p-3 bg-gray-50 rounded">
                    {initialDescription ? (
                        <p className="text-gray-700 whitespace-pre-wrap">
                            {initialDescription}
                        </p>
                    ) : (
                        <p className="text-gray-400 italic">
                            Aucune description.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <AlignLeft className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">Description</h3>
            </div>

            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

            {isEditing ? (
                <div className="space-y-2">
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none min-h-[100px]"
                        placeholder="Ajouter une description plus détaillée..."
                        autoFocus
                        disabled={saving}
                    />
                    <p className="text-xs text-gray-500">
                        Appuyez sur Cmd/Ctrl + Entrée pour sauvegarder, Esc pour annuler
                    </p>
                </div>
            ) : (
                <div
                    className="min-h-[60px] p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => setIsEditing(true)}
                >
                    {initialDescription ? (
                        <p className="text-gray-700 whitespace-pre-wrap">
                            {initialDescription}
                        </p>
                    ) : (
                        <p className="text-gray-400 italic">
                            Ajouter une description plus détaillée...
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
