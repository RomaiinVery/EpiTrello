"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "./ColorPicker";
import { useRouter } from "next/navigation";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardId: string;
    initialTitle: string;
    initialDescription?: string;
    initialBackground?: string;
    onUpdate: (data: { id?: string; title: string; description?: string; background: string }) => void;
}

export function SettingsModal({
    isOpen,
    onClose,
    boardId,
    initialTitle,
    initialDescription = "",
    initialBackground = "#F5F5F5",
    onUpdate,
}: SettingsModalProps) {
    const [title, setTitle] = useState(initialTitle);
    const [description, setDescription] = useState(initialDescription);
    const [background, setBackground] = useState(initialBackground);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setTitle(initialTitle);
        setDescription(initialDescription || "");
        setBackground(initialBackground || "#F5F5F5");
    }, [isOpen, initialTitle, initialDescription, initialBackground]);

    const handleSave = async () => {
        if (!title.trim()) return;
        setIsLoading(true);

        try {
            const res = await fetch(`/api/boards/${boardId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, description, background }),
            });

            if (!res.ok) throw new Error("Failed to update board");

            const updatedBoard = await res.json();
            onUpdate(updatedBoard);
            onClose();
            router.refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Paramètres du tableau</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Titre</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Titre du tableau"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Description (optionnelle)"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Couleur de fond</label>
                        <ColorPicker selectedColor={background} onChange={setBackground} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Annuler
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading || !title.trim()}>
                        {isLoading ? "Enregistrement..." : "Enregistrer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
