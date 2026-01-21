"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Layout, Clock, TrendingUp } from "lucide-react";

export function StatsOverview() {
    const [stats, setStats] = useState({
        activeBoards: 0,
        tasksAssigned: 0,
        overdueTasks: 0,
        completedTasks: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch("/api/user/stats");
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("Failed to fetch user stats", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchStats();
    }, []);

    const statItems = [
        {
            label: "Tableaux Actifs",
            value: stats.activeBoards,
            icon: Layout,
            color: "text-blue-600",
            bg: "bg-blue-50",
        },
        {
            label: "Tâches Assignées",
            value: stats.tasksAssigned,
            icon: CheckCircle2, // Or a different icon if preferred for 'Assigned'
            color: "text-green-600",
            bg: "bg-green-50",
        },
        {
            label: "En Retard",
            value: stats.overdueTasks,
            icon: Clock,
            color: "text-orange-600",
            bg: "bg-orange-50",
        },
        {
            label: "Tâches Terminées",
            value: stats.completedTasks,
            icon: TrendingUp, // Or CheckCircle2
            color: "text-purple-600",
            bg: "bg-purple-50",
        },
    ];

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-gray-50 rounded-2xl animate-pulse border border-gray-100"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {statItems.map((stat, index) => (
                <div
                    key={index}
                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col items-start gap-3"
                >
                    <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                        <stat.icon size={20} />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                        <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}
