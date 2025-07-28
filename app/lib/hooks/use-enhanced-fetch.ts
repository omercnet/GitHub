import { useState, useEffect, useCallback, useRef } from "react";
import { enhancedCache, ENHANCED_CACHE_TTL } from "@/app/lib/enhanced-cache";

interface FetchOptions {
  cacheKey: string;
  cacheConfig: (typeof ENHANCED_CACHE_TTL)[keyof typeof ENHANCED_CACHE_TTL];
  forceRefresh?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastFetched: number | null;
  stale: boolean;
}

/**
 * Enhanced data fetching hook with intelligent caching
 * Implements stale-while-revalidate pattern and background updates
 */
export function useEnhancedFetch<T>(
  url: string,
  options: FetchOptions
): FetchState<T> & {
  refetch: (force?: boolean) => Promise<void>;
  invalidate: () => void;
} {
  const {
    cacheKey,
    cacheConfig,
    forceRefresh = false,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
    lastFetched: null,
    stale: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const backgroundFetchRef = useRef<Promise<void> | null>(null);

  const fetchData = useCallback(
    async (force: boolean = false, background: boolean = false) => {
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        // Check cache first if not forcing refresh
        if (!force) {
          const cached = enhancedCache.get<T>(cacheKey);
          if (cached && !cached.stale) {
            setState((prev) => ({
              ...prev,
              data: cached.data,
              loading: false,
              error: null,
              stale: false,
              lastFetched: Date.now(),
            }));
            return;
          }

          // If we have stale data, use it while fetching fresh data in background
          if (cached && cached.stale && !background) {
            setState((prev) => ({
              ...prev,
              data: cached.data,
              loading: false,
              stale: true,
              lastFetched: Date.now(),
            }));

            // Start background fetch
            if (cacheConfig.background && !backgroundFetchRef.current) {
              backgroundFetchRef.current = fetchData(true, true);
            }
            return;
          }
        }

        if (!background) {
          setState((prev) => ({ ...prev, loading: true, error: null }));
        }

        // Prepare headers for conditional requests
        const headers: HeadersInit = {
          "Content-Type": "application/json",
        };

        const cached = enhancedCache.get<T>(cacheKey);
        if (cached?.etag) {
          headers["If-None-Match"] = cached.etag;
        }

        const response = await fetch(url, {
          signal: abortControllerRef.current.signal,
          headers,
        });

        // Handle 304 Not Modified
        if (response.status === 304 && cached) {
          setState((prev) => ({
            ...prev,
            data: cached.data,
            loading: false,
            error: null,
            stale: false,
            lastFetched: Date.now(),
          }));

          // Update cache timestamp to reset TTL
          enhancedCache.set(cacheKey, cached.data, cacheConfig, {
            etag: cached.etag,
          });
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const etag = response.headers.get("etag");
        const lastModified = response.headers.get("last-modified");

        // Cache the new data
        enhancedCache.set(cacheKey, data, cacheConfig, {
          etag: etag || undefined,
          lastModified: lastModified || undefined,
        });

        setState((prev) => ({
          ...prev,
          data,
          loading: false,
          error: null,
          stale: false,
          lastFetched: Date.now(),
        }));

        onSuccess?.(data);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return; // Request was cancelled
        }

        const errorObj =
          error instanceof Error ? error : new Error("Unknown error");

        // If we have cached data, keep showing it even on error
        const cached = enhancedCache.get<T>(cacheKey);
        if (cached && !background) {
          setState((prev) => ({
            ...prev,
            data: cached.data,
            loading: false,
            error: errorObj,
            stale: true,
            lastFetched: Date.now(),
          }));
        } else {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: errorObj,
            lastFetched: Date.now(),
          }));
        }

        onError?.(errorObj);
      } finally {
        backgroundFetchRef.current = null;
      }
    },
    [url, cacheKey, cacheConfig, onSuccess, onError]
  );

  const refetch = useCallback(
    async (force: boolean = false) => {
      await fetchData(force);
    },
    [fetchData]
  );

  const invalidate = useCallback(() => {
    enhancedCache.remove(cacheKey);
    if (cacheConfig.tags) {
      cacheConfig.tags.forEach((tag) => {
        enhancedCache.invalidateTag(tag);
      });
    }
  }, [cacheKey, cacheConfig.tags]);

  // Initial fetch
  useEffect(() => {
    fetchData(forceRefresh);
  }, [fetchData, forceRefresh]);

  // Setup focus revalidation
  useEffect(() => {
    if (!cacheConfig.revalidateOnFocus) return;

    const handleFocus = () => {
      if (enhancedCache.shouldRevalidate(cacheKey)) {
        fetchData(false, true); // Background fetch on focus
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchData, cacheKey, cacheConfig.revalidateOnFocus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    refetch,
    invalidate,
  };
}

/**
 * Hook for fetching workflow runs with optimized caching
 */
export function useWorkflowRuns(
  owner: string,
  repo: string,
  forceRefresh?: boolean
) {
  const cacheKey = enhancedCache.getWorkflowRunsKey(owner, repo);

  return useEnhancedFetch(`/api/repos/${owner}/${repo}/actions`, {
    cacheKey,
    cacheConfig: ENHANCED_CACHE_TTL.WORKFLOW_RUNS,
    forceRefresh,
  });
}

/**
 * Hook for fetching repositories with optimized caching
 */
export function useRepositories(
  org?: string,
  isPersonal?: boolean,
  forceRefresh?: boolean
) {
  const cacheKey = enhancedCache.getRepositoriesKey(org, isPersonal);
  const params = new URLSearchParams();

  if (org) params.set("org", org);
  if (isPersonal) params.set("isPersonal", "true");

  const url = `/api/repos${params.toString() ? `?${params.toString()}` : ""}`;

  return useEnhancedFetch(url, {
    cacheKey,
    cacheConfig: ENHANCED_CACHE_TTL.REPOSITORIES,
    forceRefresh,
  });
}

/**
 * Hook for fetching organizations with optimized caching
 */
export function useOrganizations(forceRefresh?: boolean) {
  const cacheKey = enhancedCache.getOrganizationsKey();

  return useEnhancedFetch("/api/orgs", {
    cacheKey,
    cacheConfig: ENHANCED_CACHE_TTL.ORGANIZATIONS,
    forceRefresh,
  });
}

/**
 * Hook for fetching run jobs with optimized caching
 */
export function useRunJobs(
  owner: string,
  repo: string,
  runId: number,
  forceRefresh?: boolean
) {
  const cacheKey = enhancedCache.getRunJobsKey(owner, repo, runId);

  return useEnhancedFetch(`/api/repos/${owner}/${repo}/actions/${runId}/jobs`, {
    cacheKey,
    cacheConfig: ENHANCED_CACHE_TTL.RUN_JOBS,
    forceRefresh,
  });
}

/**
 * Hook for fetching job logs with status-aware caching
 */
export function useJobLogs(
  owner: string,
  repo: string,
  jobId: number,
  jobStatus: string,
  offset: number = 0,
  forceRefresh?: boolean
) {
  const cacheKey = enhancedCache.getJobLogsKey(owner, repo, jobId);
  const isCompleted = jobStatus === "completed";
  const cacheConfig = isCompleted
    ? ENHANCED_CACHE_TTL.COMPLETED_JOB_LOGS
    : ENHANCED_CACHE_TTL.RUNNING_JOB_LOGS;

  return useEnhancedFetch(
    `/api/repos/${owner}/${repo}/actions/jobs/${jobId}?offset=${offset}`,
    {
      cacheKey,
      cacheConfig,
      forceRefresh,
    }
  );
}

/**
 * Hook for fetching branches with optimized caching
 */
export function useBranches(
  owner: string,
  repo: string,
  forceRefresh?: boolean
) {
  const cacheKey = `branches:${owner}/${repo}`;

  return useEnhancedFetch(`/api/repos/${owner}/${repo}/branches`, {
    cacheKey,
    cacheConfig: ENHANCED_CACHE_TTL.BRANCHES,
    forceRefresh,
  });
}

/**
 * Hook for fetching pull requests with optimized caching
 */
export function usePullRequests(
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open",
  forceRefresh?: boolean
) {
  const cacheKey = `pull_requests:${owner}/${repo}:${state}`;

  return useEnhancedFetch(`/api/repos/${owner}/${repo}/pulls?state=${state}`, {
    cacheKey,
    cacheConfig: ENHANCED_CACHE_TTL.PULL_REQUESTS,
    forceRefresh,
  });
}
