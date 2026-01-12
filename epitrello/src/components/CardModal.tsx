"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CoverImage } from "@/components/card/CoverImage";
import { DescriptionEditor } from "@/components/card/DescriptionEditor";
import { ChecklistSection } from "@/components/card/ChecklistSection";
import { CommentSection } from "@/components/card/CommentSection";
import { ActivityLog } from "@/components/card/ActivityLog";
import { CardActions } from "@/components/card/CardActions";

import { CardDetail, User } from "@/types";

interface CardModalProps {
  boardId: string;
  cardId: string;
  listId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function CardModal({
  boardId,
  cardId,
  listId,
  isOpen,
  onClose,
  onUpdate,
}: CardModalProps) {
  const [card, setCard] = useState<CardDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [lastActivityUpdate, setLastActivityUpdate] = useState(0);

  // Title Editing State
  const [title, setTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);

  useEffect(() => {
    if (isOpen && cardId) {
      fetchCardDetails();
    }
  }, [isOpen, cardId, boardId, listId]);

  const fetchCardDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/boards/${boardId}/lists/${listId}/cards/${cardId}`
      );
      if (!res.ok) {
        throw new Error("Failed to fetch card details");
      }
      const cardData = await res.json();
      setCard(cardData);
      setTitle(cardData.title || "");

      // Fetch user session for comments/permissions
      fetchCurrentUser();
    } catch (err) {
      setError("Erreur lors du chargement de la carte");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const userRes = await fetch("/api/auth/session");
      if (userRes.ok) {
        const session = await userRes.json();
        if (session?.user) {
          // Replicating original logic of matching email to board member for ID:
          const boardRes = await fetch(`/api/boards/${boardId}`);
          if (boardRes.ok) {
            const boardData = await boardRes.json();
            // Flatten members
            const allMembers: User[] = [];
            if (boardData.user) {
              allMembers.push({ id: boardData.user.id, email: boardData.user.email, name: boardData.user.name });
            }
            if (boardData.members) {
              boardData.members.forEach((m: User) => {
                if (!allMembers.some(ex => ex.id === m.id)) allMembers.push(m);
              });
            }
            const found = allMembers.find(m => m.email === session.user.email);
            if (found) setCurrentUser(found);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching current user:", err);
    }
  };

  const handleSaveTitle = async () => {
    if (!title.trim()) {
      setError("Le titre ne peut pas être vide");
      return;
    }

    setSavingTitle(true);
    try {
      const res = await fetch(
        `/api/boards/${boardId}/lists/${listId}/cards/${cardId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim() }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to update title");
      }

      const updatedCard = await res.json();
      setCard(updatedCard);
      setIsEditingTitle(false);
      triggerActivityUpdate();
      onUpdate();
    } catch (err) {
      setError("Erreur lors de la mise à jour du titre");
      console.error(err);
    } finally {
      setSavingTitle(false);
    }
  };

  const triggerActivityUpdate = () => {
    setLastActivityUpdate(Date.now());
  };

  const handleCardUpdate = (newCard: CardDetail) => {
    setCard(newCard);
    triggerActivityUpdate();
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    else if (e.key === "Escape") {
                      setIsEditingTitle(false);
                      setTitle(card?.title || "");
                    }
                  }}
                  className="text-xl font-semibold"
                  autoFocus
                  disabled={savingTitle}
                />
                <p className="text-xs text-gray-500">
                  Entrée pour sauvegarder, Esc pour annuler
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
                Dans la liste{" "}
                <span className="font-medium">{card.list.title}</span>
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
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-8 px-6">{error}</div>
          ) : (
            <>
              {card && (
                <>
                  <CoverImage
                    boardId={boardId}
                    listId={listId}
                    cardId={cardId}
                    coverImage={card.coverImage}
                    onUpdate={onUpdate}
                    onCardUpdate={handleCardUpdate}
                  />

                  <div className="p-6 space-y-6">
                    <DescriptionEditor
                      boardId={boardId}
                      listId={listId}
                      cardId={cardId}
                      initialDescription={card.content}
                      onUpdate={onUpdate}
                      onCardUpdate={handleCardUpdate}
                    />

                    <CardActions
                      boardId={boardId}
                      listId={listId}
                      cardId={cardId}
                      labels={card.labels || []}
                      members={card.members || []}
                      dueDate={card.dueDate}
                      onUpdate={onUpdate}
                      onCardUpdate={handleCardUpdate}
                      onActivityUpdate={triggerActivityUpdate}
                    />

                    <CommentSection
                      boardId={boardId}
                      listId={listId}
                      cardId={cardId}
                      currentUser={currentUser}
                      onUpdate={onUpdate}
                      onActivityUpdate={triggerActivityUpdate}
                    />

                    <ChecklistSection
                      boardId={boardId}
                      listId={listId}
                      cardId={cardId}
                      onUpdate={onUpdate}
                      onActivityUpdate={triggerActivityUpdate}
                    />

                    <ActivityLog
                      boardId={boardId}
                      cardId={cardId}
                      lastUpdate={lastActivityUpdate}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {card?.createdAt && (
                <span>
                  Créée le{" "}
                  {new Date(card.createdAt).toLocaleDateString("fr-FR", {
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
