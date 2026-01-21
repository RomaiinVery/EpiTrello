import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    try {
        const tasks = await prisma.card.findMany({
            where: {
                members: {
                    some: {
                        userId: user.id
                    }
                },
                archived: false,
                isDone: false // We typically want pending tasks only, or maybe we sort done ones last. Let's filter pending for now.
            },
            include: {
                list: {
                    select: {
                        title: true,
                        board: {
                            select: {
                                id: true,
                                title: true,
                                workspace: {
                                    select: {
                                        title: true
                                    }
                                }
                            }
                        }
                    }
                },
                members: {
                    select: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                profileImage: true
                            }
                        }
                    }
                },
                labels: {
                    include: {
                        label: true
                    }
                }
            },
            orderBy: [
                { dueDate: 'asc' }, // Urgent stuff first
                { updatedAt: 'desc' }
            ],
            take: 20 // Limit to 20 detailed tasks
        });

        return NextResponse.json(tasks);
    } catch (error) {
        console.error("Error fetching user tasks:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
