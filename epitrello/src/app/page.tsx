"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function Home() {
  const { status } = useSession();

  // Middleware should handle redirect if authenticated, 
  // but we keep this clean just in case.

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] w-full px-4 text-center bg-white">

      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center">
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
          Organisez tout, <span className="text-blue-600">ensemble.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mb-10">
          EpiTrello est l&apos;outil de gestion de projet ultime. Gérez vos tâches,
          collaborez avec votre équipe et atteignez vos objectifs plus rapidement.
        </p>
        <div className="flex gap-4 flex-col sm:flex-row">
          {status === "authenticated" ? (
            <Link
              href="/dashboard"
              className="px-8 py-4 text-lg font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 transform"
            >
              Accéder au Dashboard
            </Link>
          ) : (
            <Link
              href="/auth"
              className="px-8 py-4 text-lg font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 transform"
            >
              Commencer gratuitement
            </Link>
          )}

          <button
            className="px-8 py-4 text-lg font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
          >
            En savoir plus
          </button>
        </div>

        {/* Features section */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left w-full">
          <div className="p-6 bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-4">🚀</div>
            <h3 className="font-bold text-lg mb-2">Rapide & Fluide</h3>
            <p className="text-gray-500">Une interface réactive qui ne vous ralentit jamais.</p>
          </div>
          <div className="p-6 bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-4">🤝</div>
            <h3 className="font-bold text-lg mb-2">Collaboratif</h3>
            <p className="text-gray-500">Invitez votre équipe et assignez des tâches en un clic.</p>
          </div>
          <div className="p-6 bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-4">🔒</div>
            <h3 className="font-bold text-lg mb-2">Sécurisé</h3>
            <p className="text-gray-500">Vos données sont protégées par les meilleurs standards.</p>
          </div>
        </div>
      </div>
    </div>
  );
}