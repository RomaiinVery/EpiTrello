import { useState, useRef } from "react";
import { Image as ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardDetail } from "@/types";

interface CoverImageProps {
  boardId: string;
  listId: string;
  cardId: string;
  coverImage?: string | null;
  onUpdate: () => void;
  onCardUpdate: (newCard: CardDetail) => void;
}

export function CoverImage({
  boardId,
  listId,
  cardId,
  coverImage,
  onUpdate,
  onCardUpdate,
}: CoverImageProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError("Type de fichier non supporté. Utilisez JPEG, PNG, GIF ou WebP.");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError("Fichier trop volumineux. Taille maximum : 5MB.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/cover`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erreur lors de l'upload de l'image");
      }

      const data = await res.json();
      onCardUpdate(data.card);
      onUpdate();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur lors de l'upload de l'image";
      setError(errorMessage);
      console.error("Error uploading image:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!coverImage) return;

    setUploading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/cover`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Erreur lors de la suppression de l'image"
        );
      }

      const data = await res.json();
      onCardUpdate(data.card);
      onUpdate();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erreur lors de la suppression de l'image";
      setError(errorMessage);
      console.error("Error removing image:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border-t pt-4">
      <div className="flex items-center gap-2 mb-2">
        <ImageIcon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          Image de couverture
        </h3>
      </div>

      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

      <div className="space-y-2">
        {coverImage ? (
          <div className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage}
              alt="Cover"
              className="w-full h-48 object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Changer
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRemoveImage}
                  disabled={uploading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Aucune image de couverture
            </p>
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              {uploading ? "Upload..." : "Ajouter une image"}
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
  );
}
