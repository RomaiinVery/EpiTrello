import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/app/lib/prisma";
import { authOptions } from "../../[...nextauth]/route";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/settings?error=github_auth_failed", request.url));
  }

  if (!code) {
    return NextResponse.json({ error: "Code manquant" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Vous devez être connecté" }, { status: 401 });
  }

  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    console.error("GitHub credentials missing in .env");
    return NextResponse.redirect(new URL("/settings?error=server_error", request.url));
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error("Error exchanging GitHub token:", tokenData);
      return NextResponse.redirect(new URL("/settings?error=github_token_error", request.url));
    }

    const accessToken = tokenData.access_token;

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      console.error("Error fetching GitHub user:", await userResponse.text());
      return NextResponse.redirect(new URL("/settings?error=github_fetch_error", request.url));
    }

    const githubUser = await userResponse.json();

    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        githubId: githubUser.id.toString(),
        githubAccessToken: accessToken,
        githubUsername: githubUser.login,
        githubAvatarUrl: githubUser.avatar_url,
      },
    });

    return NextResponse.redirect(new URL("/settings?success=github_linked", request.url));

  } catch (error) {
    console.error("GitHub linking error:", error);
    return NextResponse.redirect(new URL("/settings?error=server_error", request.url));
  }
}