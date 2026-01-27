
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Minimize2, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface BoardChatProps {
    boardId: string;
}

export function BoardChat({ boardId }: BoardChatProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput("");
        const newMessages: Message[] = [...messages, { role: "user", content: userMsg }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            const res = await fetch("/api/ai/chat", {
                method: "POST",
                body: JSON.stringify({ messages: newMessages, boardId }),
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();

            if (data.error) {
                setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error." }]);
            } else {
                setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);

                if (data.actionPerformed) {
                    router.refresh(); // Refresh board data to show new lists/cards
                }
            }

        } catch (error) {
            console.error(error);
            setMessages((prev) => [...prev, { role: "assistant", content: "Network error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-gradient-to-tr from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 hover:scale-105 z-50"
            >
                <Sparkles className="h-6 w-6 text-white animate-pulse" />
            </Button>
        );
    }

    return (
        <Card className="fixed bottom-6 right-6 w-[350px] sm:w-[400px] h-[500px] shadow-2xl z-50 flex flex-col border-purple-200 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <CardHeader className="p-3 border-b bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg flex flex-row items-center justify-between shrink-0">
                <CardTitle className="flex items-center gap-2 text-md">
                    <Bot className="w-5 h-5" />
                    AI Action Bot
                </CardTitle>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white/80 hover:text-white hover:bg-white/20" onClick={() => setIsOpen(false)}>
                        <Minimize2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 flex flex-col overflow-hidden bg-gray-50/50">
                <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                    {messages.length === 0 && (
                        <div className="text-center text-sm text-gray-500 mt-20 px-6">
                            <Sparkles className="w-10 h-10 mx-auto mb-3 text-purple-300" />
                            <p>Hi! I can help you manage your board.</p>
                            <p className="mt-2 text-xs">Try: &quot;Create a list for Bugs&quot; or &quot;Add a card &apos;Fix Login&apos; to Bugs&quot;</p>
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={cn("flex w-full", m.role === "user" ? "justify-end" : "justify-start")}>
                            <div className={cn(
                                "max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                                m.role === "user"
                                    ? "bg-indigo-600 text-white rounded-br-none"
                                    : "bg-white border border-gray-100 text-gray-800 rounded-bl-none"
                            )}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start w-full">
                            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex gap-1">
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-3 bg-white border-t shrink-0">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me to do something..."
                            className="flex-1 focus-visible:ring-indigo-500"
                            disabled={isLoading}
                        />
                        <Button type="submit" size="icon" className="bg-indigo-600 hover:bg-indigo-700" disabled={isLoading || !input.trim()}>
                            <Send className="w-4 h-4" />
                        </Button>
                    </form>
                </div>
            </CardContent>
        </Card>
    );
}
