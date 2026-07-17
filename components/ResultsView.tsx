"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnalysisView } from "@/components/AnalysisView";
import { RunHistory } from "@/components/RunHistory";
import { SummaryView } from "@/components/SummaryView";
import { StatusBadge } from "@/components/ui";
import type { ModelRun, RunAnalysis } from "@/lib/types";

export function ResultsView({ projectId, runs }: { projectId: string; runs: ModelRun[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  // Optimistic local copy so the analysis renders immediately after generation, without
  // waiting on router.refresh() to re-fetch the server component.
  const [analysis, setAnalysis] = useState<RunAnalysis | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  if (runs.length === 0) {
    return <p className="text-sm text-fg-muted">Nog geen resultaten. Start een fit hierboven.</p>;
  }

  // The analysis section (step "diepgaande analyse", explicitly out of scope for this
  // pass) always targets the newest run, exactly as before — run selection below only
  // changes which run's SUMMARY and PUBLISH state are shown, a separate concern.
  const latestRun = runs[0];
  const shownAnalysis = analysis ?? latestRun.analysis;
  const viewedRun = runs.find((r) => r.id === selectedRunId) ?? latestRun;

  async function publish() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_run_id: viewedRun.id }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Publiceren mislukt.");
      return;
    }
    router.refresh();
  }

  async function generateAnalysis() {
    setAnalyzing(true);
    setAnalysisError(null);
    const res = await fetch("/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, model_run_id: latestRun.id }),
    });
    setAnalyzing(false);
    if (!res.ok) {
      setAnalysisError((await res.json().catch(() => ({}))).error ?? "Genereren van de analyse mislukt.");
      return;
    }
    const { analysis: generated } = (await res.json()) as { analysis: RunAnalysis };
    setAnalysis(generated);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <RunHistory runs={runs} selectedId={viewedRun.id} onSelect={setSelectedRunId} />
      <SummaryView summary={viewedRun.summary} />
      <div className="flex items-center gap-3 border-t border-border pt-4">
        {viewedRun.is_published ? (
          <StatusBadge status="published" />
        ) : (
          <button
            onClick={publish}
            disabled={busy}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent-hover hover:shadow-glow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Publiceren…" : "Publiceer naar klantdashboard"}
          </button>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
      {viewedRun.id === latestRun.id && (
        <div className="border-t border-border pt-4">
          <p className="mb-2 text-sm text-fg-muted">
            Laat Claude deze uitkomst verder analyseren en op maat gemaakte grafieken maken (kan even duren).
          </p>
          <button
            onClick={generateAnalysis}
            disabled={analyzing}
            className="rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-fg transition hover:bg-surface-2 disabled:opacity-50"
          >
            {analyzing ? "Analyse wordt gegenereerd…" : shownAnalysis ? "Analyse opnieuw genereren" : "Genereer diepgaande analyse"}
          </button>
          {analysisError && <p className="mt-2 text-sm text-danger">{analysisError}</p>}
          {shownAnalysis && <AnalysisView analysis={shownAnalysis} />}
        </div>
      )}
    </div>
  );
}
