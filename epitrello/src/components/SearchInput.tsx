"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";

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

export function SearchInput() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Debounce logic
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                setLoading(true);
                fetch(`/api/search?q=${encodeURIComponent(query)}`)
                    .then((res) => res.json())
                    .then((data) => {
                        setResults(data);
                        setLoading(false);
                        setOpen(true);
                    })
                    .catch(() => setLoading(false));
            } else {
                setResults([]);
                setOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Click outside listener
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (result: SearchResult) => {
        setOpen(false);
        setQuery("");
        // Navigate to the board and open the card
        router.push(`/workspaces/${result.list.board.workspaceId}/boards/${result.list.board.id}?cardId=${result.id}`);
    };

    return (
        <div className="relative w-full max-w-2xl" ref={containerRef}>
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Rechercher..."
                    className="w-full pl-9 pr-4 py-2 bg-muted border-none rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        if (results.length > 0) setOpen(true);
                    }}
                />
                {loading && (
                    <div className="absolute right-3 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>

            {open && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-md shadow-lg border border-border text-sm max-h-[300px] overflow-y-auto z-50">
                    {results.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">Aucun résultat</div>
                    ) : (
                        <div className="py-2">
                            <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Cartes
                            </div>
                            {results.map((result) => (
                                <button
                                    key={result.id}
                                    onClick={() => handleSelect(result)}
                                    className="w-full text-left px-4 py-2 hover:bg-accent flex flex-col gap-0.5"
                                >
                                    <span className="font-medium text-foreground">{result.title}</span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        dans <span className="font-medium text-foreground">{result.list.title}</span>
                                        sur <span className="font-medium text-foreground">{result.list.board.title}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
