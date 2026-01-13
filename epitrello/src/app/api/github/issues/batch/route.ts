import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/app/lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { githubAccessToken: true },
    });

    if (!user || !user.githubAccessToken) {
        return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
    }

    try {
        const { issues } = await req.json(); // Expecting [{ owner, repo, number, id }]

        if (!issues || !Array.isArray(issues)) {
            return NextResponse.json({ error: "Invalid body" }, { status: 400 });
        }

        const statuses: Record<string, string> = {};

        // Use Promise.all to fetch concurrently
        // Note: Production-grade would batch via GraphQL or limit concurrency
        await Promise.all(
            issues.map(async (issue: { owner: string; repo: string; number: number; id: string }) => {
                try {
                    const res = await fetch(`https://api.github.com/repos/${issue.owner}/${issue.repo}/issues/${issue.number}`, {
                        headers: {
                            Authorization: `Bearer ${user.githubAccessToken}`,
                            Accept: "application/vnd.github.v3+json",
                        },
                    });

                    if (res.ok) {
                        const data = await res.json();
                        statuses[issue.id] = data.state; // 'open' or 'closed'
                    } else {
                        // statuses[issue.id] = "unknown";
                    }
                } catch (err) {
                    console.error(`Error fetching issue ${issue.owner}/${issue.repo}#${issue.number}`, err);
                }
            })
        );

        return NextResponse.json({ statuses });

    } catch (error) {
        console.error("Batch Issue Status Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
