// Derives each pipeline step's visual state from data already fetched for the project
// page — no extra "current step" column to keep in sync. The story this tells:
// - "active": the one step the builder should look at next (auto-expanded).
// - "attention": something failed and needs a decision (auto-expanded, rose).
// - "done": finished, collapsed to a one-line summary.
// - "available": reachable and freely reviewable, but not the current focus.
// - "locked": its prerequisite isn't met yet (still openable, just dimmed).
import type { Dataset, Job, ModelRun, SourceFile } from "@/lib/types";
import { humanizeError } from "@/lib/humanizeMessage";

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
  if (dataset.status === "failed") return humanizeError(dataset.error, "Samenvoegen is niet gelukt").text;
  return "Nog niet samengevoegd";
}

const PROGRESS_LABEL: Record<string, string> = {
  downloading: "brondata laden",
  building_dataset: "dataset opbouwen",
  sampling: "model berekenen",
  saving: "resultaten opslaan",
};

function fitJobSummary(job: Job): string {
  if (job.status === "succeeded") return "Laatste berekening geslaagd";
  if (job.status === "failed") return humanizeError(job.error, "Laatste berekening is niet gelukt").text;
  if (job.status === "running") return `Berekening loopt — ${job.progress ? PROGRESS_LABEL[job.progress] : "wordt gestart"}`;
  if (job.status === "queued") return "Berekening staat in de wachtrij";
  return "Laatste berekening geannuleerd";
}

function resultsSummary(run: ModelRun): string {
  return run.is_published ? "Gepubliceerd naar het klantdashboard" : "Nog niet gepubliceerd";
}

export function computePipelineSteps({
  sources,
  dataset,
  jobs,
  runs,
}: {
  sources: SourceFile[];
  dataset: Dataset | null;
  jobs: Job[];
  runs: ModelRun[];
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

  let dataprepStatus: StepStatus;
  if (!hasSources) dataprepStatus = "locked";
  else if (dataset?.status === "failed") dataprepStatus = "attention";
  else dataprepStatus = next(dataset?.status === "approved");

  let configStatus: StepStatus;
  if (dataset?.status !== "approved") configStatus = "locked";
  else configStatus = next(fitJobs.length > 0);

  // Berekenen & resultaten is één stap met twee toestanden: zolang de laatste berekening
  // loopt toont hij de voortgang, daarna het resultaat (beoordelen + publiceren). Klaar
  // is hij nooit automatisch — beoordelen/publiceren blijft mensenwerk.
  let runStatus: StepStatus;
  if (fitJobs.length === 0) runStatus = "locked";
  else if (latestFitJob!.status === "failed") runStatus = "attention";
  else runStatus = next(false);

  const runSummary =
    runs.length && latestFitJob?.status === "succeeded"
      ? resultsSummary(runs[0])
      : latestFitJob
        ? fitJobSummary(latestFitJob)
        : undefined;

  return [
    {
      id: "data",
      title: "Data uploaden",
      status: dataStatus,
      summary: hasSources ? `${sources.length} bestand${sources.length === 1 ? "" : "en"} geüpload` : undefined,
    },
    { id: "dataprep", title: "Data voorbereiden", status: dataprepStatus, summary: dataprepSummary(dataset) },
    {
      id: "config",
      title: "Model configureren",
      status: configStatus,
      summary: fitJobs.length ? `${fitJobs.length} berekening${fitJobs.length === 1 ? "" : "en"} gestart` : undefined,
    },
    { id: "run", title: "Berekenen & resultaten", status: runStatus, summary: runSummary },
  ];
}
