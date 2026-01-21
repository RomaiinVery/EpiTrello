"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlignLeft, Calendar } from "lucide-react";

// Use a simplified type matching what our API returns
type Task = {
    id: string;
    title: string;
    isDone: boolean;
    dueDate: string | null;
    updatedAt: string;
    list: {
        title: string;
        board: {
            id: string;
            title: string;
        };
    };
};

export function TaskSummary() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchTasks() {
            try {
                const res = await fetch("/api/user/tasks");
                if (res.ok) {
                    const data = await res.json();
                    setTasks(data);
                }
            } catch (error) {
                console.error("Failed to fetch tasks", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchTasks();
    }, []);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                        <CheckCircle2 size={20} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">Mes Tâches</h2>
                </div>
                <Link href="#" className="text-sm font-medium text-gray-400 hover:text-gray-600">
                    Voir tout
                </Link>
            </div>

            <div className="space-y-3">
                {isLoading ? (
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                            <CheckCircle2 className="text-gray-300" size={24} />
                        </div>
                        <p className="text-gray-500 text-sm">Aucune tâche en attente. Vous êtes à jour !</p>
                    </div>
                ) : (
                    tasks.map((task) => (
                        <div key={task.id} className="group p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all flex items-start gap-3">
                            {/* Custom checkbox look */}
                            <button className="mt-1 flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-blue-500 transition-colors"></button>

                            <div className="flex-1 min-w-0">
                                <Link href={`/board/${task.list.board.id}?cardId=${task.id}`} className="block">
                                    <h4 className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-700">
                                        {task.title}
                                    </h4>
                                </Link>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <AlignLeft size={12} />
                                        <span className="truncate max-w-[100px]">{task.list.board.title}</span>
                                    </div>
                                    {task.dueDate && (
                                        <div className={`flex items-center gap-1 ${new Date(task.dueDate) < new Date() ? 'text-red-500 font-medium' : ''}`}>
                                            <Calendar size={12} />
                                            <span>{new Date(task.dueDate).toLocaleDateString("fr-FR")}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
