interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ClientCache {
  private prefix = "github_ui_cache:";

  // Set item with TTL (time to live in milliseconds)
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    if (typeof window === "undefined") return;

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    try {
      localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn("Failed to save to cache:", error);
    }
  }

  // Get item if not expired
  get<T>(key: string): T | null {
    if (typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem(`${this.prefix}${key}`);
      if (!stored) return null;

      const item: CacheItem<T> = JSON.parse(stored);
      const now = Date.now();

      // Check if expired
      if (now - item.timestamp > item.ttl) {
        this.remove(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn("Failed to read from cache:", error);
      return null;
    }
  }

  // Remove item from cache
  remove(key: string): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(`${this.prefix}${key}`);
    } catch (error) {
      console.warn("Failed to remove from cache:", error);
    }
  }

  // Clear all cache
  clear(): void {
    if (typeof window === "undefined") return;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn("Failed to clear cache:", error);
    }
  }

  // Get cache key for workflow runs
  getWorkflowRunsKey(owner: string, repo: string): string {
    return `workflow_runs:${owner}/${repo}`;
  }

  // Get cache key for job logs
  getJobLogsKey(owner: string, repo: string, jobId: number): string {
    return `job_logs:${owner}/${repo}/${jobId}`;
  }

  // Get cache key for jobs in a run
  getRunJobsKey(owner: string, repo: string, runId: number): string {
    return `run_jobs:${owner}/${repo}/${runId}`;
  }

  // Get cache key for workflow runs with filters signature
  getWorkflowRunsFilteredKey(
    owner: string,
    repo: string,
    signature: string
  ): string {
    return `workflow_runs_filtered:${owner}/${repo}:${signature}`;
  }

  // Get cache key for steps of a job
  getJobStepsKey(owner: string, repo: string, jobId: number): string {
    return `job_steps:${owner}/${repo}/${jobId}`;
  }

  // Get cache key for annotations of a run or job
  getAnnotationsKey(owner: string, repo: string, runId: number): string {
    return `annotations:${owner}/${repo}/${runId}`;
  }
}

export const cache = new ClientCache();

// Cache TTL constants
export const CACHE_TTL = {
  WORKFLOW_RUNS: 2 * 60 * 1000, // 2 minutes
  COMPLETED_JOB_LOGS: 60 * 60 * 1000, // 1 hour (completed logs don't change)
  RUNNING_JOB_LOGS: 30 * 1000, // 30 seconds (running logs change frequently)
  RUN_JOBS: 5 * 60 * 1000, // 5 minutes
  RUN_STEPS: 5 * 60 * 1000, // 5 minutes
  ANNOTATIONS: 2 * 60 * 1000, // 2 minutes
} as const;
