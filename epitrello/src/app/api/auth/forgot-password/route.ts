
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { sendPasswordResetEmail } from "@/app/lib/email";
import crypto from "crypto";


export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { error: "Email requis" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Return success even if user not found to prevent email enumeration
            return NextResponse.json(
                { message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." },
                { status: 200 }
            );
        }

        // Generate token
        const resetToken = crypto.randomBytes(32).toString("hex");
        // Token valid for 1 hour
        const tokenExpiry = new Date(Date.now() + 3600000);

        await prisma.user.update({
            where: { email },
            data: {
                resetToken,
                resetTokenExpiry: tokenExpiry,
            },
        });

        // Create reset link
        // Assuming the app URL is determined by the request headers or env var, but for now hardcode/env
        const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const resetLink = `${appUrl}/auth/reset-password?token=${resetToken}`;

        await sendPasswordResetEmail(email, resetLink);

        return NextResponse.json(
            { message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." },
            { status: 200 }
        );

    } catch (error) {
        console.error("Forgot Password Error:", error);
        return NextResponse.json(
            { error: "Une erreur est survenue" },
            { status: 500 }
        );
    }
}
