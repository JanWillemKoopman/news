"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/ui";
import type { Job, JobProgress } from "@/lib/types";

const PROGRESS_LABEL: Record<JobProgress, string> = {
  downloading: "Brondata laden",
  building_dataset: "Dataset opbouwen",
  sampling: "Model fitten (sampling)",
  saving: "Resultaten opslaan",
};

function elapsedLabel(fromIso: string, now: number): string {
  const from = new Date(fromIso).getTime();
  const seconds = Math.max(0, Math.floor((now - from) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s.toString().padStart(2, "0")} s` : `${s} s`;
}

function phaseLine(job: Job, now: number): string {
  if (job.status === "queued") return `In wachtrij — ${elapsedLabel(job.created_at, now)}`;
  if (job.status === "running") {
    const phase = job.progress ? PROGRESS_LABEL[job.progress] : "Wordt gestart";
    return job.started_at ? `${phase} — ${elapsedLabel(job.started_at, now)} bezig` : phase;
  }
  if (job.status === "succeeded" && job.started_at && job.finished_at) {
    return `Geslaagd in ${elapsedLabel(job.started_at, new Date(job.finished_at).getTime())}`;
  }
  if (job.status === "cancelled") return "Geannuleerd";
  return "";
}

// Live job list: subscribes to Realtime so status/progress flips (queued -> running ->
// succeeded, plus phase updates while running) appear without a refresh, and refreshes
// the page data when a job finishes. Shows both 'fit' and 'fit_hierarchical' jobs —
// 'prepare' jobs have their own status view in the data-prep section, keyed off the
// dataset row.
const FIT_JOB_TYPES: Job["type"][] = ["fit", "fit_hierarchical"];

export function JobList({ projectId, initialJobs }: { projectId: string; initialJobs: Job[] }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>(initialJobs.filter((j) => FIT_JOB_TYPES.includes(j.type)));
  const [now, setNow] = useState(() => Date.now());
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === "queued" || j.status === "running");
    if (!hasActive) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [jobs]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`jobs-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "mmm", table: "jobs", filter: `project_id=eq.${projectId}` },
        (payload) => {
          const row = payload.new as Job;
          if (!FIT_JOB_TYPES.includes(row.type)) return;
          setJobs((prev) => {
            const next = prev.filter((j) => j.id !== row.id);
            return [row, ...next].sort((a, b) => b.created_at.localeCompare(a.created_at));
          });
          if (row.status === "succeeded" || row.status === "failed") router.refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, router]);

  async function cancelQueued(job: Job) {
    setCancelling(job.id);
    const supabase = createClient();
    await supabase
      .schema("mmm")
      .from("jobs")
      .update({ status: "cancelled" })
      .eq("id", job.id)
      .eq("status", "queued"); // guard: never cancel a job that already started picking up
    setCancelling(null);
  }

  if (jobs.length === 0) {
    return <p className="text-sm text-fg-muted">Nog geen fits gestart.</p>;
  }

  return (
    <ul className="divide-y divide-border text-sm">
      {jobs.map((job) => (
        <li key={job.id} className="py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-fg">{phaseLine(job, now)}</p>
              {job.status === "failed" && (
                <p className="mt-1 text-xs text-danger">{job.error ?? "Onbekende fout."}</p>
              )}
            </div>
            <div className="flex flex-none items-center gap-2">
              {job.status === "queued" && (
                <button
                  onClick={() => cancelQueued(job)}
                  disabled={cancelling === job.id}
                  className="rounded-lg border border-border px-2.5 py-1 text-xs text-fg-muted transition hover:border-danger/30 hover:text-danger disabled:opacity-50"
                >
                  {cancelling === job.id ? "…" : "Annuleren"}
                </button>
              )}
              <StatusBadge status={job.status} />
            </div>
          </div>
          {job.status === "running" && (
            <p className="mt-1 text-xs text-fg-faint">
              Een lopende fit kan nu niet worden geannuleerd — wacht tot deze klaar is.
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
