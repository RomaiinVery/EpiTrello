"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LabelPicker } from "./LabelPicker";

type Label = {
  id: string;
  name: string;
  color: string;
  boardId: string;
};

type User = {
  id: string;
  email: string;
  name?: string | null;
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
  members?: User[];
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
  const [members, setMembers] = useState<User[]>([]);
  const [boardMembers, setBoardMembers] = useState<User[]>([]);
  const [isAssigningMember, setIsAssigningMember] = useState(false);

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
      setMembers(cardData.members || []);
      
      // Fetch board members
      const boardRes = await fetch(`/api/boards/${boardId}`);
      if (boardRes.ok) {
        const boardData = await boardRes.json();
        const allMembers: User[] = [];
        
        // Add owner if exists
        if (boardData.user) {
          allMembers.push({
            id: boardData.user.id,
            email: boardData.user.email,
            name: boardData.user.name,
          });
        }
        
        // Add other members
        if (boardData.members && Array.isArray(boardData.members)) {
          boardData.members.forEach((m: any) => {
            // Avoid duplicates (in case owner is also in members list)
            if (!allMembers.some(existing => existing.id === m.id)) {
              allMembers.push({
                id: m.id,
                email: m.email,
                name: m.name,
              });
            }
          });
        }
        
        setBoardMembers(allMembers);
      }
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

              {/* Assigned Members Section */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Membres assignés</h3>
                </div>
                <div className="space-y-2">
                  {members.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-200"
                        >
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                            {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-gray-700">
                            {member.name || member.email}
                          </span>
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(
                                  `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/members?userId=${member.id}`,
                                  { method: "DELETE" }
                                );
                                if (res.ok) {
                                  setMembers(members.filter(m => m.id !== member.id));
                                  onUpdate();
                                }
                              } catch (err) {
                                console.error("Error unassigning member:", err);
                              }
                            }}
                            className="ml-1 text-gray-400 hover:text-red-600 transition-colors"
                            aria-label="Retirer le membre"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Aucun membre assigné</p>
                  )}
                  <div className="mt-2">
                    <select
                      value=""
                      onChange={async (e) => {
                        const userId = e.target.value;
                        if (!userId) return;
                        
                        setIsAssigningMember(true);
                        try {
                          const res = await fetch(
                            `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/members`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ userId }),
                            }
                          );
                          if (res.ok) {
                            const newMember = await res.json();
                            setMembers([...members, newMember]);
                            onUpdate();
                            e.target.value = "";
                          }
                        } catch (err) {
                          console.error("Error assigning member:", err);
                        } finally {
                          setIsAssigningMember(false);
                        }
                      }}
                      disabled={isAssigningMember}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">Assigner un membre...</option>
                      {boardMembers
                        .filter(m => !members.some(assigned => assigned.id === m.id))
                        .map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name || member.email}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
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

