"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnalysisView } from "@/components/AnalysisView";
import { HierarchicalSummaryView } from "@/components/HierarchicalSummaryView";
import { RunHistory } from "@/components/RunHistory";
import { SummaryView } from "@/components/SummaryView";
import { StatusBadge } from "@/components/ui";
import { humanizeError } from "@/lib/humanizeMessage";
import { postJson } from "@/lib/fetchJson";
import { isHierSummary, type ClientSummary, type JobConfig, type ModelRun, type RunAnalysis } from "@/lib/types";

export function ResultsView({
  projectId,
  runs,
  jobConfigs,
  kpiMargin,
}: {
  projectId: string;
  runs: ModelRun[];
  jobConfigs?: Record<string, JobConfig>;
  kpiMargin?: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  // Optimistic local copy so the analysis renders immediately after generation, without
  // waiting on router.refresh() to re-fetch the server component.
  const [analysis, setAnalysis] = useState<RunAnalysis | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [clientSummary, setClientSummary] = useState<ClientSummary | null>(null);
  const [copied, setCopied] = useState(false);

  if (runs.length === 0) {
    return <p className="text-sm text-fg-muted">Nog geen resultaten. Start een fit hierboven.</p>;
  }

  // The analysis section (step "diepgaande analyse", explicitly out of scope for this
  // pass) always targets the newest run, exactly as before — run selection below only
  // changes which run's SUMMARY and PUBLISH state are shown, a separate concern.
  const latestRun = runs[0];
  const shownAnalysis = analysis ?? latestRun.analysis;
  const viewedRun = runs.find((r) => r.id === selectedRunId) ?? latestRun;
  // Telling (orders/leads, poisson/negative_binomial) vs. continue KPI (omzet, normal/
  // student_t) — bepaalt of de marge-tekst "per verkochte eenheid" of "per euro omzet"
  // moet zeggen. Uit de config waarmee déze run is gefit; onbekend als die er niet is
  // (oudere runs) — dan valt het dashboard terug op neutrale taal.
  const viewedLikelihood = viewedRun.job_id ? jobConfigs?.[viewedRun.job_id]?.model.likelihood : undefined;
  const isCountKpi = viewedLikelihood === "poisson" || viewedLikelihood === "negative_binomial";

  async function publish() {
    setBusy(true);
    setError(null);
    const res = await postJson(`/api/projects/${projectId}/publish`, { model_run_id: viewedRun.id });
    setBusy(false);
    if (!res.ok) {
      setError(humanizeError(res.error, "Publiceren is niet gelukt — probeer het opnieuw.").text);
      return;
    }
    router.refresh();
  }

  async function generateAnalysis() {
    setAnalyzing(true);
    setAnalysisError(null);
    const res = await postJson<{ analysis: RunAnalysis }>("/api/analysis", {
      project_id: projectId,
      model_run_id: latestRun.id,
    });
    setAnalyzing(false);
    if (!res.ok || !res.data.analysis) {
      setAnalysisError(humanizeError(res.error, "Het genereren van de analyse is niet gelukt — probeer het opnieuw.").text);
      return;
    }
    setAnalysis(res.data.analysis);
    router.refresh();
  }

  const viewedIsHierarchical = isHierSummary(viewedRun.summary);
  const shownClientSummary = clientSummary ?? latestRun.client_summary ?? null;

  async function generateClientSummary() {
    setSummarizing(true);
    setSummaryError(null);
    const res = await postJson<{ client_summary: ClientSummary }>("/api/client-summary", {
      project_id: projectId,
      model_run_id: latestRun.id,
    });
    setSummarizing(false);
    if (!res.ok || !res.data.client_summary) {
      setSummaryError(humanizeError(res.error, "Het schrijven van de samenvatting is niet gelukt — probeer het opnieuw.").text);
      return;
    }
    setClientSummary(res.data.client_summary);
    router.refresh();
  }

  async function copySummary() {
    if (!shownClientSummary) return;
    try {
      await navigator.clipboard.writeText(shownClientSummary.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Klembord niet beschikbaar (bv. zonder https) — de tekst staat er toch al.
    }
  }

  return (
    <div className="space-y-5">
      <RunHistory runs={runs} selectedId={viewedRun.id} onSelect={setSelectedRunId} jobConfigs={jobConfigs} />
      {isHierSummary(viewedRun.summary) ? (
        <HierarchicalSummaryView summary={viewedRun.summary} />
      ) : (
        <SummaryView summary={viewedRun.summary} kpiMargin={kpiMargin} isCountKpi={isCountKpi} />
      )}
      {/* Deep analysis assumes the single-region FitSummary shape (it feeds the summary
          JSON straight to Claude's code-execution tool) — not offered for a hierarchical
          run, which has no response curves / quality gate for it to interpret. */}
      {viewedRun.id === latestRun.id && !viewedIsHierarchical && (
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
      {viewedRun.id === latestRun.id && !viewedIsHierarchical && (
        <div className="border-t border-border pt-4">
          <p className="mb-2 text-sm text-fg-muted">
            Laat Claude een presentatieklare samenvatting in klanttaal schrijven (kwaliteit →
            contributie → onzekerheid → advies) die je 1-op-1 in je rapport of slides kunt plakken.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={generateClientSummary}
              disabled={summarizing}
              className="rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-fg transition hover:bg-surface-2 disabled:opacity-50"
            >
              {summarizing
                ? "Samenvatting wordt geschreven…"
                : shownClientSummary
                  ? "Klantsamenvatting opnieuw genereren"
                  : "Schrijf klantsamenvatting"}
            </button>
            {shownClientSummary && (
              <button
                onClick={copySummary}
                className="rounded-lg border border-border px-3 py-2 text-xs text-fg-muted transition hover:bg-surface-2"
              >
                {copied ? "Gekopieerd!" : "Kopieer tekst"}
              </button>
            )}
          </div>
          {summaryError && <p className="mt-2 text-sm text-danger">{summaryError}</p>}
          {shownClientSummary && (
            <div className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-fg">
              {shownClientSummary.text}
            </div>
          )}
        </div>
      )}

      {/* Publiceren is de zichtbare finish van de wizard: onderaan, ná beoordelen,
          analyse en klantsamenvatting — zo heeft het traject een duidelijk einde. */}
      <div className="rounded-lg border border-accent/30 bg-accent-dim/40 p-4">
        {viewedRun.is_published ? (
          <div className="flex items-center gap-3">
            <StatusBadge status="published" />
            <p className="text-sm text-fg-muted">
              Deze run staat op het klantdashboard — hiermee is het traject afgerond.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={publish}
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent-hover hover:shadow-glow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Publiceren…" : "Publiceer naar klantdashboard"}
            </button>
            <p className="min-w-0 flex-1 text-xs text-fg-muted">
              De afsluitende stap: vertrouw je deze uitkomst (kwaliteitscontrole groen, resultaten
              beoordeeld), publiceer dan — de klant ziet daarna het dashboard met deze run.
            </p>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
