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

    if (tokenData.error) {
      console.error("Erreur GitHub Token:", tokenData.error);
      return NextResponse.redirect(new URL("/settings?error=github_token_error", request.url));
    }

    const accessToken = tokenData.access_token;

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

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

    // 6. Succès : Redirection vers les settings
    return NextResponse.redirect(new URL("/settings?success=github_linked", request.url));

  } catch (error) {
    console.error("Erreur liaison GitHub:", error);
    return NextResponse.redirect(new URL("/settings?error=server_error", request.url));
  }
}