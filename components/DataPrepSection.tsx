"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { useWizardChat } from "@/components/WizardChatContext";
import { ErrorNotice, StatusBadge } from "@/components/ui";
import { humanizeError } from "@/lib/humanizeMessage";
import { fetchJson, postJson } from "@/lib/fetchJson";
import { QualityReportView } from "@/components/QualityReportView";
import { SubStep, type SubStepState } from "@/components/SubStep";
import { DatasetPreviewTable } from "@/components/DatasetPreviewTable";
import { InspectionFindings } from "@/components/InspectionFindings";
import { extractNumericValues } from "@/lib/eda";
import { computeDataHealth } from "@/lib/dataHealth";
import type {
  AutoPrepareRound,
  ColumnRole,
  DataInspection,
  Dataset,
  DatasetStatus,
  EventDummyConfig,
  FeatureOp,
  FeatureSpec,
  FillStrategy,
  PrepareRecipe,
  SourceFile,
  TransformSpec,
} from "@/lib/types";

const RAW_BUCKET = "mmm-raw-data";
const DATE_ROLE = "__date__";
// "Marge" is geen mmm-core-rol maar een UI-actie: het gemiddelde van de kolom wordt
// overgenomen als projectmarge (mmm.projects.kpi_margin) — zie de onChange in de tabel.
const MARGIN_ROLE = "__margin__";
const ROLE_OPTIONS: { value: ColumnRole | "" | typeof DATE_ROLE | typeof MARGIN_ROLE; label: string }[] = [
  { value: "", label: "(niet gebruiken)" },
  { value: DATE_ROLE, label: "Datum" },
  { value: "kpi", label: "KPI" },
  { value: "spend", label: "Spend" },
  { value: "control", label: "Control" },
  { value: MARGIN_ROLE, label: "Marge (gemiddelde overnemen)" },
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

// Herkomst van een ingevulde waarde: kwam de rol/instelling uit een AI-voorstel, of
// heeft de gebruiker hem zelf gezet/aangepast? Review-metadata, alleen voor de UI — gaat
// niet mee in het recept naar de worker.
type Origin = "ai" | "user";

interface DraftColumn {
  name: string;
  role: ColumnRole | "";
  output_name: string;
  fill: FillStrategy | "";
  // Herkomst van de tóégekende rol. Leeg zolang er geen rol is.
  roleOrigin?: Origin;
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
  origin?: Origin;
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

// De volledige AI-duiding van een kolom (betekenis + eenheid), voor transparantie in de
// rollentabel: de gebruiker ziet niet alleen wélke rol de AI voorstelt, maar ook wat de
// AI denkt dat de kolom betekent — en kan dat dus controleren.
function mappingEntry(file: SourceFile, columnName: string) {
  return file.mapping?.columns.find((c) => c.name === columnName) ?? null;
}

// Uitklapbare verantwoording van de AI-classificatie van één bestand: de redenering van
// het model plus wat het over het bestand als geheel denkt (cadans, indeling, valuta).
// Puur weergave van data die al bij de upload is verzameld — geen extra AI-call.
function MappingExplainer({ file }: { file: SourceFile }) {
  const m = file.mapping;
  if (!m?.reasoning) return null;
  return (
    <details className="mb-2 rounded border border-border bg-surface-2 p-2 text-xs">
      <summary className="cursor-pointer select-none font-medium text-fg-muted">
        Hoe heeft de AI dit bestand gelezen?
      </summary>
      <div className="mt-2 space-y-1.5 text-fg-muted">
        <p className="flex flex-wrap gap-1.5">
          <span className="rounded-sm bg-surface px-2 py-0.5">cadans: {m.granularity}</span>
          <span className="rounded-sm bg-surface px-2 py-0.5">indeling: {m.layout}</span>
          {m.currency && <span className="rounded-sm bg-surface px-2 py-0.5">valuta: {m.currency}</span>}
        </p>
        <p>{m.reasoning}</p>
      </div>
    </details>
  );
}

// Handmatig een afgeleide variabele toevoegen — sluit de gap "de gebruiker kan features
// alleen verwijderen, niet zelf maken". Bewust een veilige, veelgebruikte deelverzameling
// van de ops (de complexe reshapes laat de architect beter voorstellen). Elke op weet zijn
// eigen arity en of hij een numerieke parameter nodig heeft; de vorm past zich daarop aan.
const MANUAL_FEATURE_OPS: {
  op: FeatureOp;
  label: string;
  arity: "one" | "two" | "many";
  param?: { key: string; label: string; default: number };
  hint: string;
}[] = [
  { op: "lag", label: "Lag (vertraagd effect)", arity: "one", param: { key: "weeks", label: "weken", default: 1 }, hint: "Waarde van N weken geleden — bv. prijs die na-ijlt." },
  { op: "rolling_mean", label: "Voortschrijdend gemiddelde", arity: "one", param: { key: "window", label: "venster (weken)", default: 4 }, hint: "Gladstrijken over een venster." },
  { op: "diff", label: "Weekverschil", arity: "one", param: { key: "weeks", label: "weken", default: 1 }, hint: "Verschil t.o.v. N weken eerder." },
  { op: "winsorize", label: "Uitschieters knippen (winsorize)", arity: "one", hint: "Kapt extreme waarden af — het kwaliteitsrapport stelt dit vaak voor." },
  { op: "log1p", label: "Log-transform (log1p)", arity: "one", hint: "Tempert een lange staart." },
  { op: "zscore", label: "Standaardiseren (z-score)", arity: "one", hint: "Centreren en schalen." },
  { op: "sum", label: "Som van kolommen", arity: "many", hint: "Bv. totale spend over kanalen." },
  { op: "ratio", label: "Verhouding (aandeel)", arity: "two", hint: "Eerste ÷ tweede — bv. eigen spend / totale spend." },
  { op: "product", label: "Interactie (product)", arity: "two", hint: "Eerste × tweede." },
];

function ManualFeatureForm({
  existingColumns,
  existingNames,
  onAdd,
}: {
  existingColumns: string[];
  existingNames: string[];
  onAdd: (spec: FeatureSpec) => void;
}) {
  const [opKey, setOpKey] = useState<FeatureOp>("lag");
  const [inputs, setInputs] = useState<string[]>([]);
  const [paramValue, setParamValue] = useState<number | "">("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const opDef = MANUAL_FEATURE_OPS.find((o) => o.op === opKey)!;
  const maxInputs = opDef.arity === "one" ? 1 : opDef.arity === "two" ? 2 : existingColumns.length;
  const needInputs = opDef.arity === "two" ? 2 : opDef.arity === "many" ? 2 : 1;

  function toggleInput(col: string) {
    setInputs((prev) => {
      if (prev.includes(col)) return prev.filter((c) => c !== col);
      if (opDef.arity === "one") return [col];
      if (opDef.arity === "two" && prev.length >= 2) return [prev[1], col];
      return [...prev, col];
    });
  }

  function suggestedName(): string {
    const base = inputs[0]?.replace(/[^a-z0-9]+/gi, "_").toLowerCase() ?? "feature";
    if (opKey === "lag") return `${base}_lag${paramValue || opDef.param?.default}`;
    if (opKey === "rolling_mean") return `${base}_ma${paramValue || opDef.param?.default}`;
    if (opKey === "ratio") return `${base}_share`;
    if (opKey === "sum") return "totaal";
    return `${base}_${opKey}`;
  }

  function add() {
    setErr(null);
    if (inputs.length < needInputs) {
      setErr(`Kies ${needInputs === 1 ? "een kolom" : `${needInputs} kolommen`} als invoer.`);
      return;
    }
    const finalName = (name.trim() || suggestedName()).replace(/[^a-z0-9_]+/gi, "_");
    if (!finalName) {
      setErr("Geef de nieuwe variabele een naam.");
      return;
    }
    if (existingNames.includes(finalName) || existingColumns.includes(finalName)) {
      setErr(`De naam “${finalName}” bestaat al — kies een andere.`);
      return;
    }
    const params: Record<string, number> = {};
    if (opDef.param) params[opDef.param.key] = paramValue === "" ? opDef.param.default : Number(paramValue);
    onAdd({ name: finalName, op: opKey, inputs: [...inputs], params: Object.keys(params).length ? params : undefined });
    setInputs([]);
    setParamValue("");
    setName("");
  }

  if (existingColumns.length === 0) {
    return (
      <p className="border-t border-border pt-2 text-xs text-fg-faint">
        Wijs eerst kolommen een rol toe hierboven; daarna kun je hier zelf een afgeleide variabele maken.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2 border-t border-border pt-3">
      <p className="text-xs font-medium text-fg">Zelf een afgeleide variabele toevoegen</p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={opKey}
          onChange={(e) => {
            setOpKey(e.target.value as FeatureOp);
            setInputs([]);
          }}
          className="rounded border border-border-strong px-1.5 py-1 text-xs outline-none focus:border-accent/50"
        >
          {MANUAL_FEATURE_OPS.map((o) => (
            <option key={o.op} value={o.op}>{o.label}</option>
          ))}
        </select>
        {opDef.param && (
          <label className="flex items-center gap-1 text-xs text-fg-muted">
            {opDef.param.label}:
            <input
              type="number"
              value={paramValue}
              placeholder={String(opDef.param.default)}
              onChange={(e) => setParamValue(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-16 rounded border border-border-strong px-1.5 py-1 text-xs outline-none focus:border-accent/50"
            />
          </label>
        )}
      </div>
      <p className="text-[11px] text-fg-faint">{opDef.hint}</p>
      <div className="flex flex-wrap gap-1.5">
        {existingColumns.map((col) => {
          const idx = inputs.indexOf(col);
          const selected = idx >= 0;
          return (
            <button
              key={col}
              onClick={() => toggleInput(col)}
              disabled={!selected && opDef.arity !== "many" && inputs.length >= maxInputs && opDef.arity !== "two"}
              className={`rounded-full border px-2 py-0.5 font-mono text-[11px] transition ${
                selected ? "border-accent/40 bg-accent-dim text-accent" : "border-border text-fg-muted hover:bg-surface-2"
              }`}
            >
              {opDef.arity === "two" && selected ? `${idx + 1}. ${col}` : col}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`naam (bv. ${suggestedName()})`}
          className="w-48 rounded border border-border-strong px-2 py-1 text-xs outline-none focus:border-accent/50"
        />
        <button
          onClick={add}
          className="rounded-lg border border-border-strong px-3 py-1 text-xs font-medium text-fg transition hover:bg-surface-2"
        >
          Toevoegen
        </button>
      </div>
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}

// Laatste rem vóór een dure fit: een compacte samenvatting van wát er wordt goedgekeurd,
// met de openstaande waarschuwingen en — het belangrijkste — een expliciete rode
// blokkade als het klaar-voor-model-verdict (te veel parameters) rood staat.
function ApprovalSummary({ dataset }: { dataset: Dataset }) {
  const roles = dataset.column_roles ?? {};
  const nChannels = Object.values(roles).filter((r) => r === "spend").length;
  const nColumns = Object.keys(roles).length;
  const issues = dataset.quality?.issues ?? [];
  const nErrors = issues.filter((i) => i.severity === "error").length;
  const nWarnings = issues.filter((i) => i.severity === "warning").length;
  const health = computeDataHealth(dataset);

  const facts = [
    dataset.n_weeks != null ? `${dataset.n_weeks} weken` : null,
    dataset.window_start && dataset.window_end ? `${dataset.window_start} – ${dataset.window_end}` : null,
    `${nChannels} kanaal${nChannels === 1 ? "" : "en"}`,
    `${nColumns} kolom${nColumns === 1 ? "" : "men"}`,
  ].filter(Boolean);

  return (
    <div className="rounded-lg border border-border bg-surface-2/60 p-3 text-sm">
      <p className="font-medium text-fg">Je staat op het punt goed te keuren:</p>
      <p className="mt-1 text-fg-muted">{facts.join(" · ")}</p>
      {(nWarnings > 0 || nErrors > 0) && (
        <p className="mt-1.5 text-xs text-fg-muted">
          {nErrors > 0 && <span className="font-medium text-danger">{nErrors} openstaande fout(en). </span>}
          {nWarnings > 0 && `${nWarnings} openstaande waarschuwing${nWarnings === 1 ? "" : "en"} — controleer ze bij 2c hierboven.`}
        </p>
      )}
      {health && health.band !== "goed" && (
        <p className={`mt-1.5 text-xs font-medium ${health.band === "zwak" ? "text-danger" : "text-warn"}`}>
          {health.band === "zwak"
            ? "Let op: de data is volgens de gezondheidscheck nog niet klaar om te modelleren — een fit zal onbetrouwbaar zijn."
            : "De data is bruikbaar, maar met kanttekeningen (zie de gezondheidsmeter bij 2c)."}
        </p>
      )}
    </div>
  );
}

// Herkomst-badge: laat in één oogopslag zien of een rol/instelling door de AI is
// voorgesteld of door de gebruiker zelf gezet. Kern van de transparantie: bij het
// controleren en goedkeuren weet je precies wat je van de AI overneemt.
function OriginBadge({ origin }: { origin?: Origin }) {
  if (!origin) return null;
  const isAi = origin === "ai";
  return (
    <span
      title={isAi ? "Door de AI voorgesteld" : "Door jou ingesteld"}
      className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
        isAi ? "bg-accent-dim text-accent" : "bg-surface-2 text-fg-muted"
      }`}
    >
      {isAi ? "AI" : "jij"}
    </span>
  );
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
      <polyline points={points} fill="none" stroke="#00693E" strokeWidth={1.25} strokeLinejoin="round" />
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
        <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-surface-2">
          <div
            className={`h-full rounded-full ${
              health.band === "goed" ? "bg-success" : health.band === "redelijk" ? "bg-warn" : "bg-danger"
            }`}
            style={{ width: `${health.score}%` }}
          />
        </div>
        <p
          className={`flex-none text-sm font-medium ${
            health.band === "goed" ? "text-success" : health.band === "redelijk" ? "text-warn" : "text-danger"
          }`}
        >
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
      // Alles uit een architect-recept is per definitie door de AI voorgesteld.
      roleOrigin: c.role ? ("ai" as Origin) : undefined,
    })),
  }));
  const dummies: DraftDummy[] = (recipe.event_dummies ?? []).flatMap((d, i) =>
    d.weeks.map(([y, w], j) => ({ key: `${i}-${j}`, name: d.weeks.length > 1 ? `${d.name}_${y}w${w}` : d.name, iso_year: y, iso_week: w, origin: "ai" as Origin })),
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
      const res = await postJson<{ inspection?: { findings?: unknown[] } }>("/api/inspect", {
        project_id: projectId,
        scope,
      });
      if (!res.ok) {
        setMsg(humanizeError(res.error, "De inspectie is niet gelukt — probeer het opnieuw.").text);
      } else {
        const n = res.data.inspection?.findings?.length ?? 0;
        setMsg(`Inspectie klaar — ${n} bevinding(en). De AI leest ze nu mee in de chat.`);
        router.refresh();
      }
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
  const [rounds, setRounds] = useState<AutoPrepareRound[]>([]);

  async function run() {
    setBusy(true);
    setRounds([]);
    setMsg("De AI stelt een recept voor en voert het uit — dit kan enkele minuten duren…");
    const activity = beginActivity("De AI bereidt de data automatisch voor — dit kan enkele minuten duren…");
    try {
      const res = await postJson<{ message?: string; rounds?: AutoPrepareRound[] }>("/api/prepare-auto", {
        project_id: projectId,
      });
      setRounds(res.data.rounds ?? []);
      if (!res.ok) {
        setMsg(humanizeError(res.error, "Automatisch voorbereiden is niet gelukt — probeer het opnieuw of werk via “Handmatig voorbereiden”.").text);
      } else {
        setMsg(res.data.message ?? "Klaar.");
        router.refresh();
      }
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
          (max. 3 rondes, duurt meestal 2–5 minuten). Jij controleert en keurt goed — en
          ziet hieronder per ronde wat de AI heeft gedaan.
        </span>
      </div>
      {msg && <p className="mt-2 text-xs text-fg-muted">{msg}</p>}
      {rounds.length > 0 && <AutoPrepareTimeline rounds={rounds} />}
    </div>
  );
}

// Transparantie-tijdlijn van de agentische loop: per ronde de eigen toelichting van de
// AI, het voorgestelde recept en de uitkomst. Zo is "de AI heeft het gedaan" nooit een
// zwarte doos — de gebruiker kan elke ronde nalezen voordat hij goedkeurt.
function AutoPrepareTimeline({ rounds }: { rounds: AutoPrepareRound[] }) {
  return (
    <ol className="mt-3 space-y-2 border-t border-accent/20 pt-3">
      {rounds.map((r) => (
        <li key={r.round} className="flex gap-2.5 text-xs">
          <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-accent/15 font-mono font-semibold text-accent">
            {r.round}
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-fg">
              Voorstel: {r.recipe_summary} → <span className="font-medium">{r.result}</span>
            </p>
            {r.note && <p className="whitespace-pre-wrap text-fg-muted">{r.note}</p>}
            {r.open_issues.length > 0 && (
              <ul className="space-y-0.5 text-fg-faint">
                {r.open_issues.map((issue, i) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function DataPrepSection({
  projectId,
  sources,
  initialDataset,
  latestInspection = null,
}: {
  projectId: string;
  sources: SourceFile[];
  initialDataset: Dataset | null;
  latestInspection?: DataInspection | null;
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
  // Herkomst per feature-naam: features uit een AI-recept zijn "ai", zelf toegevoegde
  // "user". Een losse map i.p.v. een veld op FeatureSpec, zodat het recept dat naar de
  // worker gaat ongewijzigd blijft.
  const [featureOrigins, setFeatureOrigins] = useState<Record<string, Origin>>({});
  const [newDummy, setNewDummy] = useState({ name: "", iso_year: new Date().getFullYear(), iso_week: 1 });
  const [dataset, setDataset] = useState<Dataset | null>(initialDataset);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceValues, setSourceValues] = useState<Record<string, Record<string, number[]>>>({});
  const [applyDiff, setApplyDiff] = useState<string | null>(null);
  const [marginMsg, setMarginMsg] = useState<string | null>(null);
  // Snapshot van vóór het laatst overgenomen architect-recept, zodat "Ongedaan maken"
  // één klik is — dat maakt experimenteren met voorstellen veilig.
  const [undoSnapshot, setUndoSnapshot] = useState<{
    drafts: DraftSource[];
    dummies: DraftDummy[];
    features: FeatureSpec[];
  } | null>(null);
  const knownPaths = useMemo(() => new Set(drafts.map((d) => d.file.storage_path)), [drafts]);

  // De kolomnamen die ná de samenvoeging in de master-tabel bestaan — de geldige inputs
  // voor een handmatige feature: elke kolom met een rol (onder zijn output-naam) plus de
  // al gedefinieerde features.
  const availableColumns = useMemo(() => {
    const names = new Set<string>();
    for (const s of drafts) {
      if (!s.included) continue;
      for (const c of s.columns) {
        if (c.role !== "") names.add(c.output_name || c.name);
      }
    }
    for (const f of features) names.add(f.name);
    return [...names];
  }, [drafts, features]);

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
    setFeatureOrigins(Object.fromEntries(draftFeatures.map((f) => [f.name, "ai" as Origin])));
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
    setDummies((prev) => [...prev, { key: crypto.randomUUID(), ...newDummy, origin: "user" as Origin }]);
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
    const res = await postJson("/api/datasets", { project_id: projectId, recipe });
    setBusy(false);
    if (!res.ok) {
      setError(humanizeError(res.error, "Kon de voorbereiding niet starten.").text);
      return;
    }
    router.refresh();
  }

  async function approve() {
    if (!dataset) return;
    setBusy(true);
    setError(null);
    const res = await fetchJson(`/api/datasets/${dataset.id}/approve`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      setError(humanizeError(res.error, "Goedkeuren is niet gelukt — probeer het opnieuw.").text);
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

  // Substap-statussen: één duidelijke lijn — samenvoegen (2b) -> controleren (2c) ->
  // goedkeuren (2d). De actieve substap klapt vanzelf open; klaar/te-doen klapt in.
  const mergeState: SubStepState =
    dataset?.status === "failed"
      ? "attention"
      : dataset?.status === "prepared" || dataset?.status === "approved"
        ? "done"
        : "active";
  const reviewState: SubStepState =
    dataset?.status === "failed"
      ? "attention"
      : dataset?.status === "approved"
        ? "done"
        : dataset?.status === "prepared"
          ? "active"
          : "todo";
  const approveState: SubStepState =
    dataset?.status === "approved" ? "done" : dataset?.status === "prepared" ? "active" : "todo";

  return (
    <div className="space-y-3">
      {sources.length === 0 ? (
        <p className="text-sm text-fg-muted">Upload eerst bestanden bij stap 1 om ze te kunnen samenvoegen.</p>
      ) : (
        <>
          <SubStep
            label="2b"
            title="Voeg samen tot één modeltabel"
            state={mergeState}
            summary={
              datasetBusy
                ? "Wordt samengevoegd en gecontroleerd…"
                : mergeState === "done"
                  ? "Samengevoegd — controleer het resultaat bij 2c"
                  : "Laat de AI het doen, of wijs zelf rollen toe"
            }
          >
            <div className="space-y-4">
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

          {marginMsg && (
            <p className="rounded-lg border border-accent/40 bg-accent-dim px-3 py-2 text-xs text-accent">{marginMsg}</p>
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
                                    return sug ? { ...c, role: sug.role, roleOrigin: "ai" as Origin } : c;
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
                  <span className="ml-auto text-xs text-fg-muted">
                    Datumkolom:{" "}
                    {src.date_column ? (
                      <span className="font-medium text-fg">{src.date_column}</span>
                    ) : (
                      <span className="text-fg-faint">automatisch detecteren — of kies “Datum” als rol</span>
                    )}
                  </span>
                </div>
                <MappingExplainer file={src.file} />
                {src.transforms.length > 0 && (
                  <div className="mb-2 space-y-1 rounded border border-border bg-surface-2 p-2">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                      Opschoonstappen (vóór roltoewijzing, in volgorde): <OriginBadge origin="ai" />
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
                          const aiEntry = mappingEntry(src.file, col.name);
                          return (
                          <tr key={col.name}>
                            <td className="py-1.5 pr-3">
                              <span className="text-fg">{col.name}</span>
                              {aiEntry?.unit && (
                                <span className="ml-1.5 rounded-sm bg-surface-2 px-1.5 py-0.5 text-[10px] text-fg-muted">
                                  {aiEntry.unit}
                                </span>
                              )}
                              {aiEntry?.meaning && (
                                <span className="mt-0.5 block max-w-[16rem] text-[11px] leading-snug text-fg-faint">
                                  AI: {aiEntry.meaning}
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 pr-3">
                              <Sparkline values={values} />
                            </td>
                            <td className="py-1.5 pr-3">
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={src.date_column === col.name ? DATE_ROLE : col.role}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === MARGIN_ROLE) {
                                      // Gemiddelde van de kolom overnemen als marge per
                                      // verkocht product; de kolom zelf gaat niet mee in
                                      // de samenvoeging (rol blijft leeg).
                                      const vals = sourceValues[src.file.storage_path]?.[col.name] ?? [];
                                      if (vals.length === 0) {
                                        setMarginMsg(`Kolom “${col.name}” bevat geen numerieke waarden — er valt geen gemiddelde marge uit te halen.`);
                                        return;
                                      }
                                      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
                                      void postJson("/api/business-context", {
                                        project_id: projectId,
                                        kpi_margin: Math.round(avg * 100) / 100,
                                      }).then((res) => {
                                        if (res.ok) {
                                          setMarginMsg(
                                            `Gemiddelde van “${col.name}” overgenomen als marge per verkocht product: €${(Math.round(avg * 100) / 100).toLocaleString("nl-NL")}. Zichtbaar in het dashboard (ROI) en aanpasbaar bij stap 3.`,
                                          );
                                          router.refresh();
                                        } else {
                                          setMarginMsg(res.error ?? "Marge overnemen is niet gelukt.");
                                        }
                                      });
                                      return;
                                    }
                                    if (v === DATE_ROLE) {
                                      // Deze kolom wordt de datumkolom van het bestand
                                      // (één per bestand); een rol heeft hij dan niet.
                                      setDrafts((prev) =>
                                        prev.map((sd, i) =>
                                          i !== sIdx
                                            ? sd
                                            : {
                                                ...sd,
                                                date_column: col.name,
                                                columns: sd.columns.map((c, j) => (j === cIdx ? { ...c, role: "" } : c)),
                                              },
                                        ),
                                      );
                                    } else {
                                      setDrafts((prev) =>
                                        prev.map((sd, i) =>
                                          i !== sIdx
                                            ? sd
                                            : {
                                                ...sd,
                                                // Was dit de datumkolom, dan valt het bestand
                                                // terug op automatische detectie.
                                                date_column: sd.date_column === col.name ? "" : sd.date_column,
                                                columns: sd.columns.map((c, j) =>
                                                  j === cIdx
                                                    ? { ...c, role: v as ColumnRole | "", roleOrigin: v ? ("user" as Origin) : undefined }
                                                    : c,
                                                ),
                                              },
                                        ),
                                      );
                                    }
                                  }}
                                  className="rounded border border-border-strong px-1.5 py-1 text-xs outline-none focus:border-accent/50"
                                >
                                  {ROLE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                                {col.role !== "" && <OriginBadge origin={col.roleOrigin} />}
                                {suggestion && (
                                  <button
                                    onClick={() => updateColumn(sIdx, cIdx, { role: suggestion.role, roleOrigin: "ai" })}
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
                  <OriginBadge origin={d.origin} />
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
                    <OriginBadge origin={featureOrigins[f.name] ?? "ai"} />
                    <button
                      onClick={() => setFeatures((prev) => prev.filter((x) => x.name !== f.name))}
                      className="text-danger hover:underline"
                    >
                      verwijderen
                    </button>
                  </div>
                ))
              )}
              <ManualFeatureForm
                existingColumns={availableColumns}
                existingNames={features.map((f) => f.name)}
                onAdd={(spec) => {
                  setFeatures((prev) => [...prev, spec]);
                  setFeatureOrigins((prev) => ({ ...prev, [spec.name]: "user" }));
                }}
              />
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
            </div>
          </details>

              <DeepInspectionButton
                projectId={projectId}
                scope={dataset?.status === "prepared" || dataset?.status === "approved" ? "master" : "raw"}
              />
              <InspectionFindings inspection={latestInspection} />
            </div>
          </SubStep>

          <SubStep
            label="2c"
            title="Controleer het resultaat"
            state={reviewState}
            summary={
              dataset
                ? dataset.n_weeks != null && dataset.window_start && dataset.window_end
                  ? `${dataset.window_start} t/m ${dataset.window_end} (${dataset.n_weeks} weken)`
                  : undefined
                : "Beschikbaar zodra de samenvoeging (2b) klaar is"
            }
          >
            {!dataset ? (
              <p className="text-sm text-fg-muted">
                Nog geen samengevoegde dataset. Rond eerst substap 2b af — daarna zie je hier het
                kwaliteitsrapport, de gezondheidsmeter en een voorbeeld van de tabel.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <StatusBadge status={mapDatasetStatus(dataset.status)} />
                  {dataset.n_weeks != null && dataset.window_start && dataset.window_end && (
                    <p className="text-sm text-fg-muted">
                      {dataset.window_start} t/m {dataset.window_end} ({dataset.n_weeks} weken)
                    </p>
                  )}
                </div>

                {dataset.status === "failed" && (
                  <ErrorNotice
                    raw={dataset.error}
                    fallback="Het samenvoegen is niet gelukt. Controleer de bestanden of vraag de AI in de chat wat er misging."
                  />
                )}

                <DataHealthMeter dataset={dataset} />

                {(dataset.status === "prepared" || dataset.status === "approved") && (
                  <ColumnNotesEditor dataset={dataset} />
                )}

                {dataset.quality && <QualityReportView quality={dataset.quality} />}
                {dataset.preview && <DatasetPreviewTable preview={dataset.preview} />}
              </div>
            )}
          </SubStep>

          <SubStep
            label="2d"
            title="Keur goed als definitieve dataset"
            state={approveState}
            summary={
              approveState === "done"
                ? "Goedgekeurd — door naar stap 3 (model configureren)"
                : approveState === "active"
                  ? "Alles gecontroleerd? Dan is dit de laatste klik van deze stap"
                  : "Beschikbaar zodra er een gecontroleerd resultaat is"
            }
          >
            {dataset?.status === "prepared" ? (
              <div className="space-y-3">
                <ApprovalSummary dataset={dataset} />
                <p className="text-sm text-fg-muted">
                  Met goedkeuren maak je deze tabel het definitieve bestand waarop het model gaat
                  rekenen. Je kunt daarna altijd nog opnieuw samenvoegen.
                </p>
                <button
                  onClick={approve}
                  disabled={busy}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent-hover hover:shadow-glow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Bezig…" : "Goedkeuren als definitieve dataset"}
                </button>
              </div>
            ) : dataset?.status === "approved" ? (
              <p className="text-sm text-fg-muted">
                Deze dataset is goedgekeurd en is het definitieve bestand voor de modelstap (stap 3).
              </p>
            ) : (
              <p className="text-sm text-fg-muted">
                Eerst samenvoegen (2b) en controleren (2c) — daarna keur je hier het resultaat goed.
              </p>
            )}
          </SubStep>
        </>
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
    const res = await postJson(`/api/datasets/${dataset.id}/column-notes`, { notes });
    setMsg(res.ok ? "Notities opgeslagen — de AI leest ze mee bij elk volgend voorstel." : (res.error ?? "Opslaan mislukt."));
    setBusy(false);
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
            <span className="flex-none rounded-sm bg-surface-2 px-2 py-0.5 text-[11px]">{roles[col]}</span>
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
