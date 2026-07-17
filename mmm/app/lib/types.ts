// Domain types mirroring the `mmm` Postgres schema (supabase/migrations/0001_mmm_init.sql).

export type ProjectStatus = "draft" | "published" | "archived";
export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type ColumnRole = "kpi" | "spend" | "control";
export type ChannelType = "intent" | "brand" | "generic";
export type AdstockType = "geometric" | "delayed";
export type SaturationType = "hill" | "logistic";
export type LikelihoodType = "normal" | "student_t" | "poisson" | "negative_binomial";
export type TrendType = "linear" | "piecewise";
export type FillStrategy = "zero" | "ffill" | "bfill" | "interpolate" | "mean" | "median";

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

export type JobProgress = "downloading" | "building_dataset" | "sampling" | "saving";

export interface Job {
  id: string;
  project_id: string;
  type: "fit" | "prepare";
  status: JobStatus;
  progress: JobProgress | null;
  config: JobConfig | PrepareRecipe;
  error: string | null;
  attempts: number;
  dataset_id?: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

// A generated chart image (base64 data URL) produced by the deep-analysis step.
export interface AnalysisChart {
  filename: string;
  mime_type: string;
  data_url: string;
}

// The deep-analysis step's output: a written interpretation plus charts, generated
// on-demand from the (already computed) FitSummary via Claude's sandboxed code
// execution. Distinct from the chat architect's own inline discussion of results —
// this is a heavier, explicitly-triggered "genereer diepgaande analyse" action.
export interface RunAnalysis {
  text: string;
  charts: AnalysisChart[];
  model: string;
  generated_at: string;
}

export interface ModelRun {
  id: string;
  project_id: string;
  job_id: string | null;
  summary: FitSummary;
  quality: unknown;
  analysis: RunAnalysis | null;
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
  features?: FeatureSpec[];
  sample?: { draws?: number; tune?: number; chains?: number };
}

// A 0/1 control column for named ISO weeks (anomalies, one-off promotions, ...) —
// added to the master dataset without editing the raw source file. Declared names are
// appended to `model.control_columns` automatically by mmm-worker/jobspec.py.
export interface EventDummyConfig {
  name: string;
  weeks: [number, number][]; // [iso_year, iso_week] pairs
}

// A raw-table cleaning/reshaping step applied to one source BEFORE role-mapping (mirrors
// mmm_core.ingestion.transforms.TransformSpec). Gives the architect room to tidy messy
// uploads — rename, filter, dedupe, unit/currency conversion, combine/split columns,
// recode categories, force a date parse, long→wide pivot — deterministically.
export type TransformOp =
  | "rename"
  | "drop_columns"
  | "filter_rows"
  | "drop_duplicates"
  | "scale"
  | "combine"
  | "split"
  | "recode"
  | "parse_date"
  | "pivot";

export interface TransformSpec {
  op: TransformOp;
  // Op-specific parameters (see the architect tool description / mmm-core for each op).
  params?: Record<string, unknown>;
}

export interface SourceConfig {
  name: string;
  storage_path: string;
  date_column?: string;
  essential?: boolean;
  // Raw cleaning/reshaping applied to this file before role-mapping, in order.
  transforms?: TransformSpec[];
  columns: {
    name: string;
    role: ColumnRole;
    output_name?: string;
    // control columns only: how to fill missing weeks inside the analysis window.
    fill?: FillStrategy;
  }[];
}

// A derived feature: a new control column computed from existing master columns during
// the merge (mirrors mmm_core.ingestion.feature_engineering.FeatureSpec). Lets the
// architect propose engineered variables (lags, rolling means, ratios/shares,
// interactions, transforms, recurring calendar dummies) without hand-editing raw data.
export type FeatureOp =
  | "lag"
  | "rolling_mean"
  | "rolling_sum"
  | "diff"
  | "ratio"
  | "product"
  | "sum"
  | "log1p"
  | "zscore"
  | "winsorize"
  | "recurring_week_dummy";

export interface FeatureSpec {
  name: string;
  op: FeatureOp;
  inputs: string[];
  // Op-specific params (weeks/window/lower_q/upper_q/iso_weeks); omitted → op defaults.
  params?: Record<string, number | number[] | null>;
}

// --- Data preparation (the recipe + result of merging raw uploads into one master
// table, BEFORE the model config step) ---

export type DatasetStatus = "draft" | "preparing" | "prepared" | "failed" | "approved";

// The recipe is exactly the merge instructions: which files, which column -> which role,
// how to fill control gaps, and which weeks to flag as event dummies. No model settings —
// those come later, once the definitive master table exists.
export interface PrepareRecipe {
  sources: SourceConfig[];
  event_dummies?: EventDummyConfig[];
  features?: FeatureSpec[];
}

export interface DatasetColumnSummary {
  role: ColumnRole | null;
  n_missing: number;
  min: number | null;
  max: number | null;
  mean: number | null;
}

export interface DatasetPreview {
  columns: { name: string; role: ColumnRole | null }[];
  n_weeks: number;
  head: Record<string, string | number | null>[];
  tail: Record<string, string | number | null>[];
  summary: Record<string, DatasetColumnSummary>;
}

// Mirrors mmm_core.ingestion.quality.QualityReport's to-JSON shape.
export interface QualityIssue {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  source?: string | null;
  [key: string]: unknown;
}
export interface DatasetQuality {
  issues: QualityIssue[];
}

export interface Dataset {
  id: string;
  project_id: string;
  status: DatasetStatus;
  recipe: PrepareRecipe;
  master_path: string | null;
  window_start: string | null;
  window_end: string | null;
  n_weeks: number | null;
  column_roles: Record<string, ColumnRole> | null;
  quality: DatasetQuality | null;
  preview: DatasetPreview | null;
  error: string | null;
  created_at: string;
  prepared_at: string | null;
  approved_at: string | null;
}

// Prior overrides for one channel (any subset; omitted keys keep mmm-core defaults).
export interface ChannelPriors {
  beta_sigma?: number;
  adstock_concentration?: number;
  delayed_peak_weeks?: number;
  delayed_peak_sigma?: number;
  hill_slope_a?: number;
  hill_slope_b?: number;
  halfsat_a?: number;
  halfsat_b?: number;
  logistic_lam_sigma?: number;
}

// Prior overrides for the baseline (non-media) components.
export interface BaselinePriors {
  intercept_sigma?: number;
  trend_sigma?: number;
  season_sigma?: number;
  control_sigma?: number;
  noise_sigma?: number;
  // Laplace scale on each piecewise-trend changepoint step (smaller = stiffer trend).
  changepoint_scale?: number;
}

// An experimentally-measured ROAS (from a lift/geo test) to calibrate a channel against.
export interface RoasCalibration {
  roas: number;
  sd: number;
}

export interface ChannelConfig {
  name: string;
  channel_type?: ChannelType;
  l_max?: number;
  expected_half_life?: number | null;
  adstock?: AdstockType;
  saturation?: SaturationType;
  priors?: ChannelPriors;
  calibration?: RoasCalibration | null;
}

export interface ModelConfig {
  kpi: string;
  channels: ChannelConfig[];
  control_columns?: string[];
  add_trend?: boolean;
  trend_type?: TrendType;
  n_changepoints?: number;
  seasonality_periods?: number | null;
  n_fourier_modes?: number;
  likelihood?: LikelihoodType;
  student_t_nu?: number;
  priors?: BaselinePriors;
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

export interface QualityGate {
  verdict: "pass" | "warn" | "fail";
  reasons: string[];
  checks: Record<string, boolean>;
}

export interface CurvePoint {
  weekly_spend: number;
  contribution: Interval;
  extrapolated: boolean;
}

export interface ResponseCurve {
  name: string;
  current_weekly_spend: number;
  marginal_roas_at_current: Interval;
  points: CurvePoint[];
}

export interface OptimalAllocation {
  total_weekly_budget: number;
  per_channel: Record<string, number>;
  predicted_contribution: Interval;
  capped_channels: string[];
}

export interface FrontierPoint {
  total_weekly_budget: number;
  predicted_contribution: Interval;
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
  quality_gate?: QualityGate | null;
  response_curves?: ResponseCurve[];
  optimal_allocation?: OptimalAllocation | null;
  efficiency_frontier?: FrontierPoint[];
}
