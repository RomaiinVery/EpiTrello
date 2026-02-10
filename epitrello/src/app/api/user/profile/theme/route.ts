import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userId = (session?.user as any)?.id;

        if (!session?.user?.email && !userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { theme } = body;

        if (!theme || !["light", "dark", "system"].includes(theme)) {
            return NextResponse.json(
                { error: "Invalid theme value" },
                { status: 400 }
            );
        }

        // Identify User
        const whereClause = userId ? { id: userId } : { email: session?.user?.email as string };
        const currentUser = await prisma.user.findUnique({ where: whereClause });

        if (!currentUser) {
            return NextResponse.json(
                { error: "Session invalid or user not found. Please login again." },
                { status: 401 }
            );
        }

        // Update ONLY theme, do NOT touch the name field
        await prisma.user.update({
            where: { id: currentUser.id },
            data: { theme },
        });

        return NextResponse.json({
            message: "Theme updated successfully",
        });
    } catch (error) {
        console.error("Error updating theme:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
