import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Paperclip, Plus, Trash2, FileText, Image as ImageIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Attachment } from "@/types";

interface AttachmentSectionProps {
    boardId: string;
    listId: string;
    cardId: string;
    onUpdate: () => void;
    onActivityUpdate: () => void;
    readOnly?: boolean;
}

export function AttachmentSection({
    boardId,
    listId,
    cardId,
    onUpdate,
    onActivityUpdate,
    readOnly = false,
}: AttachmentSectionProps) {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchAttachments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/attachments`
            );
            if (res.ok) {
                const data = await res.json();
                setAttachments(data);
            }
        } catch (err) {
            console.error("Error fetching attachments:", err);
        } finally {
            setLoading(false);
        }
    }, [boardId, listId, cardId]);

    useEffect(() => {
        fetchAttachments();
    }, [fetchAttachments]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (readOnly) return;
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate size (client-side)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            setError("Fichier trop volumineux. Taille maximum : 10MB.");
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(
                `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/attachments`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Erreur lors de l'upload");
            }

            const newAttachment = await res.json();
            setAttachments([newAttachment, ...attachments]);
            onUpdate();
            onActivityUpdate();
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "Erreur lors de l'upload";
            setError(errorMessage);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleDelete = async (attachmentId: string) => {
        if (readOnly) return;
        if (!confirm("Êtes-vous sûr de vouloir supprimer cette pièce jointe ?")) return;

        try {
            const res = await fetch(
                `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/attachments/${attachmentId}`,
                {
                    method: "DELETE",
                }
            );

            if (!res.ok) {
                throw new Error("Erreur lors de la suppression");
            }

            setAttachments(attachments.filter((a) => a.id !== attachmentId));
            onUpdate();
            onActivityUpdate();
        } catch (err) {
            setError("Erreur lors de la suppression");
            console.error(err);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const getIcon = (type: string) => {
        if (type.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-blue-500" />;
        return <FileText className="w-5 h-5 text-gray-500" />;
    };

    return (
        <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-4">
                <Paperclip className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">Pièces jointes</h3>
                {attachments.length > 0 && (
                    <span className="text-xs text-gray-500">({attachments.length})</span>
                )}
            </div>

            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

            <div className="space-y-3 mb-4">
                {attachments.map((attachment) => (
                    <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 group border border-transparent hover:border-gray-200 transition-colors"
                    >
                        {/* Thumbnail / Icon */}
                        <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden flex items-center justify-center flex-shrink-0">
                            {attachment.type.startsWith("image/") ? (
                                <Image
                                    src={attachment.url}
                                    alt={attachment.name}
                                    width={64}
                                    height={48}
                                    unoptimized
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                getIcon(attachment.type)
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-gray-700 hover:text-blue-600 truncate block"
                            >
                                {attachment.name}
                            </a>
                            <p className="text-xs text-gray-500">
                                Ajoutée le {new Date(attachment.createdAt).toLocaleDateString()} • {formatSize(attachment.size)}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                                href={attachment.url}
                                download={attachment.name} // Hint for download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200"
                                title="Télécharger / Ouvrir"
                            >
                                <Download className="w-4 h-4" />
                            </a>
                            {!readOnly && (
                                <button
                                    onClick={() => handleDelete(attachment.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                                    title="Supprimer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {attachments.length === 0 && !loading && (
                    <p className="text-sm text-gray-400 italic text-center py-2">
                        Aucune pièce jointe
                    </p>
                )}
            </div>

            {!readOnly && (
                <div className="mt-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {uploading ? "Upload..." : "Ajouter une pièce jointe"}
                    </Button>
                </div>
            )}
        </div>
    );
}
