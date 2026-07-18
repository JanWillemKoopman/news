"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/ui";
import { useOpenChatDock } from "@/components/ChatDock";
import { useWizardChatOptional } from "@/components/WizardChatContext";
import type { Job, JobProgress } from "@/lib/types";

const PROGRESS_LABEL: Record<JobProgress, string> = {
  downloading: "Brondata laden",
  building_dataset: "Dataset opbouwen",
  sampling: "Model berekenen (sampling)",
  saving: "Resultaten opslaan",
};

function elapsedLabel(fromIso: string, now: number): string {
  const from = new Date(fromIso).getTime();
  const seconds = Math.max(0, Math.floor((now - from) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s.toString().padStart(2, "0")} s` : `${s} s`;
}

// Rough wall-clock expectation per sampling preset, so "3 min bezig" has a frame of
// reference ("is dit normaal?") without promising anything exact.
function expectedDuration(job: Job): string | null {
  const draws = (job.config as { sample?: { draws?: number } } | null)?.sample?.draws;
  if (!draws) return null;
  if (draws <= 300) return "meestal 1–3 min";
  if (draws <= 1000) return "meestal 3–8 min";
  return "meestal 8–20 min";
}

// Median duration of this project's own finished berekeningen — a sharper expectation
// than the per-preset vuistregel, once er echt historie is.
function typicalMinutes(jobs: Job[]): number | null {
  const durations = jobs
    .filter((j) => j.status === "succeeded" && j.started_at && j.finished_at)
    .map((j) => (new Date(j.finished_at as string).getTime() - new Date(j.started_at as string).getTime()) / 60000)
    .sort((a, b) => a - b);
  if (durations.length < 2) return null;
  return durations[Math.floor(durations.length / 2)];
}

function phaseLine(job: Job, now: number, typical: number | null): string {
  if (job.status === "queued") return `In wachtrij — ${elapsedLabel(job.created_at, now)}`;
  if (job.status === "running") {
    const phase = job.progress ? PROGRESS_LABEL[job.progress] : "Wordt gestart";
    const expect = typical != null ? `in dit project meestal ~${Math.max(1, Math.round(typical))} min` : expectedDuration(job);
    const base = job.started_at ? `${phase} — ${elapsedLabel(job.started_at, now)} bezig` : phase;
    return expect ? `${base} (${expect})` : base;
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
  const chat = useWizardChatOptional();
  const openChat = useOpenChatDock();
  // Proactieve terugkoppeling: alleen op een ín deze sessie waargenomen transitie naar
  // succeeded/failed (nooit bij een refresh die een oude eindstatus binnenhaalt), en
  // hooguit één keer per job.
  const reviewedJobs = useRef<Set<string>>(new Set());
  // Automatische verbetercyclus: zolang aan, roept elke afgeronde-maar-niet-goede fit
  // /api/fit-refine aan (architect corrigeert → nieuwe fit), tot "pass" of de rondelimiet.
  const [autoRefine, setAutoRefine] = useState(false);
  const [refineStatus, setRefineStatus] = useState<string | null>(null);
  const refineRound = useRef(1);
  const refineBusy = useRef(false);
  const autoRefineRef = useRef(autoRefine);
  autoRefineRef.current = autoRefine;

  async function runRefineRound() {
    if (refineBusy.current) return;
    refineBusy.current = true;
    setRefineStatus(`Ronde ${refineRound.current}: de AI beoordeelt de laatste berekening…`);
    try {
      const res = await fetch("/api/fit-refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, round: refineRound.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRefineStatus(data.error ?? "De verbetercyclus is gestopt door een fout.");
        setAutoRefine(false);
      } else if (data.status === "refitted") {
        setRefineStatus(`Ronde ${refineRound.current}: gecorrigeerde berekening gestart — de cyclus gaat door zodra die klaar is.`);
        refineRound.current += 1;
      } else if (data.status === "waiting") {
        setRefineStatus("Er draait nog een berekening; de cyclus wacht tot die klaar is.");
      } else {
        // done / stopped / exhausted: cyclus klaar, boodschap tonen en uitzetten.
        setRefineStatus(data.message ?? "De verbetercyclus is klaar.");
        setAutoRefine(false);
      }
    } catch {
      setRefineStatus("De verbetercyclus is gestopt: verbinding mislukt.");
      setAutoRefine(false);
    } finally {
      refineBusy.current = false;
    }
  }

  function toggleAutoRefine() {
    if (autoRefine) {
      setAutoRefine(false);
      setRefineStatus("Cyclus gestopt.");
      return;
    }
    refineRound.current = 1;
    setAutoRefine(true);
    // Directe eerste ronde: als de laatste fit al mislukt/warn is, hoeft de bouwer niet
    // op een volgende transitie te wachten.
    void runRefineRound();
  }

  const hasActiveJob = jobs.some((j) => j.status === "queued" || j.status === "running");
  const typical = typicalMinutes(jobs);

  useEffect(() => {
    if (!hasActiveJob) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasActiveJob]);

  // Globale ActivityBar: laat overal in de wizard zien dat er een fit draait of dat de
  // automatische verbetercyclus bezig is — ook als de gebruiker niet op deze stap staat.
  useEffect(() => {
    if (!chat || !hasActiveJob) return;
    const activity = chat.beginActivity(
      typical != null
        ? `Model wordt berekend — in dit project meestal ~${Math.max(1, Math.round(typical))} min…`
        : "Model wordt berekend — dit kan enkele minuten duren…",
    );
    return () => activity.end();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveJob]);
  useEffect(() => {
    if (!chat || !autoRefine) return;
    const activity = chat.beginActivity("Automatische verbetercyclus: de AI beoordeelt en corrigeert de berekening…");
    return () => activity.end();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefine]);

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
            const previous = prev.find((j) => j.id === row.id);
            // De architect meldt zich vanzelf zodra een fit die we live zagen lopen klaar
            // is of faalt: de beoordelingsvraag gaat automatisch de chat in en de dock
            // klapt open. De bouwer hoeft er niet meer zelf om te vragen.
            const observedTransition =
              previous != null &&
              (previous.status === "queued" || previous.status === "running") &&
              (row.status === "succeeded" || row.status === "failed");
            if (observedTransition && autoRefineRef.current) {
              // In de verbetercyclus neemt /api/fit-refine de beoordeling over (die
              // schrijft zijn eigen chatberichten); de losse proactieve vraag zou dubbelen.
              reviewedJobs.current.add(row.id);
              void runRefineRound();
            } else if (observedTransition && chat && !reviewedJobs.current.has(row.id)) {
              reviewedJobs.current.add(row.id);
              chat.sendToChat(
                row.status === "succeeded"
                  ? "Er is zojuist een modelberekening afgerond. Beoordeel het resultaat: is het model betrouwbaar (kwaliteitscontrole, diagnostiek), wat zeggen de kanalen, en kan het beter? Vergelijk waar mogelijk met eerdere runs."
                  : "De berekening die net draaide is MISLUKT. Diagnosticeer de oorzaak aan de hand van de foutmelding en stel een concrete, gecorrigeerde configuratie voor.",
              );
              openChat?.();
            }
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
    return <p className="text-sm text-fg-muted">Nog geen modelberekeningen gestart.</p>;
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
        <button
          onClick={toggleAutoRefine}
          className={
            "rounded-lg px-3 py-1.5 text-xs font-medium transition " +
            (autoRefine
              ? "bg-accent text-bg hover:bg-accent-hover"
              : "border border-border-strong text-fg hover:bg-surface-3")
          }
        >
          {autoRefine ? "Verbetercyclus stoppen" : "Automatische verbetercyclus"}
        </button>
        <p className="min-w-0 flex-1 text-xs text-fg-muted">
          {refineStatus ??
            "Laat de AI een mislukte of zwakke berekening (kwaliteitscontrole warn/fail) zelf corrigeren en opnieuw draaien, max. 3 rondes. Elke ronde is zichtbaar in de chat; goedkeuren en publiceren blijft aan jou."}
        </p>
      </div>
      <ul className="divide-y divide-border text-sm">
      {jobs.map((job) => (
        <li key={job.id} className="py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-fg">{phaseLine(job, now, typical)}</p>
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
              Een lopende berekening kan nu niet worden geannuleerd — wacht tot deze klaar is.
            </p>
          )}
        </li>
      ))}
      </ul>
    </div>
  );
}
