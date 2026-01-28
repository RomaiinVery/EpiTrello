"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar, Filter, User as UserIcon, Tag } from "lucide-react";

import { Label } from "@/app/lib/board-api";
import { User } from "@/types";

interface FilterPopoverProps {
    labels: Label[];
    members: User[];
    onFilterChange: (filters: FilterState) => void;
    activeFilters: FilterState;
}

export interface FilterState {
    labelIds: string[];
    memberIds: string[];
    dueDate: "no-date" | "overdue" | "due-soon" | "none"; // 'none' means no filter applied
}

export function FilterPopover({ labels, members, onFilterChange, activeFilters }: FilterPopoverProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Helper to toggle array items
    const toggleItem = (current: string[], item: string) => {
        if (current.includes(item)) {
            return current.filter((i) => i !== item);
        }
        return [...current, item];
    };

    const hasActiveFilters =
        activeFilters.labelIds.length > 0 ||
        activeFilters.memberIds.length > 0 ||
        activeFilters.dueDate !== "none";

    const clearFilters = () => {
        onFilterChange({
            labelIds: [],
            memberIds: [],
            dueDate: "none",
        });
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtres
                    {hasActiveFilters && (
                        <span className="ml-2 rounded-sm px-1 font-normal lg:hidden bg-gray-200 text-gray-800 text-xs">
                            {activeFilters.labelIds.length + activeFilters.memberIds.length + (activeFilters.dueDate !== "none" ? 1 : 0)}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
                <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                    <h4 className="font-medium text-sm">Filtrer les cartes</h4>
                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-auto p-0 text-xs text-red-500 hover:text-red-600 hover:bg-transparent">
                            Effacer tout
                        </Button>
                    )}
                </div>

                <div className="p-4 space-y-4">
                    {/* Labels */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-xs text-gray-500 uppercase flex items-center gap-2">
                            <Tag className="w-3 h-3" />
                            Étiquettes
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {labels.length === 0 && <span className="text-sm text-gray-400 italic">Aucune étiquette</span>}
                            {labels.map((label) => {
                                const isActive = activeFilters.labelIds.includes(label.id);
                                return (
                                    <div
                                        key={label.id}
                                        onClick={() => onFilterChange({ ...activeFilters, labelIds: toggleItem(activeFilters.labelIds, label.id) })}
                                        className={`
                            px-2 py-1 rounded text-xs cursor-pointer border transition-all
                            ${isActive ? 'ring-2 ring-offset-1 ring-gray-400' : 'opacity-70 hover:opacity-100'}
                        `}
                                        style={{ backgroundColor: label.color, color: "#fff", borderColor: label.color }}
                                    >
                                        {label.name}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="h-[1px] w-full bg-border my-2" />

                    {/* Members */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-xs text-gray-500 uppercase flex items-center gap-2">
                            <UserIcon className="w-3 h-3" />
                            Membres
                        </h4>
                        <div className="space-y-1">
                            {members.length === 0 && <span className="text-sm text-gray-400 italic">Aucun membre</span>}
                            {members.map((member) => {
                                const isActive = activeFilters.memberIds.includes(member.id);
                                return (
                                    <div
                                        key={member.id}
                                        onClick={() => onFilterChange({ ...activeFilters, memberIds: toggleItem(activeFilters.memberIds, member.id) })}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-gray-100 ${isActive ? "bg-blue-50 text-blue-700" : "text-gray-700"}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${isActive ? "border-blue-500 bg-blue-200" : "border-gray-300 bg-gray-100"}`}>
                                            {isActive && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                                        </div>
                                        <span className="text-sm">{member.name || member.email}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="h-[1px] w-full bg-border my-2" />

                    {/* Due Date */}
                    <div className="space-y-2">
                        <h4 className="font-medium text-xs text-gray-500 uppercase flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            Date d&apos;échéance
                        </h4>
                        <div className="flex flex-col gap-1">
                            {[
                                { id: "no-date", label: "Pas de date" },
                                { id: "overdue", label: "En retard" },
                                { id: "due-soon", label: "Bientôt (24h)" }
                            ].map((opt) => (
                                <div
                                    key={opt.id}
                                    onClick={() => {
                                        const newVal = activeFilters.dueDate === opt.id ? "none" : opt.id as FilterState["dueDate"];
                                        onFilterChange({ ...activeFilters, dueDate: newVal });
                                    }}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-gray-100 ${activeFilters.dueDate === opt.id ? "bg-blue-50 text-blue-700" : "text-gray-700"}`}
                                >
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${activeFilters.dueDate === opt.id ? "border-blue-500 bg-blue-200" : "border-gray-300 bg-gray-100"}`}>
                                        {activeFilters.dueDate === opt.id && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                                    </div>
                                    <span className="text-sm">{opt.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
