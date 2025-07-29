import { getOctokit } from "@/app/lib/octokit";
import { NextRequest, NextResponse } from "next/server";

interface GitHubContentItem {
  name: string;
  path: string;
  type: "dir" | "file" | "submodule" | "symlink";
  size: number;
  sha: string;
  url: string;
  git_url: string | null;
  html_url: string | null;
  download_url: string | null;
  content?: string;
  _links: {
    self: string;
    git: string | null;
    html: string | null;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await params;
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") || "";
    const ref = searchParams.get("ref") || "main"; // Branch parameter

    const octokit = await getOctokit();

    if (!octokit) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get contents for the specified branch
    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        owner,
        repo,
        path,
        ref,
      }
    );

    // If it's a directory, enhance with commit information
    if (Array.isArray(response.data)) {
      const enhancedContents = await Promise.all(
        response.data.map(async (item: GitHubContentItem) => {
          try {
            // Get the latest commit for each file
            const commits = await octokit.request(
              "GET /repos/{owner}/{repo}/commits",
              {
                owner,
                repo,
                path: item.path,
                sha: ref,
                per_page: 1,
              }
            );

            const latestCommit = commits.data[0];
            return {
              ...item,
              lastCommit: latestCommit
                ? {
                    sha: latestCommit.sha,
                    message: latestCommit.commit.message,
                    author: {
                      name: latestCommit.commit.author?.name,
                      email: latestCommit.commit.author?.email,
                      date: latestCommit.commit.author?.date,
                      avatar_url: latestCommit.author?.avatar_url,
                    },
                    url: latestCommit.html_url,
                  }
                : null,
            };
          } catch {
            // If we can't get commit info, return the item without it
            return item;
          }
        })
      );
      return NextResponse.json(enhancedContents);
    }

    return NextResponse.json(response.data);
  } catch (error: unknown) {
    console.error("Error fetching contents:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    if (errorMessage.includes("404")) {
      return NextResponse.json(
        { error: "File or directory not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch contents" },
      { status: 500 }
    );
  }
}
