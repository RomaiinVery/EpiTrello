"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();

  const [variant, setVariant] = useState<"LOGIN" | "REGISTER" | "VERIFY">("LOGIN");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [verificationCode, setVerificationCode] = useState("");

  // Fonction utilitaire pour vérifier le format de l'email via Regex
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const toggleVariant = () => {
    if (variant === "VERIFY") {
      setVariant("LOGIN"); // Back to login if cancelling verify
    } else {
      setVariant((prev) => (prev === "LOGIN" ? "REGISTER" : "LOGIN"));
    }
    setErrorMessage(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const loginUser = async () => {
    const callback = await signIn("credentials", {
      ...data,
      redirect: false,
    });

    if (callback?.error) {
      setErrorMessage("Identifiants invalides. Vérifiez votre email et mot de passe.");
    }

    if (callback?.ok && !callback?.error) {
      router.push("/");
      router.refresh();
    }
  };

  const registerUser = async () => {
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Registration failed");
      }

      if (responseData.verificationNeeded) {
        setVariant("VERIFY");
        setErrorMessage(null);
        // Optionally show success message: "Code sent!"
        return;
      }

      // Fallback for immediate login if verification not needed (legacy support)
      await loginUser();

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Une erreur est survenue lors de l'inscription.";
      setErrorMessage(msg);
    }
  };

  const verifyUser = async () => {
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, code: verificationCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Verification failed");
      }

      // Verification successful, log the user in
      await loginUser();

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Code invalide ou expiré.";
      setErrorMessage(msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    // Validation
    if (variant === "VERIFY") {
      if (verificationCode.length !== 6) {
        setErrorMessage("Le code doit contenir 6 chiffres.");
        setIsLoading(false);
        return;
      }
    } else {
      if (!data.email || !isValidEmail(data.email)) {
        setErrorMessage("Veuillez entrer une adresse email valide (ex: nom@domaine.com)");
        setIsLoading(false);
        return;
      }
    }

    try {
      if (variant === "LOGIN") {
        await loginUser();
      } else if (variant === "REGISTER") {
        await registerUser();
      } else if (variant === "VERIFY") {
        await verifyUser();
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center text-5xl mb-4">📋</div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {variant === "LOGIN"
            ? "Connexion"
            : variant === "REGISTER"
              ? "Créer un compte"
              : "Vérification email"}
        </h2>
        {variant === "VERIFY" && (
          <p className="mt-2 text-center text-sm text-gray-600">
            Un code a été envoyé à <strong>{data.email}</strong>
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">

          <form className="space-y-6" onSubmit={handleSubmit}>

            {variant === "REGISTER" && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nom complet
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    disabled={isLoading}
                    value={data.name}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            {variant === "VERIFY" ? (
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Code de vérification (6 chiffres)
                </label>
                <div className="mt-1">
                  <input
                    id="code"
                    name="code"
                    type="text"
                    maxLength={6}
                    required
                    disabled={isLoading}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center tracking-widest text-lg"
                  />
                </div>
              </div>
            ) : (
              // Login/Register fields
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Adresse email
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      disabled={isLoading}
                      value={data.email}
                      onChange={handleChange}
                      className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm ${errorMessage && errorMessage.toLowerCase().includes("email")
                        ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        }`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Mot de passe
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      disabled={isLoading}
                      value={data.password}
                      onChange={handleChange}
                      className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm ${errorMessage && errorMessage.toLowerCase().includes("mot de passe")
                        ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                        : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        }`}
                    />
                  </div>
                  <div className="text-right mt-1">
                    <a href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
                      Mot de passe oublié ?
                    </a>
                  </div>
                </div>
              </>
            )}

            {errorMessage && (
              <div className="text-sm font-medium text-red-600 bg-red-50 border border-red-200 p-3 rounded-md flex items-center gap-2 animate-pulse">
                <span>⚠️</span>
                {errorMessage}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Traitement...
                  </span>
                ) : (
                  variant === "LOGIN" ? "Se connecter"
                    : variant === "REGISTER" ? "S'inscrire"
                      : "Vérifier le code"
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {variant === "LOGIN" ? "Nouveau ici ?" : variant === "REGISTER" ? "Déjà un compte ?" : "Erreur d'email ?"}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={toggleVariant}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                {variant === "LOGIN" ? "Créer un compte"
                  : variant === "REGISTER" ? "Se connecter"
                    : "Annuler"}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}