"use client";

// De inline-kaarten die ALS bubbels in de chatstroom verschijnen. Elke kaart hoort bij één
// fase van de deterministische wizard-FSM. Ze roepen de bestaande API-routes aan (upload,
// /api/datasets, approve, /api/jobs, publish) — de zware backend blijft ongewijzigd.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Upload, Trash2, Check, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildSourceProfile } from "@/lib/dataProfile";
import { humanizeError } from "@/lib/humanizeMessage";
import { QualityReportView } from "@/components/QualityReportView";
import { DatasetPreviewTable } from "@/components/DatasetPreviewTable";
import { SummaryView } from "@/components/SummaryView";
import { HierarchicalSummaryView } from "@/components/HierarchicalSummaryView";
import { RunHistory } from "@/components/RunHistory";
import { AnalysisView } from "@/components/AnalysisView";
import { StatusBadge } from "@/components/ui";
import { postJson } from "@/lib/fetchJson";
import { isHierSummary } from "@/lib/types";
import type {
  AdstockType,
  ChannelConfig,
  ChannelType,
  ClientSummary,
  ColumnRole,
  Dataset,
  EventDummyConfig,
  FeatureOp,
  FeatureSpec,
  JobConfig,
  LikelihoodType,
  ModelRun,
  PrepareRecipe,
  RunAnalysis,
  SaturationType,
  SourceConfig,
  SourceFile,
  SourceProfile,
} from "@/lib/types";

const BUCKET = "mmm-raw-data";
const PREVIEW_LINES = 15;

// Zachte primaire/secundaire knop-stijlen, consistent met de rest van de app.
const BTN_PRIMARY =
  "inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-fg-faint";
const BTN_SECONDARY =
  "inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-fg transition hover:bg-surface-2 disabled:opacity-50";

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-surface-1 p-4">{children}</div>;
}

// ---------------------------------------------------------------------------
// Fase "upload" — precies ÉÉN databestand. Een tweede upload wordt geweigerd; het bestaande
// bestand kan wel vervangen worden (eerst verwijderen). Dit dwingt "1 CSV, geen samenvoegen" af.
// ---------------------------------------------------------------------------

function buildProfileFromCsv(text: string): SourceProfile | null {
  try {
    const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
    const columns = parsed.meta.fields ?? [];
    if (columns.length === 0 || parsed.data.length === 0) return null;
    return buildSourceProfile(columns, parsed.data);
  } catch {
    return null;
  }
}

export function UploadCard({ projectId, source }: { projectId: string; source: SourceFile | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const MAX_FILE_MB = 50;
  function validate(file: File): string | null {
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) return `"${file.name}" is geen CSV- of Excel-bestand.`;
    if (file.size === 0) return `"${file.name}" is leeg.`;
    if (file.size > MAX_FILE_MB * 1024 * 1024)
      return `"${file.name}" is groter dan ${MAX_FILE_MB} MB. Aggregeer naar weekniveau of kies een kortere periode.`;
    return null;
  }

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    if (list.length > 1) {
      setError("Je werkt met precies één bestand. Kies één CSV of Excel-bestand.");
      return;
    }
    const file = list[0];
    const invalid = validate(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const path = `${projectId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
    if (upErr) {
      setBusy(false);
      setError(humanizeError(upErr.message, "Het uploaden is niet gelukt — probeer het opnieuw.").text);
      return;
    }
    const isCsv = /\.csv$/i.test(file.name);
    const csvText = isCsv ? await file.text() : null;
    const preview = csvText ? csvText.split("\n").slice(0, PREVIEW_LINES).join("\n") : null;
    const profile = csvText ? buildProfileFromCsv(csvText) : null;
    const { data: inserted, error: rowErr } = await supabase
      .schema("mmm")
      .from("source_files")
      .insert({ project_id: projectId, name: file.name, storage_path: path, preview, profile })
      .select("id")
      .single();
    if (rowErr) {
      setBusy(false);
      setError(humanizeError(rowErr.message, "Het opslaan is niet gelukt — probeer het opnieuw.").text);
      return;
    }
    // Goedkope kolom-classificatie op de achtergrond: die vult straks de rol-indeling voor
    // — zonder extra klik of extra dure call op het moment zelf.
    if (inserted?.id && preview) {
      void fetch("/api/classify-columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_file_id: inserted.id }),
      }).catch(() => {});
    }
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!source) return;
    if (!confirm(`"${source.name}" verwijderen en een ander bestand kiezen?`)) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([source.storage_path]);
    await supabase.schema("mmm").from("source_files").delete().eq("id", source.id);
    setBusy(false);
    router.refresh();
  }

  if (source) {
    return (
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg">{source.name}</p>
            <p className="text-xs text-fg-muted">Je databestand staat klaar.</p>
          </div>
          <button onClick={remove} disabled={busy} className="flex-none rounded-lg p-2 text-fg-faint transition hover:bg-danger-dim hover:text-danger disabled:opacity-50" aria-label="Bestand vervangen">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </Card>
    );
  }

  return (
    <Card>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) void upload(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
          dragOver ? "border-accent/50 bg-accent-dim" : "border-border"
        }`}
      >
        <Upload className="h-5 w-5 text-fg-faint" />
        <p className="text-sm text-fg-muted">Sleep je CSV hierheen, of</p>
        <label className={BTN_SECONDARY + " cursor-pointer"}>
          {busy ? "Uploaden…" : "Kies je databestand"}
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              if (e.target.files) void upload(e.target.files);
              e.target.value = "";
            }}
            disabled={busy}
            className="hidden"
          />
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Card>
  );
}

// --- Geavanceerd (optioneel): event-dummy's + afgeleide features ----------------------
// Uitklapbare secties in de rol-indeling. Beide zijn declaratief en gaan mee in het
// PrepareRecipe; ze blijven verborgen achter "Geavanceerd" zodat de standaardflow simpel blijft.

const BTN_ADD = "text-xs font-medium text-accent transition hover:underline";
const INPUT_SM = "rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-fg placeholder:text-fg-faint outline-none focus:border-accent/50";

// Parseert tokens als "2023-W48", "2023-48" of "2023 48" naar [iso_jaar, iso_week]-paren.
function parseWeeks(text: string): [number, number][] {
  const out: [number, number][] = [];
  for (const tok of text.split(/[,;]+/)) {
    const m = tok.trim().match(/^(\d{4})\s*[-\sWw]+\s*(\d{1,2})$/);
    if (m) {
      const y = Number(m[1]);
      const w = Number(m[2]);
      if (w >= 1 && w <= 53) out.push([y, w]);
    }
  }
  return out;
}

function EventDummiesEditor({ value, onChange }: { value: EventDummyConfig[]; onChange: (v: EventDummyConfig[]) => void }) {
  // Interne rijen bewaren de rauwe tekst; naar buiten geven we alleen geldige, geparste events.
  const [rows, setRows] = useState<{ name: string; weeksText: string }[]>(
    value.length
      ? value.map((e) => ({ name: e.name, weeksText: e.weeks.map(([y, w]) => `${y}-W${w}`).join(", ") }))
      : [{ name: "", weeksText: "" }],
  );

  function push(next: { name: string; weeksText: string }[]) {
    setRows(next);
    onChange(
      next
        .map((r) => ({ name: r.name.trim(), weeks: parseWeeks(r.weeksText) }))
        .filter((e) => e.name && e.weeks.length > 0),
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-fg-faint">
        Markeer bijzondere weken (bijv. Black Friday, een storing) als 0/1-kolom. Weken als
        “2023-W48, 2024-W47”.
      </p>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={r.name}
            onChange={(e) => push(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            placeholder="naam (bv. black_friday)"
            className={INPUT_SM + " w-40"}
          />
          <input
            value={r.weeksText}
            onChange={(e) => push(rows.map((x, j) => (j === i ? { ...x, weeksText: e.target.value } : x)))}
            placeholder="2023-W48, 2024-W47"
            className={INPUT_SM + " flex-1"}
          />
          <button onClick={() => push(rows.filter((_, j) => j !== i))} className="text-fg-faint hover:text-danger" aria-label="Verwijderen">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button onClick={() => setRows([...rows, { name: "", weeksText: "" }])} className={BTN_ADD}>
        + Event toevoegen
      </button>
    </div>
  );
}

// Ondersteunde feature-ops met hun param-sleutel (spiegelt mmm_core.ingestion.feature_engineering).
const FEATURE_OPS: { op: FeatureOp; label: string; inputs: "one" | "two"; paramKey?: "weeks" | "window"; paramLabel?: string }[] = [
  { op: "lag", label: "Vertraging (lag)", inputs: "one", paramKey: "weeks", paramLabel: "weken" },
  { op: "rolling_mean", label: "Voortschrijdend gemiddelde", inputs: "one", paramKey: "window", paramLabel: "venster" },
  { op: "rolling_sum", label: "Voortschrijdende som", inputs: "one", paramKey: "window", paramLabel: "venster" },
  { op: "diff", label: "Verschil t.o.v. eerdere week", inputs: "one", paramKey: "weeks", paramLabel: "weken" },
  { op: "log1p", label: "Log(1+x)", inputs: "one" },
  { op: "zscore", label: "Z-score (standaardiseren)", inputs: "one" },
  { op: "ratio", label: "Verhouding (a ÷ b)", inputs: "two" },
];

interface FeatureRow {
  name: string;
  op: FeatureOp;
  input1: string;
  input2: string;
  param: string;
}

function FeaturesEditor({
  columns,
  value,
  onChange,
}: {
  columns: string[];
  value: FeatureSpec[];
  onChange: (v: FeatureSpec[]) => void;
}) {
  const [rows, setRows] = useState<FeatureRow[]>(
    value.length
      ? value.map((f) => ({
          name: f.name,
          op: f.op as FeatureOp,
          input1: f.inputs[0] ?? "",
          input2: f.inputs[1] ?? "",
          param: String((f.params?.weeks ?? f.params?.window ?? "") as number | string),
        }))
      : [],
  );

  function toSpecs(next: FeatureRow[]): FeatureSpec[] {
    const specs: FeatureSpec[] = [];
    for (const r of next) {
      const meta = FEATURE_OPS.find((o) => o.op === r.op);
      if (!meta || !r.name.trim() || !r.input1) continue;
      const inputs = meta.inputs === "two" ? [r.input1, r.input2].filter(Boolean) : [r.input1];
      if (meta.inputs === "two" && inputs.length !== 2) continue;
      const spec: FeatureSpec = { name: r.name.trim(), op: r.op, inputs };
      if (meta.paramKey) {
        const n = Number(r.param);
        if (Number.isFinite(n) && n >= 1) spec.params = { [meta.paramKey]: n };
        else continue; // param verplicht voor deze op
      }
      specs.push(spec);
    }
    return specs;
  }

  function push(next: FeatureRow[]) {
    setRows(next);
    onChange(toSpecs(next));
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-fg-faint">
        Bereken extra variabelen uit bestaande kolommen (bijv. een vertraagde spend of een
        voortschrijdend gemiddelde) die als control meegaan.
      </p>
      <datalist id="feature-cols">
        {columns.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      {rows.map((r, i) => {
        const meta = FEATURE_OPS.find((o) => o.op === r.op)!;
        return (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input
              value={r.name}
              onChange={(e) => push(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              placeholder="naam"
              className={INPUT_SM + " w-28"}
            />
            <select
              value={r.op}
              onChange={(e) => push(rows.map((x, j) => (j === i ? { ...x, op: e.target.value as FeatureOp } : x)))}
              className={INPUT_SM}
            >
              {FEATURE_OPS.map((o) => (
                <option key={o.op} value={o.op}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              list="feature-cols"
              value={r.input1}
              onChange={(e) => push(rows.map((x, j) => (j === i ? { ...x, input1: e.target.value } : x)))}
              placeholder="kolom"
              className={INPUT_SM + " w-28"}
            />
            {meta.inputs === "two" && (
              <input
                list="feature-cols"
                value={r.input2}
                onChange={(e) => push(rows.map((x, j) => (j === i ? { ...x, input2: e.target.value } : x)))}
                placeholder="kolom 2"
                className={INPUT_SM + " w-28"}
              />
            )}
            {meta.paramKey && (
              <input
                value={r.param}
                onChange={(e) => push(rows.map((x, j) => (j === i ? { ...x, param: e.target.value } : x)))}
                placeholder={meta.paramLabel}
                inputMode="numeric"
                className={INPUT_SM + " w-16"}
              />
            )}
            <button onClick={() => push(rows.filter((_, j) => j !== i))} className="text-fg-faint hover:text-danger" aria-label="Verwijderen">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
      <button
        onClick={() => setRows([...rows, { name: "", op: "lag", input1: "", input2: "", param: "1" }])}
        className={BTN_ADD}
      >
        + Feature toevoegen
      </button>
    </div>
  );
}

function AdvancedSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="mt-3 rounded-lg border border-border bg-surface-2/40 px-3 py-2">
      <summary className="cursor-pointer select-none text-xs font-medium text-fg-muted">{title}</summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Fase "prepare_recipe" — kolomrollen bevestigen. Voorgevuld uit de goedkope
// kolom-classificatie die al bij upload draaide (source.mapping). De gebruiker vinkt
// alleen aan/corrigeert; geen extra AI-call nodig.
// ---------------------------------------------------------------------------

type RoleChoice = ColumnRole | "date" | "ignore";

const ROLE_OPTIONS: { value: RoleChoice; label: string }[] = [
  { value: "date", label: "Datum" },
  { value: "kpi", label: "KPI (doel)" },
  { value: "spend", label: "Kanaal (uitgaven)" },
  { value: "control", label: "Control" },
  { value: "ignore", label: "Niet gebruiken" },
];

export function RoleMappingCard({ projectId, source }: { projectId: string; source: SourceFile }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kolomnamen uit het (client-side) profiel; anders uit de preview-header.
  const columns = useMemo<string[]>(() => {
    if (source.profile?.columns?.length) return source.profile.columns.map((c) => c.name);
    if (source.preview) {
      const header = source.preview.split("\n")[0] ?? "";
      return header.split(/[,;\t]/).map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }, [source]);

  // Beginwaarde per kolom uit de AI-classificatie (mapping) die bij upload draaide.
  const initial = useMemo<Record<string, RoleChoice>>(() => {
    const out: Record<string, RoleChoice> = {};
    const mapping = source.mapping;
    for (const col of columns) {
      const guess = mapping?.columns.find((m) => m.name === col)?.role;
      out[col] =
        guess === "kpi" || guess === "spend" || guess === "control" || guess === "date"
          ? guess
          : guess === "ignore"
            ? "ignore"
            : /date|datum|week|dag|periode/i.test(col)
              ? "date"
              : "ignore";
    }
    // Zorg dat er precies één datumkolom staat.
    if (!Object.values(out).includes("date")) {
      const firstText = source.profile?.columns.find((c) => c.kind === "date")?.name ?? columns[0];
      if (firstText) out[firstText] = "date";
    }
    return out;
  }, [columns, source]);

  const [roles, setRoles] = useState<Record<string, RoleChoice>>(initial);
  const [events, setEvents] = useState<EventDummyConfig[]>([]);
  const [features, setFeatures] = useState<FeatureSpec[]>([]);

  const dateCol = Object.entries(roles).find(([, r]) => r === "date")?.[0] ?? null;
  const kpiCount = Object.values(roles).filter((r) => r === "kpi").length;
  const spendCount = Object.values(roles).filter((r) => r === "spend").length;

  function setRole(col: string, role: RoleChoice) {
    setRoles((prev) => {
      const next = { ...prev, [col]: role };
      // Datum is uniek: kies je een nieuwe datumkolom, dan valt de oude terug op "ignore".
      if (role === "date") {
        for (const k of Object.keys(next)) if (k !== col && next[k] === "date") next[k] = "ignore";
      }
      return next;
    });
  }

  async function submit() {
    if (!dateCol) {
      setError("Kies precies één datumkolom.");
      return;
    }
    if (kpiCount !== 1) {
      setError("Kies precies één KPI-kolom (je doel: omzet of leads).");
      return;
    }
    if (spendCount === 0) {
      setError("Kies minstens één kanaal (uitgaven-kolom).");
      return;
    }
    setBusy(true);
    setError(null);
    const cols: SourceConfig["columns"] = Object.entries(roles)
      .filter(([, r]) => r === "kpi" || r === "spend" || r === "control")
      .map(([name, r]) => ({ name, role: r as ColumnRole }));
    const recipe: PrepareRecipe = {
      sources: [
        {
          name: source.name.replace(/\.[^.]+$/, ""),
          storage_path: source.storage_path,
          date_column: dateCol,
          columns: cols,
        },
      ],
      ...(events.length > 0 ? { event_dummies: events } : {}),
      ...(features.length > 0 ? { features } : {}),
    };
    const res = await fetch("/api/datasets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, recipe }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setBusy(false);
      setError(humanizeError(j.error, "Het samenvoegen kon niet gestart worden — probeer het opnieuw.").text);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <div className="max-h-80 space-y-1.5 overflow-y-auto">
        {columns.map((col) => (
          <div key={col} className="flex items-center justify-between gap-2">
            <span className="min-w-0 flex-1 truncate text-sm text-fg" title={col}>
              {col}
            </span>
            <select
              value={roles[col]}
              onChange={(e) => setRole(col, e.target.value as RoleChoice)}
              className="flex-none rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-fg outline-none focus:border-accent/50"
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {source.mapping && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-fg-faint">
          <Sparkles className="h-3 w-3" /> Voorgevuld door de AI-kolomherkenning — controleer even.
        </p>
      )}

      <AdvancedSection title="Geavanceerd: bijzondere weken & afgeleide variabelen (optioneel)">
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-fg-faint">Bijzondere weken (events)</p>
            <EventDummiesEditor value={events} onChange={setEvents} />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-fg-faint">Afgeleide variabelen (features)</p>
            <FeaturesEditor
              columns={Object.entries(roles).filter(([, r]) => r === "kpi" || r === "spend" || r === "control").map(([n]) => n)}
              value={features}
              onChange={setFeatures}
            />
          </div>
        </div>
      </AdvancedSection>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-3">
        <button onClick={submit} disabled={busy} className={BTN_PRIMARY}>
          {busy ? "Bezig…" : "Klopt — voeg samen & controleer"}
        </button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Fase "prepare_review" — kwaliteitsrapport + preview, en goedkeuren.
// ---------------------------------------------------------------------------

export function PrepareReviewCard({ dataset }: { dataset: Dataset }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/datasets/${dataset.id}/approve`, { method: "POST" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setBusy(false);
      setError(humanizeError(j.error, "Goedkeuren is niet gelukt — probeer het opnieuw.").text);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      {dataset.window_start && (
        <p className="mb-3 text-xs text-fg-muted">
          {dataset.n_weeks ?? "?"} weken · {dataset.window_start} t/m {dataset.window_end}
        </p>
      )}
      <QualityReportView quality={dataset.quality} />
      {dataset.preview && (
        <div className="mt-3">
          <DatasetPreviewTable preview={dataset.preview} />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-3">
        <button onClick={approve} disabled={busy} className={BTN_PRIMARY}>
          <Check className="h-4 w-4" />
          {busy ? "Bezig…" : "Goedkeuren als definitieve dataset"}
        </button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Fase "context" — zakelijke context vastleggen vóór het model instellen. Overslaanbaar.
// Schrijft naar dezelfde mmm.project_context-rij als de AI-tool record_business_context,
// zodat paneel en AI één gedeelde waarheid delen.
// ---------------------------------------------------------------------------

export function ContextCard({
  projectId,
  industry,
  description,
  kpiMargin,
  onSkip,
}: {
  projectId: string;
  industry: string | null;
  description: string | null;
  kpiMargin: number | null;
  onSkip: () => void;
}) {
  const router = useRouter();
  const [desc, setDesc] = useState(description ?? "");
  const [branche, setBranche] = useState(industry ?? "");
  const [marge, setMarge] = useState(kpiMargin != null ? String(kpiMargin) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const margeNum = marge.trim() === "" ? null : Number(marge.replace(",", "."));
    if (margeNum !== null && (!Number.isFinite(margeNum) || margeNum <= 0)) {
      setBusy(false);
      setError("De marge moet een bedrag boven 0 zijn (bijv. 12,50) of leeg.");
      return;
    }
    const res = await fetch("/api/business-context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        description: desc.trim(),
        industry: branche.trim(),
        kpi_margin: margeNum,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setBusy(false);
      setError(humanizeError(j.error, "Opslaan is niet gelukt — probeer het opnieuw.").text);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-muted">Wat doet het bedrijf? (markt, doelen, bijzonderheden)</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            placeholder="Bijv. webshop in duurzame kleding, sterke Q4-piek, prijsverhoging in maart…"
            className="w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-fg-faint outline-none focus:border-accent/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-muted">Branche</label>
            <input
              value={branche}
              onChange={(e) => setBranche(e.target.value)}
              placeholder="bijv. e-commerce"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-fg-faint outline-none focus:border-accent/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-muted">Marge per KPI-eenheid (€)</label>
            <input
              value={marge}
              onChange={(e) => setMarge(e.target.value)}
              inputMode="decimal"
              placeholder="bijv. 12,50"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-fg-faint outline-none focus:border-accent/50"
            />
          </div>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={save} disabled={busy} className={BTN_PRIMARY}>
          {busy ? "Opslaan…" : "Opslaan & door naar het model"}
        </button>
        <button onClick={onSkip} disabled={busy} className={BTN_SECONDARY}>
          Overslaan
        </button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Fase "configure" — standaard-modelinstelling (deterministisch, 0 tokens). De gebruiker
// start meteen, of vraagt de AI om te optimaliseren (dat loopt via de vrij-tekst-escape).
// ---------------------------------------------------------------------------

const STANDARD_SAMPLE = { draws: 1000, tune: 1000, chains: 4 };

function templateConfigFromDataset(dataset: Dataset): JobConfig {
  const roles = dataset.column_roles ?? {};
  const byRole = (role: ColumnRole) => Object.entries(roles).filter(([, r]) => r === role).map(([name]) => name);
  const kpi = byRole("kpi")[0] ?? "";
  return {
    sources: [
      {
        name: "master",
        storage_path: dataset.master_path ?? "",
        date_column: "week_start",
        columns: Object.entries(roles).map(([name, role]) => ({ name, role: role as ColumnRole })),
      },
    ],
    model: {
      kpi,
      channels: byRole("spend").map((name) => ({ name, channel_type: "generic" }) as ChannelConfig),
      control_columns: byRole("control"),
      add_trend: true,
      seasonality_periods: 52,
      n_fourier_modes: 2,
    },
    sample: STANDARD_SAMPLE,
  };
}

const CHANNEL_TYPE_OPTS: { value: ChannelType; label: string }[] = [
  { value: "generic", label: "Generiek" },
  { value: "intent", label: "Intent (kort effect)" },
  { value: "brand", label: "Merk (lang effect)" },
];
const ADSTOCK_OPTS: { value: AdstockType; label: string }[] = [
  { value: "geometric", label: "Geometrisch (piekt meteen)" },
  { value: "delayed", label: "Vertraagd (piekt later)" },
];
const SATURATION_OPTS: { value: SaturationType; label: string }[] = [
  { value: "hill", label: "Hill" },
  { value: "logistic", label: "Logistic" },
];
const LIKELIHOOD_OPTS: { value: LikelihoodType; label: string }[] = [
  { value: "normal", label: "Normaal (omzet)" },
  { value: "student_t", label: "Student-t (robuust)" },
  { value: "poisson", label: "Poisson (leads/orders)" },
  { value: "negative_binomial", label: "Negative binomial (telgegevens)" },
];

type ChannelTuning = Partial<Pick<ChannelConfig, "channel_type" | "adstock" | "saturation" | "expected_half_life">>;

export function ConfigureCard({
  projectId,
  dataset,
  onAskAi,
}: {
  projectId: string;
  dataset: Dataset;
  onAskAi: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = useMemo(() => templateConfigFromDataset(dataset), [dataset]);
  const [tuning, setTuning] = useState<Record<string, ChannelTuning>>({});
  const [likelihood, setLikelihood] = useState<LikelihoodType>("normal");

  // De uiteindelijke config: standaard + per-kanaal-overrides + likelihood.
  const config: JobConfig = useMemo(() => {
    const channels = base.model.channels.map((ch) => {
      const t = tuning[ch.name];
      return t ? ({ ...ch, ...t } as ChannelConfig) : ch;
    });
    return { ...base, model: { ...base.model, channels, likelihood } };
  }, [base, tuning, likelihood]);

  function setChannel(name: string, patch: ChannelTuning) {
    setTuning((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }));
  }

  async function start() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, type: "fit", dataset_id: dataset.id, config }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setBusy(false);
      setError(humanizeError(j.error, "De berekening kon niet gestart worden — probeer het opnieuw.").text);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-fg-muted">KPI (doel)</dt>
          <dd className="font-medium text-fg">{config.model.kpi}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-fg-muted">Kanalen</dt>
          <dd className="text-right text-fg">{config.model.channels.map((c) => c.name).join(", ")}</dd>
        </div>
        {config.model.control_columns && config.model.control_columns.length > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-fg-muted">Controls</dt>
            <dd className="text-right text-fg">{config.model.control_columns.join(", ")}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <dt className="text-fg-muted">Instelling</dt>
          <dd className="text-fg">Standaard (adstock geometrisch, saturatie Hill, trend + seizoen)</dd>
        </div>
      </dl>

      <AdvancedSection title="Geavanceerd: fijnafstelling per kanaal & ruismodel (optioneel)">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-fg-muted">Ruismodel (likelihood)</span>
            <select value={likelihood} onChange={(e) => setLikelihood(e.target.value as LikelihoodType)} className={INPUT_SM}>
              {LIKELIHOOD_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 border-t border-border pt-2">
            {base.model.channels.map((ch) => {
              const t = tuning[ch.name] ?? {};
              return (
                <div key={ch.name} className="space-y-1">
                  <p className="text-xs font-medium text-fg">{ch.name}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select value={t.channel_type ?? "generic"} onChange={(e) => setChannel(ch.name, { channel_type: e.target.value as ChannelType })} className={INPUT_SM}>
                      {CHANNEL_TYPE_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <select value={t.adstock ?? "geometric"} onChange={(e) => setChannel(ch.name, { adstock: e.target.value as AdstockType })} className={INPUT_SM}>
                      {ADSTOCK_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <select value={t.saturation ?? "hill"} onChange={(e) => setChannel(ch.name, { saturation: e.target.value as SaturationType })} className={INPUT_SM}>
                      {SATURATION_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={t.expected_half_life != null ? String(t.expected_half_life) : ""}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        const n = v === "" ? null : Number(v);
                        setChannel(ch.name, { expected_half_life: n != null && Number.isFinite(n) && n > 0 ? n : null });
                      }}
                      inputMode="decimal"
                      placeholder="halfwaarde (wkn)"
                      className={INPUT_SM + " w-28"}
                      title="Verwachte na-ijl: na hoeveel weken is het effect gehalveerd?"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AdvancedSection>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={start} disabled={busy} className={BTN_PRIMARY}>
          {busy ? "Starten…" : "Gebruik de standaard & start berekening"}
        </button>
        <button onClick={onAskAi} disabled={busy} className={BTN_SECONDARY}>
          <Sparkles className="h-4 w-4" />
          Laat de AI optimaliseren
        </button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Fase "review" — resultaten + publiceren.
// ---------------------------------------------------------------------------

// De volledige beoordeel-/publiceerkaart: run-historie (met vergelijken), de resultaten
// zelf, en twee opt-in AI-verrijkingen (diepgaande analyse, klantsamenvatting) — precies
// dezelfde mogelijkheden als de oude ResultsView, nu als kaart in de chatstroom. Beide
// AI-acties zijn expliciete knoppen: er lopen geen tokens totdat de bouwer erop klikt.
export function ReviewCard({
  projectId,
  runs,
  jobConfigs,
  kpiMargin,
}: {
  projectId: string;
  runs: ModelRun[];
  jobConfigs?: Record<string, JobConfig>;
  kpiMargin: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<RunAnalysis | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [clientSummary, setClientSummary] = useState<ClientSummary | null>(null);
  const [copied, setCopied] = useState(false);

  if (runs.length === 0) return null;

  const latestRun = runs[0];
  const shownAnalysis = analysis ?? latestRun.analysis;
  const viewedRun = runs.find((r) => r.id === selectedRunId) ?? latestRun;
  const viewedLikelihood = viewedRun.job_id ? jobConfigs?.[viewedRun.job_id]?.model.likelihood : undefined;
  const isCountKpi = viewedLikelihood === "poisson" || viewedLikelihood === "negative_binomial";
  const viewedIsHierarchical = isHierSummary(viewedRun.summary);
  const shownClientSummary = clientSummary ?? latestRun.client_summary ?? null;

  async function publish() {
    if (!confirm("Dit resultaat publiceren naar het klantdashboard?")) return;
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
      // Klembord niet beschikbaar — de tekst staat er toch al.
    }
  }

  return (
    <Card>
      <div className="space-y-5">
        <RunHistory runs={runs} selectedId={viewedRun.id} onSelect={setSelectedRunId} jobConfigs={jobConfigs} />
        {viewedIsHierarchical ? (
          <HierarchicalSummaryView summary={viewedRun.summary as unknown as Parameters<typeof HierarchicalSummaryView>[0]["summary"]} />
        ) : (
          <SummaryView summary={viewedRun.summary} kpiMargin={kpiMargin} isCountKpi={isCountKpi} />
        )}

        {viewedRun.id === latestRun.id && !viewedIsHierarchical && (
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-sm text-fg-muted">
              Laat Claude deze uitkomst verder analyseren en op maat gemaakte grafieken maken (kan even duren).
            </p>
            <button onClick={generateAnalysis} disabled={analyzing} className={BTN_SECONDARY}>
              {analyzing ? "Analyse wordt gegenereerd…" : shownAnalysis ? "Analyse opnieuw genereren" : "Genereer diepgaande analyse"}
            </button>
            {analysisError && <p className="mt-2 text-sm text-danger">{analysisError}</p>}
            {shownAnalysis && <AnalysisView analysis={shownAnalysis} />}
          </div>
        )}

        {viewedRun.id === latestRun.id && !viewedIsHierarchical && (
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-sm text-fg-muted">
              Laat Claude een presentatieklare samenvatting in klanttaal schrijven, 1-op-1 te plakken in je rapport of slides.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={generateClientSummary} disabled={summarizing} className={BTN_SECONDARY}>
                {summarizing ? "Samenvatting wordt geschreven…" : shownClientSummary ? "Klantsamenvatting opnieuw genereren" : "Schrijf klantsamenvatting"}
              </button>
              {shownClientSummary && (
                <button onClick={copySummary} className="rounded-lg border border-border px-3 py-2 text-xs text-fg-muted transition hover:bg-surface-2">
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

        <div className="rounded-lg border border-accent/30 bg-accent-dim/40 p-4">
          {viewedRun.is_published ? (
            <div className="flex items-center gap-3">
              <StatusBadge status="published" />
              <p className="text-sm text-fg-muted">Deze run staat op het klantdashboard.</p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={publish} disabled={busy} className={BTN_PRIMARY}>
                {busy ? "Publiceren…" : "Publiceer naar klantdashboard"}
              </button>
              <p className="min-w-0 flex-1 text-xs text-fg-muted">
                Vertrouw je deze uitkomst? Publiceer dan — de klant ziet daarna het dashboard met deze run.
              </p>
            </div>
          )}
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      </div>
    </Card>
  );
}
