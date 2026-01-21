"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
    Bell,
    CreditCard,
    Layout,
    MessageSquare,
    User,
    Paperclip,
    Activity,
    Check,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NotificationItem = {
    id: string;
    type: string;
    description: string;
    createdAt: string;
    user: {
        name: string | null;
        email: string;
        profileImage?: string | null;
    };
    board: {
        title: string;
    };
    card?: {
        title: string;
    } | null;
};

export function NotificationDropdown() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    // Fetch notifications when dropdown opens
    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            fetch("/api/user/notifications?limit=5") // Limit to 5 for dropdown
                .then((res) => res.json())
                .then((data) => {
                    if (Array.isArray(data)) {
                        setNotifications(data);
                    }
                })
                .catch((err) => console.error(err))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen]);

    const getNotificationIcon = (type: string) => {
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
                return <Paperclip className="w-4 h-4 text-gray-500" />;
            default:
                return <Activity className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <DropdownMenu onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    className="relative p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors outline-none"
                    title="Notifications"
                >
                    <Bell className="w-5 h-5" />
                    {/* Unread badge logic can be added here later */}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
                <DropdownMenuLabel className="px-4 py-3 font-semibold text-gray-900 border-b bg-gray-50 flex items-center justify-between">
                    <span>Notifications</span>
                    {/* Optional: 'Mark all as read' button could go here */}
                </DropdownMenuLabel>

                <div className="max-h-[300px] overflow-y-auto">
                    {isLoading ? (
                        <div className="py-8 text-center text-gray-500 text-sm">
                            Chargement...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="py-8 text-center text-gray-500 text-sm px-4">
                            Aucune nouvelle notification.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-default"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                            {getNotificationIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900 line-clamp-2">
                                                <span className="font-semibold">
                                                    {notif.user.name || "User"}
                                                </span>{" "}
                                                {notif.description.replace(/^.*? a /, "a ")} {/* Quick dirty fix to remove duplicate name if description starts with name, ideally description shouldn't contain name or we parse it out */}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-500">
                                                    {formatDistanceToNow(new Date(notif.createdAt), {
                                                        addSuffix: true,
                                                        locale: fr,
                                                    })}
                                                </span>
                                                <span className="text-xs text-gray-400">•</span>
                                                <span className="text-xs text-gray-500 truncate max-w-[100px]">
                                                    {notif.board.title}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </DropdownMenuContent>
        </DropdownMenu>
    );
}
