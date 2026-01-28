"use client";

import { useEffect, useState } from "react";
import { Filter, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/types"; // Assuming Label and User types exist
import { User } from "@/types";

interface FilterPanelProps {
    labels: Label[];
    members: User[];
    activeFilters: {
        labelIds: string[];
        memberIds: string[];
        dueDate: string | null; // 'no-date', 'overdue', 'next-day', etc.
    };
    onFilterChange: (filters: any) => void;
}

export function FilterPanel({
    labels,
    members,
    activeFilters,
    onFilterChange,
}: FilterPanelProps) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleLabel = (labelId: string) => {
        const newLabels = activeFilters.labelIds.includes(labelId)
            ? activeFilters.labelIds.filter((id) => id !== labelId)
            : [...activeFilters.labelIds, labelId];

        onFilterChange({ ...activeFilters, labelIds: newLabels });
    };

    const toggleMember = (memberId: string) => {
        const newMembers = activeFilters.memberIds.includes(memberId)
            ? activeFilters.memberIds.filter((id) => id !== memberId)
            : [...activeFilters.memberIds, memberId];

        onFilterChange({ ...activeFilters, memberIds: newMembers });
    };

    const setDateFilter = (type: string | null) => {
        onFilterChange({ ...activeFilters, dueDate: activeFilters.dueDate === type ? null : type });
    };

    const clearFilters = () => {
        onFilterChange({
            labelIds: [],
            memberIds: [],
            dueDate: null,
        });
    };

    const hasActiveFilters =
        activeFilters.labelIds.length > 0 ||
        activeFilters.memberIds.length > 0 ||
        activeFilters.dueDate !== null;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant={hasActiveFilters ? "secondary" : "outline"} size="sm" className="gap-2">
                    <Filter className="w-4 h-4" />
                    Filtres
                    {hasActiveFilters && (
                        <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                            {activeFilters.labelIds.length + activeFilters.memberIds.length + (activeFilters.dueDate ? 1 : 0)}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Filtrer les cartes</h3>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="text-xs text-blue-600 hover:text-blue-800"
                        >
                            Effacer tout
                        </button>
                    )}
                </div>

                <div className="p-4 space-y-6 max-h-[400px] overflow-y-auto">
                    {/* Labels */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-medium text-gray-500 uppercase">Étiquettes</h4>
                        <div className="space-y-2">
                            {labels.map((label) => {
                                const isSelected = activeFilters.labelIds.includes(label.id);
                                return (
                                    <div
                                        key={label.id}
                                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                        onClick={() => toggleLabel(label.id)}
                                    >
                                        <div
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}
                                        >
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <div
                                            className="h-6 px-3 rounded text-xs font-medium flex items-center text-white flex-1"
                                            style={{ backgroundColor: label.color }}
                                        >
                                            {label.name}
                                        </div>
                                    </div>
                                );
                            })}
                            {labels.length === 0 && <p className="text-sm text-gray-500 italic">Aucune étiquette</p>}
                        </div>
                    </div>

                    {/* Members */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-medium text-gray-500 uppercase">Membres</h4>
                        <div className="space-y-2">
                            {members.map((member) => {
                                const isSelected = activeFilters.memberIds.includes(member.id);
                                return (
                                    <div
                                        key={member.id}
                                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                        onClick={() => toggleMember(member.id)}
                                    >
                                        <div
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}
                                        >
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium overflow-hidden">
                                                {member.profileImage ? (
                                                    <img src={member.profileImage} alt={member.name || ""} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span>{(member.name || member.email || "?")[0].toUpperCase()}</span>
                                                )}
                                            </div>
                                            <span className="text-sm text-gray-700">{member.name || member.email}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            {members.length === 0 && <p className="text-sm text-gray-500 italic">Aucun membre</p>}
                        </div>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-medium text-gray-500 uppercase">Date d'échéance</h4>
                        <div className="space-y-2">
                            {[
                                { id: "no-date", label: "Pas de date" },
                                { id: "overdue", label: "En retard" },
                                { id: "due-next-day", label: "Pour demain" },
                                { id: "due-next-week", label: "Pour la semaine prochaine" }
                            ].map((option) => {
                                const isSelected = activeFilters.dueDate === option.id;
                                return (
                                    <div
                                        key={option.id}
                                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                        onClick={() => setDateFilter(option.id)}
                                    >
                                        <div
                                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'border-blue-600' : 'border-gray-300'}`}
                                        >
                                            {isSelected && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                        </div>
                                        <span className="text-sm text-gray-700">{option.label}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
