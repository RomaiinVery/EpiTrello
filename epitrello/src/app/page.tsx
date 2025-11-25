"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type BoardHistory = {
  id: string;
  title: string;
  color: string;
  timestamp: number;
  link: string;
};

export default function Home() {
  const [recentBoards, setRecentBoards] = useState<BoardHistory[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Effect: Load and validate history from LocalStorage on mount
  useEffect(() => {
    setIsMounted(true);
    const storedHistory = localStorage.getItem("board_history");
    
    if (storedHistory) {
      try {
        const parsedHistory: any[] = JSON.parse(storedHistory);
        
        // Data Integrity Check: Filter out items missing the 'link' property 
        // This prevents crashes if local storage contains outdated schema data
        const validHistory = parsedHistory.filter((item) => item.link && item.id);
        
        setRecentBoards(validHistory.sort((a, b) => b.timestamp - a.timestamp));
      } catch (e) {
        console.error("Failed to parse history", e);
        // Clear corrupt data to reset state
        localStorage.removeItem("board_history");
      }
    }
  }, []);

  // Handler: Update local storage when a navigation item is clicked
  const handleBoardClick = (value: string) => {
    let currentBoard: BoardHistory | null = null;

    // Map button values to BoardHistory objects
    if (value === "boards") {
      currentBoard = {
        id: "boards",
        title: "My Main Board",
        color: "bg-blue-600",
        timestamp: Date.now(),
        link: "/boards"
      };
    } else if (value === "settings") {
      currentBoard = {
        id: "settings",
        title: "Settings",
        color: "bg-purple-600",
        timestamp: Date.now(),
        link: "/settings"
      };
    } else if (value === "team_management") {
      currentBoard = {
        id: "team_management",
        title: "Team Management",
        color: "bg-orange-600",
        timestamp: Date.now(),
        link: "/team-management"
      };
    }
    
    if (!currentBoard) return;

    // Prevent duplicates and limit history to the last 4 items
    const newHistory = [
      currentBoard,
      ...recentBoards.filter((b) => b.id !== currentBoard!.id),
    ].slice(0, 4);

    setRecentBoards(newHistory);
    localStorage.setItem("board_history", JSON.stringify(newHistory));
  };

  // Prevent hydration mismatch by ensuring component is mounted before rendering
  if (!isMounted) return null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Welcome to your Workspace</h1>
        <p className="text-gray-500 mt-2">What would you like to do today?</p>
      </div>

      {/* Main Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card: My Boards */}
        <Link 
          href="/boards" 
          onClick={() => handleBoardClick("boards")}
          className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col gap-4"
        >
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
            📋
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 group-hover:text-blue-600">My Boards</h2>
            <p className="text-gray-500 text-sm mt-1">Access your projects and active tasks.</p>
          </div>
        </Link>

        {/* Card: Team Management */}
        <Link 
          href="/team-management"
          onClick={() => handleBoardClick("team_management")}
          className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-400 transition-all cursor-pointer flex flex-col gap-4"
        >
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-2xl group-hover:bg-orange-600 group-hover:text-white transition-colors">
            👥
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 group-hover:text-orange-600">Team Members</h2>
            <p className="text-gray-500 text-sm mt-1">Invite colleagues and manage workspace access.</p>
          </div>
        </Link>

        {/* Card: Settings */}
        <Link 
          href="/settings" 
          onClick={() => handleBoardClick("settings")}
          className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-400 transition-all cursor-pointer flex flex-col gap-4"
        >
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-2xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
            ⚙️
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 group-hover:text-purple-600">Settings</h2>
            <p className="text-gray-500 text-sm mt-1">Manage your profile, notifications, and team.</p>
          </div>
        </Link>
      </div>

      {/* Section: Recently Viewed */}
      <div className="mt-10">
        <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span>🕒</span> Recently Viewed
        </h3>

        {recentBoards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {recentBoards.map((board) => (
              <Link
                key={board.id}
                href={board.link || "#"} // Fallback to avoid undefined prop error
                onClick={() => handleBoardClick(board.id)}
                className={`
                  ${board.color} 
                  h-24 rounded-md p-4 shadow-sm 
                  text-white font-bold text-md 
                  hover:bg-opacity-90 hover:shadow-md 
                  transition duration-200 transform hover:-translate-y-1
                  cursor-pointer flex flex-col justify-between
                  no-underline
                `}
              >
                <span className="truncate">{board.title}</span>
                <span className="text-xs text-white/80 font-normal flex items-center gap-1">
                   Last viewed: {new Date(board.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 italic">
            No recent activity.
          </div>
        )}
      </div>
    </div>
  );
}