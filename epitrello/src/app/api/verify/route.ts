import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, code } = body;

        if (!email || !code) {
            return NextResponse.json(
                { error: "Email and code are required" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        if (user.verificationCode !== code) {
            return NextResponse.json(
                { error: "Invalid verification code" },
                { status: 400 }
            );
        }

        // Update user: clear code and set verified date
        await prisma.user.update({
            where: { email },
            data: {
                verificationCode: null,
                emailVerified: new Date(),
            },
        });

        return NextResponse.json(
            { message: "Email verified successfully" },
            { status: 200 }
        );

    } catch (error) {
        console.error("Verification Error:", error);
        return NextResponse.json(
            { error: "Error verifying email" },
            { status: 500 }
        );
    }
}
