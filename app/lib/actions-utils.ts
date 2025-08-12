import {
  WorkflowFilters,
  JobExtended,
  Annotation,
  LogChunk,
  MatrixGroup,
} from "./actions-types";

// Build query string from filters (sanitizing allowed keys)
export function buildFiltersQuery(filters: WorkflowFilters): string {
  const params = new URLSearchParams();
  const allowed: (keyof WorkflowFilters)[] = [
    "page",
    "per_page",
    "status",
    "event",
    "branch",
    "workflow_id",
    "actor",
    "search",
  ];
  allowed.forEach((key) => {
    const v = filters[key];
    if (v !== undefined && v !== null && v !== "") params.set(key, String(v));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// Format duration ms to human string
export function formatDuration(ms?: number): string {
  if (!ms || ms < 0) return "";
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h) return `${h}h ${m}m ${s}s`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

// Relative time helper
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

// Group matrix jobs by base name (strip matrix params in parentheses or strategy suffix)
export function groupMatrixJobs(jobs: JobExtended[]): MatrixGroup[] {
  const map = new Map<string, JobExtended[]>();
  jobs.forEach((job) => {
    const base = job.name.replace(/\s*\(.+?\)$/, "");
    const arr = map.get(base) || [];
    arr.push(job);
    map.set(base, arr);
  });
  return Array.from(map.entries()).map(([baseName, grouped]) => ({
    baseName,
    jobs: grouped,
  }));
}

// Merge new log chunk onto existing content
export function mergeLogChunk(prev: LogChunk | null, next: LogChunk): LogChunk {
  if (!prev) return next;
  if (next.totalLength <= prev.totalLength) return prev;
  return {
    content: prev.content + next.content,
    totalLength: next.totalLength,
    isComplete: next.isComplete,
  };
}

// Parse annotations from GitHub style lines (::error::message etc.)
export function parseLogAnnotations(raw: string): Annotation[] {
  const lines = raw.split(/\n/);
  const annotations: Annotation[] = [];
  const regex =
    /^::(error|warning|notice)(?:\s+file=(.*?)(?:,line=(\d+))?(?:,endLine=(\d+))?)?::(.*)$/;
  lines.forEach((lineText, idx) => {
    const m = lineText.match(regex);
    if (m) {
      const rawLevel = m[1];
      const annotation_level: Annotation["annotation_level"] =
        rawLevel === "error" ? "failure" : (rawLevel as "warning" | "notice");
      annotations.push({
        annotation_level,
        path: m[2] || undefined,
        start_line: m[3] ? Number(m[3]) : undefined,
        end_line: m[4] ? Number(m[4]) : undefined,
        message: m[5].trim(),
        title: m[5].split(":")[0],
        line: idx,
      });
    }
  });
  return annotations;
}

// Segment steps by detecting step header patterns (placeholder – actual integration later)
export function segmentSteps(
  raw: string
): { name: string; start: number; end: number }[] {
  const lines = raw.split(/\n/);
  const segments: { name: string; start: number; end: number }[] = [];
  let current = null as null | { name: string; start: number };
  const headerRegex = /^##\[group\]\s*(.+)$/;
  lines.forEach((line, idx) => {
    const h = line.match(headerRegex);
    if (h) {
      if (current) {
        segments.push({ name: current.name, start: current.start, end: idx });
      }
      current = { name: h[1], start: idx };
    }
  });
  if (current)
    segments.push({
      name: current.name,
      start: current.start,
      end: lines.length,
    });
  return segments;
}
