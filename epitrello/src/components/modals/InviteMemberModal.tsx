'use client';

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createInvitation } from "@/app/actions/invitations";
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface InviteMemberModalProps {
    workspaceId?: string;
    boardId?: string;
    resourceTitle: string;
}

export function InviteMemberModal({
    workspaceId,
    boardId,
    resourceTitle,
}: InviteMemberModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("VIEWER"); // Default role
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus("idle");
        setErrorMessage("");

        try {
            // Role is cast to any here to satisfy the server action signature which expects the Prisma Enum
            // In a real app we'd share the type or validate strictly.
            const result = await createInvitation({
                email,
                role: role as "VIEWER" | "EDITOR" | "ADMIN", // Simple cast
                workspaceId,
                boardId,
            });

            if (result.error) {
                setStatus("error");
                setErrorMessage(result.error);
            } else {
                setStatus("success");
                setEmail("");
                setTimeout(() => {
                    setIsOpen(false);
                    setStatus("idle");
                }, 2000);
            }
        } catch (error) {
            setStatus("error");
            setErrorMessage("Une erreur inattendue est survenue.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Mail className="h-4 w-4" />
                    Inviter
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Inviter des membres</DialogTitle>
                    <DialogDescription>
                        Envoyez une invitation par email pour rejoindre &quot;{resourceTitle}&quot;.
                    </DialogDescription>
                </DialogHeader>

                {status === "success" ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-medium">Invitation envoyée !</h3>
                            <p className="text-sm text-gray-500">Un email a été envoyé à l&apos;adresse indiquée.</p>
                        </div>
                        <Button variant="secondary" onClick={() => setIsOpen(false)} className="mt-4">
                            Fermer
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleInvite} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                            <Input
                                placeholder="collegue@example.com"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Rôle</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div
                                    onClick={() => setRole("VIEWER")}
                                    className={`cursor-pointer border rounded-lg p-3 text-sm transition-all ${role === "VIEWER"
                                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                                        : "border-gray-200 hover:border-gray-300"
                                        }`}
                                >
                                    <div className="font-medium text-gray-900 mb-1">Observateur</div>
                                    <div className="text-gray-500 text-xs text-pretty">
                                        Lecture seule. Ne peut pas modifier le contenu.
                                    </div>
                                </div>
                                <div
                                    onClick={() => setRole("EDITOR")}
                                    className={`cursor-pointer border rounded-lg p-3 text-sm transition-all ${role === "EDITOR"
                                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                                        : "border-gray-200 hover:border-gray-300"
                                        }`}
                                >
                                    <div className="font-medium text-gray-900 mb-1">Éditeur</div>
                                    <div className="text-gray-500 text-xs text-pretty">
                                        Peut ajouter, modifier et déplacer des cartes.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {status === "error" && (
                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                                <AlertCircle className="h-4 w-4" />
                                {errorMessage}
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Invitation
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
