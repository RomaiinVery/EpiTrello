"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export function Navbar() {
  const { data: session, status } = useSession();

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white shadow-sm border-b border-gray-200">
      <h1 className="font-semibold text-lg text-gray-800">EpiTrello</h1>
      
      <div>
        {status === "loading" ? (
          // Squelette de chargement pendant que NextAuth vérifie
          <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
        ) : session?.user ? (
          // CAS CONNECTÉ : Affiche le nom et redirige vers Settings
          <Link 
            href="/settings"
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors p-2 rounded-md hover:bg-gray-50"
          >
            {/* Petite icône utilisateur */}
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              {session.user.name ? session.user.name[0].toUpperCase() : "U"}
            </div>
            <span>{session.user.name || "Utilisateur"}</span>
          </Link>
        ) : (
          // CAS NON CONNECTÉ : Redirige vers la page d'Auth
          <Link 
            href="/auth"
            className="text-sm font-medium text-gray-500 hover:text-blue-600 px-3 py-2 transition-colors"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}