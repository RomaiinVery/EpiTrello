import { Task, ViewMode, Gantt } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import React, { useMemo, useState } from "react";
import { Card, List } from "@/app/lib/board-api";

interface GanttViewProps {
    lists: List[];
    cardsByList: Record<string, Card[]>;
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

    // Custom row to only show Title
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
                {tasks.map((t) => (
                    <div
                        key={t.id}
                        style={{
                            height: rowHeight,
                            display: "flex",
                            alignItems: "center",
                            paddingLeft: "10px",
                            borderBottom: "1px solid #e5e7eb",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                        title={t.name}
                    >
                        {t.name}
                    </div>
                ))}
            </div>
        );
    };

    const tasks: Task[] = useMemo(() => {
        const allTasks: Task[] = [];

        lists.forEach(list => {
            const listCards = cardsByList[list.id] || [];

            // Create tasks for cards
            listCards.forEach(card => {
                if (card.startDate || card.dueDate) {
                    const start = card.startDate ? new Date(card.startDate) : (card.dueDate ? new Date(card.dueDate) : new Date());
                    const end = card.dueDate ? new Date(card.dueDate) : (card.startDate ? new Date(card.startDate) : new Date());

                    // If start == end, add 1 day duration for visibility
                    if (start.getTime() === end.getTime()) {
                        end.setDate(end.getDate() + 1);
                    }

                    allTasks.push({
                        start,
                        end,
                        name: card.title,
                        id: card.id,
                        type: "task",
                        progress: card.isDone ? 100 : 0,
                        isDisabled: true, // Read-only for now
                        styles: { progressColor: card.isDone ? "#10b981" : "#3b82f6", progressSelectedColor: "#059669" },
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
