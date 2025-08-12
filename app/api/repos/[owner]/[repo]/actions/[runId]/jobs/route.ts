import { getOctokit } from "@/app/lib/octokit";
import { NextRequest, NextResponse } from "next/server";
import { JobExtended, Step } from "@/app/lib/actions-types";

interface RawStep {
  number: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at?: string;
  completed_at?: string;
}
interface RawJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at?: string;
  completed_at?: string;
  run_id: number;
  html_url: string;
  steps?: RawStep[];
  runner_name?: string;
  runner_group_id?: number;
  run_attempt?: number;
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ owner: string; repo: string; runId: string }> }
) {
  try {
    const { owner, repo, runId } = await params;
    const octokit = await getOctokit();

    if (!octokit) {
      return NextResponse.json(
        { error: { message: "Not authenticated", status: 401 } },
        { status: 401 }
      );
    }

    const response = await octokit.request(
      "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
      {
        owner,
        repo,
        run_id: parseInt(runId, 10),
        per_page: 100,
      }
    );

    const rawData = response.data as { jobs: RawJob[] };
    const jobs: JobExtended[] = (rawData.jobs || []).map((j: RawJob) => {
      const steps: Step[] | undefined = j.steps?.map((s: RawStep) => ({
        number: s.number,
        name: s.name,
        status: s.status,
        conclusion: s.conclusion,
        started_at: s.started_at || null,
        completed_at: s.completed_at || null,
      }));
      return {
        id: j.id,
        name: j.name,
        status: j.status,
        conclusion: j.conclusion,
        started_at: j.started_at || null,
        completed_at: j.completed_at || null,
        run_id: j.run_id,
        html_url: j.html_url,
        steps,
        runner_name: j.runner_name,
        runner_group_id: j.runner_group_id,
        attempt: j.run_attempt,
      };
    });

    return NextResponse.json({ jobs, total_count: jobs.length });
  } catch (error) {
    console.error("Error fetching workflow jobs:", error);
    const e = error as {
      response?: { data?: { message?: string } };
      status?: number;
    };
    return NextResponse.json(
      {
        error: {
          message: e.response?.data?.message || "Failed to fetch workflow jobs",
          status: e.status || 500,
        },
      },
      { status: e.status || 500 }
    );
  }
}
