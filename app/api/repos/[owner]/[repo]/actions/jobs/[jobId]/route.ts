import { getOctokit } from "@/app/lib/octokit";
import { NextRequest, NextResponse } from "next/server";
import type { Octokit } from "@octokit/core";

interface LogsError {
  status?: number;
  response?: { data?: { message?: string } };
}

interface JobData {
  status: string;
  conclusion: string | null;
  steps?: Array<{
    name: string;
    status: string;
    conclusion: string | null;
    number: number;
    started_at?: string | null;
    completed_at?: string | null;
  }>;
  started_at: string | null;
  completed_at: string | null;
}

async function fetchJobLogs(
  octokit: Octokit,
  owner: string,
  repo: string,
  jobId: number,
  offset: number
) {
  const response = await octokit.request(
    "GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs",
    {
      owner,
      repo,
      job_id: jobId,
    }
  );

  const logsResponse = await fetch(response.url);
  const logsText = await logsResponse.text();

  return {
    content: logsText.slice(offset),
    totalLength: logsText.length,
  };
}

async function handleCompletedJob(
  octokit: Octokit,
  owner: string,
  repo: string,
  jobId: number,
  offset: number,
  job: JobData
) {
  try {
    const { content, totalLength } = await fetchJobLogs(
      octokit,
      owner,
      repo,
      jobId,
      offset
    );

    return NextResponse.json({
      content,
      totalLength,
      isComplete: true,
      jobStatus: job.status,
      jobConclusion: job.conclusion,
    });
  } catch (logsError: unknown) {
    const error = logsError as LogsError;
    // If logs aren't available yet for a completed job, return empty content
    if (error?.status === 404) {
      return NextResponse.json({
        content: "",
        totalLength: 0,
        isComplete: true,
        jobStatus: job.status,
        jobConclusion: job.conclusion,
        error: "Logs not available yet",
      });
    }
    throw logsError;
  }
}

async function handleRunningJob(
  octokit: Octokit,
  owner: string,
  repo: string,
  jobId: number,
  offset: number,
  job: JobData
) {
  try {
    const { content, totalLength } = await fetchJobLogs(
      octokit,
      owner,
      repo,
      jobId,
      offset
    );

    return NextResponse.json({
      content,
      totalLength,
      isComplete: false,
      jobStatus: job.status,
      jobConclusion: job.conclusion,
      jobSteps: job.steps,
      startedAt: job.started_at,
      completedAt: job.completed_at,
    });
  } catch (logsError: unknown) {
    const error = logsError as LogsError;
    // Logs not available yet for running job - this is normal
    if (error?.status === 404) {
      return NextResponse.json({
        content: "",
        totalLength: 0,
        isComplete: false,
        jobStatus: job.status,
        jobConclusion: job.conclusion,
        jobSteps: job.steps,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        message: `Job is ${job.status}. Logs will be available once the job starts running.`,
      });
    }
    throw logsError;
  }
}

export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ owner: string; repo: string; jobId: string }> }
) {
  try {
    const { owner, repo, jobId } = await params;
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get("offset") || "0");

    const octokit = await getOctokit();

    if (!octokit) {
      return NextResponse.json(
        { error: { message: "Not authenticated", status: 401 } },
        { status: 401 }
      );
    }

    // First, get the job status to determine if it's running or completed
    const jobResponse = await octokit.request(
      "GET /repos/{owner}/{repo}/actions/jobs/{job_id}",
      {
        owner,
        repo,
        job_id: parseInt(jobId, 10),
      }
    );

    const job = jobResponse.data;
    const isRunning = job.status === "in_progress" || job.status === "queued";
    const isComplete = job.status === "completed";

    // For completed jobs, we can get the full logs
    if (isComplete) {
      return await handleCompletedJob(
        octokit,
        owner,
        repo,
        parseInt(jobId, 10),
        offset,
        job
      );
    }

    // For running or queued jobs, logs may not be available yet
    if (isRunning) {
      return await handleRunningJob(
        octokit,
        owner,
        repo,
        parseInt(jobId, 10),
        offset,
        job
      );
    }

    // For other statuses, return job info
    return NextResponse.json({
      content: "",
      totalLength: 0,
      isComplete: false,
      jobStatus: job.status,
      jobConclusion: job.conclusion,
      jobSteps: job.steps,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      message: `Job status: ${job.status}`,
    });
  } catch (error) {
    console.error("Error fetching job logs:", error);
    const e = error as {
      response?: { data?: { message?: string } };
      status?: number;
    };

    // Handle 404 specifically for missing logs
    if (e.status === 404) {
      return NextResponse.json(
        {
          error: {
            message: "Job logs not found or not available yet",
            status: 404,
            type: "logs_not_found",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          message: e.response?.data?.message || "Failed to fetch job logs",
          status: e.status || 500,
        },
      },
      { status: e.status || 500 }
    );
  }
}
