"use client";

import { useSession } from "next-auth/react";

export function DashboardHeader() {
    const { data: session } = useSession();
    const userName = session?.user?.name || "User";

    const today = new Date().toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                    Bonjour, {userName} 👋
                </h1>
                <p className="text-muted-foreground mt-1 text-lg">
                    Voici ce qui se passe avec vos projets aujourd&apos;hui.
                </p>
            </div>
            <div className="text-muted-foreground font-medium text-sm md:text-right capitalize">
                {today}
            </div>
        </div>
    );
}
