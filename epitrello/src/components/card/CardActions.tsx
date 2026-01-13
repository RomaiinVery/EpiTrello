"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, X, Calendar } from "lucide-react";
import { LabelPicker } from "@/components/LabelPicker";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatePicker } from "./DatePicker";
import { Button } from "@/components/ui/button";
import { Label, User, CardDetail } from "@/types";

interface CardActionsProps {
    boardId: string;
    listId: string;
    cardId: string;
    labels: Label[];
    members: User[];
    startDate?: string | null;
    dueDate?: string | null;
    onUpdate: () => void;
    onCardUpdate: (newCard: CardDetail) => void;
    onActivityUpdate: () => void;
}

export function CardActions({
    boardId,
    listId,
    cardId,
    labels,
    members,
    startDate,
    dueDate,
    onUpdate,
    onCardUpdate,
    onActivityUpdate,
}: CardActionsProps) {
    const [boardMembers, setBoardMembers] = useState<User[]>([]);
    const [isAssigningMember, setIsAssigningMember] = useState(false);

    useEffect(() => {
        fetchBoardMembers();
    }, [boardId]);

    const fetchBoardMembers = useCallback(async () => {
        try {
            const boardRes = await fetch(`/api/boards/${boardId}`);
            if (boardRes.ok) {
                const boardData = await boardRes.json();
                const allMembers: User[] = [];

                if (boardData && boardData.user) {
                    allMembers.push({
                        id: boardData.user.id,
                        email: boardData.user.email,
                        name: boardData.user.name,
                    });
                }

                if (boardData?.members && Array.isArray(boardData.members)) {
                    boardData.members.forEach((m: User) => {
                        if (!allMembers.some((existing) => existing.id === m.id)) {
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
            console.error("Error fetching board members:", err);
        }
    }, [boardId]);

    const handleUnassignMember = async (memberId: string) => {
        try {
            const res = await fetch(
                `/api/boards/${boardId}/lists/${listId}/cards/${cardId}/members?userId=${memberId}`,
                { method: "DELETE" }
            );
            if (res.ok) {
                onUpdate();
                onActivityUpdate();
            }
        } catch (err) {
            console.error("Error unassigning member:", err);
        }
    };

    const handleAssignMember = async (userId: string) => {
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
                onUpdate();
                onActivityUpdate();
            }
        } catch (err) {
            console.error("Error assigning member:", err);
        } finally {
            setIsAssigningMember(false);
        }
    };

    const handleStartDateSelect = async (date: Date | undefined) => {
        try {
            const res = await fetch(
                `/api/boards/${boardId}/lists/${listId}/cards/${cardId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ startDate: date }),
                }
            );

            if (res.ok) {
                const updatedCard = await res.json();
                onCardUpdate(updatedCard);
                onUpdate();
                onActivityUpdate();
            }
        } catch (err) {
            console.error("Error updating due date:", err);
        }
    };

    const handleDueDateSelect = async (date: Date | undefined) => {
        try {
            const res = await fetch(
                `/api/boards/${boardId}/lists/${listId}/cards/${cardId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ dueDate: date }),
                }
            );

            if (res.ok) {
                const updatedCard = await res.json();
                onCardUpdate(updatedCard);
                onUpdate();
                onActivityUpdate();
            }
        } catch (err) {
            console.error("Error updating due date:", err);
        }
    };

    return (
        <>
            {/* Dates Section */}
            <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-700">Dates</h3>
                </div>
                <div className="mb-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full justify-start">
                                <Calendar className="w-4 h-4 mr-2" />
                                {startDate
                                    ? new Date(startDate).toLocaleDateString("fr-FR", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    })
                                    : "Ajouter une date de début"}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="p-0" align="start">
                            <DatePicker
                                selected={startDate ? new Date(startDate) : undefined}
                                onSelect={handleStartDateSelect}
                                maxDate={dueDate ? new Date(dueDate) : undefined}
                            />
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full justify-start">
                                <Calendar className="w-4 h-4 mr-2" />
                                {dueDate
                                    ? new Date(dueDate).toLocaleDateString("fr-FR", {
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                    })
                                    : "Ajouter une date de fin"}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="p-0" align="start">
                            <DatePicker
                                selected={dueDate ? new Date(dueDate) : undefined}
                                onSelect={handleDueDateSelect}
                                minDate={startDate ? new Date(startDate) : undefined}
                            />
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Labels Section */}
            <div className="border-t pt-4">
                <LabelPicker
                    boardId={boardId}
                    cardId={cardId}
                    selectedLabels={labels}
                    onLabelsChange={(newLabels) => {
                        onUpdate();
                    }}
                />
            </div>

            {/* Assigned Members Section */}
            <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-700">
                        Membres assignés
                    </h3>
                </div>
                <div className="space-y-2">
                    {members.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {members.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-200"
                                >
                                    {member.profileImage ? (
                                        <img
                                            src={member.profileImage}
                                            alt={member.name || member.email}
                                            className="w-6 h-6 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                                            {member.name
                                                ? member.name.charAt(0).toUpperCase()
                                                : member.email.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="text-sm text-gray-700">
                                        {member.name || member.email}
                                    </span>
                                    <button
                                        onClick={() => handleUnassignMember(member.id)}
                                        className="ml-1 text-gray-400 hover:text-red-600 transition-colors"
                                        aria-label="Retirer le membre"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 italic">
                            Aucun membre assigné
                        </p>
                    )}
                    <div className="mt-2">
                        <select
                            value=""
                            onChange={(e) => {
                                if (e.target.value) handleAssignMember(e.target.value);
                            }}
                            disabled={isAssigningMember}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            <option value="">Assigner un membre...</option>
                            {boardMembers
                                .filter(
                                    (m) =>
                                        !members.some((assigned) => assigned.id === m.id)
                                )
                                .map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.name || member.email}
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>
            </div>
        </>
    );
}
