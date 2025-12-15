"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react"; 

type SettingsState = {
  displayName: string;
  email: string;
  timezone: string;
  language: string;
  theme: "light" | "dark" | "system";
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  connectedGitHub: boolean;
};

type PasswordState = {
  current: string;
  newP: string;
  confirm: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [values, setValues] = useState<SettingsState>({
    displayName: "",
    email: "",
    timezone: "UTC",
    language: "en",
    theme: "system",
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: false,
    connectedGitHub: false,
  });

  const [passwords, setPasswords] = useState<PasswordState>({ current: "", newP: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  
    useEffect(() => {
        if (status === "authenticated" && session?.user) {
        setValues((prev) => ({
            ...prev,
            displayName: session.user?.name || "", 
            email: session.user?.email || "",
            timezone: "Europe/Paris", 
        }));
        } else if (status === "unauthenticated") {
            router.push("/auth");
        }
    }, [session, status, router]);


  function handleChange<K extends keyof SettingsState>(key: K, val: SettingsState[K]) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>, field: keyof PasswordState) {
    setPasswords((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setMessage(null);

    if (!/^\S+@\S+\.\S+$/.test(values.email)) {
      setMessage("Please provide a valid email address.");
      setSaving(false);
      return;
    }

    setTimeout(() => {
      setSaving(false);
      setMessage("Settings saved successfully (Simulation).");
      setTimeout(() => setMessage(null), 3000);
    }, 800);
  }

  function handleSecuritySubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setPwError(null);

    if (!passwords.current || !passwords.newP) {
      setPwError("Please fill all password fields.");
      return;
    }
    if (passwords.newP !== passwords.confirm) {
      setPwError("New password and confirmation do not match.");
      return;
    }
    if (passwords.newP.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setPasswords({ current: "", newP: "", confirm: "" });
      setMessage("Password updated successfully.");
      setTimeout(() => setMessage(null), 3000);
    }, 900);
  }


  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center text-gray-500">
        <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 font-sans text-gray-900">
      
      {/* Header with Back Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
            <button 
                onClick={() => router.back()}
                className="p-2 rounded-full hover:bg-gray-200 transition-colors text-gray-600"
                aria-label="Go back"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
            </button>
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h1>
                <p className="text-gray-500 mt-1">Manage your profile preferences and security settings.</p>
            </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-3">
            <button 
                onClick={() => signOut({ callbackUrl: "/auth" })} 
                className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors"
            >
                Logout
            </button>
            <button 
                onClick={handleSubmit} 
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
                {saving ? "Saving..." : "Save Changes"}
            </button>
        </div>
      </div>

      {/* Feedback Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${message.includes("valid") ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"} flex items-center gap-2`}>
            <span>{message.includes("valid") ? "⚠️" : "✅"}</span>
            {message}
        </div>
      )}

      <div className="space-y-6">
        
        {/* SECTION 1: Profile */}
        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Display Name</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={values.displayName}
                onChange={(e) => handleChange("displayName", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                value={values.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Timezone</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={values.timezone}
                onChange={(e) => handleChange("timezone", e.target.value)}
              >
                <option value="UTC">UTC</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Language</label>
                    <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={values.language}
                        onChange={(e) => handleChange("language", e.target.value)}
                    >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Theme</label>
                    <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        value={values.theme}
                        onChange={(e) => handleChange("theme", e.target.value as SettingsState["theme"])}
                    >
                        <option value="system">System</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                    </select>
                </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: Notifications */}
        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">Notifications</h2>
          <div className="space-y-4">
            {[
                { key: "emailNotifications", label: "Email Notifications", desc: "Receive daily digests and important alerts." },
            ].map((item) => (
                <div key={item.key} className="flex items-start gap-3">
                    <div className="flex h-6 items-center">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={values[item.key as keyof SettingsState] as boolean}
                            onChange={(e) => handleChange(item.key as keyof SettingsState, e.target.checked)}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-900 block">{item.label}</label>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                </div>
            ))}
          </div>
        </section>

        {/* SECTION 3: Security */}
        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">Security</h2>
          <form onSubmit={handleSecuritySubmit} className="max-w-md space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Current Password</label>
                <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={passwords.current}
                    onChange={(e) => handlePasswordChange(e, 'current')}
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">New Password</label>
                <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={passwords.newP}
                    onChange={(e) => handlePasswordChange(e, 'newP')}
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={passwords.confirm}
                    onChange={(e) => handlePasswordChange(e, 'confirm')}
                />
            </div>

            {pwError && <div className="text-sm text-red-600 font-medium">{pwError}</div>}
            
            <button 
                type="submit" 
                disabled={saving}
                className="mt-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
            >
                Update Password
            </button>
          </form>
        </section>

      </div>
    </div>
  );
}