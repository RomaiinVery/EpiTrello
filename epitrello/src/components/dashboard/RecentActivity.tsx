"use client";

import { useEffect, useState } from "react";
import { Activity, MessageSquare, Move, Plus } from "lucide-react";
import Image from "next/image";

// Simplified type for activity
type ActivityItem = {
    id: string;
    type: string;
    description: string;
    createdAt: string;
    user: {
        name: string | null;
        profileImage: string | null;
    };
    board: {
        title: string;
    } | null;
};

export function RecentActivity() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchActivity() {
            try {
                const res = await fetch("/api/user/activities?limit=10");
                if (res.ok) {
                    const data = await res.json();
                    setActivities(data);
                }
            } catch (error) {
                console.error("Failed to fetch activity", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchActivity();
    }, []);

    const getActivityIcon = (type: string) => {
        if (type.includes("comment")) return <MessageSquare size={14} className="text-blue-500" />;
        if (type.includes("create")) return <Plus size={14} className="text-green-500" />;
        if (type.includes("move")) return <Move size={14} className="text-orange-500" />;
        return <Activity size={14} className="text-muted-foreground" />;
    };

    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Activity size={20} />
                </div>
                <h2 className="text-lg font-bold text-foreground">Recent Activity</h2>
            </div>

            <div className="space-y-6">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4 animate-pulse">
                                <div className="w-8 h-8 rounded-full bg-muted" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-muted w-3/4 rounded" />
                                    <div className="h-2 bg-muted w-1/2 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activities.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center">No recent activity.</p>
                ) : (
                    activities.map((act) => (
                        <div key={act.id} className="relative flex gap-4">
                            {/* Vertical connector line */}
                            <div className="absolute left-[15px] top-8 bottom-[-24px] w-0.5 bg-accent last:hidden"></div>

                            <div className="relative">
                                {act.user.profileImage ? (
                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-border relative">
                                        <Image
                                            src={act.user.profileImage}
                                            alt={act.user.name || "User"}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                        {act.user.name?.[0]?.toUpperCase() || "U"}
                                    </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 bg-card p-0.5 rounded-full border border-border">
                                    {getActivityIcon(act.type)}
                                </div>
                            </div>

                            <div className="flex-1 pb-1">
                                <p className="text-sm text-foreground leading-snug">
                                    <span className="font-semibold">{act.user.name || "Someone"}</span> {act.description}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {act.board && (
                                        <>
                                            <span className="text-muted-foreground">•</span>
                                            <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {act.board.title}
                                            </span>
                                        </>
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
