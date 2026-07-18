// Derives each pipeline step's visual state from data already fetched for the project
// page — no extra "current step" column to keep in sync. The story this tells:
// - "active": the one step the builder should look at next (auto-expanded).
// - "attention": something failed and needs a decision (auto-expanded, rose).
// - "done": finished, collapsed to a one-line summary.
// - "available": reachable and freely reviewable, but not the current focus.
// - "locked": its prerequisite isn't met yet (still openable, just dimmed).
import type { Dataset, Job, ModelRun, SourceFile } from "@/lib/types";

export type StepStatus = "locked" | "available" | "active" | "done" | "attention";

export interface StepMeta {
  id: string;
  title: string;
  status: StepStatus;
  summary?: string;
}

function dataprepSummary(dataset: Dataset | null): string | undefined {
  if (!dataset) return undefined;
  if (dataset.status === "approved") {
    return dataset.n_weeks != null && dataset.window_start && dataset.window_end
      ? `Goedgekeurd — ${dataset.window_start} t/m ${dataset.window_end} (${dataset.n_weeks} weken)`
      : "Goedgekeurd";
  }
  if (dataset.status === "prepared") return "Samengevoegd — klaar om goed te keuren";
  if (dataset.status === "preparing") return "Wordt samengevoegd…";
  if (dataset.status === "failed") return dataset.error ?? "Samenvoegen mislukt";
  return "Nog niet samengevoegd";
}

const PROGRESS_LABEL: Record<string, string> = {
  downloading: "brondata laden",
  building_dataset: "dataset opbouwen",
  sampling: "model fitten",
  saving: "resultaten opslaan",
};

function fitJobSummary(job: Job): string {
  if (job.status === "succeeded") return "Laatste fit geslaagd";
  if (job.status === "failed") return job.error ?? "Laatste fit mislukt";
  if (job.status === "running") return `Fit loopt — ${job.progress ? PROGRESS_LABEL[job.progress] : "wordt gestart"}`;
  if (job.status === "queued") return "Fit staat in de wachtrij";
  return "Laatste fit geannuleerd";
}

function resultsSummary(run: ModelRun): string {
  return run.is_published ? "Gepubliceerd naar het klantdashboard" : "Nog niet gepubliceerd";
}

export function computePipelineSteps({
  sources,
  dataset,
  jobs,
  runs,
  edaCompleted,
}: {
  sources: SourceFile[];
  dataset: Dataset | null;
  jobs: Job[];
  runs: ModelRun[];
  edaCompleted?: boolean;
}): StepMeta[] {
  const hasSources = sources.length > 0;
  const fitJobs = jobs.filter((j) => j.type === "fit" || j.type === "fit_hierarchical");
  const latestFitJob = fitJobs[0] ?? null;

  let focused = false;
  function next(done: boolean): StepStatus {
    if (done) return "done";
    if (!focused) {
      focused = true;
      return "active";
    }
    return "available";
  }

  const dataStatus = next(hasSources);

  // EDA is a detour, not a gate: it only grabs focus in the narrow window right after
  // upload, before a data-prep attempt exists — after that it steps aside. It has no
  // natural completion signal (no approve/publish action), so a builder marks it "done"
  // explicitly via a button; without that click it just stays active/available forever.
  let edaStatus: StepStatus;
  if (!hasSources) edaStatus = "locked";
  else if (edaCompleted) edaStatus = "done";
  else if (dataset === null && !focused) {
    edaStatus = "active";
    focused = true;
  } else edaStatus = "available";

  let dataprepStatus: StepStatus;
  if (!hasSources) dataprepStatus = "locked";
  else if (dataset?.status === "failed") dataprepStatus = "attention";
  else dataprepStatus = next(dataset?.status === "approved");

  let configStatus: StepStatus;
  if (dataset?.status !== "approved") configStatus = "locked";
  else configStatus = next(fitJobs.length > 0);

  let fitsStatus: StepStatus;
  if (fitJobs.length === 0) fitsStatus = "locked";
  else if (latestFitJob!.status === "failed") fitsStatus = "attention";
  else fitsStatus = next(latestFitJob!.status === "succeeded");

  let resultsStatus: StepStatus;
  if (runs.length === 0) resultsStatus = "locked";
  else resultsStatus = next(false); // reviewing/publishing is never "finished" automatically

  return [
    {
      id: "data",
      title: "Data",
      status: dataStatus,
      summary: hasSources ? `${sources.length} bestand${sources.length === 1 ? "" : "en"} geüpload` : undefined,
    },
    { id: "eda", title: "EDA", status: edaStatus, summary: edaCompleted ? "Afgerond" : undefined },
    { id: "dataprep", title: "Data voorbereiden", status: dataprepStatus, summary: dataprepSummary(dataset) },
    {
      id: "config",
      title: "Model configureren",
      status: configStatus,
      summary: fitJobs.length ? `${fitJobs.length} fit${fitJobs.length === 1 ? "" : "s"} gestart` : undefined,
    },
    { id: "fits", title: "Fits", status: fitsStatus, summary: latestFitJob ? fitJobSummary(latestFitJob) : undefined },
    {
      id: "results",
      title: "Resultaten",
      status: resultsStatus,
      summary: runs.length ? resultsSummary(runs[0]) : undefined,
    },
  ];
}
