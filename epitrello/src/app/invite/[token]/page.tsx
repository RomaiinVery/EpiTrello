import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { acceptInvitation } from "@/app/actions/invitations";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertCircle, CheckCircle } from "lucide-react";

export default async function InvitationPage({
    params,
}: {
    params: { token: string };
}) {
    const session = await getServerSession(authOptions);

    // If not logged in, redirect to login but keep callback URL to return here
    if (!session?.user) {
        // Construct the full URL to this page
        // In dev we assume localhost, but need a robust way or just relative
        // signIn callbackUrl handles relative paths usually
        const callbackUrl = `/invite/${params.token}`;
        redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }

    // Attempt to accept the invitation immediately upon load
    // Alternatively we could show a "Click to Accept" button, but auto-accept is smoother if already logged in.
    const result = await acceptInvitation(params.token);

    if (result.success && result.redirectUrl) {
        redirect(result.redirectUrl);
    }

    return (
        <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg text-center">
                {result.error ? (
                    <div className="flex flex-col items-center space-y-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                            <AlertCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Impossible d&apos;accepter l&apos;invitation
                        </h2>
                        <p className="text-gray-600">{result.error}</p>
                        <div className="pt-4">
                            <Link href="/workspaces">
                                <Button variant="outline">Retour aux workspaces</Button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    // This state might be unreachable due to redirect above, but fallback just in case
                    <div className="flex flex-col items-center space-y-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Invitation acceptée !
                        </h2>
                        <p className="text-gray-600">Redirection en cours...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
