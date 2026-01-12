import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/app/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { githubAccessToken: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!user || !(user as any).githubAccessToken) {
        return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
    }

    try {
        const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
            headers: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Authorization: `Bearer ${(user as any).githubAccessToken}`,
                Accept: "application/vnd.github.v3+json",
            },
        });

        if (!res.ok) {
            throw new Error("Failed to fetch repositories from GitHub");
        }

        const repos = await res.json();

        // Map to simple structure
        const simpleRepos = repos.map((repo: { id: number; name: string; full_name: string; private: boolean }) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            private: repo.private,
        }));

        return NextResponse.json(simpleRepos);
    } catch (error) {
        console.error("GitHub Repos Fetch Error:", error);
        return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
    }
}
