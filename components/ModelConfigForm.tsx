"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  AdstockType,
  ChannelConfig,
  ChannelType,
  ColumnRole,
  Dataset,
  JobConfig,
  LikelihoodType,
  SaturationType,
  SourceFile,
  TrendType,
} from "@/lib/types";
import { useWizardChat } from "@/components/WizardChatContext";
import { MMM_GLOSSARY, Term } from "@/components/ui";

type SamplePreset = "fast" | "standard" | "thorough";
const SAMPLE_PRESETS: Record<SamplePreset, { draws: number; tune: number; chains: number }> = {
  fast: { draws: 300, tune: 300, chains: 2 },
  standard: { draws: 1000, tune: 1000, chains: 4 },
  thorough: { draws: 2000, tune: 2000, chains: 4 },
};
const PRESET_LABEL: Record<SamplePreset, { title: string; hint: string }> = {
  fast: { title: "Snel (verkennen)", hint: "Minder scherpe onzekerheidsmarges, geschikt om snel te itereren — doorgaans 1\u20133 min" },
  standard: { title: "Standaard", hint: "Goede balans tussen snelheid en betrouwbaarheid — doorgaans 3\u20138 min" },
  thorough: { title: "Grondig (publiceren)", hint: "Langzamer, scherpere marges — voor het definitieve model — doorgaans 8\u201320 min" },
};

function matchPreset(sample: { draws?: number; tune?: number; chains?: number } | undefined): SamplePreset | "custom" {
  if (!sample) return "standard";
  for (const [key, preset] of Object.entries(SAMPLE_PRESETS) as [SamplePreset, typeof SAMPLE_PRESETS.fast][]) {
    if (sample.draws === preset.draws && sample.tune === preset.tune && sample.chains === preset.chains) return key;
  }
  return "custom";
}

const CHANNEL_TYPE_OPTIONS: { value: ChannelType; label: string }[] = [
  { value: "generic", label: "Generiek" },
  { value: "intent", label: "Intent (zoekt actief — kort effect)" },
  { value: "brand", label: "Merk (lang effect)" },
];
const ADSTOCK_OPTIONS: { value: AdstockType; label: string }[] = [
  { value: "geometric", label: "Geometrisch (piekt meteen)" },
  { value: "delayed", label: "Vertraagd (piekt later — TV/radio/OOH)" },
];
const SATURATION_OPTIONS: { value: SaturationType; label: string }[] = [
  { value: "hill", label: "Hill" },
  { value: "logistic", label: "Logistic" },
];
const LIKELIHOOD_OPTIONS: { value: LikelihoodType; label: string }[] = [
  { value: "normal", label: "Normaal" },
  { value: "student_t", label: "Student-t (robuust tegen uitschieters)" },
  { value: "poisson", label: "Poisson (telgegevens)" },
  { value: "negative_binomial", label: "Negative binomial (overdispersed telgegevens)" },
];
const TREND_OPTIONS: { value: TrendType; label: string }[] = [
  { value: "linear", label: "Lineair" },
  { value: "piecewise", label: "Piecewise (knikpunten)" },
];

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
        columns: Object.entries(roles).map(([name, role]) => ({ name, role })),
      },
    ],
    model: {
      kpi,
      channels: byRole("spend").map((name) => ({ name, channel_type: "generic" as ChannelType })),
      control_columns: byRole("control"),
      add_trend: true,
      seasonality_periods: 52,
      n_fourier_modes: 2,
    },
    sample: SAMPLE_PRESETS.standard,
  };
}

function templateConfigFromRawSources(sources: SourceFile[]): JobConfig {
  return {
    sources: sources.map((s) => ({
      name: s.name.replace(/\.[^.]+$/, ""),
      storage_path: s.storage_path,
      date_column: undefined,
      columns: [{ name: "REPLACE_ME", role: "spend" as ColumnRole }],
    })),
    model: {
      kpi: "REPLACE_ME",
      channels: [{ name: "REPLACE_ME", channel_type: "generic" }],
      control_columns: [],
      add_trend: true,
      seasonality_periods: 52,
      n_fourier_modes: 2,
    },
    sample: SAMPLE_PRESETS.standard,
  };
}

// The architect's tool output carries `reasoning` for the chat bubble, but that's not
// part of the job config itself; `sample` (compute cost) is deliberately left for the
// wizard to default rather than letting the model pick it.
function configFromProposal(proposal: unknown): JobConfig {
  const { reasoning: _reasoning, ...rest } = proposal as { reasoning?: string } & JobConfig;
  return { ...rest, sample: SAMPLE_PRESETS.standard };
}

function validate(config: JobConfig): string | null {
  if (!config.model?.kpi || config.model.kpi === "REPLACE_ME") return "Kies een KPI-kolom.";
  if (!config.model?.channels || config.model.channels.length === 0) return "Voeg minstens één kanaal toe.";
  for (const ch of config.model.channels) {
    if (!ch.name || ch.name === "REPLACE_ME") return "Elk kanaal moet een geldige kolomnaam hebben.";
  }
  if (!config.sources?.length || config.sources.some((s) => !s.storage_path)) {
    return "Geen geldige brondata gevonden — keur eerst een dataset goed bij stap 3.";
  }
  return null;
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
  const template = useMemo(
    () => (approvedDataset ? templateConfigFromDataset(approvedDataset) : templateConfigFromRawSources(sources)),
    [approvedDataset, sources],
  );
  const [config, setConfig] = useState<JobConfig>(template);
  // The structured form needs real column names (only known once a dataset is
  // approved); without that, fall back to the plain JSON editor exactly as before.
  const [mode, setMode] = useState<"form" | "json">(approvedDataset ? "form" : "json");
  const [jsonText, setJsonText] = useState(() => JSON.stringify(template, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pendingConfig, clearPendingConfig, sendToChat, applyConfig, stagedConfig, clearStagedConfig } = useWizardChat();
  // Bevestiging + snapshot na een overgenomen architect-voorstel, zodat "Ongedaan maken"
  // één klik is (zelfde patroon als de recepttabel in stap 3).
  const [applyNote, setApplyNote] = useState<string | null>(null);
  const [undoConfig, setUndoConfig] = useState<JobConfig | null>(null);

  const kpiOptions = useMemo(() => {
    const roles = approvedDataset?.column_roles ?? {};
    return Object.entries(roles).filter(([, r]) => r === "kpi").map(([name]) => name);
  }, [approvedDataset]);
  const controlOptions = useMemo(() => {
    const roles = approvedDataset?.column_roles ?? {};
    return Object.entries(roles).filter(([, r]) => r === "control").map(([name]) => name);
  }, [approvedDataset]);

  // Re-seed whenever the underlying source changes (a dataset just got approved, or the
  // raw file list changed) — same "start from the latest known-good input" as before.
  useEffect(() => {
    setConfig(template);
    setJsonText(JSON.stringify(template, null, 2));
    setMode(approvedDataset ? "form" : "json");
    setJsonError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  useEffect(() => {
    if (pendingConfig === null) return;
    const next = configFromProposal(pendingConfig);
    setUndoConfig(config);
    setApplyNote(
      `Voorstel overgenomen: ${next.model.channels.length} kanaal/kanalen, KPI "${next.model.kpi}"${
        next.model.control_columns?.length ? `, ${next.model.control_columns.length} control(s)` : ""
      }. Controleer de instellingen voordat je de berekening start.`,
    );
    setConfig(next);
    setJsonText(JSON.stringify(next, null, 2));
    setMode(approvedDataset ? "form" : "json");
    clearPendingConfig();
    clearStagedConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingConfig, clearPendingConfig]);

  function updateConfig(patch: Partial<JobConfig>) {
    const next = { ...config, ...patch };
    setConfig(next);
    setJsonText(JSON.stringify(next, null, 2));
  }
  function updateModel(patch: Partial<JobConfig["model"]>) {
    updateConfig({ model: { ...config.model, ...patch } });
  }
  function updateChannel(idx: number, patch: Partial<ChannelConfig>) {
    updateModel({ channels: config.model.channels.map((c, i) => (i === idx ? { ...c, ...patch } : c)) });
  }

  function switchToJson() {
    setJsonText(JSON.stringify(config, null, 2));
    setMode("json");
  }
  function switchToForm() {
    try {
      const parsed = JSON.parse(jsonText) as JobConfig;
      setConfig(parsed);
      setJsonError(null);
      setMode("form");
    } catch (e) {
      setJsonError("Ongeldige JSON: " + (e as Error).message);
    }
  }

  const preset = matchPreset(config.sample);
  const validationError = mode === "form" ? validate(config) : null;

  async function onRun() {
    setError(null);
    let payload: unknown;
    if (mode === "json") {
      try {
        payload = JSON.parse(jsonText);
      } catch (e) {
        setError("Ongeldige JSON: " + (e as Error).message);
        return;
      }
    } else {
      const v = validate(config);
      if (v) {
        setError(v);
        return;
      }
      payload = config;
    }
    // A hierarchical/multi-region job config replaces top-level `sources` with `regions`
    // (see worker/mmm_worker/jobspec.py::parse_hier_job_config) — reachable today only via
    // the JSON editor above, not the form. Detected here rather than added as a form
    // toggle, since region-aware data upload has no dedicated UI yet.
    const jobType =
      payload && typeof payload === "object" && "regions" in (payload as Record<string, unknown>)
        ? "fit_hierarchical"
        : "fit";
    setBusy(true);
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        type: jobType,
        config: payload,
        dataset_id: approvedDataset?.id ?? null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Kon de berekening niet starten.");
      return;
    }
    router.refresh();
  }

  const canSubmit = sources.length > 0 || !!approvedDataset;

  return (
    <div className="space-y-4">
      {approvedDataset && (
        <div className="rounded-lg border border-accent/30 bg-accent-dim/40 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                sendToChat(
                  "Kijk naar de goedgekeurde dataset en alle context (profiel, inspectie, zakelijke feiten) en stel een complete modelconfiguratie voor.",
                )
              }
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent-hover hover:shadow-glow-sm"
            >
              Stel een configuratie voor (AI)
            </button>
            <span className="text-xs text-fg-muted">
              De AI vult het formulier hieronder; jij controleert, stelt bij en start de berekening.
            </span>
          </div>
        </div>
      )}

      {stagedConfig != null && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent-dim px-3 py-2.5">
          <p className="text-sm text-accent">
            De AI heeft in de chat een configuratievoorstel gedaan. Neem het hier over om het
            formulier te vullen — jij controleert en start daarna de berekening.
          </p>
          <span className="flex flex-none items-center gap-2">
            <button
              onClick={() => applyConfig(stagedConfig)}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-bg transition hover:bg-accent-hover"
            >
              Voorstel overnemen
            </button>
            <button
              onClick={clearStagedConfig}
              className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
            >
              Negeren
            </button>
          </span>
        </div>
      )}

      {applyNote && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-accent/40 bg-accent-dim px-3 py-2 text-sm text-accent">
          <span>{applyNote}</span>
          <span className="flex flex-none items-center gap-2">
            {undoConfig && (
              <button
                onClick={() => {
                  setConfig(undoConfig);
                  setJsonText(JSON.stringify(undoConfig, null, 2));
                  setUndoConfig(null);
                  setApplyNote("Voorstel ongedaan gemaakt — de configuratie staat weer zoals ervoor.");
                }}
                className="rounded border border-accent/40 px-2 py-0.5 text-xs font-medium hover:bg-accent/20"
              >
                Ongedaan maken
              </button>
            )}
            <button
              onClick={() => { setApplyNote(null); setUndoConfig(null); }}
              className="text-accent/70 hover:text-accent"
              aria-label="Sluiten"
            >
              ×
            </button>
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          {approvedDataset
            ? "De goedgekeurde dataset is als bron ingevuld. Vul de kanalen en modelinstellingen aan — of laat de AI een voorstel doen."
            : "Configureer de modelberekening. Vul de kolomnamen, rollen (kpi/spend/control) en kanalen in — of keur eerst een dataset goed bij stap 3 voor een ingevulde start."}
        </p>
        {approvedDataset && (
          <button
            onClick={mode === "form" ? switchToJson : switchToForm}
            className="flex-none rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-fg-muted transition hover:bg-surface-2"
          >
            {mode === "form" ? "Geavanceerd (JSON)" : "Terug naar formulier"}
          </button>
        )}
      </div>

      {!approvedDataset ? (
        // Zonder goedgekeurde dataset is de kale JSON-editor met REPLACE_ME-placeholders
        // een valkuil, geen hulpmiddel: stuur de bouwer expliciet terug naar stap 3 en
        // hou de directe-JSON-route als bewuste, geavanceerde uitzondering.
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-fg-muted">
            <p className="font-medium text-fg">Eerst een dataset goedkeuren</p>
            <p className="mt-1">
              Het configuratieformulier werkt op de goedgekeurde master-dataset uit stap 3. Voeg
              daar je bronnen samen en keur het resultaat goed — dan staat hier een ingevuld
              formulier klaar.
            </p>
            <Link
              href="?step=dataprep"
              replace
              scroll={false}
              className="mt-2 inline-block rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-fg transition hover:bg-surface-3"
            >
              Naar stap 3 — Data voorbereiden
            </Link>
          </div>
          <details className="rounded-lg border border-border p-3 text-sm">
            <summary className="cursor-pointer select-none text-xs font-medium text-fg-muted">
              Geavanceerd: JSON-configuratie direct tegen de ruwe bestanden (zonder dataset)
            </summary>
            <div className="mt-2 space-y-2">
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                spellCheck={false}
                rows={16}
                className="w-full rounded-lg border border-border-strong p-3 font-mono text-xs outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
              />
              {jsonError && <p className="text-sm text-danger">{jsonError}</p>}
            </div>
          </details>
        </div>
      ) : mode === "form" ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-fg-muted">
              KPI-kolom
              <select
                value={config.model.kpi}
                onChange={(e) => updateModel({ kpi: e.target.value })}
                className="mt-1 block w-full rounded border border-border-strong px-2 py-1.5 text-sm outline-none focus:border-accent/50"
              >
                {kpiOptions.length === 0 && <option value="">geen KPI-kolom gevonden</option>}
                {kpiOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-faint">
              Kanalen ({config.model.channels.length})
            </p>
            <div className="space-y-3">
              {config.model.channels.map((ch, i) => (
                <div key={ch.name} className="rounded-lg border border-border p-3">
                  <p className="mb-2 text-sm font-medium text-fg">{ch.name}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <label className="text-xs text-fg-muted">
                      <Term definition={MMM_GLOSSARY.channel_type}>Type</Term>
                      <select
                        value={ch.channel_type ?? "generic"}
                        onChange={(e) => updateChannel(i, { channel_type: e.target.value as ChannelType })}
                        className="mt-1 block w-full rounded border border-border-strong px-2 py-1.5 text-sm outline-none focus:border-accent/50"
                      >
                        {CHANNEL_TYPE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-fg-muted">
                      <Term definition={MMM_GLOSSARY.adstock}>Adstock (carry-over)</Term>
                      <select
                        value={ch.adstock ?? "geometric"}
                        onChange={(e) => updateChannel(i, { adstock: e.target.value as AdstockType })}
                        className="mt-1 block w-full rounded border border-border-strong px-2 py-1.5 text-sm outline-none focus:border-accent/50"
                      >
                        {ADSTOCK_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-fg-muted">
                      <Term definition={MMM_GLOSSARY.saturation_form}>Saturatie</Term>
                      <select
                        value={ch.saturation ?? "hill"}
                        onChange={(e) => updateChannel(i, { saturation: e.target.value as SaturationType })}
                        className="mt-1 block w-full rounded border border-border-strong px-2 py-1.5 text-sm outline-none focus:border-accent/50"
                      >
                        {SATURATION_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
              {config.model.channels.length === 0 && (
                <p className="text-sm text-fg-faint">
                  Geen spend-kolommen gevonden in de goedgekeurde dataset — ga terug naar stap 3.
                </p>
              )}
            </div>
          </div>

          {controlOptions.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-fg-faint">
                Control-kolommen
              </p>
              <div className="flex flex-wrap gap-1.5">
                {controlOptions.map((name) => {
                  const active = (config.model.control_columns ?? []).includes(name);
                  return (
                    <button
                      key={name}
                      onClick={() =>
                        updateModel({
                          control_columns: active
                            ? (config.model.control_columns ?? []).filter((c) => c !== name)
                            : [...(config.model.control_columns ?? []), name],
                        })
                      }
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${
                        active
                          ? "border-accent/40 bg-accent-dim text-accent"
                          : "border-border text-fg-muted hover:bg-surface-2"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <details className="rounded-lg border border-border p-3 text-sm">
            <summary className="cursor-pointer select-none font-medium text-fg">
              Trend, seizoen &amp; ruismodel
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-1.5 text-xs text-fg-muted">
                <input
                  type="checkbox"
                  checked={config.model.add_trend ?? true}
                  onChange={(e) => updateModel({ add_trend: e.target.checked })}
                />
                Trend meenemen
              </label>
              {config.model.add_trend && (
                <label className="text-xs text-fg-muted">
                  <Term definition={MMM_GLOSSARY.trend}>Trendvorm</Term>
                  <select
                    value={config.model.trend_type ?? "linear"}
                    onChange={(e) => updateModel({ trend_type: e.target.value as TrendType })}
                    className="mt-1 block w-full rounded border border-border-strong px-2 py-1.5 text-sm outline-none focus:border-accent/50"
                  >
                    {TREND_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="text-xs text-fg-muted">
                <Term definition={MMM_GLOSSARY.seasonality}>Seizoensperiode (weken, leeg = geen)</Term>
                <input
                  type="number"
                  value={config.model.seasonality_periods ?? ""}
                  onChange={(e) =>
                    updateModel({ seasonality_periods: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className="mt-1 block w-full rounded border border-border-strong px-2 py-1.5 text-sm outline-none focus:border-accent/50"
                />
              </label>
              <label className="text-xs text-fg-muted">
                <Term definition={MMM_GLOSSARY.likelihood}>Ruismodel</Term>
                <select
                  value={config.model.likelihood ?? "normal"}
                  onChange={(e) => updateModel({ likelihood: e.target.value as LikelihoodType })}
                  className="mt-1 block w-full rounded border border-border-strong px-2 py-1.5 text-sm outline-none focus:border-accent/50"
                >
                  {LIKELIHOOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-fg-faint">Sampling</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(SAMPLE_PRESETS) as SamplePreset[]).map((key) => (
                <button
                  key={key}
                  onClick={() => updateConfig({ sample: SAMPLE_PRESETS[key] })}
                  className={`rounded-lg border p-2.5 text-left transition ${
                    preset === key ? "border-accent/40 bg-accent-dim" : "border-border hover:bg-surface-2"
                  }`}
                >
                  <p className={`text-sm font-medium ${preset === key ? "text-accent" : "text-fg"}`}>
                    {PRESET_LABEL[key].title}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-muted">{PRESET_LABEL[key].hint}</p>
                </button>
              ))}
            </div>
            {preset === "custom" && (
              <p className="mt-1.5 text-xs text-fg-faint">
                Aangepaste sampling ({config.sample?.draws} draws · {config.sample?.tune} tune ·{" "}
                {config.sample?.chains} chains) — via een AI-voorstel of het JSON-formulier.
              </p>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-fg-faint">
              Extra betrouwbaarheidschecks
            </p>
            <div className="space-y-1.5">
              <label className="flex items-start gap-2 text-sm text-fg">
                <input
                  type="checkbox"
                  checked={config.evaluation?.cross_validation ?? false}
                  onChange={(e) =>
                    updateConfig({ evaluation: { ...config.evaluation, cross_validation: e.target.checked } })
                  }
                  className="mt-0.5"
                />
                <span>
                  Kruisvalidatie — test het model op niet-geziene weken.
                  <span className="block text-xs text-fg-muted">Extra fits per fold, dus een langere wachttijd.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-fg">
                <input
                  type="checkbox"
                  checked={config.evaluation?.placebo ?? false}
                  onChange={(e) => updateConfig({ evaluation: { ...config.evaluation, placebo: e.target.checked } })}
                  className="mt-0.5"
                />
                <span>
                  Placebo-test — controleert dat een nepkanaal geen bijdrage krijgt.
                  <span className="block text-xs text-fg-muted">Eén extra berekening, dus ongeveer dubbele wachttijd.</span>
                </span>
              </label>
            </div>
          </div>

          {validationError && <p className="text-sm text-danger">{validationError}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
            rows={16}
            className="w-full rounded-lg border border-border-strong p-3 font-mono text-xs outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
          />
          {jsonError && <p className="text-sm text-danger">{jsonError}</p>}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        onClick={onRun}
        disabled={busy || !canSubmit || (mode === "form" && !!validationError)}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent-hover hover:shadow-glow-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Starten…" : "Start modelberekening"}
      </button>
    </div>
  );
}
