"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { SearchInput } from "@/components/SearchInput";

export function Navbar() {
  const { data: session, status } = useSession();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/user/profile-image")
        .then((res) => res.json())
        .then((data) => {
          if (data.profileImage) {
            setProfileImage(data.profileImage);
          }
        })
        .catch(() => { });
    }
  }, [status]);

  // Listen for profile image updates
  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      setProfileImage(customEvent.detail);
    };

    window.addEventListener("profileImageUpdated", handleProfileUpdate);
    return () => window.removeEventListener("profileImageUpdated", handleProfileUpdate);
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-card shadow-sm border-b border-border">
      <div className="flex items-center gap-8 flex-1 max-w-3xl">
        <h1 className="font-semibold text-lg text-foreground">EpiTrello</h1>
        <SearchInput />
      </div>

      <div>
        {status === "loading" ? (
          <div className="h-5 w-20 bg-muted rounded animate-pulse"></div>
        ) : session?.user ? (
          <div className="flex items-center gap-4">
            <NotificationDropdown />

            <Link
              href="/settings"
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-blue-600 transition-colors p-2 rounded-md hover:bg-accent"
            >
              {profileImage ? (
                <Image
                  src={profileImage}
                  alt={session.user.name || "Profile"}
                  width={32}
                  height={32}
                  unoptimized
                  className="w-8 h-8 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {session.user.name ? session.user.name[0].toUpperCase() : "U"}
                </div>
              )}
              <span>{session.user.name || "Utilisateur"}</span>
            </Link>
          </div>
        ) : (
          <Link
            href="/auth"
            className="text-sm font-medium text-muted-foreground hover:text-blue-600 px-3 py-2 transition-colors"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}