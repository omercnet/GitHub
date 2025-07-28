import { cache } from "react";
import { getOctokit } from "./octokit";
import { NextRequest, NextResponse } from "next/server";

// Server-side cached data fetchers using React cache
// These functions are memoized per request to avoid duplicate API calls

/**
 * Cached function to fetch workflow runs for a repository
 * Uses React cache to memoize results within a single request
 */
export const getWorkflowRuns = cache(
  async (owner: string, repo: string, perPage: number = 50) => {
    const octokit = await getOctokit();

    if (!octokit) {
      throw new Error("Not authenticated");
    }

    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/actions/runs",
      {
        owner,
        repo,
        per_page: perPage,
        headers: {
          "If-None-Match": "", // Include ETag if available
        },
      }
    );

    return {
      data: response.data,
      headers: {
        etag: response.headers.etag,
        lastModified: response.headers["last-modified"],
      },
    };
  }
);

/**
 * Cached function to fetch repositories
 */
export const getRepositories = cache(
  async (org?: string, isPersonal?: boolean) => {
    const octokit = await getOctokit();

    if (!octokit) {
      throw new Error("Not authenticated");
    }

    let response;

    if (isPersonal) {
      response = await octokit.request("GET /user/repos", {
        affiliation: "owner",
        sort: "updated",
        per_page: 100,
      });
    } else if (org) {
      response = await octokit.request("GET /orgs/{org}/repos", {
        org,
        sort: "updated",
        per_page: 100,
      });
    } else {
      response = await octokit.request("GET /user/repos", {
        sort: "updated",
        per_page: 100,
      });
    }

    return {
      data: response.data,
      headers: {
        etag: response.headers.etag,
        lastModified: response.headers["last-modified"],
      },
    };
  }
);

/**
 * Cached function to fetch organizations
 */
export const getOrganizations = cache(async () => {
  const octokit = await getOctokit();

  if (!octokit) {
    throw new Error("Not authenticated");
  }

  const response = await octokit.request("GET /user/orgs");

  return {
    data: response.data,
    headers: {
      etag: response.headers.etag,
      lastModified: response.headers["last-modified"],
    },
  };
});

/**
 * Cached function to fetch jobs for a workflow run
 */
export const getRunJobs = cache(
  async (owner: string, repo: string, runId: number) => {
    const octokit = await getOctokit();

    if (!octokit) {
      throw new Error("Not authenticated");
    }

    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
      {
        owner,
        repo,
        run_id: runId,
      }
    );

    return {
      data: response.data,
      headers: {
        etag: response.headers.etag,
        lastModified: response.headers["last-modified"],
      },
    };
  }
);

/**
 * Cached function to fetch job logs
 */
export const getJobLogs = cache(
  async (owner: string, repo: string, jobId: number, offset: number = 0) => {
    const octokit = await getOctokit();

    if (!octokit) {
      throw new Error("Not authenticated");
    }

    // For job logs, we need to handle pagination and partial content
    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs",
      {
        owner,
        repo,
        job_id: jobId,
      }
    );

    // Process the logs to handle offset if needed
    const fullLogs = typeof response.data === "string" ? response.data : "";
    const lines = fullLogs.split("\n");
    const content = lines.slice(offset).join("\n");

    return {
      data: {
        content,
        totalLength: lines.length,
        hasMore: false, // GitHub API returns full logs
      },
      headers: {
        etag: response.headers.etag,
        lastModified: response.headers["last-modified"],
      },
    };
  }
);

/**
 * Cached function to fetch branches
 */
export const getBranches = cache(async (owner: string, repo: string) => {
  const octokit = await getOctokit();

  if (!octokit) {
    throw new Error("Not authenticated");
  }

  const response = await octokit.request("GET /repos/{owner}/{repo}/branches", {
    owner,
    repo,
    per_page: 100,
  });

  return {
    data: response.data,
    headers: {
      etag: response.headers.etag,
      lastModified: response.headers["last-modified"],
    },
  };
});

/**
 * Cached function to fetch pull requests
 */
export const getPullRequests = cache(
  async (
    owner: string,
    repo: string,
    state: "open" | "closed" | "all" = "open"
  ) => {
    const octokit = await getOctokit();

    if (!octokit) {
      throw new Error("Not authenticated");
    }

    const response = await octokit.request("GET /repos/{owner}/{repo}/pulls", {
      owner,
      repo,
      state,
      per_page: 50,
      sort: "updated",
      direction: "desc",
    });

    return {
      data: response.data,
      headers: {
        etag: response.headers.etag,
        lastModified: response.headers["last-modified"],
      },
    };
  }
);

/**
 * Utility function to create cached API responses with proper headers
 */
export function createCachedResponse<T>(
  data: T,
  headers: { etag?: string; lastModified?: string },
  cacheControl: string = "public, max-age=300, s-maxage=300, stale-while-revalidate=86400"
): NextResponse<T> {
  const response = NextResponse.json(data);

  // Set cache headers
  response.headers.set("Cache-Control", cacheControl);

  if (headers.etag) {
    response.headers.set("ETag", headers.etag);
  }

  if (headers.lastModified) {
    response.headers.set("Last-Modified", headers.lastModified);
  }

  // Add CORS headers if needed
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, If-None-Match, If-Modified-Since"
  );

  return response;
}

/**
 * Utility function to check if request has conditional headers
 */
export function checkConditionalRequest(
  request: NextRequest,
  etag?: string,
  lastModified?: string
): { notModified: boolean; response?: NextResponse } {
  const ifNoneMatch = request.headers.get("If-None-Match");
  const ifModifiedSince = request.headers.get("If-Modified-Since");

  // Check ETag
  if (ifNoneMatch && etag && ifNoneMatch === etag) {
    return {
      notModified: true,
      response: new NextResponse(null, {
        status: 304,
        headers: {
          "Cache-Control":
            "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
          ETag: etag,
        },
      }),
    };
  }

  // Check Last-Modified
  if (ifModifiedSince && lastModified) {
    const ifModifiedSinceDate = new Date(ifModifiedSince);
    const lastModifiedDate = new Date(lastModified);

    if (ifModifiedSinceDate >= lastModifiedDate) {
      return {
        notModified: true,
        response: new NextResponse(null, {
          status: 304,
          headers: {
            "Cache-Control":
              "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
            "Last-Modified": lastModified,
          },
        }),
      };
    }
  }

  return { notModified: false };
}

/**
 * Cache configurations for different data types
 */
export const SERVER_CACHE_CONFIG = {
  REPOSITORIES:
    "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400", // 5min client, 1hr server
  ORGANIZATIONS:
    "public, max-age=600, s-maxage=14400, stale-while-revalidate=86400", // 10min client, 4hr server
  WORKFLOW_RUNS:
    "public, max-age=120, s-maxage=300, stale-while-revalidate=3600", // 2min client, 5min server
  RUN_JOBS: "public, max-age=60, s-maxage=120, stale-while-revalidate=3600", // 1min client, 2min server
  BRANCHES: "public, max-age=300, s-maxage=900, stale-while-revalidate=86400", // 5min client, 15min server
  PULL_REQUESTS:
    "public, max-age=60, s-maxage=180, stale-while-revalidate=3600", // 1min client, 3min server
  COMPLETED_JOB_LOGS:
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800", // 1hr client, 24hr server
  RUNNING_JOB_LOGS:
    "public, max-age=30, s-maxage=60, stale-while-revalidate=300", // 30s client, 1min server
} as const;
