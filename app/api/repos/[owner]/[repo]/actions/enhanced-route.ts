import { NextRequest, NextResponse } from "next/server";
import {
  getWorkflowRuns,
  createCachedResponse,
  checkConditionalRequest,
  SERVER_CACHE_CONFIG,
} from "@/app/lib/server-cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await params;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const perPage = parseInt(searchParams.get("per_page") || "50", 10);

    // Fetch data using cached function
    const result = await getWorkflowRuns(owner, repo, perPage);

    // Check if client has up-to-date cached version
    const conditionalCheck = checkConditionalRequest(
      request,
      result.headers.etag,
      result.headers.lastModified
    );

    if (conditionalCheck.notModified && conditionalCheck.response) {
      return conditionalCheck.response;
    }

    // Return fresh data with cache headers
    return createCachedResponse(
      result.data,
      result.headers,
      SERVER_CACHE_CONFIG.WORKFLOW_RUNS
    );
  } catch (error) {
    console.error("Error fetching workflow runs:", error);

    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch workflow runs" },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler for CORS preflight
export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, If-None-Match, If-Modified-Since",
    },
  });
}
