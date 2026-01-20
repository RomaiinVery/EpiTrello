'use client';

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Trash2, Loader2, Shield } from "lucide-react";

interface User {
    id: string;
    name: string | null;
    email: string;
    profileImage: string | null;
}

interface Member {
    id: string; // Membership ID
    role: string;
    user: User;
}

interface WorkspaceMembersMenuProps {
    workspaceId: string;
    currentUserRole?: string; // To check if user can manage members
}

export function WorkspaceMembersMenu({ workspaceId, currentUserRole }: WorkspaceMembersMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [owner, setOwner] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchMembers();
        }
    }, [isOpen, workspaceId]);

    const fetchMembers = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/workspaces/${workspaceId}/members`);
            if (!res.ok) throw new Error("Failed to fetch members");
            const data = await res.json();
            setMembers(data.members);
            setOwner(data.owner);
        } catch (err) {
            setError("Impossible de charger les membres.");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestRemove = (membershipId: string) => {
        setConfirmDeleteId(membershipId);
    };

    const handleCancelRemove = () => {
        setConfirmDeleteId(null);
    };

    const handleConfirmRemove = async (membershipId: string) => {
        setRemovingId(membershipId);
        try {
            const res = await fetch(`/api/workspaces/${workspaceId}/members/${membershipId}`, {
                method: "DELETE"
            });

            if (res.ok) {
                setMembers(prev => prev.filter(m => m.id !== membershipId));
            } else {
                alert("Erreur lors de la suppression");
            }
        } catch (e) {
            alert("Erreur réseau");
        } finally {
            setRemovingId(null);
            setConfirmDeleteId(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Users className="h-4 w-4" />
                    Membres
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Membres du Workspace</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                ) : error ? (
                    <div className="text-red-500 text-center py-4 text-sm">{error}</div>
                ) : (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {/* Owner Section */}
                        {owner && (
                            <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-50/50 border border-yellow-100">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border border-blue-200">
                                        {owner.profileImage ? (
                                            <img src={owner.profileImage} alt={owner.name || ""} className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold text-blue-700">{(owner.name || owner.email)[0].toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                            {owner.name || "Utilisateur"}
                                            <Shield className="h-3 w-3 text-yellow-500" fill="currentColor" />
                                        </div>
                                        <div className="text-xs text-gray-500">{owner.email}</div>
                                    </div>
                                </div>
                                <div className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                                    Propriétaire
                                </div>
                            </div>
                        )}

                        <div className="border-t border-gray-100 my-2"></div>

                        {/* Members List */}
                        {members.length === 0 ? (
                            <p className="text-center text-sm text-gray-500 py-2">Aucun autre membre.</p>
                        ) : (
                            members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors min-h-[56px]">
                                    {confirmDeleteId === member.id ? (
                                        <div className="flex items-center justify-between w-full bg-red-50 p-2 -m-2 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                                            <div className="text-sm text-red-700 font-medium">
                                                Retirer ce membre ?
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={handleCancelRemove}
                                                    disabled={removingId === member.id}
                                                    className="h-7 px-2 hover:bg-red-100 text-red-700 hover:text-red-800"
                                                >
                                                    Annuler
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleConfirmRemove(member.id)}
                                                    disabled={removingId === member.id}
                                                    className="h-7 px-2"
                                                >
                                                    {removingId === member.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmer"}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                                    {member.user.profileImage ? (
                                                        <img src={member.user.profileImage} alt={member.user.name || ""} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs font-bold text-gray-600">{(member.user.name || member.user.email)[0].toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{member.user.name || "Utilisateur"}</div>
                                                    <div className="text-xs text-gray-500">{member.user.email}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${member.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                                                    member.role === 'EDITOR' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {member.role === 'VIEWER' ? 'Observateur' :
                                                        member.role === 'EDITOR' ? 'Éditeur' : 'Admin'}
                                                </span>
                                                {/* Only show delete if current user is owner or admin (logic simplified here) */}
                                                {currentUserRole === 'OWNER' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-400 hover:text-red-600"
                                                        onClick={() => handleRequestRemove(member.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
