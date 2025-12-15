"use client";

import { useState, useEffect, useRef } from "react";
import { X, UserPlus, Users, Image, Trash2, MessageSquare, Edit2, History, CheckSquare, Plus } from "lucide-react";
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

type Comment = {
  id: string;
  content: string;
  cardId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: User;
};

type Activity = {
  id: string;
  type: string;
  description: string;
  cardId: string | null;
  boardId: string;
  userId: string;
  createdAt: string;
  metadata: any;
  user: User;
};

type ChecklistItem = {
  id: string;
  text: string;
  checked: boolean;
  position: number;
  checklistId: string;
  createdAt: string;
  updatedAt: string;
};

type Checklist = {
  id: string;
  title: string;
  position: number;
  cardId: string;
  createdAt: string;
  updatedAt: string;
  items: ChecklistItem[];
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
  coverImage?: string | null;
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loadingChecklists, setLoadingChecklists] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [creatingChecklist, setCreatingChecklist] = useState(false);
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistTitle, setEditingChecklistTitle] = useState("");
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});

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
      
      await fetchActivities();
      
      const boardRes = await fetch(`/api/boards/${boardId}`);
      let boardData: any = null;
      if (boardRes.ok) {
        boardData = await boardRes.json();
        const allMembers: User[] = [];
        
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

      // Fetch comments
      await fetchComments();

      // Fetch activities
      await fetchActivities();

      // Fetch checklists
      await fetchChecklists();

      // Fetch current user info from session
      try {
        const userRes = await fetch('/api/auth/session');
        if (userRes.ok) {
          const session = await userRes.json();
          if (session?.user?.email && boardData) {
            const allMembers: User[] = [];
            if (boardData.user) {
              allMembers.push({
                id: boardData.user.id,
                email: boardData.user.email,
                name: boardData.user.name,
              });
            }
            if (boardData.members && Array.isArray(boardData.members)) {
              boardData.members.forEach((m: any) => {
                if (!allMembers.some(existing => existing.id === m.id)) {
                  allMembers.push({
                    id: m.id,
                    email: m.email,
                    name: m.name,
                  });
                }
              });
            }
            
            const foundUser = allMembers.find(m => m.email === session.user.email);
            if (foundUser) {
              setCurrentUser(foundUser);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching current user:", err);
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
      await fetchActivities(); 
      onUpdate(); 
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
      await fetchActivities(); 
      onUpdate(); 
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Type de fichier non supporté. Utilisez JPEG, PNG, GIF ou WebP.");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError("Fichier trop volumineux. Taille maximum : 5MB.");
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/boards/${boardId}/lists/${listId}/cards/${cardId}/cover`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de l'upload de l'image");
      }

      const data = await res.json();
      setCard(data.card);
      await fetchActivities(); // Refresh activities
      onUpdate(); // Refresh the board
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'upload de l'image";
      setError(errorMessage);
      console.error("Error uploading image:", err);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!card?.coverImage) return;

    setUploadingImage(true);
    setError(null);

    try {
      const res = await fetch(`/api/boards/${boardId}/lists/${listId}/cards/${cardId}/cover`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de la suppression de l'image");
      }

      const data = await res.json();
      setCard(data.card);
      await fetchActivities(); // Refresh activities
      onUpdate(); // Refresh the board
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la suppression de l'image";
      setError(errorMessage);
      console.error("Error removing image:", err);
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}/lists/${listId}/cards/${cardId}/comments`);
      if (res.ok) {
        const commentsData = await res.json();
        setComments(commentsData);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    setPostingComment(true);
    setError(null);

    try {
      const res = await fetch(`/api/boards/${boardId}/lists/${listId}/cards/${cardId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de l'ajout du commentaire");
      }

      const newCommentData = await res.json();
      setComments([...comments, newCommentData]);
      setNewComment("");
      await fetchActivities(); // Refresh activities
      onUpdate(); // Refresh the board
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'ajout du commentaire";
      setError(errorMessage);
      console.error("Error posting comment:", err);
    } finally {
      setPostingComment(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingCommentContent.trim()) return;

    try {
      const res = await fetch(
        `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/comments/${commentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editingCommentContent.trim() }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de la modification du commentaire");
      }

      const updatedComment = await res.json();
      setComments(comments.map(c => c.id === commentId ? updatedComment : c));
      setEditingCommentId(null);
      setEditingCommentContent("");
      await fetchActivities(); // Refresh activities
      onUpdate(); // Refresh the board
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la modification du commentaire";
      setError(errorMessage);
      console.error("Error editing comment:", err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce commentaire ?")) return;

    try {
      const res = await fetch(
        `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/comments/${commentId}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de la suppression du commentaire");
      }

      setComments(comments.filter(c => c.id !== commentId));
      await fetchActivities(); // Refresh activities
      onUpdate(); // Refresh the board
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la suppression du commentaire";
      setError(errorMessage);
      console.error("Error deleting comment:", err);
    }
  };

  const fetchActivities = async () => {
    setLoadingActivities(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/activities?cardId=${cardId}&limit=50`);
      if (res.ok) {
        const activitiesData = await res.json();
        setActivities(activitiesData);
      }
    } catch (err) {
      console.error("Error fetching activities:", err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchChecklists = async () => {
    setLoadingChecklists(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/lists/${listId}/cards/${cardId}/checklists`);
      if (res.ok) {
        const checklistsData = await res.json();
        setChecklists(checklistsData);
      }
    } catch (err) {
      console.error("Error fetching checklists:", err);
    } finally {
      setLoadingChecklists(false);
    }
  };

  const handleCreateChecklist = async () => {
    if (!newChecklistTitle.trim()) return;

    setCreatingChecklist(true);
    setError(null);

    try {
      const res = await fetch(`/api/boards/${boardId}/lists/${listId}/cards/${cardId}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newChecklistTitle.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de la création de la checklist");
      }

      const newChecklist = await res.json();
      setChecklists([...checklists, newChecklist]);
      setNewChecklistTitle("");
      onUpdate(); // Refresh the board
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la création de la checklist";
      setError(errorMessage);
      console.error("Error creating checklist:", err);
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
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de la modification de la checklist");
      }

      const updatedChecklist = await res.json();
      setChecklists(checklists.map(c => c.id === checklistId ? updatedChecklist : c));
      setEditingChecklistId(null);
      setEditingChecklistTitle("");
      onUpdate(); // Refresh the board
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la modification de la checklist";
      setError(errorMessage);
      console.error("Error updating checklist:", err);
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
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de la suppression de la checklist");
      }

      setChecklists(checklists.filter(c => c.id !== checklistId));
      onUpdate(); // Refresh the board
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la suppression de la checklist";
      setError(errorMessage);
      console.error("Error deleting checklist:", err);
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
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de l'ajout de l'élément");
      }

      const newItem = await res.json();
      setChecklists(checklists.map(checklist => 
        checklist.id === checklistId
          ? { ...checklist, items: [...checklist.items, newItem] }
          : checklist
      ));
      setNewItemTexts({ ...newItemTexts, [checklistId]: "" });
      onUpdate(); // Refresh the board
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de l'ajout de l'élément";
      setError(errorMessage);
      console.error("Error creating item:", err);
    }
  };

  const handleToggleItem = async (checklistId: string, itemId: string, checked: boolean) => {
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
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de la modification de l'élément");
      }

      const updatedItem = await res.json();
      setChecklists(checklists.map(checklist =>
        checklist.id === checklistId
          ? {
              ...checklist,
              items: checklist.items.map(item =>
                item.id === itemId ? updatedItem : item
              ),
            }
          : checklist
      ));
      onUpdate(); // Refresh the board
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la modification de l'élément";
      setError(errorMessage);
      console.error("Error toggling item:", err);
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
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de la suppression de l'élément");
      }

      setChecklists(checklists.map(checklist =>
        checklist.id === checklistId
          ? {
              ...checklist,
              items: checklist.items.filter(item => item.id !== itemId),
            }
          : checklist
      ));
      onUpdate(); // Refresh the board
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la suppression de l'élément";
      setError(errorMessage);
      console.error("Error deleting item:", err);
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
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-8 px-6">{error}</div>
          ) : (
            <>
              {card?.coverImage && (
                <img
                  src={card.coverImage}
                  alt="Cover"
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6 space-y-6">
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

              {/* Cover Image Section */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Image className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Image de couverture</h3>
                </div>
                <div className="space-y-2">
                  {card?.coverImage ? (
                    <div className="relative group">
                      <img
                        src={card.coverImage}
                        alt="Cover"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImage}
                          >
                            <Image className="w-4 h-4 mr-2" />
                            Changer
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleRemoveImage}
                            disabled={uploadingImage}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Image className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 mb-3">Aucune image de couverture</p>
                      <Button
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                      >
                        <Image className="w-4 h-4 mr-2" />
                        {uploadingImage ? "Upload..." : "Ajouter une image"}
                      </Button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
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
                                  await fetchActivities(); // Refresh activities
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
                            await fetchActivities(); // Refresh activities
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

              {/* Comments Section */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Commentaires</h3>
                  {comments.length > 0 && (
                    <span className="text-xs text-gray-500">({comments.length})</span>
                  )}
                </div>
                
                {/* Add Comment Form */}
                <div className="mb-4">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Écrire un commentaire..."
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none min-h-[80px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handlePostComment();
                      }
                    }}
                    disabled={postingComment}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">
                      Appuyez sur Cmd/Ctrl + Entrée pour publier
                    </p>
                    <Button
                      size="sm"
                      onClick={handlePostComment}
                      disabled={postingComment || !newComment.trim()}
                    >
                      {postingComment ? "Publication..." : "Publier"}
                    </Button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-sm text-gray-400 italic text-center py-4">
                      Aucun commentaire pour le moment
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                              {comment.user.name
                                ? comment.user.name.charAt(0).toUpperCase()
                                : comment.user.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                {comment.user.name || comment.user.email}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(comment.createdAt).toLocaleDateString("fr-FR", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {comment.updatedAt !== comment.createdAt && " (modifié)"}
                              </p>
                            </div>
                          </div>
                          {currentUser && comment.userId === currentUser.id && (
                            <div className="flex gap-1">
                              {editingCommentId === comment.id ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditingCommentContent("");
                                    }}
                                  >
                                    Annuler
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleEditComment(comment.id)}
                                    disabled={!editingCommentContent.trim()}
                                  >
                                    Enregistrer
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingCommentId(comment.id);
                                      setEditingCommentContent(comment.content);
                                    }}
                                    className="text-gray-400 hover:text-blue-600 transition-colors"
                                    aria-label="Modifier"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                    aria-label="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        {editingCommentId === comment.id ? (
                          <textarea
                            value={editingCommentContent}
                            onChange={(e) => setEditingCommentContent(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none min-h-[60px]"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                handleEditComment(comment.id);
                              }
                            }}
                          />
                        ) : (
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Checklists Section */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <CheckSquare className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Checklists</h3>
                </div>

                {loadingChecklists ? (
                  <p className="text-sm text-gray-400 italic text-center py-4">
                    Chargement...
                  </p>
                ) : (
                  <div className="space-y-4">
                    {checklists.map((checklist) => {
                      const checkedCount = checklist.items.filter(item => item.checked).length;
                      const totalCount = checklist.items.length;
                      const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

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
                              <div key={item.id} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={item.checked}
                                  onChange={() => handleToggleItem(checklist.id, item.id, item.checked)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span
                                  className={`flex-1 ${
                                    item.checked ? "line-through text-gray-400" : "text-gray-700"
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
                                setNewItemTexts({ ...newItemTexts, [checklist.id]: e.target.value })
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
                          {creatingChecklist ? "Création..." : <Plus className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Activity Log Section */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Historique des activités</h3>
                  {activities.length > 0 && (
                    <span className="text-xs text-gray-500">({activities.length})</span>
                  )}
                </div>

                {loadingActivities ? (
                  <p className="text-sm text-gray-400 italic text-center py-4">
                    Chargement...
                  </p>
                ) : activities.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-4">
                    Aucune activité pour le moment
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-2 text-sm">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold flex-shrink-0 mt-0.5">
                          {activity.user.name
                            ? activity.user.name.charAt(0).toUpperCase()
                            : activity.user.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-700">
                            <span className="font-medium">
                              {activity.user.name || activity.user.email}
                            </span>{" "}
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(activity.createdAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>
            </>
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

