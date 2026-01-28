import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q");

        if (!query || query.length < 2) {
            return NextResponse.json([]);
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Search for cards where the user is a member of the board directly OR via workspace
        // And where title or content matches query
        const cards = await prisma.card.findMany({
            take: 10,
            where: {
                OR: [
                    { title: { contains: query, mode: "insensitive" } },
                    { content: { contains: query, mode: "insensitive" } },
                    // Could enable label search here if needed
                ],
                list: {
                    board: {
                        OR: [
                            { userId: user.id }, // Owner
                            { members: { some: { userId: user.id } } }, // Board Member
                            { workspace: { members: { some: { userId: user.id } } } }, // Workspace Member
                        ],
                    },
                },
            },
            select: {
                id: true,
                title: true,
                list: {
                    select: {
                        id: true,
                        title: true,
                        board: {
                            select: {
                                id: true,
                                title: true,
                                workspaceId: true,
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json(cards);
    } catch (error) {
        console.error("[SEARCH_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
