"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb } from "lucide-react";
import type { BusinessContextNote } from "@/lib/types";

const TOPIC_LABEL: Record<BusinessContextNote["topic"], string> = {
  branche: "Branche",
  seizoen: "Seizoen",
  campagne: "Campagne",
  offline_kanaal: "Offline kanaal",
  experiment: "Experiment",
  prijs: "Prijs",
  overig: "Overig",
};

// Zakelijke context is de grootste hefboom van een Bayesiaans MMM — daarom heeft hij een
// eigen, zichtbaar paneel in de modelstap in plaats van alleen impliciet in de chat te
// leven. Toont de vastgelegde feiten (zowel hier ingevoerd als via de chat opgeslagen)
// en laat de bouwer er direct feiten en de branche aan toevoegen. Dezelfde opslag als de
// chat-tool (mmm.project_context), dus AI en paneel zien altijd hetzelfde.
export function BusinessContextPanel({
  projectId,
  industry,
  notes,
  kpiMargin,
}: {
  projectId: string;
  industry: string | null;
  notes: BusinessContextNote[];
  // Gemiddelde brutomarge in euro's per verkochte KPI-eenheid (mmm.projects.kpi_margin).
  kpiMargin: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<BusinessContextNote["topic"]>("seizoen");
  const [fact, setFact] = useState("");
  const [relatesTo, setRelatesTo] = useState("");
  const [industryDraft, setIndustryDraft] = useState(industry ?? "");
  const [marginDraft, setMarginDraft] = useState(kpiMargin != null ? String(kpiMargin).replace(".", ",") : "");

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/business-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, ...body }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error ?? "Opslaan mislukt.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Verbinding mislukt — probeer het opnieuw.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addFact() {
    if (!fact.trim()) return;
    const ok = await post({ add: { topic, fact, relates_to: relatesTo || null } });
    if (ok) {
      setFact("");
      setRelatesTo("");
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface-2/60 p-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 flex-none text-accent" />
        <h3 className="text-sm font-semibold text-fg">Wat weet je over deze klant?</h3>
      </div>
      <p className="mt-1 text-xs text-fg-muted">
        Zakelijke context is de grootste hefboom van het model: seizoensdrukte, campagnes,
        offline kanalen, experimenten, prijsacties. Alles wat je hier vastlegt (of in de
        chat vertelt) gebruikt de AI direct in zijn configuratievoorstellen.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-xs text-fg-muted">
          Branche:
          <input
            type="text"
            value={industryDraft}
            onChange={(e) => setIndustryDraft(e.target.value)}
            onBlur={() => {
              if (industryDraft.trim() !== (industry ?? "")) void post({ industry: industryDraft });
            }}
            placeholder="bv. retail elektronica"
            className="ml-1.5 w-56 rounded border border-border-strong bg-surface px-2 py-1 text-xs outline-none focus:border-accent/50"
          />
        </label>
        <label className="text-xs text-fg-muted">
          Gemiddelde marge per verkocht product:
          <span className="ml-1.5">€</span>
          <input
            type="text"
            inputMode="decimal"
            value={marginDraft}
            onChange={(e) => setMarginDraft(e.target.value)}
            onBlur={() => {
              const stored = kpiMargin != null ? String(kpiMargin).replace(".", ",") : "";
              if (marginDraft.trim() === stored) return;
              const parsed = marginDraft.trim() === "" ? null : Number(marginDraft.replace(",", "."));
              if (parsed !== null && !Number.isFinite(parsed)) return;
              void post({ kpi_margin: parsed });
            }}
            placeholder="bv. 12,50"
            className="ml-1 w-20 rounded border border-border-strong bg-surface px-2 py-1 text-xs outline-none focus:border-accent/50"
          />
          <span className="ml-2 text-fg-faint">
            — wat houd je gemiddeld over aan één verkoop? Maakt ROI (winst) zichtbaar in het dashboard.
            Staat de marge al als kolom in je data, kies dan de rol “Marge” bij stap 2 — dan nemen we het gemiddelde automatisch over.
          </span>
        </label>
      </div>

      {notes.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {notes.map((n, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-fg-muted">
              <span className="mt-px flex-none rounded-sm bg-surface-3 px-2 py-0.5 text-[11px] text-fg">
                {TOPIC_LABEL[n.topic] ?? n.topic}
              </span>
              <span className="min-w-0 flex-1">
                {n.fact}
                {n.relates_to && <span className="text-fg-faint"> — betreft: {n.relates_to}</span>}
              </span>
              <button
                onClick={() => void post({ remove_index: i })}
                disabled={busy}
                className="flex-none text-danger hover:underline disabled:opacity-50"
              >
                verwijderen
              </button>
            </li>
          ))}
        </ul>
      )}
      {notes.length === 0 && (
        <p className="mt-3 text-xs text-fg-faint">
          Nog geen feiten vastgelegd. Voorbeeld: &ldquo;Black Friday (week 48) is veruit de
          drukste week&rdquo; of &ldquo;TV liep alleen in het najaar van 2024&rdquo;.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-xs text-fg-muted">
          Type
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value as BusinessContextNote["topic"])}
            className="block rounded border border-border-strong bg-surface px-2 py-1 text-xs outline-none focus:border-accent/50"
          >
            {Object.entries(TOPIC_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[14rem] flex-1 text-xs text-fg-muted">
          Feit
          <input
            type="text"
            value={fact}
            onChange={(e) => setFact(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addFact();
            }}
            placeholder="bv. sterke decemberpiek door feestdagen"
            className="block w-full rounded border border-border-strong bg-surface px-2 py-1 text-xs outline-none focus:border-accent/50"
          />
        </label>
        <label className="text-xs text-fg-muted">
          Betreft (optioneel)
          <input
            type="text"
            value={relatesTo}
            onChange={(e) => setRelatesTo(e.target.value)}
            placeholder="kolom of kanaal"
            className="block w-36 rounded border border-border-strong bg-surface px-2 py-1 text-xs outline-none focus:border-accent/50"
          />
        </label>
        <button
          onClick={() => void addFact()}
          disabled={busy || !fact.trim()}
          className="rounded-lg border border-border-strong px-3 py-1.5 text-xs font-medium text-fg transition hover:bg-surface-2 disabled:opacity-50"
        >
          Toevoegen
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
