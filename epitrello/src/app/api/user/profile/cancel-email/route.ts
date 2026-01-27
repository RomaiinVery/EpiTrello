
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session?.user as any)?.id;

        if (!userId && !session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const whereClause = userId ? { id: userId } : { email: session?.user?.email as string };

        await prisma.user.update({
            where: whereClause,
            data: {
                pendingEmail: null,
                verificationCode: null,
            },
        });

        return NextResponse.json({ message: "Verification cancelled" });
    } catch (error) {
        console.error("Error cancelling email verification:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
