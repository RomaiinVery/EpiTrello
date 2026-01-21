
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session?.user as any)?.id;

        if (!userId && !session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: userId ? { id: userId } : { email: session?.user?.email as string },
            select: {
                name: true,
                email: true,
                pendingEmail: true,
                profileImage: true,
                // Add other fields if needed
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("Error fetching profile:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        // Cast to any to access id added in session callback
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session?.user as any)?.id;

        if (!session?.user?.email && !userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { displayName, email } = body;

        if (!displayName || typeof displayName !== "string") {
            return NextResponse.json(
                { error: "Display name is required" },
                { status: 400 }
            );
        }

        // 1. Identify User & Check Existence for Stale Session Handling
        const whereClause = userId ? { id: userId } : { email: session?.user?.email as string };
        const currentUser = await prisma.user.findUnique({ where: whereClause });

        if (!currentUser) {
            // Session is stale (e.g. email changed in DB but session has old email, and no ID in session yet)
            return NextResponse.json(
                { error: "Session invalid or user not found. Please login again." },
                { status: 401 } // 401 will often trigger client to redirect to login
            );
        }

        // Logic for email update
        let verificationNeeded = false;
        // Verify we are changing to a NEW email
        if (email && email !== currentUser.email) {
            // Validate email format
            if (!/^\S+@\S+\.\S+$/.test(email)) {
                return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
            }

            // Check if email is already taken
            const existingUser = await prisma.user.findUnique({
                where: { email },
            });

            if (existingUser) {
                return NextResponse.json({ error: "Email already in use" }, { status: 400 });
            }

            // Generate 6 digit code
            const code = Math.floor(100000 + Math.random() * 900000).toString();

            // Update user with pending email
            await prisma.user.update({
                where: { id: currentUser.id }, // Safe: we found currentUser
                data: {
                    pendingEmail: email,
                    verificationCode: code,
                }
            });

            // Send verification email
            const { sendEmailChangeVerification } = await import("@/app/lib/email");
            await sendEmailChangeVerification(email, code);
            verificationNeeded = true;
        }

        // Update name
        const updatedUser = await prisma.user.update({
            where: { id: currentUser.id }, // Safe
            data: {
                name: displayName,
            },
        });

        return NextResponse.json({
            message: verificationNeeded ? "Verification code sent to new email" : "Profile updated successfully",
            verificationNeeded,
            user: {
                name: updatedUser.name,
                email: updatedUser.email,
            },
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
