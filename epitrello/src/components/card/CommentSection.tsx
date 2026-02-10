import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Comment, User } from "@/types";



interface CommentSectionProps {
    boardId: string;
    listId: string;
    cardId: string;
    currentUser: User | null;
    onUpdate: () => void;
    onActivityUpdate: () => void;
    readOnly?: boolean;
}

export function CommentSection({
    boardId,
    listId,
    cardId,
    currentUser,
    onUpdate,
    onActivityUpdate,
    readOnly = false,
}: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [postingComment, setPostingComment] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentContent, setEditingCommentContent] = useState("");
    const [error, setError] = useState<string | null>(null);

    const fetchComments = useCallback(async () => {
        try {
            const res = await fetch(
                `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/comments`
            );
            if (res.ok) {
                const commentsData = await res.json();
                setComments(commentsData);
            }
        } catch (err) {
            console.error("Error fetching comments:", err);
        }
    }, [boardId, listId, cardId]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handlePostComment = async () => {
        if (readOnly) return;
        if (!newComment.trim()) return;

        setPostingComment(true);
        setError(null);

        try {
            const res = await fetch(
                `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/comments`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: newComment.trim() }),
                }
            );

            if (!res.ok) {
                throw new Error("Erreur lors de l'ajout du commentaire");
            }

            const newCommentData = await res.json();
            setComments([...comments, newCommentData]);
            setNewComment("");
            onUpdate();
            onActivityUpdate();
        } catch (err) {
            setError("Erreur lors de l'ajout du commentaire");
            console.error(err);
        } finally {
            setPostingComment(false);
        }
    };

    const handleEditComment = async (commentId: string) => {
        if (readOnly) return;
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
                throw new Error("Erreur lors de la modification du commentaire");
            }

            const updatedComment = await res.json();
            setComments(
                comments.map((c) => (c.id === commentId ? updatedComment : c))
            );
            setEditingCommentId(null);
            setEditingCommentContent("");
            onUpdate();
            onActivityUpdate();
        } catch (err) {
            setError("Erreur lors de la modification du commentaire");
            console.error(err);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (readOnly) return;
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce commentaire ?")) return;

        try {
            const res = await fetch(
                `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/comments/${commentId}`,
                {
                    method: "DELETE",
                }
            );

            if (!res.ok) {
                throw new Error("Erreur lors de la suppression du commentaire");
            }

            setComments(comments.filter((c) => c.id !== commentId));
            onUpdate();
            onActivityUpdate();
        } catch (err) {
            setError("Erreur lors de la suppression du commentaire");
            console.error(err);
        }
    };

    return (
        <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Commentaires</h3>
                {comments.length > 0 && (
                    <span className="text-xs text-muted-foreground">({comments.length})</span>
                )}
            </div>

            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

            {/* Add Comment Form */}
            {!readOnly && (
                <div className="mb-4">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Écrire un commentaire..."
                        className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none min-h-[80px]"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                handlePostComment();
                            }
                        }}
                        disabled={postingComment}
                    />
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-muted-foreground">
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
            )}

            {/* Comments List */}
            <div className="space-y-3">
                {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-4">
                        Aucun commentaire pour le moment
                    </p>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="bg-muted rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                                        {comment.user.name
                                            ? comment.user.name.charAt(0).toUpperCase()
                                            : comment.user.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {comment.user.name || comment.user.email}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
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
                                {currentUser && comment.userId === currentUser.id && !readOnly && (
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
                                                    className="text-muted-foreground hover:text-primary transition-colors"
                                                    aria-label="Modifier"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    className="text-muted-foreground hover:text-destructive transition-colors"
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
                                    className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none min-h-[60px]"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                            e.preventDefault();
                                            handleEditComment(comment.id);
                                        }
                                    }}
                                />
                            ) : (
                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                    {comment.content}
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
