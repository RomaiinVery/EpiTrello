import { Task, ViewMode, Gantt } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import React, { useMemo, useState } from "react";
import { Card, List, User } from "@/app/lib/board-api";

interface GanttViewProps {
    lists: List[];
    cardsByList: Record<string, Card[]>;
}

// Extend Task interface to include members
interface ExtendedTask extends Task {
    members?: User[];
}

export function GanttView({ lists, cardsByList }: GanttViewProps) {
    const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);

    // Custom header to only show Title
    const TaskListHeader: React.FC<{ headerHeight: number; rowWidth: string; fontFamily: string; fontSize: string }> = ({ headerHeight, rowWidth, fontFamily, fontSize }) => {
        return (
            <div style={{
                height: headerHeight,
                fontFamily: fontFamily,
                fontSize: fontSize,
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                paddingLeft: "10px",
                fontWeight: "bold"
            }}>
                Tâche
            </div>
        );
    };

    // Custom row to show Title + Assignees
    const TaskListTable: React.FC<{
        rowHeight: number;
        rowWidth: string;
        fontFamily: string;
        fontSize: string;
        locale: string;
        tasks: Task[];
        selectedTaskId: string;
        setSelectedTask: (taskId: string) => void;
        onExpanderClick: (task: Task) => void;
    }> = ({ rowHeight, tasks, fontFamily, fontSize }) => {
        return (
            <div style={{ fontFamily: fontFamily, fontSize: fontSize }}>
                {tasks.map((t) => {
                    const task = t as ExtendedTask;
                    return (
                        <div
                            key={t.id}
                            style={{
                                height: rowHeight,
                                display: "flex",
                                alignItems: "center",
                                paddingLeft: "10px",
                                paddingRight: "10px",
                                borderBottom: "1px solid #e5e7eb",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                justifyContent: "space-between"
                            }}
                        >
                            <div title={t.name} style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", marginRight: "8px" }}>
                                {t.name}
                            </div>
                            <div className="flex -space-x-1 shrink-0">
                                {task.members && task.members.map((member) => (
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
                        </div>
                    );
                })}
            </div>
        );
    };

    const tasks: Task[] = useMemo(() => {
        const allTasks: ExtendedTask[] = [];

        lists.forEach(list => {
            const listCards = cardsByList[list.id] || [];

            // Determine common styles for this list (e.g. if it's "Doing")
            const isDoingList = list.title.toLowerCase().includes("doing") || list.title.toLowerCase().includes("en cours");

            // Create tasks for cards
            listCards.forEach(card => {
                if (card.startDate || card.dueDate) {
                    const start = card.startDate ? new Date(card.startDate) : (card.dueDate ? new Date(card.dueDate) : new Date());
                    const end = card.dueDate ? new Date(card.dueDate) : (card.startDate ? new Date(card.startDate) : new Date());

                    // If start == end, add 1 day duration for visibility
                    if (start.getTime() === end.getTime()) {
                        end.setDate(end.getDate() + 1);
                    }

                    // Determine color
                    let barColor = "#3b82f6"; // Default Blue
                    let progressColor = "#2563eb";

                    if (card.isDone) {
                        barColor = "#10b981"; // Green
                        progressColor = "#059669";
                    } else if (isDoingList) {
                        barColor = "#ef4444"; // Red
                        progressColor = "#dc2626";
                    }

                    allTasks.push({
                        start,
                        end,
                        name: card.title,
                        id: card.id,
                        type: "task",
                        progress: card.isDone ? 100 : 0,
                        isDisabled: true, // Read-only for now
                        styles: {
                            progressColor: progressColor,
                            progressSelectedColor: progressColor,
                            backgroundColor: barColor,
                            backgroundSelectedColor: barColor
                        },
                        members: card.members,
                    });
                }
            });
        });

        return allTasks;
    }, [lists, cardsByList]);

    if (tasks.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                Aucune tâche avec des dates à afficher.
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto p-4 bg-white rounded-lg shadow">
            <div className="mb-4 flex gap-2 justify-end">
                <button onClick={() => setViewMode(ViewMode.Day)} className={`px-3 py-1 rounded ${viewMode === ViewMode.Day ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Jour</button>
                <button onClick={() => setViewMode(ViewMode.Week)} className={`px-3 py-1 rounded ${viewMode === ViewMode.Week ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Semaine</button>
                <button onClick={() => setViewMode(ViewMode.Month)} className={`px-3 py-1 rounded ${viewMode === ViewMode.Month ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Mois</button>
            </div>
            <Gantt
                tasks={tasks}
                viewMode={viewMode}
                locale="fr"
                columnWidth={viewMode === ViewMode.Month ? 80 : 40}
                fontSize="10px"
                barFill={70}
                listCellWidth="300px" // Wider task list
                TaskListHeader={TaskListHeader}
                TaskListTable={TaskListTable}
            />
        </div>
    );
}
