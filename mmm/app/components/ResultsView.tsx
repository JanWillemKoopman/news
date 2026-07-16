"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnalysisView } from "@/components/AnalysisView";
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

  if (runs.length === 0) {
    return <p className="text-sm text-neutral-500">Nog geen resultaten. Start een fit hierboven.</p>;
  }

  const latest = runs[0];
  const shownAnalysis = analysis ?? latest.analysis;

  async function publish() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_run_id: latest.id }),
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
      body: JSON.stringify({ project_id: projectId, model_run_id: latest.id }),
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
      <SummaryView summary={latest.summary} />
      <div className="border-t border-neutral-100 pt-4">
        <p className="mb-2 text-sm text-neutral-500">
          Laat Claude deze uitkomst verder analyseren en op maat gemaakte grafieken maken (kan even duren).
        </p>
        <button
          onClick={generateAnalysis}
          disabled={analyzing}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
        >
          {analyzing ? "Analyse wordt gegenereerd…" : shownAnalysis ? "Analyse opnieuw genereren" : "Genereer diepgaande analyse"}
        </button>
        {analysisError && <p className="mt-2 text-sm text-rose-600">{analysisError}</p>}
      </div>
      {shownAnalysis && <AnalysisView analysis={shownAnalysis} />}
      <div className="flex items-center gap-3 border-t border-neutral-100 pt-4">
        {latest.is_published ? (
          <StatusBadge status="published" />
        ) : (
          <button
            onClick={publish}
            disabled={busy}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
          >
            {busy ? "Publiceren…" : "Publiceer naar klantdashboard"}
          </button>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
