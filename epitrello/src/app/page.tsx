"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react"; 

type BoardHistory = {
  id: string;
  title: string;
  color: string;
  timestamp: number;
  link: string;
};

export default function Home() {
  const { data: session, status } = useSession();
  
  const [recentBoards, setRecentBoards] = useState<BoardHistory[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedHistory = localStorage.getItem("board_history");
    
    if (storedHistory) {
      try {
        const parsedHistory: any[] = JSON.parse(storedHistory);
        const validHistory = parsedHistory.filter((item) => item.link && item.id);
        setRecentBoards(validHistory.sort((a, b) => b.timestamp - a.timestamp));
      } catch (e) {
        console.error("Failed to parse history", e);
        localStorage.removeItem("board_history");
      }
    }
  }, []);

  const handleBoardClick = (value: string) => {
    let currentBoard: BoardHistory | null = null;

    if (value === "boards") {
      currentBoard = {
        id: "boards",
        title: "Tableaux",
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

    const newHistory = [
      currentBoard,
      ...recentBoards.filter((b) => b.id !== currentBoard!.id),
    ].slice(0, 4);

    setRecentBoards(newHistory);
    localStorage.setItem("board_history", JSON.stringify(newHistory));
  };

  if (!isMounted) return null;

  // ---------------------------------------------------------------------------
  // CAS 1 : UTILISATEUR NON CONNECTÉ -> AFFICHER LA LANDING PAGE
  // ---------------------------------------------------------------------------
if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full px-4 text-center bg-white">
        
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center">
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
            Organisez tout, <span className="text-blue-600">ensemble.</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mb-10">
            EpiTrello est l'outil de gestion de projet ultime. Gérez vos tâches, 
            collaborez avec votre équipe et atteignez vos objectifs plus rapidement.
            </p>
            <div className="flex gap-4 flex-col sm:flex-row">
            <Link 
                href="/auth" 
                className="px-8 py-4 text-lg font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 transform"
            >
                Commencer gratuitement
            </Link>
            <button 
                className="px-8 py-4 text-lg font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
            >
                En savoir plus
            </button>
            </div>
            
            {/* Features section */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left w-full">
                <div className="p-6 bg-white border rounded-xl shadow-sm">
                    <div className="text-3xl mb-4">🚀</div>
                    <h3 className="font-bold text-lg mb-2">Rapide & Fluide</h3>
                    <p className="text-gray-500">Une interface réactive qui ne vous ralentit jamais.</p>
                </div>
                <div className="p-6 bg-white border rounded-xl shadow-sm">
                    <div className="text-3xl mb-4">🤝</div>
                    <h3 className="font-bold text-lg mb-2">Collaboratif</h3>
                    <p className="text-gray-500">Invitez votre équipe et assignez des tâches en un clic.</p>
                </div>
                <div className="p-6 bg-white border rounded-xl shadow-sm">
                    <div className="text-3xl mb-4">🔒</div>
                    <h3 className="font-bold text-lg mb-2">Sécurisé</h3>
                    <p className="text-gray-500">Vos données sont protégées par les meilleurs standards.</p>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // CAS 2 : CHARGEMENT (Pendant que NextAuth vérifie le token)
  if (status === "loading") {
    return (
        <div className="flex h-full items-center justify-center min-h-[60vh]">
            <div className="animate-pulse flex flex-col items-center">
                <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <span className="text-gray-500 font-medium">Chargement de votre espace...</span>
            </div>
        </div>
    );
  }

  // ---------------------------------------------------------------------------
  // CAS 3 : UTILISATEUR CONNECTÉ -> AFFICHER LE DASHBOARD
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
            Bonjour, {session?.user?.name || "Utilisateur"} 👋
        </h1>
        <p className="text-gray-500 mt-2">Prêt à travailler ? Voici ton tableau de bord.</p>
      </div>

      {/* Main Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card: Tableaux */}
        <Link 
          href="/boards" 
          onClick={() => handleBoardClick("boards")}
          className="group bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col gap-4"
        >
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
            📋
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 group-hover:text-blue-600">Tableaux</h2>
            <p className="text-gray-500 text-sm mt-1">Accède à tes tableaux et projets actifs.</p>
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
                href={board.link || "#"}
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