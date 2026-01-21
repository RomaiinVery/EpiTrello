
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        console.log("API /api/user/profile hit. Session:", session?.user?.email);

        if (!session?.user?.email) {
            console.log("Unauthorized: No session email");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        console.log("Request body:", body);
        const { displayName } = body;

        if (!displayName || typeof displayName !== "string") {
            console.log("Invalid display name:", displayName);
            return NextResponse.json(
                { error: "Display name is required" },
                { status: 400 }
            );
        }

        // Update user in database
        const updatedUser = await prisma.user.update({
            where: {
                email: session.user.email,
            },
            data: {
                name: displayName,
            },
        });
        console.log("User updated successfully:", updatedUser);

        return NextResponse.json({
            message: "Profile updated successfully",
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
