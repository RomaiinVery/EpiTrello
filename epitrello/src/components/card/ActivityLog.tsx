import { useState, useEffect } from "react";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Activity } from "@/types";

interface ActivityLogProps {
    boardId: string;
    cardId: string;
    lastUpdate: number;
}

export function ActivityLog({ boardId, cardId, lastUpdate }: ActivityLogProps) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        fetchActivities();
    }, [boardId, cardId, lastUpdate]);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `/api/boards/${boardId}/activities?cardId=${cardId}&limit=50`
            );
            if (res.ok) {
                const activitiesData = await res.json();
                setActivities(activitiesData);
            }
        } catch (err) {
            console.error("Error fetching activities:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">
                    Historique des activités
                </h3>
                {activities.length > 0 && (
                    <span className="text-xs text-gray-500">({activities.length})</span>
                )}
            </div>

            {loading ? (
                <p className="text-sm text-gray-400 italic text-center py-4">
                    Chargement...
                </p>
            ) : activities.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-4">
                    Aucune activité pour le moment
                </p>
            ) : (
                <div className="space-y-4">
                    <div className="space-y-2">
                        {(showAll ? activities : activities.slice(0, 1)).map((activity) => (
                            <div key={activity.id} className="flex items-start gap-2 text-sm">
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold flex-shrink-0 mt-0.5">
                                    {activity.user.name
                                        ? activity.user.name.charAt(0).toUpperCase()
                                        : activity.user.email.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-gray-700">
                                        <span className="font-medium">
                                            {activity.user.name || activity.user.email}
                                        </span>{" "}
                                        {activity.description}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {new Date(activity.createdAt).toLocaleDateString("fr-FR", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {activities.length > 1 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAll(!showAll)}
                            className="w-full text-xs text-gray-500 hover:text-gray-900 h-8"
                        >
                            {showAll
                                ? "Masquer l'historique"
                                : `Afficher tout l'historique (${activities.length - 1} de plus)`}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
