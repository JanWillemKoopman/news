// Domain types mirroring the `mmm` Postgres schema (supabase/migrations/0001_mmm_init.sql).

export type ProjectStatus = "draft" | "published" | "archived";
export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type ColumnRole = "kpi" | "spend" | "control";
export type ChannelType = "intent" | "brand" | "generic";

export interface Project {
  id: string;
  name: string;
  client_company: string | null;
  status: ProjectStatus;
  created_by: string | null;
  created_at: string;
  published_at: string | null;
}

export interface SourceFile {
  id: string;
  project_id: string;
  name: string;
  storage_path: string;
  role_hint: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  project_id: string;
  type: "fit";
  status: JobStatus;
  config: JobConfig;
  error: string | null;
  attempts: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface ModelRun {
  id: string;
  project_id: string;
  job_id: string | null;
  summary: FitSummary;
  quality: unknown;
  inference_data_path: string | null;
  is_published: boolean;
  created_at: string;
  published_at: string | null;
}

// --- Job config (the contract with mmm-worker/jobspec.py) ---

export interface JobConfig {
  sources: SourceConfig[];
  model: ModelConfig;
  event_dummies?: EventDummyConfig[];
  sample?: { draws?: number; tune?: number; chains?: number };
}

// A 0/1 control column for named ISO weeks (anomalies, one-off promotions, ...) —
// added to the master dataset without editing the raw source file. Declared names are
// appended to `model.control_columns` automatically by mmm-worker/jobspec.py.
export interface EventDummyConfig {
  name: string;
  weeks: [number, number][]; // [iso_year, iso_week] pairs
}

export interface SourceConfig {
  name: string;
  storage_path: string;
  date_column?: string;
  essential?: boolean;
  columns: { name: string; role: ColumnRole; output_name?: string }[];
}

export interface ModelConfig {
  kpi: string;
  channels: { name: string; channel_type?: ChannelType; l_max?: number }[];
  control_columns?: string[];
  add_trend?: boolean;
  seasonality_periods?: number | null;
  n_fourier_modes?: number;
}

// --- Fit summary (the JSON mmm-core writes; what the dashboard reads) ---

export interface Interval {
  p3: number;
  p50: number;
  p97: number;
}

export interface ChannelResult {
  name: string;
  absolute_contribution: Interval;
  contribution_share: Interval;
  roas: Interval;
  adstock_half_life_weeks: Interval;
  saturation_point: Interval;
  total_spend: number;
}

export interface FitSummary {
  kpi: string;
  n_weeks: number;
  window: [string, string];
  baseline_contribution: Interval;
  channels: ChannelResult[];
  diagnostics: {
    max_r_hat: number;
    min_ess_bulk: number;
    n_divergences: number;
    r2: number;
    mape: number;
    interval_coverage_94: number;
    decomposition_ok: boolean;
  };
  draws: number;
  chains: number;
}
