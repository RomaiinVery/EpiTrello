"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Layers, Settings, Plus, ChevronRight, FolderKanban } from "lucide-react";

type Workspace = {
  id: string;
  title: string;
  boards?: { id: string; title: string }[];
};

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const fetchData = () => {
    fetch("/api/workspaces")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWorkspaces(data.slice(0, 5)); // Limit to 5 most recent
        } else if (data && Array.isArray(data.workspaces)) {
          setWorkspaces(data.workspaces.slice(0, 5));
        }
      })
      .catch(() => setWorkspaces([]))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchData();

    // Listen for sidebar updates
    const handleSidebarUpdate = () => fetchData();
    window.addEventListener("sidebarUpdated", handleSidebarUpdate);
    return () => window.removeEventListener("sidebarUpdated", handleSidebarUpdate);
  }, []);

  useEffect(() => {
    // Fetch profile image
    fetch("/api/user/profile-image")
      .then((res) => res.json())
      .then((data) => {
        if (data.profileImage) {
          setProfileImage(data.profileImage);
        }
      })
      .catch(() => { });
  }, []);

  // Listen for profile image updates
  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      setProfileImage(customEvent.detail);
    };

    window.addEventListener("profileImageUpdated", handleProfileUpdate);
    return () => window.removeEventListener("profileImageUpdated", handleProfileUpdate);
  }, []);

  const isActive = (path: string) => pathname === path;
  const isWorkspaceActive = (workspaceId: string) => pathname.includes(`/workspaces/${workspaceId}`);
  const isBoardActive = (workspaceId: string, boardId: string) => pathname === `/workspaces/${workspaceId}/boards/${boardId}`;

  const toggleWorkspace = (e: React.MouseEvent, workspaceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedWorkspaces((prev) =>
      prev.includes(workspaceId)
        ? prev.filter((id) => id !== workspaceId)
        : [...prev, workspaceId]
    );
  };

  const navItems = [
    { href: "/", label: "Accueil", icon: Home },
    { href: "/workspaces", label: "Workspaces", icon: Layers },
    { href: "/settings", label: "Paramètres", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r flex flex-col h-full hidden md:flex">
      {/* Header */}
      <div className="p-6 border-b">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
            EpiTrello
          </h1>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive(item.href)
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Workspaces Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between px-3 mb-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Mes Workspaces
            </h2>
            <Link
              href="/workspaces"
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              title="Créer un workspace"
            >
              <Plus className="w-4 h-4 text-gray-500" />
            </Link>
          </div>

          {isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              Chargement...
            </div>
          ) : workspaces.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              Aucun workspace
            </div>
          ) : (
            <div className="space-y-1">
              {workspaces.map((workspace) => (
                <div key={workspace.id} className="mb-0.5">
                  <div
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${isWorkspaceActive(workspace.id)
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100"
                      }`}
                  >
                    <Link
                      href={`/workspaces/${workspace.id}/boards`}
                      className="flex items-center gap-2 flex-1 min-w-0"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${isWorkspaceActive(workspace.id) ? "bg-blue-600" : "bg-gray-400"
                          }`}
                      />
                      <span className="truncate font-medium">{workspace.title}</span>
                    </Link>
                    <div className="flex items-center gap-1">
                      {workspace.boards && workspace.boards.length > 0 && (
                        <>
                          <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded group-hover:bg-white transition-colors">
                            {workspace.boards.length}
                          </span>
                          <button
                            onClick={(e) => toggleWorkspace(e, workspace.id)}
                            className="p-0.5 hover:bg-gray-200 rounded-sm transition-colors focus:outline-none"
                          >
                            <ChevronRight
                              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expandedWorkspaces.includes(workspace.id) ? "rotate-90" : ""
                                }`}
                            />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {expandedWorkspaces.includes(workspace.id) &&
                    workspace.boards &&
                    workspace.boards.length > 0 && (
                      <div className="ml-4 mt-1 border-l-2 border-gray-100 pl-2 space-y-0.5">
                        {workspace.boards.map((board) => (
                          <Link
                            key={board.id}
                            href={`/workspaces/${workspace.id}/boards/${board.id}`}
                            className={`block px-2 py-1.5 rounded text-sm truncate transition-colors ${isBoardActive(workspace.id, board.id)
                              ? "bg-blue-50 text-blue-600 font-medium"
                              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                              }`}
                          >
                            {board.title}
                          </Link>
                        ))}
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}

          {workspaces.length > 0 && (
            <Link
              href="/workspaces"
              className="flex items-center gap-2 px-3 py-2 mt-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
            >
              <span className="font-medium">Voir tous les workspaces</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t bg-gray-50">
        {/* User Profile */}
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition-colors"
        >
          {profileImage ? (
            <img
              src={profileImage}
              alt={session?.user?.name || "Profile"}
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
              {session?.user?.name ? session.user.name[0].toUpperCase() : "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {session?.user?.name || "Utilisateur"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {session?.user?.email}
            </p>
          </div>
          <Settings className="w-4 h-4 text-gray-400" />
        </Link>

        {/* New Workspace Button */}
        <div className="p-4">
          <Link
            href="/workspaces"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nouveau workspace
          </Link>
        </div>
      </div>
    </aside>
  );
}
