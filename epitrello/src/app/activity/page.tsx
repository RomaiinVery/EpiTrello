"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Image from "next/image";
import {
    Activity, // lucide-react Activity icon
    CreditCard,
    Layout,
    MessageSquare,
    User,
    Paperclip,
} from "lucide-react";

interface ActivityItem {
    id: string;
    type: string;
    description: string;
    createdAt: string;
    user: {
        name: string | null;
        email: string;
        profileImage: string | null;
    };
    board: {
        title: string;
    };
    card?: {
        title: string;
    } | null;
}

export default function ActivityPage() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch("/api/user/activities")
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setActivities(data);
                }
            })
            .catch((err) => console.error(err))
            .finally(() => setIsLoading(false));
    }, []);

    const getActivityIcon = (type: string) => {
        switch (type) {
            case "card_created":
            case "card_updated":
                return <CreditCard className="w-4 h-4 text-blue-500" />;
            case "board_created":
            case "board_updated":
                return <Layout className="w-4 h-4 text-purple-500" />;
            case "comment_added":
                return <MessageSquare className="w-4 h-4 text-green-500" />;
            case "member_assigned":
                return <User className="w-4 h-4 text-orange-500" />;
            case "attachment_uploaded":
                return <Paperclip className="w-4 h-4 text-muted-foreground" />;
            default:
                return <Activity className="w-4 h-4 text-muted-foreground" />;
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-2">
                <Activity className="w-6 h-6" />
                Fil d&apos;actualité
            </h1>
            <p className="text-muted-foreground mb-6">L&apos;activité récente de vos espaces de travail.</p>

            {isLoading ? (
                <div className="text-center py-10 text-muted-foreground">Chargement...</div>
            ) : activities.length === 0 ? (
                <div className="text-center py-10 bg-muted rounded-lg text-muted-foreground">
                    Aucune activité récente.
                </div>
            ) : (
                <div className="space-y-4">
                    {activities.map((activity) => (
                        <div
                            key={activity.id}
                            className="bg-card p-4 rounded-lg border shadow-sm flex items-start gap-4 hover:bg-muted transition-colors"
                        >
                            {/* User Avatar */}
                            <div className="flex-shrink-0">
                                {activity.user.profileImage ? (
                                    <Image
                                        src={activity.user.profileImage}
                                        alt={activity.user.name || "User"}
                                        width={32}
                                        height={32}
                                        unoptimized
                                        className="w-8 h-8 rounded-full border border-border"
                                    />
                                ) : (
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                        {activity.user.name ? activity.user.name[0].toUpperCase() : "U"}
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-foreground text-sm">
                                        {activity.user.name || activity.user.email}
                                    </span>
                                    <span className="text-muted-foreground text-xs">•</span>
                                    <span className="text-muted-foreground text-xs">
                                        {formatDistanceToNow(new Date(activity.createdAt), {
                                            addSuffix: true,
                                            locale: fr,
                                        })}
                                    </span>
                                </div>

                                <p className="text-sm text-foreground mb-1">
                                    {activity.description}
                                </p>

                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs text-foreground font-medium">
                                        {getActivityIcon(activity.type)}
                                        <span>{activity.board.title}</span>
                                    </div>
                                    {activity.card && (
                                        <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded text-xs text-blue-600 font-medium border border-blue-100">
                                            <CreditCard className="w-3 h-3" />
                                            <span>{activity.card.title}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
