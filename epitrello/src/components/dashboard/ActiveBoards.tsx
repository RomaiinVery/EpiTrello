"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Board } from "@prisma/client";

export function ActiveBoards() {
    const [boards, setBoards] = useState<Board[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchBoards() {
            try {
                const res = await fetch("/api/boards");
                if (res.ok) {
                    const data = await res.json();
                    // Take only the first 4 for the dashboard view
                    setBoards(data.slice(0, 4));
                }
            } catch (error) {
                console.error("Failed to fetch boards", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchBoards();
    }, []);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Tableaux Actifs</h2>
                <Link
                    href="/workspaces"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                    Voir tout
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Create New Board Button */}
                <button
                    onClick={() => {
                        // This would ideally open a modal, for now we might redirect or just show UI
                        // Assuming there's a modal context or similar in the actual app
                        // For this quick implementation, maybe just a placeholder or link to workspaces
                        window.location.href = "/workspaces";
                    }}
                    className="group flex flex-col items-center justify-center p-6 h-28 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                >
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <Plus className="text-gray-500 group-hover:text-blue-600" size={20} />
                    </div>
                    <span className="mt-2 text-sm font-medium text-gray-500 group-hover:text-blue-700">Créer un tableau</span>
                </button>

                {boards.map((board) => (
                    <Link
                        key={board.id}
                        href={`/board/${board.id}`}
                        className="group relative h-28 p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all bg-white flex flex-col justify-between overflow-hidden"
                    >
                        {/* Gradient Background Decoration */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:opacity-100 transition-opacity"></div>

                        <div className="relative z-10">
                            <h3 className="font-bold text-gray-800 text-lg group-hover:text-blue-700 truncate">
                                {board.title}
                            </h3>
                            <p className="text-gray-400 text-xs mt-1">
                                Mis à jour le {new Date(board.createdAt).toLocaleDateString("fr-FR")}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
