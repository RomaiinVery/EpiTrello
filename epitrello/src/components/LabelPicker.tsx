"use client";

import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Label = {
  id: string;
  name: string;
  color: string;
  boardId: string;
};

interface LabelPickerProps {
  boardId: string;
  cardId: string;
  selectedLabels: Label[];
  onLabelsChange: (labels: Label[]) => void;
}

const PRESET_COLORS = [
  "#61BD4F", // Green
  "#F2D600", // Yellow
  "#FF9F1A", // Orange
  "#EB5A46", // Red
  "#C377E0", // Purple
  "#0079BF", // Blue
  "#00C2E0", // Sky
  "#51E898", // Lime
  "#FF78CB", // Pink
  "#344563", // Black
];

export function LabelPicker({ boardId, cardId, selectedLabels, onLabelsChange }: LabelPickerProps) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLabels();
  }, [boardId]);

  const fetchLabels = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/labels`);
      if (res.ok) {
        const data = await res.json();
        setLabels(data);
      }
    } catch (err) {
      console.error("Error fetching labels:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) {
      setError("Le nom de l'étiquette ne peut pas être vide");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch(`/api/boards/${boardId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLabelName.trim(),
          color: newLabelColor,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur lors de la création de l'étiquette");
        setCreating(false);
        return;
      }

      const newLabel = await res.json();
      setLabels((prev) => [...prev, newLabel]);
      setNewLabelName("");
      setShowCreate(false);
      
      // Automatically add the new label to the card
      handleToggleLabel(newLabel);
    } catch (err) {
      setError("Erreur réseau");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleLabel = async (label: Label) => {
    const isSelected = selectedLabels.some(l => l.id === label.id);

    try {
      if (isSelected) {
        // Remove label
        const res = await fetch(
          `/api/boards/${boardId}/cards/${cardId}/labels?labelId=${label.id}`,
          { method: "DELETE" }
        );

        if (res.ok) {
          onLabelsChange(selectedLabels.filter(l => l.id !== label.id));
        }
      } else {
        // Add label
        const res = await fetch(`/api/boards/${boardId}/cards/${cardId}/labels`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ labelId: label.id }),
        });

        if (res.ok) {
          onLabelsChange([...selectedLabels, label]);
        }
      }
    } catch (err) {
      console.error("Error toggling label:", err);
    }
  };

  const selectedLabelIds = new Set(selectedLabels.map(l => l.id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Étiquettes</h3>
      </div>

      {/* Selected Labels */}
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLabels.map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white"
              style={{ backgroundColor: label.color }}
            >
              <span>{label.name}</span>
              <button
                onClick={() => handleToggleLabel(label)}
                className="hover:bg-black/20 rounded p-0.5"
                type="button"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Available Labels */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500">Étiquettes disponibles</p>
        {loading ? (
          <div className="text-sm text-gray-400">Chargement...</div>
        ) : labels.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Aucune étiquette disponible</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => {
              const isSelected = selectedLabelIds.has(label.id);
              return (
                <button
                  key={label.id}
                  onClick={() => handleToggleLabel(label)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    isSelected
                      ? "ring-2 ring-offset-2"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  style={{
                    backgroundColor: label.color,
                    color: isLabelColorLight(label.color) ? "#000" : "#fff",
                    ringColor: label.color,
                  }}
                  type="button"
                >
                  {label.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create New Label */}
      {showCreate ? (
        <div className="border rounded-lg p-3 space-y-2 bg-gray-50">
          <Input
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder="Nom de l'étiquette"
            className="text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateLabel();
              if (e.key === "Escape") {
                setShowCreate(false);
                setNewLabelName("");
                setError(null);
              }
            }}
            disabled={creating}
          />
          
          {/* Color Picker */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Couleur</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewLabelColor(color)}
                  className={`w-8 h-8 rounded border-2 transition-all ${
                    newLabelColor === color
                      ? "border-gray-800 scale-110"
                      : "border-gray-300 hover:border-gray-500"
                  }`}
                  style={{ backgroundColor: color }}
                  type="button"
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreateLabel}
              disabled={creating || !newLabelName.trim()}
            >
              {creating ? "Création..." : "Créer"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowCreate(false);
                setNewLabelName("");
                setError(null);
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowCreate(true)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-1" />
          Créer une nouvelle étiquette
        </Button>
      )}
    </div>
  );
}

// Helper function to determine if a color is light (for text contrast)
function isLabelColorLight(color: string): boolean {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}

