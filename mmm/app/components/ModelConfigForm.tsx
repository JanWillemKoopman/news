"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnRole, Dataset, SourceFile } from "@/lib/types";
import { useWizardChat } from "@/components/WizardChatContext";

const DEFAULT_SAMPLE = { draws: 1000, tune: 1000, chains: 4 };

// The architect's tool output carries `reasoning` for the chat bubble, but that's not
// part of the job config itself; `sample` (compute cost) is deliberately left for the
// wizard to default rather than letting the model pick it.
function configFromProposal(proposal: unknown): string {
  const { reasoning: _reasoning, ...rest } = proposal as { reasoning?: string; sources: unknown; model: unknown };
  return JSON.stringify({ ...rest, sample: DEFAULT_SAMPLE }, null, 2);
}

// Once a dataset is approved, the merge step already decided every column's role — the
// fit config just points at that one file and echoes the roles back, instead of asking
// the builder to re-map raw files from scratch.
function templateFromDataset(dataset: Dataset): string {
  const roles = dataset.column_roles ?? {};
  const byRole = (role: ColumnRole) => Object.entries(roles).filter(([, r]) => r === role).map(([name]) => name);
  const kpi = byRole("kpi")[0] ?? "REPLACE_ME";
  const config = {
    sources: [
      {
        name: "master",
        storage_path: dataset.master_path,
        date_column: "week_start",
        columns: Object.entries(roles).map(([name, role]) => ({ name, role })),
      },
    ],
    model: {
      kpi,
      channels: byRole("spend").map((name) => ({ name, channel_type: "generic" })),
      control_columns: byRole("control"),
      add_trend: true,
      seasonality_periods: 52,
      n_fourier_modes: 2,
    },
    sample: DEFAULT_SAMPLE,
  };
  return JSON.stringify(config, null, 2);
}

// Fallback for when no dataset has been approved yet: a JSON editor pointing straight at
// the raw uploads, with placeholders the builder (or the architect) fills in.
function templateFromRawSources(sources: SourceFile[]): string {
  const config = {
    sources: sources.map((s) => ({
      name: s.name.replace(/\.[^.]+$/, ""),
      storage_path: s.storage_path,
      date_column: null,
      columns: [{ name: "REPLACE_ME", role: "spend" }],
    })),
    model: {
      kpi: "REPLACE_ME",
      channels: [{ name: "REPLACE_ME", channel_type: "generic" }],
      control_columns: [],
      add_trend: true,
      seasonality_periods: 52,
      n_fourier_modes: 2,
    },
    sample: DEFAULT_SAMPLE,
  };
  return JSON.stringify(config, null, 2);
}

export function ModelConfigForm({
  projectId,
  sources,
  approvedDataset,
}: {
  projectId: string;
  sources: SourceFile[];
  approvedDataset: Dataset | null;
}) {
  const router = useRouter();
  const initial = useMemo(
    () => (approvedDataset ? templateFromDataset(approvedDataset) : templateFromRawSources(sources)),
    [approvedDataset, sources],
  );
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pendingConfig, clearPendingConfig } = useWizardChat();

  // Re-seed the editor whenever the underlying source changes (a dataset just got
  // approved, or the raw file list changed) — same "start from the latest known-good
  // input" behaviour as before, just now dataset-aware.
  useEffect(() => {
    setText(initial);
  }, [initial]);

  useEffect(() => {
    if (pendingConfig === null) return;
    setText(configFromProposal(pendingConfig));
    clearPendingConfig();
  }, [pendingConfig, clearPendingConfig]);

  async function onRun() {
    setError(null);
    let config: unknown;
    try {
      config = JSON.parse(text);
    } catch (e) {
      setError("Ongeldige JSON: " + (e as Error).message);
      return;
    }
    setBusy(true);
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, config, dataset_id: approvedDataset?.id ?? null }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Kon de fit niet starten.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500">
        {approvedDataset
          ? "De goedgekeurde dataset is als bron ingevuld. Vul de kanalen en modelinstellingen aan."
          : "Configureer de fit. Vul de kolomnamen, rollen (kpi/spend/control) en kanalen in — of keur eerst een dataset goed bij stap 2 voor een ingevulde start."}
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        rows={16}
        className="w-full rounded-lg border border-neutral-300 p-3 font-mono text-xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
      />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button
        onClick={onRun}
        disabled={busy || (sources.length === 0 && !approvedDataset)}
        className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
      >
        {busy ? "Starten…" : "Fit starten"}
      </button>
    </div>
  );
}
