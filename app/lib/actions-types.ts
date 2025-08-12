// Action domain types
export interface WorkflowActor {
  login: string;
  avatar_url: string;
  html_url?: string;
}

export interface WorkflowRunExtended {
  id: number;
  name: string;
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
  duration_ms?: number;
  actor?: WorkflowActor;
  workflow_id?: number;
  html_url: string;
}

export interface WorkflowFilters {
  page?: number;
  per_page?: number;
  status?: string;
  event?: string;
  branch?: string;
  workflow_id?: number;
  actor?: string;
  search?: string;
}

export interface JobExtended {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  run_id: number;
  html_url: string;
  steps?: Step[];
  runner_name?: string;
  runner_group_id?: number;
  attempt?: number;
  matrix?: Record<string, string | number | boolean>;
}

export interface Step {
  number: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface Annotation {
  path?: string;
  start_line?: number;
  end_line?: number;
  message: string;
  annotation_level: "failure" | "warning" | "notice";
  title?: string;
  line?: number; // line index within logs (0-based)
  column?: number;
}

export interface LogChunk {
  content: string;
  totalLength: number;
  isComplete?: boolean;
}

export interface MatrixGroup {
  baseName: string;
  jobs: JobExtended[];
}
