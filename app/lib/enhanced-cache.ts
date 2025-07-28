// Enhanced caching utilities for better client-server coordination
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
  lastModified?: string;
}

interface CacheConfig {
  clientTTL: number;
  serverTTL: number;
  tags?: string[];
  revalidateOnFocus?: boolean;
  background?: boolean;
}

class EnhancedClientCache {
  private prefix = "github_ui_cache:";

  // Enhanced set with ETags and cache coordination
  set<T>(
    key: string,
    data: T,
    config: CacheConfig,
    headers?: { etag?: string; lastModified?: string }
  ): void {
    if (typeof window === "undefined") return;

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: config.clientTTL,
      etag: headers?.etag,
      lastModified: headers?.lastModified,
    };

    try {
      localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(item));

      // Store cache metadata for server coordination
      if (config.tags) {
        this.setTags(key, config.tags);
      }
    } catch (error) {
      console.warn("Failed to save to cache:", error);
    }
  }

  // Enhanced get with conditional requests support
  get<T>(key: string): { data: T; stale: boolean; etag?: string } | null {
    if (typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem(`${this.prefix}${key}`);
      if (!stored) return null;

      const item: CacheItem<T> = JSON.parse(stored);
      const now = Date.now();
      const age = now - item.timestamp;
      const isStale = age > item.ttl;

      // Return data even if stale (stale-while-revalidate pattern)
      return {
        data: item.data,
        stale: isStale,
        etag: item.etag,
      };
    } catch (error) {
      console.warn("Failed to read from cache:", error);
      return null;
    }
  }

  // Tag-based invalidation
  private setTags(key: string, tags: string[]): void {
    tags.forEach((tag) => {
      const tagKey = `${this.prefix}tag:${tag}`;
      const existingKeys = JSON.parse(localStorage.getItem(tagKey) || "[]");
      if (!existingKeys.includes(key)) {
        existingKeys.push(key);
        localStorage.setItem(tagKey, JSON.stringify(existingKeys));
      }
    });
  }

  // Invalidate by tag
  invalidateTag(tag: string): void {
    if (typeof window === "undefined") return;

    const tagKey = `${this.prefix}tag:${tag}`;
    const keys = JSON.parse(localStorage.getItem(tagKey) || "[]");

    keys.forEach((key: string) => {
      this.remove(key);
    });

    localStorage.removeItem(tagKey);
  }

  // Check if cache needs revalidation
  shouldRevalidate(key: string): boolean {
    const cached = this.get(key);
    return !cached || cached.stale;
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

  // Generate cache keys with consistent format
  getWorkflowRunsKey(owner: string, repo: string): string {
    return `workflow_runs:${owner}/${repo}`;
  }

  getJobLogsKey(owner: string, repo: string, jobId: number): string {
    return `job_logs:${owner}/${repo}/${jobId}`;
  }

  getRunJobsKey(owner: string, repo: string, runId: number): string {
    return `run_jobs:${owner}/${repo}/${runId}`;
  }

  getRepositoriesKey(org?: string, isPersonal?: boolean): string {
    if (isPersonal) return "repos:personal";
    if (org) return `repos:org:${org}`;
    return "repos:all";
  }

  getOrganizationsKey(): string {
    return "organizations";
  }
}

export const enhancedCache = new EnhancedClientCache();

// Enhanced cache TTL constants with different strategies
export const ENHANCED_CACHE_TTL = {
  // Long-term cache for static data
  REPOSITORIES: {
    clientTTL: 5 * 60 * 1000, // 5 minutes
    serverTTL: 60 * 60, // 1 hour
    tags: ["repositories"],
    revalidateOnFocus: true,
    background: false,
  },

  ORGANIZATIONS: {
    clientTTL: 10 * 60 * 1000, // 10 minutes
    serverTTL: 4 * 60 * 60, // 4 hours
    tags: ["organizations"],
    revalidateOnFocus: false,
    background: false,
  },

  // Medium-term cache for semi-dynamic data
  WORKFLOW_RUNS: {
    clientTTL: 2 * 60 * 1000, // 2 minutes
    serverTTL: 5 * 60, // 5 minutes
    tags: ["workflow-runs"],
    revalidateOnFocus: true,
    background: true,
  },

  BRANCHES: {
    clientTTL: 5 * 60 * 1000, // 5 minutes
    serverTTL: 15 * 60, // 15 minutes
    tags: ["branches"],
    revalidateOnFocus: false,
    background: false,
  },

  PULL_REQUESTS: {
    clientTTL: 1 * 60 * 1000, // 1 minute
    serverTTL: 3 * 60, // 3 minutes
    tags: ["pull-requests"],
    revalidateOnFocus: true,
    background: true,
  },

  // Short-term cache for dynamic data
  RUN_JOBS: {
    clientTTL: 1 * 60 * 1000, // 1 minute
    serverTTL: 2 * 60, // 2 minutes
    tags: ["run-jobs"],
    revalidateOnFocus: true,
    background: true,
  },

  // Job logs with status-based caching
  COMPLETED_JOB_LOGS: {
    clientTTL: 60 * 60 * 1000, // 1 hour (completed logs don't change)
    serverTTL: 24 * 60 * 60, // 24 hours
    tags: ["job-logs"],
    revalidateOnFocus: false,
    background: false,
  },

  RUNNING_JOB_LOGS: {
    clientTTL: 30 * 1000, // 30 seconds (running logs change frequently)
    serverTTL: 60, // 1 minute
    tags: ["job-logs"],
    revalidateOnFocus: true,
    background: true,
  },

  // Real-time data
  REAL_TIME_STATUS: {
    clientTTL: 10 * 1000, // 10 seconds
    serverTTL: 30, // 30 seconds
    tags: ["status"],
    revalidateOnFocus: true,
    background: true,
  },
} satisfies Record<string, CacheConfig>;

export const CACHE_TTL = {
  WORKFLOW_RUNS: 2 * 60 * 1000,
  COMPLETED_JOB_LOGS: 60 * 60 * 1000,
  RUNNING_JOB_LOGS: 30 * 1000,
  RUN_JOBS: 1 * 60 * 1000, // Add missing RUN_JOBS constant
};
