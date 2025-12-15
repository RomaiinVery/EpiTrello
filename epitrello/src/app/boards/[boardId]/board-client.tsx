"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";

import { type List, type Card, type Board, type Checklist } from "@/app/lib/board-api";
import { CardModal } from "@/components/CardModal";
import { CheckSquare } from "lucide-react";

function CardItem({ card, onRename, onDelete, onClick }: {
  card: Card;
  onRename: (listId: string, cardId: string) => void;
  onDelete: (listId: string, cardId: string) => void;
  onClick: (listId: string, cardId: string) => void;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: "Card",
      card,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-gray-200 rounded shadow p-2 mb-2 h-24 opacity-50"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="bg-white rounded shadow mb-2 cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
      onClick={(e) => {
        if (!isDragging && !(e.target as HTMLElement).closest('[role="menuitem"]')) {
          onClick(card.listId, card.id);
        }
      }}
    >
      {card.coverImage && (
        <img
          src={card.coverImage}
          alt="Cover"
          className="w-full h-32 object-cover"
        />
      )}
      <div className="p-2">
        <div className="flex justify-between items-center mb-2">
        <h3 
          className="font-semibold text-gray-700 flex-1"
          {...listeners}
        >
          {card.title}
        </h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label="Menu"
              type="button"
              onClick={(e) => e.stopPropagation()}
            >
              &#x22EE;
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRename(card.listId, card.id)}>
              Renommer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(card.listId, card.id)}>
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {card.content && (
        <p className="text-gray-600 text-sm line-clamp-2">{card.content}</p>
      )}
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {card.labels.map((label) => (
            <div
              key={label.id}
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: label.color,
                color: isLabelColorLight(label.color) ? "#000" : "#fff",
              }}
            >
              {label.name}
            </div>
          ))}
        </div>
      )}
      {card.members && card.members.length > 0 && (
        <div className="flex items-center gap-1 mt-2">
          {card.members.map((member) => (
            <div
              key={member.id}
              className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold border-2 border-white"
              title={member.name || member.email}
            >
              {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      )}
      {card.checklists && card.checklists.length > 0 && (
        <div className="mt-2 space-y-1">
          {card.checklists.map((checklist) => {
            const checkedCount = checklist.items.filter(item => item.checked).length;
            const totalCount = checklist.items.length;
            if (totalCount === 0) return null;
            
            return (
              <div key={checklist.id} className="flex items-center gap-2 text-xs text-gray-600">
                <CheckSquare className="w-3 h-3" />
                <span className="flex-1">{checklist.title}</span>
                <span className="font-medium">
                  {checkedCount}/{totalCount}
                </span>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}

function isLabelColorLight(color: string): boolean {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}

function ListContainer({ list, cards, onRenameList, onDeleteList, onAddCard, onRenameCard, onDeleteCard, onCardClick }: {
  list: List;
  cards: Card[];
  onRenameList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  onAddCard: (list: List) => void;
  onRenameCard: (listId: string, cardId: string) => void;
  onDeleteCard: (listId: string, cardId: string) => void;
  onCardClick: (listId: string, cardId: string) => void;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: {
      type: "List",
      list,
    },
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const cardsMemo = useMemo(() => cards, [cards]);

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-64 min-w-[16rem] bg-gray-200 rounded-lg p-3 shadow-sm h-full opacity-50"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-64 min-w-[16rem] bg-gray-100 rounded-lg p-3 shadow-sm relative flex flex-col max-h-[calc(100vh-12rem)]"
    >
      <div {...attributes} {...listeners} className="flex justify-between items-center mb-2 cursor-grab active:cursor-grabbing">
        <h2 className="font-semibold text-gray-800">{list.title}</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label="Menu"
              type="button"
            >
              &#x22EE;
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRenameList(list.id)}>
              Renommer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDeleteList(list.id)}>
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-grow overflow-y-auto mb-2">
        <SortableContext items={cardsMemo.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cardsMemo.length > 0 ? (
            cardsMemo.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                onRename={onRenameCard}
                onDelete={onDeleteCard}
                onClick={onCardClick}
              />
            ))
          ) : (
            <p className="text-sm text-gray-500 italic mb-2">Aucune carte</p>
          )}
        </SortableContext>
      </div>

      <button
        onClick={() => onAddCard(list)}
        className="mt-auto flex items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors py-1"
        type="button"
      >
        + Ajouter une carte
      </button>
    </div>
  );
}

interface BoardClientProps {
  boardId: string;
  initialBoard: Board;
  initialCardsByList: Record<string, Card[]>;
}

export default function BoardClient({ boardId, initialBoard, initialCardsByList }: BoardClientProps) {
  
  const [board, setBoard] = useState<Board | null>(initialBoard);
  const [cardsByList, setCardsByList] = useState<Record<string, Card[]>>(initialCardsByList);

  const [showDialog, setShowDialog] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [listToRename, setListToRename] = useState<List | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [listToDelete, setListToDelete] = useState<List | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [showAddCardDialog, setShowAddCardDialog] = useState(false);
  const [cardTitle, setCardTitle] = useState("");
  const [cardContent, setCardContent] = useState("");
  const [addingCard, setAddingCard] = useState(false);
  const [addCardError, setAddCardError] = useState<string | null>(null);
  const [listForNewCard, setListForNewCard] = useState<List | null>(null);

  const [listForCardAction, setListForCardAction] = useState<string | null>(null);
  const [showRenameCardDialog, setShowRenameCardDialog] = useState(false);
  const [renameCardTitle, setRenameCardTitle] = useState("");
  const [cardToRename, setCardToRename] = useState<Card | null>(null);
  const [renamingCard, setRenamingCard] = useState(false);
  const [renameCardError, setRenameCardError] = useState<string | null>(null);

  const [showDeleteCardDialog, setShowDeleteCardDialog] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);
  const [deletingCard, setDeletingCard] = useState(false);
  const [deleteCardError, setDeleteCardError] = useState<string | null>(null);

  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);

  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const [activeList, setActiveList] = useState<List | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const listIds = useMemo(() => (board?.lists || []).map(l => l.id), [board?.lists]);

  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const handleAddListClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowDialog(true);
    setNewListTitle("");
    setError(null);
  };
  const handleDialogCancel = () => {
    setShowDialog(false);
    setNewListTitle("");
    setError(null);
  };
  const handleDialogConfirm = async () => {
    if (!newListTitle.trim()) {
      setError("Le titre ne peut pas être vide");
      return;
    }
    setAddingList(true);
    setError(null);
    try {
      const nextPosition = (board?.lists?.length || 0);

      const res = await fetch(`/api/boards/${boardId}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newListTitle, position: nextPosition }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur lors de l'ajout de la liste");
        setAddingList(false);
        return;
      }
      const newList = await res.json();
      setBoard((prev) =>
        prev
          ? { ...prev, lists: [...(prev.lists || []), newList] }
          : prev
      );
      setCardsByList((prev) => ({ ...prev, [newList.id]: [] }));
      setShowDialog(false);
      setNewListTitle("");
    } catch (err) {
      setError("Erreur réseau");
    }
    setAddingList(false);
  };

  const handleRename = (listId: string) => {
    if (!board || !board.lists) return;
    const list = board.lists.find((l) => l.id === listId);
    if (!list) return;
    setListToRename(list);
    setRenameTitle(list.title);
    setRenameError(null);
    setShowRenameDialog(true);
  };
  const handleRenameCancel = () => {
    setShowRenameDialog(false);
    setRenameTitle("");
    setListToRename(null);
    setRenameError(null);
  };
  const handleRenameConfirm = async () => {
    if (!renameTitle.trim()) {
      setRenameError("Le titre ne peut pas être vide");
      return;
    }
    if (!listToRename) return;
    setRenaming(true);
    setRenameError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/lists/${listToRename.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameTitle }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRenameError(data.error || "Erreur lors du renommage");
        setRenaming(false);
        return;
      }
      const updatedList = await res.json();
      setBoard((prev) => {
        if (!prev || !prev.lists) return prev;
        const newLists = prev.lists.map((l) =>
          l.id === updatedList.id ? updatedList : l
        );
        return { ...prev, lists: newLists };
      });
      setShowRenameDialog(false);
      setRenameTitle("");
      setListToRename(null);
    } catch (err) {
      setRenameError("Erreur réseau");
    }
    setRenaming(false);
  };

  const handleDelete = (listId: string) => {
    if (!board || !board.lists) return;
    const list = board.lists.find((l) => l.id === listId);
    if (!list) return;
    setListToDelete(list);
    setDeleteError(null);
    setShowDeleteDialog(true);
  };
  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setListToDelete(null);
    setDeleteError(null);
  };
  const handleDeleteConfirm = async () => {
    if (!listToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/lists/${listToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error || "Erreur lors de la suppression");
        setDeleting(false);
        return;
      }
      setBoard((prev) => {
        if (!prev || !prev.lists) return prev;
        const newLists = prev.lists.filter((l) => l.id !== listToDelete.id);
        return { ...prev, lists: newLists };
      });
      setCardsByList((prev) => {
        const newCardsByList = { ...prev };
        delete newCardsByList[listToDelete.id];
        return newCardsByList;
      });
      setShowDeleteDialog(false);
      setListToDelete(null);
    } catch (err) {
      setDeleteError("Erreur réseau");
    }
    setDeleting(false);
  };

  const handleAddCardClick = (list: List) => {
    setListForNewCard(list);
    setCardTitle("");
    setCardContent("");
    setAddCardError(null);
    setShowAddCardDialog(true);
  };
  const handleAddCardCancel = () => {
    setShowAddCardDialog(false);
    setCardTitle("");
    setCardContent("");
    setAddCardError(null);
    setListForNewCard(null);
  };
  const handleAddCardConfirm = async () => {
    if (!cardTitle.trim()) {
      setAddCardError("Le titre ne peut pas être vide");
      return;
    }
    if (!listForNewCard) return;
    setAddingCard(true);
    setAddCardError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/lists/${listForNewCard.id}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cardTitle, content: cardContent }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAddCardError(data.error || "Erreur lors de l'ajout de la carte");
        setAddingCard(false);
        return;
      }
      const newCard = await res.json();
      setCardsByList((prev) => {
        const prevCards = prev[listForNewCard.id] || [];
        return { ...prev, [listForNewCard.id]: [...prevCards, { ...newCard, listId: listForNewCard.id }] };
      });
      setShowAddCardDialog(false);
      setCardTitle("");
      setCardContent("");
      setListForNewCard(null);
    } catch (err) {
      setAddCardError("Erreur réseau");
    }
    setAddingCard(false);
  };

  const handleRenameCard = (listId: string, cardId: string) => {
    const card = cardsByList[listId]?.find((c) => c.id === cardId);
    if (!card) return;
    setCardToRename(card);
    setListForCardAction(listId);
    setRenameCardTitle(card.title);
    setRenameCardError(null);
    setShowRenameCardDialog(true);
  };
  const handleRenameCardCancel = () => {
    setShowRenameCardDialog(false);
    setCardToRename(null);
    setRenameCardTitle("");
    setRenameCardError(null);
  };
  const handleRenameCardConfirm = async () => {
    if (!cardToRename || !listForCardAction) return;
    if (!renameCardTitle.trim()) {
      setRenameCardError("Le titre ne peut pas être vide");
      return;
    }
    setRenamingCard(true);
    setRenameCardError(null);
    try {
      const res = await fetch(
        `/api/boards/${boardId}/lists/${listForCardAction}/cards/${cardToRename.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: renameCardTitle }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRenameCardError(data.error || "Erreur lors du renommage");
        setRenamingCard(false);
        return;
      }
      const updatedCard = await res.json();
      setCardsByList((prev) => {
        const updatedCards = prev[listForCardAction].map((c) =>
          c.id === updatedCard.id ? { ...updatedCard, listId: listForCardAction } : c
        );
        return { ...prev, [listForCardAction]: updatedCards };
      });
      setShowRenameCardDialog(false);
      setCardToRename(null);
      setRenameCardTitle("");
    } catch (err) {
      setRenameCardError("Erreur réseau");
    }
    setListForCardAction(null);
    setRenamingCard(false);
  };

  const handleDeleteCard = (listId: string, cardId: string) => {
    const card = cardsByList[listId]?.find((c) => c.id === cardId);
    if (!card) return;
    setCardToDelete(card);
    setListForCardAction(listId);
    setShowDeleteCardDialog(true);
  };
  const handleDeleteCardCancel = () => {
    setShowDeleteCardDialog(false);
    setCardToDelete(null);
    setDeleteCardError(null);
  };
  const handleDeleteCardConfirm = async () => {
    if (!cardToDelete || !listForCardAction) return;
    setDeletingCard(true);
    setDeleteCardError(null);
    try {
      const res = await fetch(
        `/api/boards/${boardId}/lists/${listForCardAction}/cards/${cardToDelete.id}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteCardError(data.error || "Erreur lors de la suppression");
        setDeletingCard(false);
        return;
      }
      setCardsByList((prev) => {
        const filtered = prev[listForCardAction].filter(
          (c) => c.id !== cardToDelete.id
        );
        return { ...prev, [listForCardAction]: filtered };
      });
      setShowDeleteCardDialog(false);
      setCardToDelete(null);
    } catch (err) {
      setDeleteCardError("Erreur réseau");
    }
    setListForCardAction(null);
    setDeletingCard(false);
  };

  const handleShareClick = () => {
    setShowShareDialog(true);
    setShareEmail("");
    setShareError(null);
    setShareSuccess(false);
  };

  const handleShareCancel = () => {
    setShowShareDialog(false);
    setShareEmail("");
    setShareError(null);
    setShareSuccess(false);
  };

  const handleShareConfirm = async () => {
    if (!shareEmail.trim()) {
      setShareError("L'email ne peut pas être vide");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shareEmail.trim())) {
      setShareError("Veuillez entrer une adresse email valide");
      return;
    }

    setSharing(true);
    setShareError(null);
    setShareSuccess(false);

    try {
      const res = await fetch(`/api/boards/${boardId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: shareEmail.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setShareError(data.error || "Erreur lors du partage du tableau");
        setSharing(false);
        return;
      }

      setShareSuccess(true);
      setShareEmail("");
      
      setTimeout(() => {
        setShowShareDialog(false);
        setShareSuccess(false);
      }, 1500);
    } catch (err) {
      setShareError("Erreur réseau");
    }
    setSharing(false);
  };

  const handleCardClick = (listId: string, cardId: string) => {
    setSelectedCardId(cardId);
    setSelectedListId(listId);
    setShowCardModal(true);
  };

  const handleCardModalClose = () => {
    setShowCardModal(false);
    setSelectedCardId(null);
    setSelectedListId(null);
  };

  const handleCardUpdate = () => {
    fetchBoardData();
  };

  const fetchBoardData = async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}`);
      if (res.ok) {
        const boardData = await res.json();
        setBoard((prev) => prev ? { ...prev, ...boardData } : boardData);
      }

      const listsRes = await fetch(`/api/boards/${boardId}/lists`);
      if (listsRes.ok) {
        const listsData = await listsRes.json();
        setBoard((prev) => prev ? { ...prev, lists: listsData } : prev);

        const newCardsByList: Record<string, Card[]> = {};
        for (const list of listsData) {
          const cardsRes = await fetch(`/api/boards/${boardId}/lists/${list.id}/cards`);
          if (cardsRes.ok) {
            const cardsData = await cardsRes.json();
            newCardsByList[list.id] = cardsData.map((c: Card) => ({ ...c, listId: list.id }));
          }
        }
        setCardsByList((prev) => ({ ...prev, ...newCardsByList }));
      }
    } catch (err) {
      console.error("Error refreshing board data:", err);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const { data } = active;

    if (data.current?.type === "List") {
      setActiveList(data.current.list);
    }
    if (data.current?.type === "Card") {
      setActiveCard(data.current.card);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveACard = active.data.current?.type === "Card";
    if (!isActiveACard) return;

    const activeListId = active.data.current?.card.listId;

    let overListId: string | null = null;
    if (over.data.current?.type === "Card") {
      overListId = over.data.current.card.listId;
    } else if (over.data.current?.type === "List") {
      overListId = over.id as string;
    }

    if (!overListId || !activeListId || activeListId === overListId) {
      return;
    }

    setCardsByList((prev) => {
      const sourceList = prev[activeListId];
      const destList = prev[overListId];

      if (!sourceList || !destList) {
        return prev;
      }

      const activeIndex = sourceList.findIndex(c => c.id === activeId);
      if (activeIndex === -1) {
        return prev;
      }

      const newCardsState = { ...prev };

      const [movedCard] = newCardsState[activeListId].splice(activeIndex, 1);

      movedCard.listId = overListId;

      newCardsState[overListId].push(movedCard);

      return newCardsState;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveList(null);
    setActiveCard(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const isActiveAList = active.data.current?.type === "List";

    if (isActiveAList && activeId !== overId) {
      setBoard((prev) => {
        if (!prev || !prev.lists) return prev;
        const activeIndex = prev.lists.findIndex((l) => l.id === activeId);
        const overIndex = prev.lists.findIndex((l) => l.id === overId);
        const newLists = arrayMove(prev.lists, activeIndex, overIndex);

        const listsToUpdate = newLists.map((list, index) => ({ id: list.id, position: index }));
        fetch(`/api/boards/${boardId}/lists/reorder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lists: listsToUpdate }),
        }).catch((err) => console.error("Failed to save list order", err));

        return { ...prev, lists: newLists };
      });
      return;
    }

    const isActiveACard = active.data.current?.type === "Card";
    if (isActiveACard) {
      const activeListId = active.data.current?.card.listId;
      let overListId: string | null = null;

      if (over.data.current?.type === "Card") {
        overListId = over.data.current.card.listId;
      } else if (over.data.current?.type === "List") {
        overListId = over.id as string;
      }

      if (!activeListId || !overListId) return;

      setCardsByList((prev) => {
        const sourceList = prev[activeListId];
        const destList = prev[overListId];
        if (!sourceList || !destList) return prev;

        const activeIndex = sourceList.findIndex(c => c.id === activeId);
        if (activeIndex === -1) {
          const finalActiveIndex = destList.findIndex(c => c.id === activeId);
          if (finalActiveIndex === -1) return prev;

          let finalOverIndex: number;
          if (over.id === activeId) {
            finalOverIndex = finalActiveIndex;
          } else {
            finalOverIndex = destList.findIndex(c => c.id === overId);
            if (finalOverIndex === -1) {
              finalOverIndex = destList.length - 1;
            }
          }

          const newDestList = arrayMove(destList, finalActiveIndex, finalOverIndex);
          return { ...prev, [overListId]: newDestList };

        } else {
          const overIndex = destList.findIndex(c => c.id === overId);
          if (overIndex === -1) return prev;

          const newList = arrayMove(sourceList, activeIndex, overIndex);
          return { ...prev, [activeListId]: newList };
        }
      });

      setTimeout(() => {
        setCardsByList(currentState => {
          const sourceListCards = currentState[activeListId];
          const destListCards = currentState[overListId];

          let cardsToUpdate: { id: string, position: number, listId: string }[] = [];

          if (activeListId === overListId) {
            cardsToUpdate = sourceListCards.map((card, index) => ({
              id: card.id, position: index, listId: activeListId,
            }));
          } else {
            cardsToUpdate = [
              ...sourceListCards.map((card, index) => ({
                id: card.id, position: index, listId: activeListId,
              })),
              ...destListCards.map((card, index) => ({
                id: card.id, position: index, listId: overListId,
              })),
            ];
          }

          fetch(`/api/boards/${boardId}/cards/reorder`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cards: cardsToUpdate }),
          }).catch((err) => console.error("Failed to save card order", err));

          return currentState;
        });
      }, 0);
    }
  }

  if (!board) {
    return <div>Erreur lors du chargement du tableau.</div>
  }

  if (!isMounted) {
    return (
      <div className="p-6 h-full flex flex-col">
        <Link
          href="/boards"
          className="text-gray-500 hover:text-gray-700 mb-4 inline-block"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold mb-2">{board.title}</h1>
        {board.description && (
          <p className="text-gray-600 mb-4">{board.description}</p>
        )}
        <hr className="my-4" />
        <div className="flex-1">
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <Link
        href="/boards"
        className="text-gray-500 hover:text-gray-700 mb-4 inline-block"
      >
        ← Back
      </Link>

      <div className="flex items-center justify-between mb-2">
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">{board.title}</h1>
          {board.description && (
            <p className="text-gray-600 mb-4">{board.description}</p>
          )}
        </div>
        <button
          onClick={handleShareClick}
          className="ml-4 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          type="button"
        >
          Partager
        </button>
      </div>

      <hr className="my-4" />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
          <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
            {board.lists && board.lists.length > 0 ? (
              board.lists.map((list) => (
                <ListContainer
                  key={list.id}
                  list={list}
                  cards={cardsByList[list.id] || []}
                  onRenameList={handleRename}
                  onDeleteList={handleDelete}
                  onAddCard={handleAddCardClick}
                  onRenameCard={handleRenameCard}
                  onDeleteCard={handleDeleteCard}
                  onCardClick={handleCardClick}
                />
              ))
            ) : (
              <div className="text-gray-400 italic">
                Aucune liste pour le moment
              </div>
            )}
          </SortableContext>

          <div className="w-64 min-w-[16rem]">
            <button
              onClick={handleAddListClick}
              className="flex items-center justify-center h-full w-full border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
              type="button"
            >
              + Ajouter une liste
            </button>
          </div>
        </div>

        {isMounted ? createPortal(
          <DragOverlay>
            {activeList && (
              <div className="w-64 min-w-[16rem] bg-gray-100 rounded-lg p-3 shadow-lg relative flex flex-col max-h-[calc(100vh-12rem)] opacity-90">
                <h2 className="font-semibold text-gray-800">{activeList.title}</h2>
              </div>
            )}
            {activeCard && (
              <div className="bg-white rounded shadow p-2 mb-2 w-64 opacity-90">
                <h3 className="font-semibold text-gray-700">{activeCard.title}</h3>
                {activeCard.content && (
                  <p className="text-gray-600 text-sm">{activeCard.content}</p>
                )}
              </div>
            )}
          </DragOverlay>,
          document.body
        ): null }

      </DndContext>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h3 className="text-lg font-semibold mb-3">Ajouter une liste</h3>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Titre de la liste"
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              disabled={addingList}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleDialogConfirm();
              }}
            />
            {error && (
              <div className="text-red-500 text-sm mb-2">{error}</div>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={handleDialogCancel}
                disabled={addingList}
                type="button"
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
                onClick={handleDialogConfirm}
                disabled={addingList}
                type="button"
              >
                {addingList ? "Ajout..." : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h3 className="text-lg font-semibold mb-3">Renommer la liste</h3>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Nouveau titre"
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              disabled={renaming}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameConfirm();
              }}
            />
            {renameError && (
              <div className="text-red-500 text-sm mb-2">{renameError}</div>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={handleRenameCancel}
                disabled={renaming}
                type="button"
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
                onClick={handleRenameConfirm}
                disabled={renaming}
                type="button"
              >
                {renaming ? "Renommage..." : "Renommer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h3 className="text-lg font-semibold mb-3">Supprimer la liste</h3>
            <p className="mb-4">
              Êtes-vous sûr de vouloir supprimer la liste "{listToDelete?.title}" ?
            </p>
            {deleteError && (
              <div className="text-red-500 text-sm mb-2">{deleteError}</div>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={handleDeleteCancel}
                disabled={deleting}
                type="button"
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                type="button"
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddCardDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h3 className="text-lg font-semibold mb-3">Ajouter une carte</h3>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Titre de la carte"
              value={cardTitle}
              onChange={(e) => setCardTitle(e.target.value)}
              disabled={addingCard}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCardConfirm();
              }}
            />
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              placeholder="Contenu (optionnel)"
              value={cardContent}
              onChange={(e) => setCardContent(e.target.value)}
              disabled={addingCard}
              rows={3}
            />
            {addCardError && (
              <div className="text-red-500 text-sm mb-2">{addCardError}</div>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={handleAddCardCancel}
                disabled={addingCard}
                type="button"
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
                onClick={handleAddCardConfirm}
                disabled={addingCard}
                type="button"
              >
                {addingCard ? "Ajout..." : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenameCardDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h3 className="text-lg font-semibold mb-3">Renommer la carte</h3>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Nouveau titre"
              value={renameCardTitle}
              onChange={(e) => setRenameCardTitle(e.target.value)}
              disabled={renamingCard}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameCardConfirm();
              }}
            />
            {renameCardError && (
              <div className="text-red-500 text-sm mb-2">{renameCardError}</div>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={handleRenameCardCancel}
                disabled={renamingCard}
                type="button"
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
                onClick={handleRenameCardConfirm}
                disabled={renamingCard}
                type="button"
              >
                {renamingCard ? "Renommage..." : "Renommer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteCardDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h3 className="text-lg font-semibold mb-3">Supprimer la carte</h3>
            <p className="mb-4">
              Êtes-vous sûr de vouloir supprimer la carte "{cardToDelete?.title}" ?
            </p>
            {deleteCardError && (
              <div className="text-red-500 text-sm mb-2">{deleteCardError}</div>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={handleDeleteCardCancel}
                disabled={deletingCard}
                type="button"
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300"
                onClick={handleDeleteCardConfirm}
                disabled={deletingCard}
                type="button"
              >
                {deletingCard ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h3 className="text-lg font-semibold mb-3">Partager le tableau</h3>
            <p className="text-sm text-gray-600 mb-3">
              Entrez l'adresse email de l'utilisateur à inviter
            </p>
            <input
              type="email"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="email@exemple.com"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              disabled={sharing}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !sharing) handleShareConfirm();
              }}
            />
            {shareError && (
              <div className="text-red-500 text-sm mb-2">{shareError}</div>
            )}
            {shareSuccess && (
              <div className="text-green-600 text-sm mb-2">
                Tableau partagé avec succès !
              </div>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={handleShareCancel}
                disabled={sharing}
                type="button"
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
                onClick={handleShareConfirm}
                disabled={sharing}
                type="button"
              >
                {sharing ? "Partage..." : "Partager"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Modal */}
      {showCardModal && selectedCardId && selectedListId && (
        <CardModal
          boardId={boardId}
          cardId={selectedCardId}
          listId={selectedListId}
          isOpen={showCardModal}
          onClose={handleCardModalClose}
          onUpdate={handleCardUpdate}
        />
      )}
    </div>
  );
}