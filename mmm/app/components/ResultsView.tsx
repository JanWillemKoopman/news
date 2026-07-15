"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SummaryView } from "@/components/SummaryView";
import { StatusBadge } from "@/components/ui";
import type { ModelRun } from "@/lib/types";

export function ResultsView({ projectId, runs }: { projectId: string; runs: ModelRun[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (runs.length === 0) {
    return <p className="text-sm text-neutral-500">Nog geen resultaten. Start een fit hierboven.</p>;
  }

  const latest = runs[0];

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

  return (
    <div className="space-y-5">
      <SummaryView summary={latest.summary} />
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
