"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LabelPicker } from "./LabelPicker";

type Label = {
  id: string;
  name: string;
  color: string;
  boardId: string;
};

type CardDetail = {
  id: string;
  title: string;
  content?: string | null;
  listId: string;
  position: number;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  labels?: Label[];
  list?: {
    id: string;
    title: string;
    boardId: string;
  };
};

interface CardModalProps {
  boardId: string;
  cardId: string;
  listId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function CardModal({ boardId, cardId, listId, isOpen, onClose, onUpdate }: CardModalProps) {
  const [card, setCard] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);

  // Fetch card details when modal opens
  useEffect(() => {
    if (isOpen && cardId) {
      fetchCardDetails();
    }
  }, [isOpen, cardId, boardId, listId]);

  const fetchCardDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/lists/${listId}/cards/${cardId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch card details");
      }
      const cardData = await res.json();
      setCard(cardData);
      setTitle(cardData.title || "");
      setDescription(cardData.content || "");
      setLabels(cardData.labels || []);
    } catch (err) {
      setError("Erreur lors du chargement de la carte");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!title.trim()) {
      setError("Le titre ne peut pas être vide");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/lists/${listId}/cards/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to update title");
      }

      const updatedCard = await res.json();
      setCard(updatedCard);
      setIsEditingTitle(false);
      onUpdate(); // Refresh the board
    } catch (err) {
      setError("Erreur lors de la mise à jour du titre");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDescription = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/lists/${listId}/cards/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: description.trim() || null }),
      });

      if (!res.ok) {
        throw new Error("Failed to update description");
      }

      const updatedCard = await res.json();
      setCard(updatedCard);
      setIsEditingDescription(false);
      onUpdate(); // Refresh the board
    } catch (err) {
      setError("Erreur lors de la mise à jour de la description");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      action();
    } else if (e.key === "Escape") {
      if (isEditingTitle) {
        setIsEditingTitle(false);
        setTitle(card?.title || "");
      }
      if (isEditingDescription) {
        setIsEditingDescription(false);
        setDescription(card?.content || "");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div className="flex-1 pr-4">
            {isEditingTitle ? (
              <div className="space-y-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => handleKeyDown(e, handleSaveTitle)}
                  className="text-xl font-semibold"
                  autoFocus
                  disabled={saving}
                />
                <p className="text-xs text-gray-500">
                  Appuyez sur Cmd/Ctrl + Entrée pour sauvegarder, Esc pour annuler
                </p>
              </div>
            ) : (
              <h2
                className="text-xl font-semibold text-gray-800 cursor-pointer hover:bg-gray-100 p-2 -m-2 rounded"
                onClick={() => setIsEditingTitle(true)}
              >
                {card?.title || "Chargement..."}
              </h2>
            )}
            {card?.list && (
              <p className="text-sm text-gray-500 mt-1">
                Dans la liste <span className="font-medium">{card.list.title}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded p-2 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-8">{error}</div>
          ) : (
            <div className="space-y-6">
              {/* Description Section */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Description</h3>
                </div>
                {isEditingDescription ? (
                  <div className="space-y-2">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onBlur={handleSaveDescription}
                      onKeyDown={(e) => handleKeyDown(e, handleSaveDescription)}
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
                    onClick={() => setIsEditingDescription(true)}
                  >
                    {card?.content ? (
                      <p className="text-gray-700 whitespace-pre-wrap">{card.content}</p>
                    ) : (
                      <p className="text-gray-400 italic">Ajouter une description plus détaillée...</p>
                    )}
                  </div>
                )}
              </div>

              {/* Labels Section */}
              <div className="border-t pt-4">
                <LabelPicker
                  boardId={boardId}
                  cardId={cardId}
                  selectedLabels={labels}
                  onLabelsChange={(newLabels) => {
                    setLabels(newLabels);
                    onUpdate(); // Refresh the board
                  }}
                />
              </div>

              {/* Placeholder for future features */}
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 italic">
                  Plus de fonctionnalités à venir : dates d'échéance, membres assignés, commentaires, checklists...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {card?.createdAt && (
                <span>
                  Créée le {new Date(card.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

