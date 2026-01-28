"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchResult {
    id: string;
    title: string;
    list: {
        title: string;
        board: {
            id: string;
            title: string;
            workspaceId: string;
        };
    };
}

export function GlobalSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);

    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (debouncedQuery.length < 2) {
            setResults([]);
            return;
        }

        const fetchResults = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data);
                    setIsOpen(true);
                }
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [debouncedQuery]);

    const handleSelect = (result: SearchResult) => {
        setIsOpen(false);
        setQuery("");
        // Navigate to the board and open the card
        router.push(`/workspaces/${result.list.board.workspaceId}/boards/${result.list.board.id}?cardId=${result.id}`);
    };

    return (
        <div className="relative w-full max-w-sm mr-4 hidden md:block" ref={containerRef}>
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                    type="text"
                    placeholder="Rechercher une carte..."
                    className="pl-9 h-9 w-64 focus:w-80 transition-all duration-300"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (e.target.value.length >= 2) setIsOpen(true);
                    }}
                    onFocus={() => {
                        if (results.length > 0) setIsOpen(true);
                    }}
                />
                {loading && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-gray-500" />
                )}
            </div>

            {isOpen && (results.length > 0 || loading) && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-md shadow-lg border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto">
                    {results.length > 0 ? (
                        <div className="py-1">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Cartes
                            </div>
                            {results.map((result) => (
                                <button
                                    key={result.id}
                                    onClick={() => handleSelect(result)}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-start gap-3 transition-colors"
                                >
                                    <CreditCard className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {result.title}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {result.list.board.title} • {result.list.title}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        !loading && (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                Aucun résultat trouvé
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
