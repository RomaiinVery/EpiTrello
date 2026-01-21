"use client";

import { ActiveBoards } from "@/components/dashboard/ActiveBoards";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { TaskSummary } from "@/components/dashboard/TaskSummary";

export default function DashboardPage() {
    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
            <DashboardHeader />

            <StatsOverview />

            <ActiveBoards />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <TaskSummary />
                </div>
                <div>
                    <RecentActivity />
                </div>
            </div>
        </div>
    );
}
