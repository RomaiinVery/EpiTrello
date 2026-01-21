
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session?.user as any)?.id;

        if (!userId && !session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { code } = await req.json();

        if (!code) {
            return NextResponse.json({ error: "Code required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: userId ? { id: userId } : { email: session?.user?.email as string },
        });

        if (!user || !user.pendingEmail || !user.verificationCode) {
            return NextResponse.json({ error: "No pending email change found" }, { status: 400 });
        }

        if (user.verificationCode !== code) {
            return NextResponse.json({ error: "Invalid code" }, { status: 400 });
        }

        // Apply change
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                email: user.pendingEmail,
                pendingEmail: null,
                verificationCode: null,
                emailVerified: new Date(),
            },
        });

        return NextResponse.json({
            message: "Email updated successfully",
            user: {
                email: updatedUser.email,
            }
        });

    } catch (error) {
        console.error("Error verifying email change:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
