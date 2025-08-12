import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/app/lib/session";
import { createOctokit } from "@/app/lib/octokit";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Validate that the stored token is still valid
    const octokit = createOctokit(session.token);
    try {
      const { data: user } = await octokit.request("GET /user");
      return NextResponse.json({
        authenticated: true,
        user: {
          login: user.login,
          name: user.name,
          avatar_url: user.avatar_url,
        },
      });
    } catch {
      // Token is invalid, clear the session
      session.destroy();
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    session.destroy();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
