import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/app/lib/session";
import { createOctokit } from "@/app/lib/octokit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Validate token by making a test request
    const octokit = createOctokit(token);
    try {
      await octokit.request("GET /user");
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Store token in session
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    session.token = token;
    await session.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
