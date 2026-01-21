"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const { data: session, status, update } = useSession();

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
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [githubStatus, setGithubStatus] = useState<{
    isLinked: boolean;
    username: string | null;
    avatarUrl: string | null;
  }>({
    isLinked: false,
    username: null,
    avatarUrl: null,
  });
  const [loadingGithub, setLoadingGithub] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const verificationStepRef = React.useRef(verificationStep);

  useEffect(() => {
    verificationStepRef.current = verificationStep;
  }, [verificationStep]);

  useEffect(() => {
    return () => {
      // If we leave the page while verification is pending, cancel it
      if (verificationStepRef.current) {
        fetch('/api/user/profile/cancel-email', { method: 'POST', keepalive: true });
      }
    };
  }, []);


  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setValues((prev) => ({
        ...prev,
        displayName: session.user?.name || "",
        email: session.user?.email || "",
        timezone: "Europe/Paris",
      }));
      // Fetch user profile (full data including pendingEmail)
      fetch("/api/user/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data.email) {
            setValues(prev => ({ ...prev, email: data.email, displayName: data.name || prev.displayName }));
          }
          if (data.profileImage) {
            setProfileImage(data.profileImage);
          }
          if (data.pendingEmail) {
            setVerificationStep(true);
            setPendingVerificationEmail(data.pendingEmail);
          }
        })
        .catch(() => { });

      // Fetch user profile image (deprecated, now in profile)
      // fetch("/api/user/profile-image")
      // Fetch GitHub status
      fetch("/api/user/github")
        .then((res) => res.json())
        .then((data) => {
          if (data.isLinked !== undefined) {
            setGithubStatus({
              isLinked: data.isLinked,
              username: data.username,
              avatarUrl: data.avatarUrl,
            });
          }
        })
        .catch(() => { });
    } else if (status === "unauthenticated") {
      router.push("/auth");
    }
  }, [session, status, router]);

  // Handle query params for GitHub linking success/error

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "github_linked") {
      setMessage({ text: "Compte GitHub lié avec succès !", type: "success" });
      setTimeout(() => setMessage(null), 5000);
      // Refresh GitHub status
      fetch("/api/user/github")
        .then((res) => res.json())
        .then((data) => {
          if (data.isLinked !== undefined) {
            setGithubStatus({
              isLinked: data.isLinked,
              username: data.username,
              avatarUrl: data.avatarUrl,
            });
          }
        })
        .catch(() => { });
      // Clean URL
      router.replace("/settings");
    } else if (error === "github_auth_failed") {
      setMessage({ text: "Échec de l'authentification GitHub. Veuillez réessayer.", type: "error" });
      setTimeout(() => setMessage(null), 5000);
      router.replace("/settings");
    } else if (error === "github_token_error") {
      setMessage({ text: "Erreur lors de l'obtention du token GitHub. Veuillez réessayer.", type: "error" });
      setTimeout(() => setMessage(null), 5000);
      router.replace("/settings");
    } else if (error === "server_error") {
      setMessage({ text: "Erreur serveur lors de la liaison du compte GitHub.", type: "error" });
      setTimeout(() => setMessage(null), 5000);
      router.replace("/settings");
    }
  }, [searchParams, router]);


  function handleChange<K extends keyof SettingsState>(key: K, val: SettingsState[K]) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>, field: keyof PasswordState) {
    setPasswords((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e?: React.FormEvent) {
    try {
      e?.preventDefault();

      if (typeof values.email !== 'string') {
        return;
      }

      setSaving(true);
      setMessage(null);

      if (!values.email || !/^\S+@\S+\.\S+$/.test(values.email)) {
        setMessage({ text: "Please provide a valid email address.", type: "error" });
        setSaving(false);
        return;
      }

      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        cache: "no-store",
        body: JSON.stringify({ displayName: values.displayName, email: values.email }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.verificationNeeded) {
          setVerificationStep(true);
          setMessage({ text: "Un code de vérification a été envoyé à votre nouvelle adresse email.", type: "success" });
        } else {
          if (update) {
            await update({ name: values.displayName });
          }
          setValues(prev => ({ ...prev, displayName: values.displayName }));
          setMessage({ text: "Settings saved successfully.", type: "success" });
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      } else {
        setMessage({ text: data.error || "Something went wrong.", type: "error" });
      }
    } catch (error) {
      console.error(error);
      setMessage({ text: "Failed to save settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleVerifyEmail() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ text: "Email mis à jour avec succès !", type: "success" });
        setVerificationStep(false);
        setVerificationCode("");
        setPendingVerificationEmail(null);

        // Update session
        if (data.user?.email && update) {
          await update({ email: data.user.email });
        }

        // Force refresh to ensure everything is clean
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Code invalide", type: "error" });
      }
    } catch {
      setMessage({ text: "Erreur lors de la vérification", type: "error" });
    } finally {
      setSaving(false);
    }
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
      setMessage({ text: "Password updated successfully.", type: "success" });
      setTimeout(() => setMessage(null), 3000);
    }, 900);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/user/profile-image", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setProfileImage(data.profileImage);
        setMessage({ text: "Photo de profil mise à jour avec succès !", type: "success" });
        setTimeout(() => setMessage(null), 3000);
        // Trigger event to refresh navbar and sidebar
        window.dispatchEvent(new CustomEvent("profileImageUpdated", { detail: data.profileImage }));
      } else {
        const error = await res.json();
        setMessage({ text: error.error || "Erreur lors de l'upload", type: "error" });
      }
    } catch {
      setMessage({ text: "Erreur réseau", type: "error" });
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleRemoveImage() {
    setUploadingImage(true);
    try {
      const res = await fetch("/api/user/profile-image", {
        method: "DELETE",
      });

      if (res.ok) {
        setProfileImage(null);
        setMessage({ text: "Photo de profil supprimée avec succès !", type: "success" });
        setTimeout(() => setMessage(null), 3000);
        // Trigger event to refresh navbar and sidebar
        window.dispatchEvent(new CustomEvent("profileImageUpdated", { detail: null }));
      }
    } catch {
      setMessage({ text: "Erreur réseau", type: "error" });
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleLinkGitHub() {
    setLoadingGithub(true);
    try {
      const res = await fetch("/api/auth/github/authorize");
      const data = await res.json();

      if (res.ok && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setMessage({ text: data.error || "Erreur lors de l'initialisation de la connexion GitHub", type: "error" });
        setLoadingGithub(false);
      }
    } catch {
      setMessage({ text: "Erreur réseau lors de la connexion à GitHub", type: "error" });
      setLoadingGithub(false);
    }
  }

  async function handleUnlinkGitHub() {
    if (!confirm("Êtes-vous sûr de vouloir délier votre compte GitHub ?")) {
      return;
    }

    setLoadingGithub(true);
    try {
      const res = await fetch("/api/user/github", {
        method: "DELETE",
      });

      if (res.ok) {
        setGithubStatus({
          isLinked: false,
          username: null,
          avatarUrl: null,
        });
        setMessage({ text: "Compte GitHub délié avec succès !", type: "success" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await res.json();
        setMessage({ text: error.error || "Erreur lors de la suppression de la liaison", type: "error" });
      }
    } catch {
      setMessage({ text: "Erreur réseau", type: "error" });
    } finally {
      setLoadingGithub(false);
    }
  }


  async function handleCancelVerification() {
    setVerificationStep(false);
    setVerificationCode("");
    setPendingVerificationEmail(null);
    try {
      await fetch('/api/user/profile/cancel-email', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
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
        <div className={`mb-6 p-4 rounded-lg border ${message.type === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"} flex items-center gap-2`}>
          <span>{message.type === "error" ? "⚠️" : "✅"}</span>
          {message.text}
        </div>
      )}

      {/* Verification Modal */}



      {verificationStep && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Vérification de l&apos;email</h3>
            <p className="text-gray-600 mb-4">
              Veuillez entrer le code à 6 chiffres envoyé à <strong>{pendingVerificationEmail || values.email}</strong>.
            </p>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-2xl tracking-widest font-mono mb-4"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="123456"
              maxLength={6}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelVerification}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleVerifyEmail}
                disabled={saving || verificationCode.length !== 6}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Validation..." : "Valider"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">

        {/* SECTION 1: Profile */}
        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">Profile Information</h2>

          {/* Profile Picture Section */}
          <div className="mb-6 flex items-center gap-6">
            <div className="relative">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
                  {values.displayName ? values.displayName[0].toUpperCase() : "U"}
                </div>
              )}
              {uploadingImage && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium inline-block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
                {uploadingImage ? "Upload..." : "Changer la photo"}
              </label>
              {profileImage && (
                <button
                  onClick={handleRemoveImage}
                  disabled={uploadingImage}
                  className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                >
                  Supprimer la photo
                </button>
              )}
              <p className="text-xs text-gray-500">JPG, PNG, GIF. Max 5MB.</p>
            </div>
          </div>

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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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

        {/* SECTION 4: Connected Accounts */}
        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">Connected Accounts</h2>

          <div className="space-y-4">
            {/* GitHub Account */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">GitHub</h3>
                  {githubStatus.isLinked ? (
                    <div className="flex items-center gap-2 mt-1">
                      {githubStatus.avatarUrl && (
                        <img
                          src={githubStatus.avatarUrl}
                          alt="GitHub"
                          className="w-5 h-5 rounded-full"
                        />
                      )}
                      <p className="text-sm text-gray-500">
                        Connecté en tant que <span className="font-medium text-gray-700">@{githubStatus.username}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Non connecté</p>
                  )}
                </div>
              </div>
              <div>
                {githubStatus.isLinked ? (
                  <button
                    onClick={handleUnlinkGitHub}
                    disabled={loadingGithub}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingGithub ? "Déconnexion..." : "Délier"}
                  </button>
                ) : (
                  <button
                    onClick={handleLinkGitHub}
                    disabled={loadingGithub}
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    {loadingGithub ? "Connexion..." : "Lier un compte"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}