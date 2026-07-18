"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { useWizardChat } from "@/components/WizardChatContext";
import { StatusBadge } from "@/components/ui";
import { QualityReportView } from "@/components/QualityReportView";
import { DatasetPreviewTable } from "@/components/DatasetPreviewTable";
import { extractNumericValues } from "@/lib/eda";
import { computeDataHealth } from "@/lib/dataHealth";
import type {
  ColumnRole,
  Dataset,
  DatasetStatus,
  EventDummyConfig,
  FeatureSpec,
  FillStrategy,
  PrepareRecipe,
  SourceFile,
  TransformSpec,
} from "@/lib/types";

const RAW_BUCKET = "mmm-raw-data";
const ROLE_OPTIONS: { value: ColumnRole | ""; label: string }[] = [
  { value: "", label: "(niet gebruiken)" },
  { value: "kpi", label: "KPI" },
  { value: "spend", label: "Spend" },
  { value: "control", label: "Control" },
];
const FILL_OPTIONS: { value: FillStrategy | ""; label: string }[] = [
  { value: "", label: "niet vullen (gat blijft zichtbaar)" },
  { value: "zero", label: "nul" },
  { value: "ffill", label: "vorige week doortrekken" },
  { value: "bfill", label: "volgende week terugtrekken" },
  { value: "interpolate", label: "lineair interpoleren" },
  { value: "mean", label: "gemiddelde" },
  { value: "median", label: "mediaan" },
];

interface DraftColumn {
  name: string;
  role: ColumnRole | "";
  output_name: string;
  fill: FillStrategy | "";
}
interface DraftSource {
  file: SourceFile;
  included: boolean;
  date_column: string; // "" = auto-detect
  // Raw cleaning/reshaping steps (architect-authored) applied before role-mapping.
  transforms: TransformSpec[];
  columns: DraftColumn[];
}
interface DraftDummy {
  key: string;
  name: string;
  iso_year: number;
  iso_week: number;
}

// Conservative on purpose: a chat transcript for this very app shows the architect
// second-guessing itself over "google_sales" (a spend column despite the name) — so this
// only suggests a role for the one pattern that's rarely ambiguous, and always as a
// click-to-accept badge, never a silently pre-filled dropdown.
const SPEND_NAME_HINT = /spend|\bcost\b|kosten|budget/i;
function suggestRole(columnName: string): ColumnRole | null {
  return SPEND_NAME_HINT.test(columnName) ? "spend" : null;
}

// Tiny inline sparkline (no axes/tooltip) so a builder can eyeball a column's shape while
// assigning it a role, without leaving this table for the EDA step.
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const w = 64;
  const h = 20;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = max === min ? h / 2 : h - ((v - min) / (max - min)) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-none overflow-visible">
      <polyline points={points} fill="none" stroke="#7FEE64" strokeWidth={1.25} strokeLinejoin="round" />
    </svg>
  );
}

// A one-glance "is this ready to model?" readout, computed for free from the merge
// result already on the dataset row — before the builder spends a fit (and the wait
// that comes with it) on data that was never going to fit well.
function DataHealthMeter({ dataset }: { dataset: Dataset }) {
  const health = computeDataHealth(dataset);
  if (!health) return null;
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full rounded-full ${health.band === "goed" ? "bg-surface-3" : "bg-danger"}`}
            style={{ width: `${health.score}%` }}
          />
        </div>
        <p className={`flex-none text-sm font-medium ${health.band === "goed" ? "text-fg" : "text-danger"}`}>
          {health.band === "goed" ? "Gereed om te modelleren" : health.band === "redelijk" ? "Bruikbaar, met kanttekeningen" : "Nog niet klaar om te modelleren"}
        </p>
      </div>
      {health.reasons.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-fg-muted">
          {health.reasons.map((r, i) => (
            <li key={i}>• {r}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-fg-faint">
        Sterk samenhangende kanalen zijn hier niet meegenomen — bekijk daarvoor de correlatiematrix bij stap 2 (EDA).
      </p>
    </div>
  );
}

// A compact one-line label for a raw transform, e.g. "scale · column omzet_cent, factor 0.01".
function transformLabel(t: TransformSpec): string {
  const params = Object.entries(t.params ?? {})
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k} ${typeof v === "object" ? JSON.stringify(v) : v}`)
    .join(", ");
  return `${t.op}${params ? ` · ${params}` : ""}`;
}

// A compact one-line label for a derived feature, e.g. "google_lag1 = lag(google) · weeks 1".
function featureLabel(f: FeatureSpec): string {
  const args = f.inputs.join(", ");
  const params = Object.entries(f.params ?? {})
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k} ${Array.isArray(v) ? v.join("/") : v}`)
    .join(", ");
  return `${f.name} = ${f.op}(${args})${params ? ` · ${params}` : ""}`;
}

function draftFromRecipe(
  recipe: PrepareRecipe,
  files: SourceFile[],
): { sources: DraftSource[]; dummies: DraftDummy[]; features: FeatureSpec[] } {
  const byPath = new Map(files.map((f) => [f.storage_path, f]));
  const sources: DraftSource[] = recipe.sources.map((s) => ({
    file: byPath.get(s.storage_path) ?? { id: s.storage_path, project_id: "", name: s.name, storage_path: s.storage_path, role_hint: null, preview: null, profile: null, mapping: null, created_at: "" },
    included: true,
    date_column: s.date_column ?? "",
    transforms: s.transforms ?? [],
    columns: s.columns.map((c) => ({
      name: c.name,
      role: c.role,
      output_name: c.output_name ?? "",
      fill: c.fill ?? "",
    })),
  }));
  const dummies: DraftDummy[] = (recipe.event_dummies ?? []).flatMap((d, i) =>
    d.weeks.map(([y, w], j) => ({ key: `${i}-${j}`, name: d.weeks.length > 1 ? `${d.name}_${y}w${w}` : d.name, iso_year: y, iso_week: w })),
  );
  return { sources, dummies, features: recipe.features ?? [] };
}

// A one-sentence summary of what an architect-proposed recipe actually changed, shown
// right after it's applied — the table itself is the detailed view, this is the "one
// sentence" confirmation that something specific happened, not a silent full overwrite.
function summarizeApply(
  prevSources: DraftSource[],
  nextSources: DraftSource[],
  prevDummies: DraftDummy[],
  nextDummies: DraftDummy[],
  prevFeatures: FeatureSpec[],
  nextFeatures: FeatureSpec[],
): string {
  const roleKey = (path: string, col: string) => `${path}:${col}`;
  const prevRoles = new Map<string, ColumnRole | "">();
  for (const s of prevSources) for (const c of s.columns) prevRoles.set(roleKey(s.file.storage_path, c.name), c.role);
  let changedRoles = 0;
  for (const s of nextSources) {
    for (const c of s.columns) {
      const prev = prevRoles.get(roleKey(s.file.storage_path, c.name)) ?? "";
      if (prev !== c.role) changedRoles++;
    }
  }

  const prevTransformCount = prevSources.reduce((n, s) => n + s.transforms.length, 0);
  const nextTransformCount = nextSources.reduce((n, s) => n + s.transforms.length, 0);
  const featureDelta = nextFeatures.length - prevFeatures.length;
  const dummyDelta = nextDummies.length - prevDummies.length;

  const parts: string[] = [];
  if (changedRoles > 0) parts.push(`${changedRoles} kolomrol${changedRoles === 1 ? "" : "len"} aangepast`);
  if (nextTransformCount !== prevTransformCount) {
    parts.push(`${nextTransformCount} opschoonstap${nextTransformCount === 1 ? "" : "pen"} (was ${prevTransformCount})`);
  }
  if (featureDelta !== 0) {
    parts.push(`${featureDelta > 0 ? "+" : ""}${featureDelta} afgeleide variabele${Math.abs(featureDelta) === 1 ? "" : "n"}`);
  }
  if (dummyDelta !== 0) {
    parts.push(`${dummyDelta > 0 ? "+" : ""}${dummyDelta} event-dummy${Math.abs(dummyDelta) === 1 ? "" : "'s"}`);
  }
  if (parts.length === 0) return "Recept overgenomen — geen wijzigingen ten opzichte van de huidige tabel.";
  return `Recept overgenomen: ${parts.join(", ")}.`;
}

// Triggers the heavy, explicitly-requested deep data inspection (/api/inspect): Claude
// explores the actual CSV(s) with pandas in the sandboxed container and stores structured
// findings the chat architect then reads. Scope is "master" once a merge exists, else "raw".
function DeepInspectionButton({ projectId, scope }: { projectId: string; scope: "raw" | "master" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, scope }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Inspectie mislukt.");
      } else {
        const n = data.inspection?.findings?.length ?? 0;
        setMsg(`Inspectie klaar — ${n} bevinding(en). De architect leest ze nu mee in de chat.`);
        router.refresh();
      }
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
      <button
        onClick={run}
        disabled={busy}
        className="rounded-lg border border-border-strong px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-surface-2 disabled:opacity-50"
      >
        {busy ? "Claude onderzoekt de data…" : `Diepe data-inspectie (${scope === "master" ? "master" : "ruwe bronnen"})`}
      </button>
      <span className="text-xs text-fg-muted">
        Claude verkent de volledige data met code (outliers, seizoen, multicollineariteit) en voedt de bevindingen aan de architect.
      </span>
      {msg && <span className="w-full text-xs text-fg-muted">{msg}</span>}
    </div>
  );
}

export function DataPrepSection({
  projectId,
  sources,
  initialDataset,
}: {
  projectId: string;
  sources: SourceFile[];
  initialDataset: Dataset | null;
}) {
  const router = useRouter();
  const { pendingRecipe, clearPendingRecipe } = useWizardChat();
  const [drafts, setDrafts] = useState<DraftSource[]>([]);
  const [dummies, setDummies] = useState<DraftDummy[]>([]);
  // Derived features are authored by the architect (they carry op-specific params); the
  // builder reviews and can remove them here before merging.
  const [features, setFeatures] = useState<FeatureSpec[]>([]);
  const [newDummy, setNewDummy] = useState({ name: "", iso_year: new Date().getFullYear(), iso_week: 1 });
  const [dataset, setDataset] = useState<Dataset | null>(initialDataset);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceValues, setSourceValues] = useState<Record<string, Record<string, number[]>>>({});
  const [applyDiff, setApplyDiff] = useState<string | null>(null);
  const knownPaths = useMemo(() => new Set(drafts.map((d) => d.file.storage_path)), [drafts]);

  // Seed a draft row (with sniffed headers) for any uploaded file not yet represented, and
  // cache each numeric column's values for the sparklines below.
  useEffect(() => {
    const missing = sources.filter((f) => !knownPaths.has(f.storage_path));
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const added: DraftSource[] = [];
      for (const file of missing) {
        let headers: string[] = [];
        if (/\.csv$/i.test(file.name)) {
          const { data } = await supabase.storage.from(RAW_BUCKET).download(file.storage_path);
          if (data) {
            const text = await data.text();
            const parsed = Papa.parse<Record<string, unknown>>(text, {
              header: true,
              dynamicTyping: true,
              skipEmptyLines: true,
            });
            headers = parsed.meta.fields ?? [];
            const values: Record<string, number[]> = {};
            for (const col of headers) values[col] = extractNumericValues(parsed.data, col);
            if (!cancelled) setSourceValues((prev) => ({ ...prev, [file.storage_path]: values }));
          }
        }
        added.push({
          file,
          included: true,
          date_column: "",
          transforms: [],
          columns: headers.map((name) => ({ name, role: "", output_name: "", fill: "" })),
        });
      }
      if (!cancelled) setDrafts((prev) => [...prev, ...added]);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources, knownPaths]);

  // A recipe proposed by the architect fully replaces the current draft — same "apply
  // overwrites the editor" pattern as ModelConfigForm's proposed config — but confirms
  // itself with a one-sentence summary of what actually changed.
  useEffect(() => {
    if (pendingRecipe == null) return;
    const { sources: draftSources, dummies: draftDummies, features: draftFeatures } = draftFromRecipe(
      pendingRecipe as PrepareRecipe,
      sources,
    );
    setApplyDiff(summarizeApply(drafts, draftSources, dummies, draftDummies, features, draftFeatures));
    setDrafts(draftSources);
    setDummies(draftDummies);
    setFeatures(draftFeatures);
    clearPendingRecipe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRecipe, sources, clearPendingRecipe]);

  // Live dataset status: prepare jobs run off-request, so reflect draft -> preparing ->
  // prepared/failed as it happens, and refresh server data once there's a result to show
  // (e.g. so the model-config step below can pick up a newly approved dataset).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`datasets-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "mmm", table: "datasets", filter: `project_id=eq.${projectId}` },
        (payload) => {
          const row = payload.new as Dataset;
          setDataset((prev) => (!prev || new Date(row.created_at) >= new Date(prev.created_at) ? row : prev));
          if (row.status === "prepared" || row.status === "failed" || row.status === "approved") router.refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, router]);

  function updateColumn(sourceIdx: number, colIdx: number, patch: Partial<DraftColumn>) {
    setDrafts((prev) =>
      prev.map((s, i) =>
        i !== sourceIdx ? s : { ...s, columns: s.columns.map((c, j) => (j !== colIdx ? c : { ...c, ...patch })) },
      ),
    );
  }

  function addDummy() {
    if (!newDummy.name.trim()) return;
    setDummies((prev) => [...prev, { key: crypto.randomUUID(), ...newDummy }]);
    setNewDummy({ name: "", iso_year: newDummy.iso_year, iso_week: newDummy.iso_week });
  }

  async function submit() {
    const recipeSources = drafts
      .filter((s) => s.included)
      .map((s) => ({
        name: s.file.name.replace(/\.[^.]+$/, ""),
        storage_path: s.file.storage_path,
        date_column: s.date_column || undefined,
        transforms: s.transforms.length ? s.transforms : undefined,
        columns: s.columns
          .filter((c) => c.role !== "")
          .map((c) => ({
            name: c.name,
            role: c.role as ColumnRole,
            output_name: c.output_name || undefined,
            fill: c.role === "control" && c.fill ? c.fill : undefined,
          })),
      }))
      .filter((s) => s.columns.length > 0 || (s.transforms?.length ?? 0) > 0);

    if (recipeSources.length === 0) {
      setError("Wijs voor minstens één bestand minimaal één kolom een rol toe voordat je samenvoegt.");
      return;
    }

    const event_dummies: EventDummyConfig[] = dummies.map((d) => ({ name: d.name, weeks: [[d.iso_year, d.iso_week]] }));
    const recipe: PrepareRecipe = {
      sources: recipeSources,
      event_dummies: event_dummies.length ? event_dummies : undefined,
      features: features.length ? features : undefined,
    };

    setBusy(true);
    setError(null);
    const res = await fetch("/api/datasets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, recipe }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Kon de voorbereiding niet starten.");
      return;
    }
    router.refresh();
  }

  async function approve() {
    if (!dataset) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/datasets/${dataset.id}/approve`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Goedkeuren mislukt.");
      return;
    }
    router.refresh();
  }

  const datasetBusy = dataset?.status === "preparing";

  return (
    <div className="space-y-5">
      {sources.length === 0 ? (
        <p className="text-sm text-fg-muted">Upload eerst bestanden hierboven om ze te kunnen samenvoegen.</p>
      ) : (
        <>
          <p className="text-sm text-fg-muted">
            Wijs per bestand de datumkolom en per kolom een rol toe (of vraag de architect om een
            voorstel in de chat). Alleen kolommen met een rol gaan mee in de samenvoeging.
          </p>

          <DeepInspectionButton
            projectId={projectId}
            scope={dataset?.status === "prepared" || dataset?.status === "approved" ? "master" : "raw"}
          />

          {applyDiff && (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-accent/40 bg-accent-dim px-3 py-2 text-sm text-accent">
              <span>{applyDiff}</span>
              <button onClick={() => setApplyDiff(null)} className="flex-none text-accent/70 hover:text-accent" aria-label="Sluiten">
                ×
              </button>
            </div>
          )}

          <div className="space-y-4">
            {drafts.map((src, sIdx) => (
              <div key={src.file.storage_path} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-fg">
                    <input
                      type="checkbox"
                      checked={src.included}
                      onChange={(e) =>
                        setDrafts((prev) => prev.map((s, i) => (i !== sIdx ? s : { ...s, included: e.target.checked })))
                      }
                    />
                    {src.file.name}
                  </label>
                  <label className="ml-auto flex items-center gap-1.5 text-xs text-fg-muted">
                    Datumkolom:
                    <input
                      type="text"
                      value={src.date_column}
                      onChange={(e) =>
                        setDrafts((prev) => prev.map((s, i) => (i !== sIdx ? s : { ...s, date_column: e.target.value })))
                      }
                      placeholder="automatisch detecteren"
                      className="rounded border border-border-strong px-2 py-1 text-xs outline-none focus:border-accent/50"
                    />
                  </label>
                </div>
                {src.transforms.length > 0 && (
                  <div className="mb-2 space-y-1 rounded border border-border bg-surface-2 p-2">
                    <p className="text-xs font-medium text-fg-muted">
                      Opschoonstappen (vóór roltoewijzing, in volgorde):
                    </p>
                    {src.transforms.map((t, tIdx) => (
                      <div key={`${t.op}-${tIdx}`} className="flex items-center gap-2 text-xs text-fg-muted">
                        <span className="flex-1 font-mono">{tIdx + 1}. {transformLabel(t)}</span>
                        <button
                          onClick={() =>
                            setDrafts((prev) =>
                              prev.map((s, i) =>
                                i !== sIdx ? s : { ...s, transforms: s.transforms.filter((_, j) => j !== tIdx) },
                              ),
                            )
                          }
                          className="text-danger hover:underline"
                        >
                          verwijderen
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {src.columns.length === 0 ? (
                  <p className="text-xs text-fg-faint">
                    Geen kolommen automatisch herkend (bv. een xlsx-bestand) — vraag de architect om een
                    voorstel, of noem de kolomnamen in de chat.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-fg-faint">
                          <th className="py-1 pr-3 font-medium">Kolom</th>
                          <th className="py-1 pr-3 font-medium">Verloop</th>
                          <th className="py-1 pr-3 font-medium">Rol</th>
                          <th className="py-1 pr-3 font-medium">Naam in dataset</th>
                          <th className="py-1 pr-3 font-medium">Gaten vullen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {src.columns.map((col, cIdx) => {
                          const values = sourceValues[src.file.storage_path]?.[col.name] ?? [];
                          const suggestion = col.role === "" ? suggestRole(col.name) : null;
                          return (
                          <tr key={col.name}>
                            <td className="py-1.5 pr-3 text-fg">{col.name}</td>
                            <td className="py-1.5 pr-3">
                              <Sparkline values={values} />
                            </td>
                            <td className="py-1.5 pr-3">
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={col.role}
                                  onChange={(e) => updateColumn(sIdx, cIdx, { role: e.target.value as ColumnRole | "" })}
                                  className="rounded border border-border-strong px-1.5 py-1 text-xs outline-none focus:border-accent/50"
                                >
                                  {ROLE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                                {suggestion && (
                                  <button
                                    onClick={() => updateColumn(sIdx, cIdx, { role: suggestion })}
                                    title="Kolomnaam suggereert deze rol — klik om over te nemen"
                                    className="rounded-full border border-accent/40 bg-accent-dim px-2 py-0.5 text-[11px] font-medium text-accent hover:bg-accent/20"
                                  >
                                    voorstel: {ROLE_OPTIONS.find((o) => o.value === suggestion)?.label}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-1.5 pr-3">
                              <input
                                type="text"
                                value={col.output_name}
                                onChange={(e) => updateColumn(sIdx, cIdx, { output_name: e.target.value })}
                                placeholder={col.name}
                                disabled={col.role === ""}
                                className="w-32 rounded border border-border-strong px-1.5 py-1 text-xs outline-none focus:border-accent/50 disabled:bg-surface-2 disabled:text-fg-faint"
                              />
                            </td>
                            <td className="py-1.5 pr-3">
                              <select
                                value={col.fill}
                                onChange={(e) => updateColumn(sIdx, cIdx, { fill: e.target.value as FillStrategy | "" })}
                                disabled={col.role !== "control"}
                                className="rounded border border-border-strong px-1.5 py-1 text-xs outline-none focus:border-accent/50 disabled:bg-surface-2 disabled:text-fg-faint"
                              >
                                {FILL_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>

          <details className="rounded-lg border border-border p-3 text-sm">
            <summary className="cursor-pointer select-none font-medium text-fg">
              Eenmalige uitschieters (event-dummy&apos;s){dummies.length > 0 ? ` — ${dummies.length}` : ""}
            </summary>
            <div className="mt-3 space-y-2">
              {dummies.map((d) => (
                <div key={d.key} className="flex items-center gap-2 text-xs text-fg-muted">
                  <span className="flex-1">{d.name} — {d.iso_year} week {d.iso_week}</span>
                  <button
                    onClick={() => setDummies((prev) => prev.filter((x) => x.key !== d.key))}
                    className="text-danger hover:underline"
                  >
                    verwijderen
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs text-fg-muted">
                  Naam
                  <input
                    type="text"
                    value={newDummy.name}
                    onChange={(e) => setNewDummy((d) => ({ ...d, name: e.target.value }))}
                    placeholder="storing_week"
                    className="block w-32 rounded border border-border-strong px-2 py-1 text-xs outline-none focus:border-accent/50"
                  />
                </label>
                <label className="text-xs text-fg-muted">
                  ISO-jaar
                  <input
                    type="number"
                    value={newDummy.iso_year}
                    onChange={(e) => setNewDummy((d) => ({ ...d, iso_year: Number(e.target.value) }))}
                    className="block w-20 rounded border border-border-strong px-2 py-1 text-xs outline-none focus:border-accent/50"
                  />
                </label>
                <label className="text-xs text-fg-muted">
                  ISO-week
                  <input
                    type="number"
                    min={1}
                    max={53}
                    value={newDummy.iso_week}
                    onChange={(e) => setNewDummy((d) => ({ ...d, iso_week: Number(e.target.value) }))}
                    className="block w-16 rounded border border-border-strong px-2 py-1 text-xs outline-none focus:border-accent/50"
                  />
                </label>
                <button
                  onClick={addDummy}
                  className="rounded border border-border-strong px-2 py-1 text-xs text-fg-muted hover:bg-surface-2"
                >
                  Toevoegen
                </button>
              </div>
            </div>
          </details>

          <details className="rounded-lg border border-border p-3 text-sm" open={features.length > 0}>
            <summary className="cursor-pointer select-none font-medium text-fg">
              Afgeleide variabelen (features){features.length > 0 ? ` — ${features.length}` : ""}
            </summary>
            <div className="mt-3 space-y-2">
              {features.length === 0 ? (
                <p className="text-xs text-fg-faint">
                  Nog geen afgeleide variabelen. Vraag de architect in de chat om er een voor te stellen
                  (bv. een lag, een ratio/aandeel, een interactie of een terugkerende kalender-dummy).
                </p>
              ) : (
                features.map((f) => (
                  <div key={f.name} className="flex items-center gap-2 text-xs text-fg-muted">
                    <span className="flex-1 font-mono">{featureLabel(f)}</span>
                    <button
                      onClick={() => setFeatures((prev) => prev.filter((x) => x.name !== f.name))}
                      className="text-danger hover:underline"
                    >
                      verwijderen
                    </button>
                  </div>
                ))
              )}
            </div>
          </details>

          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            onClick={submit}
            disabled={busy || datasetBusy}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent-hover hover:shadow-glow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy || datasetBusy ? "Bezig…" : "Controleer & voeg samen"}
          </button>
        </>
      )}

      {dataset && (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={mapDatasetStatus(dataset.status)} />
            {dataset.n_weeks != null && dataset.window_start && dataset.window_end && (
              <p className="text-sm text-fg-muted">
                {dataset.window_start} t/m {dataset.window_end} ({dataset.n_weeks} weken)
              </p>
            )}
          </div>

          {dataset.status === "failed" && (
            <p className="text-sm text-danger">{dataset.error ?? "Samenvoegen is mislukt."}</p>
          )}

          <DataHealthMeter dataset={dataset} />

          {dataset.quality && <QualityReportView quality={dataset.quality} />}
          {dataset.preview && <DatasetPreviewTable preview={dataset.preview} />}

          {dataset.status === "prepared" && (
            <button
              onClick={approve}
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent-hover hover:shadow-glow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Bezig…" : "Goedkeuren als definitieve dataset"}
            </button>
          )}
          {dataset.status === "approved" && (
            <p className="text-sm text-fg-muted">
              Deze dataset is goedgekeurd en is het definitieve bestand voor de modelstap hieronder.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// The wizard's StatusBadge only knows Job/Project statuses; datasets reuse the same
// visual language via the closest equivalent rather than a third badge component.
function mapDatasetStatus(status: DatasetStatus): "queued" | "running" | "succeeded" | "failed" | "draft" | "published" {
  if (status === "preparing") return "running";
  if (status === "prepared") return "succeeded";
  if (status === "approved") return "published";
  if (status === "failed") return "failed";
  return "draft";
}
