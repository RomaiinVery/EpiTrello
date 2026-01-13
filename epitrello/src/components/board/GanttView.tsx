import {
    GanttFeature,
    GanttProvider,
    GanttSidebar,
    GanttSidebarGroup,
    GanttSidebarHeader,
    GanttTimeline,
    GanttHeader,
    GanttFeatureList,
    GanttFeatureRow,
    GanttToday,
    useGanttDragging,
    GanttContext
} from "@/components/ui/shadcn-io/gantt";
import { Card, List, User } from "@/app/lib/board-api";
import { useMemo, useContext, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDistance, isSameDay, addDays } from "date-fns";
import React from "react";

interface GanttViewProps {
    lists: List[];
    cardsByList: Record<string, Card[]>;
}

// Extended Feature to include members
type ExtendedGanttFeature = GanttFeature & {
    members?: User[];
    cardId: string;
    listId: string;
};

// Custom Sidebar Item to show assignees
const CustomGanttSidebarItem = ({
    feature,
    className,
}: {
    feature: ExtendedGanttFeature;
    className?: string;
}) => {
    const gantt = useContext(GanttContext);
    const [, setDragging] = useGanttDragging();

    // Logic copied from GanttSidebarItem for interaction
    const handleClick = () => {
        gantt.scrollToFeature?.(feature);
    };

    const tempEndAt = feature.endAt && isSameDay(feature.startAt, feature.endAt)
        ? addDays(feature.endAt, 1)
        : feature.endAt;

    const duration = tempEndAt
        ? formatDistance(feature.startAt, tempEndAt)
        : "";

    return (
        <div
            className={cn(
                "relative flex items-center gap-2.5 p-2.5 text-xs hover:bg-secondary cursor-pointer border-b border-border/50",
                className
            )}
            onClick={handleClick}
            style={{ height: "var(--gantt-row-height)" }}
        >
            <div
                className="pointer-events-none h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: feature.status.color }}
            />
            <p className="pointer-events-none flex-1 truncate text-left font-medium">
                {feature.name}
            </p>

            {/* Assignees */}
            <div className="flex -space-x-1 shrink-0 mr-2">
                {feature.members && feature.members.map((member) => (
                    <div key={member.id} className="w-5 h-5 rounded-full overflow-hidden border border-white bg-gray-200" title={member.name || member.email}>
                        {member.profileImage ? (
                            <img src={member.profileImage} alt={member.name || "User"} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-600">
                                {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <p className="pointer-events-none text-muted-foreground w-16 text-right truncate">
                {duration}
            </p>
        </div>
    );
};

const onAddItem = (date: Date) => {
    alert("Add item" + date);
};

export function GanttView({ lists, cardsByList }: GanttViewProps) {
    const data = useMemo(() => {
        const groups: { list: List; features: ExtendedGanttFeature[] }[] = [];

        lists.forEach((list) => {
            const listCards = cardsByList[list.id] || [];
            const isDoingList = list.title.toLowerCase().includes("doing") || list.title.toLowerCase().includes("en cours");

            const features: ExtendedGanttFeature[] = [];

            listCards.forEach((card) => {
                if (card.startDate || card.dueDate) {
                    const start = card.startDate ? new Date(card.startDate) : (card.dueDate ? new Date(card.dueDate) : new Date());
                    let end = card.dueDate ? new Date(card.dueDate) : (card.startDate ? new Date(card.startDate) : new Date());

                    // Ensure end >= start
                    if (end < start) end = start;

                    // TODO: change colors based on the github issue status
                    // with card.githubIssueUrl
                    let color = "#6B7280";
                    if (card.githubIssueUrl) {
                        color = "#ffe6a0ff";
                    }


                    // status: { id: statusName.toLowerCase(), name: statusName, color },
                    features.push({
                        id: card.id,
                        name: card.title,
                        startAt: start,
                        endAt: end,
                        members: card.members,
                        status: { id: "todo", name: "Todo", color: color },
                        cardId: card.id,
                        listId: list.id
                    });
                }
            });

            if (features.length > 0) {
                groups.push({ list, features });
            }
        });

        return groups;
    }, [lists, cardsByList]);

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                Aucune tâche avec des dates à afficher.
            </div>
        );
    }

    return (
        <div className="h-full bg-background rounded-lg border shadow-sm overflow-hidden flex flex-col">
            <GanttProvider className="border" zoom={75} range="daily" onAddItem={onAddItem}>
                    <GanttSidebar>
                        {data.map((group) => (
                            <GanttSidebarGroup key={group.list.id} name={group.list.title}>
                                {group.features.map((feature) => (
                                    <CustomGanttSidebarItem key={feature.id} feature={feature} />
                                ))}
                            </GanttSidebarGroup>
                        ))}
                    </GanttSidebar>
                    <GanttTimeline>
                        <GanttHeader />
                        <GanttFeatureList>
                            {data.map((group) => (
                                <div key={group.list.id} className="relative">
                                    {/* This renders the rows for the group. 
                                         We need to ensure the height matches the sidebar group. 
                                         SidebarGroup height = header (rowHeight) + features * rowHeight.
                                         Top position is tricky because GanttFeatureList expects absolute positioning or stacked divs.
                                     */}
                                    {/* Actually, GanttFeatureListGroup in the lib adds paddingTop. 
                                         We can reuse or mimic it. 
                                     */}
                                    <div style={{ paddingTop: 'var(--gantt-row-height)' }}>
                                        <GanttFeatureRow features={group.features} />
                                    </div>
                                </div>
                            ))}
                        </GanttFeatureList>
                        <GanttToday />
                    </GanttTimeline>
            </GanttProvider>
        </div>
    );
}
