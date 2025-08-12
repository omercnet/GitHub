import { getOctokit } from "@/app/lib/octokit";
import { NextRequest, NextResponse } from "next/server";
import { WorkflowRunExtended } from "@/app/lib/actions-types";

interface RawWorkflowRun {
  id: number;
  name?: string;
  display_title?: string;
  run_number: number;
  run_attempt?: number;
  status: string;
  conclusion: string | null;
  event: string;
  head_branch: string;
  head_sha: string;
  created_at: string;
  run_started_at?: string;
  updated_at: string;
  completed_at?: string;
  actor?: { login: string; avatar_url: string; html_url?: string };
  workflow_id?: number;
  html_url: string;
}

interface RunsResponse {
  workflow_runs: RawWorkflowRun[];
}

type WorkflowRunStatus =
  | "failure"
  | "in_progress"
  | "queued"
  | "completed"
  | "waiting"
  | "requested"
  | "pending"
  | "action_required"
  | "cancelled"
  | "neutral"
  | "skipped"
  | "stale"
  | "success"
  | "timed_out";

function sanitizeParams(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get("page") || "1", 10);
  const per_page = Math.min(
    parseInt(searchParams.get("per_page") || "20", 10),
    100
  );
  const statusParam = searchParams.get("status");
  const validStatuses: WorkflowRunStatus[] = [
    "failure",
    "in_progress",
    "queued",
    "completed",
    "waiting",
    "requested",
    "pending",
    "action_required",
    "cancelled",
    "neutral",
    "skipped",
    "stale",
    "success",
    "timed_out",
  ];
  const status =
    statusParam && validStatuses.includes(statusParam as WorkflowRunStatus)
      ? (statusParam as WorkflowRunStatus)
      : undefined;
  const event = searchParams.get("event") || undefined;
  const branch = searchParams.get("branch") || undefined;
  const workflow_id = searchParams.get("workflow_id") || undefined;
  const actor = searchParams.get("actor") || undefined;
  const search = searchParams.get("search") || undefined;
  return { page, per_page, status, event, branch, workflow_id, actor, search };
}

function buildGitHubParams(
  owner: string,
  repo: string,
  p: ReturnType<typeof sanitizeParams>
) {
  const gh: Record<string, string | number> = {
    owner,
    repo,
    page: p.page,
    per_page: p.per_page,
  };
  if (p.status) gh.status = p.status;
  if (p.event) gh.event = p.event;
  if (p.branch) gh.branch = p.branch;
  if (p.actor) gh.actor = p.actor;
  return gh;
}

function mapRuns(runs: RawWorkflowRun[]): WorkflowRunExtended[] {
  return runs.map((r) => {
    const start = r.run_started_at || r.created_at;
    const end = r.updated_at || r.completed_at || r.created_at;
    const duration_ms =
      start && end
        ? Math.max(0, new Date(end).getTime() - new Date(start).getTime())
        : undefined;
    return {
      id: r.id,
      name: r.name || r.display_title || "workflow",
      run_number: r.run_number,
      run_attempt: r.run_attempt,
      status: r.status,
      conclusion: r.conclusion,
      event: r.event,
      head_branch: r.head_branch,
      head_sha: r.head_sha,
      created_at: r.created_at,
      run_started_at: r.run_started_at,
      updated_at: r.updated_at,
      duration_ms,
      actor: r.actor
        ? {
            login: r.actor.login,
            avatar_url: r.actor.avatar_url,
            html_url: r.actor.html_url,
          }
        : undefined,
      workflow_id: r.workflow_id,
      html_url: r.html_url,
    };
  });
}

function filterRuns(
  runs: RawWorkflowRun[],
  workflow_id?: string,
  search?: string
) {
  let filtered = runs;
  if (workflow_id) {
    const wid = Number(workflow_id);
    filtered = filtered.filter((r) => r.workflow_id === wid);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        (r.name && r.name.toLowerCase().includes(q)) ||
        (r.display_title && r.display_title.toLowerCase().includes(q)) ||
        (r.head_branch && r.head_branch.toLowerCase().includes(q)) ||
        (r.head_sha && r.head_sha.toLowerCase().includes(q))
    );
  }
  return filtered;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await params;
    const octokit = await getOctokit();
    if (!octokit) {
      return NextResponse.json(
        { error: { message: "Not authenticated", status: 401 } },
        { status: 401 }
      );
    }

    const parsed = sanitizeParams(new URL(request.url).searchParams);
    const ghParams = buildGitHubParams(owner, repo, parsed);

    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/actions/runs",
      ghParams as {
        owner: string;
        repo: string;
        page: number;
        per_page: number;
        status?: WorkflowRunStatus;
        event?: string;
        branch?: string;
        actor?: string;
      }
    );

    const data = response.data as RunsResponse;
    const initialRuns = data.workflow_runs || [];
    const filtered = filterRuns(initialRuns, parsed.workflow_id, parsed.search);
    const mapped = mapRuns(filtered);
    const hasNextPage = initialRuns.length === parsed.per_page; // heuristic

    return NextResponse.json({
      runs: mapped,
      workflow_runs: mapped,
      page: parsed.page,
      per_page: parsed.per_page,
      hasNextPage,
      count: mapped.length,
    });
  } catch (err) {
    const e = err as {
      response?: { data?: { message?: string } };
      status?: number;
    };
    const message =
      e.response?.data?.message || "Failed to fetch workflow runs";
    const status = e.status || 500;
    return NextResponse.json({ error: { message, status } }, { status });
  }
}
