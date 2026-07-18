"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
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

// The Haiku column classification (cached on source_files.mapping at upload time) is the
// richer source of suggestions: role + confidence per column. Falls back to the name-regex
// above when no classification exists (e.g. xlsx). Suggestions stay click-to-accept.
function mappingSuggestion(
  file: SourceFile,
  columnName: string,
): { role: ColumnRole; confidence: "hoog" | "middel" | "laag" } | null {
  const entry = file.mapping?.columns.find((c) => c.name === columnName);
  if (entry && (entry.role === "kpi" || entry.role === "spend" || entry.role === "control")) {
    return { role: entry.role, confidence: entry.confidence };
  }
  const regex = suggestRole(columnName);
  return regex ? { role: regex, confidence: "middel" } : null;
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
      <polyline points={points} fill="none" stroke="#0071E3" strokeWidth={1.25} strokeLinejoin="round" />
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
            className={`h-full rounded-full ${health.band === "goed" ? "bg-success" : "bg-danger"}`}
            style={{ width: `${health.score}%` }}
          />
        </div>
        <p className={`flex-none text-sm font-medium ${health.band === "goed" ? "text-success" : "text-danger"}`}>
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
        Sterk samenhangende kanalen zijn hier niet meegenomen — bekijk daarvoor de correlatiematrix in het verkennen-paneel bovenaan deze stap.
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
  if (parts.length === 0) return "Voorstel overgenomen — geen wijzigingen ten opzichte van de huidige tabel.";
  return `Voorstel overgenomen: ${parts.join(", ")}.`;
}

// Triggers the heavy, explicitly-requested deep data inspection (/api/inspect): Claude
// explores the actual CSV(s) with pandas in the sandboxed container and stores structured
// findings the chat architect then reads. Scope is "master" once a merge exists, else "raw".
function DeepInspectionButton({ projectId, scope }: { projectId: string; scope: "raw" | "master" }) {
  const router = useRouter();
  const { beginActivity } = useWizardChat();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    const activity = beginActivity("Claude onderzoekt de data met code — dit kan even duren…");
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
        setMsg(`Inspectie klaar — ${n} bevinding(en). De AI leest ze nu mee in de chat.`);
        router.refresh();
      }
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      activity.end();
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
        {busy ? "Claude onderzoekt de data…" : `Diepe data-inspectie (${scope === "master" ? "definitieve dataset" : "ruwe bronnen"})`}
      </button>
      <span className="text-xs text-fg-muted">
        Claude verkent de volledige data met code (outliers, seizoen, multicollineariteit) en voedt de bevindingen aan de AI. Duurt meestal 1–2 minuten.
      </span>
      {msg && <span className="w-full text-xs text-fg-muted">{msg}</span>}
    </div>
  );
}

// De primaire AI-actie van deze stap: de architect stelt een recept voor, voert het uit,
// leest het kwaliteitsrapport en corrigeert tot het schoon is (/api/prepare-auto). De
// bouwer beoordeelt daarna het resultaat en keurt zelf goed — dit bespaart alleen de
// saaie tussenrondes. Kan minuten duren; de knop blijft de status tonen en de dataset
// komt via Realtime vanzelf binnen.
function AutoPrepareButton({ projectId, disabled }: { projectId: string; disabled: boolean }) {
  const router = useRouter();
  const { beginActivity } = useWizardChat();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg("De AI stelt een recept voor en voert het uit — dit kan enkele minuten duren…");
    const activity = beginActivity("De AI bereidt de data automatisch voor — dit kan enkele minuten duren…");
    try {
      const res = await fetch("/api/prepare-auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error ?? "Automatisch voorbereiden mislukt.");
      } else {
        setMsg(data.message ?? "Klaar.");
        router.refresh();
      }
    } catch {
      setMsg("Verbinding mislukt — probeer het opnieuw of werk via de chat.");
    } finally {
      activity.end();
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-accent/30 bg-accent-dim/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={run}
          disabled={busy || disabled}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent-hover hover:shadow-glow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "AI is bezig…" : "Bereid automatisch voor (AI)"}
        </button>
        <span className="text-xs text-fg-muted">
          De AI kiest rollen, voegt samen en verfijnt tot het kwaliteitsrapport schoon is
          (max. 3 rondes, duurt meestal 2–5 minuten). Jij controleert en keurt goed.
        </span>
      </div>
      {msg && <p className="mt-2 text-xs text-fg-muted">{msg}</p>}
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
  const { pendingRecipe, clearPendingRecipe, sendToChat, beginActivity, applyRecipe, stagedRecipe, clearStagedRecipe } = useWizardChat();
  // De handmatige rollentabel is de geavanceerde route en start ingeklapt: de AI-route
  // bovenaan is de hoofdactie. Zodra een AI-voorstel wordt overgenomen klapt hij open,
  // zodat de gebruiker direct ziet wat er is ingevuld en kan controleren.
  const [manualOpen, setManualOpen] = useState(false);
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
  // Snapshot van vóór het laatst overgenomen architect-recept, zodat "Ongedaan maken"
  // één klik is — dat maakt experimenteren met voorstellen veilig.
  const [undoSnapshot, setUndoSnapshot] = useState<{
    drafts: DraftSource[];
    dummies: DraftDummy[];
    features: FeatureSpec[];
  } | null>(null);
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
    setUndoSnapshot({ drafts, dummies, features });
    setDrafts(draftSources);
    setDummies(draftDummies);
    setFeatures(draftFeatures);
    setManualOpen(true);
    clearPendingRecipe();
    clearStagedRecipe();
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

  // Zolang de dataset server-side wordt samengevoegd/gecontroleerd (status "preparing",
  // komt via Realtime binnen) toont de globale ActivityBar dat er gewerkt wordt.
  useEffect(() => {
    if (!datasetBusy) return;
    const activity = beginActivity("Dataset wordt samengevoegd en gecontroleerd…");
    return () => activity.end();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetBusy]);

  return (
    <div className="space-y-5">
      {sources.length === 0 ? (
        <p className="text-sm text-fg-muted">Upload eerst bestanden hierboven om ze te kunnen samenvoegen.</p>
      ) : (
        <>
          <AutoPrepareButton projectId={projectId} disabled={datasetBusy} />

          {stagedRecipe != null && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent-dim px-3 py-2.5">
              <p className="text-sm text-accent">
                <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
                De AI heeft in de chat een samenvoeg-voorstel gedaan. Neem het hier over om het
                te controleren en uit te voeren.
              </p>
              <span className="flex flex-none items-center gap-2">
                <button
                  onClick={() => applyRecipe(stagedRecipe)}
                  className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-bg transition hover:bg-accent-hover"
                >
                  Voorstel overnemen
                </button>
                <button
                  onClick={clearStagedRecipe}
                  className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
                >
                  Negeren
                </button>
              </span>
            </div>
          )}

          {applyDiff && (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-accent/40 bg-accent-dim px-3 py-2 text-sm text-accent">
              <span>{applyDiff}</span>
              <span className="flex flex-none items-center gap-2">
                {undoSnapshot && (
                  <button
                    onClick={() => {
                      setDrafts(undoSnapshot.drafts);
                      setDummies(undoSnapshot.dummies);
                      setFeatures(undoSnapshot.features);
                      setUndoSnapshot(null);
                      setApplyDiff("Voorstel ongedaan gemaakt — de tabel staat weer zoals ervoor.");
                    }}
                    className="rounded border border-accent/40 px-2 py-0.5 text-xs font-medium hover:bg-accent/20"
                  >
                    Ongedaan maken
                  </button>
                )}
                <button onClick={() => { setApplyDiff(null); setUndoSnapshot(null); }} className="text-accent/70 hover:text-accent" aria-label="Sluiten">
                  ×
                </button>
              </span>
            </div>
          )}

          <details
            className="rounded-lg border border-border p-3"
            open={manualOpen}
            onToggle={(e) => setManualOpen((e.currentTarget as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer select-none text-sm font-medium text-fg">
              Handmatig voorbereiden (geavanceerd)
              <span className="ml-2 font-normal text-fg-muted">
                — rollen per kolom zelf toewijzen, opschonen en samenvoegen
              </span>
            </summary>
            <div className="mt-3 space-y-4">
          <p className="text-sm text-fg-muted">
            Wijs per bestand de datumkolom en per kolom een rol toe (of vraag de AI om een
            voorstel in de chat). Alleen kolommen met een rol gaan mee in de samenvoeging.
          </p>

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
                  {src.columns.some((c) => c.role === "" && mappingSuggestion(src.file, c.name)) && (
                    <button
                      onClick={() =>
                        setDrafts((prev) =>
                          prev.map((sd, i) =>
                            i !== sIdx
                              ? sd
                              : {
                                  ...sd,
                                  columns: sd.columns.map((c) => {
                                    if (c.role !== "") return c;
                                    const sug = mappingSuggestion(sd.file, c.name);
                                    return sug ? { ...c, role: sug.role } : c;
                                  }),
                                },
                          ),
                        )
                      }
                      className="rounded-full border border-accent/40 bg-accent-dim px-2.5 py-1 text-[11px] font-medium text-accent hover:bg-accent/20"
                    >
                      Alle AI-suggesties overnemen
                    </button>
                  )}
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
                <button
                  onClick={() =>
                    sendToChat(
                      `Ik wil het bestand "${src.file.name}" opschonen of hervormen voordat de rollen worden toegewezen (bijvoorbeeld hernoemen, eenheden omrekenen, filteren, pivoteren of een datumformaat forceren). Kijk naar de voorbeeldrijen en stel de passende opschoonstappen voor in een samenvoeg-voorstel.`,
                    )
                  }
                  className="mb-2 rounded-full border border-border px-2.5 py-1 text-[11px] text-fg-muted transition hover:border-accent/40 hover:bg-accent-dim hover:text-accent"
                >
                  AI vragen om een opschoonstap voor dit bestand
                </button>
                {src.columns.length === 0 ? (
                  <p className="text-xs text-fg-faint">
                    Geen kolommen automatisch herkend (bv. een xlsx-bestand) — vraag de AI om een
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
                          const suggestion = col.role === "" ? mappingSuggestion(src.file, col.name) : null;
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
                                    onClick={() => updateColumn(sIdx, cIdx, { role: suggestion.role })}
                                    title="AI-classificatie van deze kolom — klik om over te nemen"
                                    className="rounded-full border border-accent/40 bg-accent-dim px-2 py-0.5 text-[11px] font-medium text-accent hover:bg-accent/20"
                                  >
                                    AI: {ROLE_OPTIONS.find((o) => o.value === suggestion.role)?.label}
                                    {suggestion.confidence !== "hoog" ? ` (${suggestion.confidence})` : ""}
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
                  Nog geen afgeleide variabelen. Vraag de AI in de chat om er een voor te stellen
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

          <DeepInspectionButton
            projectId={projectId}
            scope={dataset?.status === "prepared" || dataset?.status === "approved" ? "master" : "raw"}
          />

          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            onClick={submit}
            disabled={busy || datasetBusy}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent-hover hover:shadow-glow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy || datasetBusy ? "Bezig…" : "Controleer & voeg samen"}
          </button>
            </div>
          </details>
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

          {(dataset.status === "prepared" || dataset.status === "approved") && (
            <ColumnNotesEditor dataset={dataset} />
          )}

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

// Zakelijke context per kolom van de samengevoegde dataset: wat zit er zakelijk achter
// deze kolom ("tv_grps = landelijke campagne, alleen Q4")? Rechtstreeks door de bouwer
// ingevuld en door de AI zwaar meegewogen bij elk voorstel (zie datasetContext.ts).
// Bewust simpel: één tekstveld per kolom, expliciete opslaan-knop.
function ColumnNotesEditor({ dataset }: { dataset: Dataset }) {
  const roles = dataset.column_roles ?? {};
  const [notes, setNotes] = useState<Record<string, string>>(dataset.column_notes ?? {});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Nieuwe dataset (nieuwe samenvoeging) → editor herseeden vanaf de nieuwe rij.
  useEffect(() => {
    setNotes(dataset.column_notes ?? {});
    setMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset.id]);

  const columns = Object.keys(roles);
  if (columns.length === 0) return null;
  const dirty = JSON.stringify(notes) !== JSON.stringify(dataset.column_notes ?? {});
  const filled = Object.values(dataset.column_notes ?? {}).filter((v) => v.trim()).length;

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/datasets/${dataset.id}/column-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) setMsg((await res.json().catch(() => ({}))).error ?? "Opslaan mislukt.");
      else setMsg("Notities opgeslagen — de AI leest ze mee bij elk volgend voorstel.");
    } catch {
      setMsg("Verbinding mislukt — probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="rounded-lg border border-border p-3 text-sm" open={filled > 0}>
      <summary className="cursor-pointer select-none font-medium text-fg">
        Zakelijke context per kolom{filled > 0 ? ` — ${filled} ingevuld` : ""}
        <span className="ml-2 font-normal text-fg-muted">
          — vertel de AI wat er zakelijk achter elke kolom zit
        </span>
      </summary>
      <div className="mt-3 space-y-2">
        {columns.map((col) => (
          <label key={col} className="flex flex-wrap items-center gap-2 text-xs text-fg-muted sm:flex-nowrap">
            <span className="w-44 flex-none truncate font-mono text-fg" title={col}>
              {col}
            </span>
            <span className="flex-none rounded-full bg-surface-2 px-2 py-0.5 text-[11px]">{roles[col]}</span>
            <input
              type="text"
              value={notes[col] ?? ""}
              onChange={(e) => setNotes((prev) => ({ ...prev, [col]: e.target.value }))}
              placeholder='bv. "landelijke tv-campagne, liep alleen in Q4" of "prijs incl. acties"'
              className="min-w-[12rem] flex-1 rounded border border-border-strong px-2 py-1 text-xs outline-none focus:border-accent/50"
            />
          </label>
        ))}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={save}
            disabled={busy || !dirty}
            className="rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-fg transition hover:bg-surface-2 disabled:opacity-50"
          >
            {busy ? "Opslaan…" : "Notities opslaan"}
          </button>
          {msg && <span className="text-xs text-fg-muted">{msg}</span>}
        </div>
      </div>
    </details>
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
