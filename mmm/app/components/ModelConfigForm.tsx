"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SourceFile } from "@/lib/types";
import { useWizardChat } from "@/components/WizardChatContext";

const DEFAULT_SAMPLE = { draws: 1000, tune: 1000, chains: 4 };

// The architect's tool output carries `reasoning` for the chat bubble, but that's not
// part of the job config itself; `sample` (compute cost) is deliberately left for the
// wizard to default rather than letting the model pick it.
function configFromProposal(proposal: unknown): string {
  const { reasoning: _reasoning, ...rest } = proposal as { reasoning?: string; sources: unknown; model: unknown };
  return JSON.stringify({ ...rest, sample: DEFAULT_SAMPLE }, null, 2);
}

// A JSON editor for the job config. For technical builders this is a fine MVP; later the
// chat panel generates this config from the data and hands it here to run.
function templateFor(projectId: string, sources: SourceFile[]): string {
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
    sample: { draws: 1000, tune: 1000, chains: 4 },
  };
  return JSON.stringify(config, null, 2);
}

export function ModelConfigForm({
  projectId,
  sources,
}: {
  projectId: string;
  sources: SourceFile[];
}) {
  const router = useRouter();
  const initial = useMemo(() => templateFor(projectId, sources), [projectId, sources]);
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pendingConfig, clearPendingConfig } = useWizardChat();

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
      body: JSON.stringify({ project_id: projectId, config }),
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
        Configureer de fit. Vul de kolomnamen, rollen (kpi/spend/control) en kanalen in.
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
        disabled={busy || sources.length === 0}
        className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
      >
        {busy ? "Starten…" : "Fit starten"}
      </button>
    </div>
  );
}
