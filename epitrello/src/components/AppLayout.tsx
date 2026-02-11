"use client";

import { useSession } from "next-auth/react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { usePathname } from "next/navigation";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();

  const forceFullScreen = ["/", "/auth", "/register"];

  if (status === "unauthenticated" || forceFullScreen.includes(pathname)) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        {children}
      </main>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-muted">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        </div>
      </div>
    );
  }

  // Check if we are on a board detail page (not the list of boards)
  // Path format: /workspaces/[workspaceId]/boards/[boardId]
  const isBoardDetail = pathname?.includes("/boards/") && pathname.split("/boards/")[1]?.length > 0;

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        <Navbar />
        <main className={`flex-1 overflow-auto ${isBoardDetail ? "p-0" : "p-6"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}