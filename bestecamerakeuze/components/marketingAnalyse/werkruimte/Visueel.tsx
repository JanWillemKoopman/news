"use client";

import type { ReactNode } from "react";
import { formatWaarde, type BudgetTempo } from "@/lib/marketingAnalyse/rekenen";
import type { LeadTempo } from "@/lib/marketingAnalyse/portefeuille";

/**
 * Kleine visuele bouwstenen van de werkruimte Marketing analyse (redesign november 2026). Alles
 * staat op een egale ondergrond (`--ma-ondergrond`); kleur heeft een vaste functie: het
 * merkaccent (`primary`) voor wat bereikt is, inkt voor de looptijdstreep, groen en rood alleen
 * voor een oordeel, en altijd met tekst erbij.
 */

export const TEMPO_KOSTEN: Record<BudgetTempo, { naam: string; kleur: string; uitleg: string }> = {
  "op-schema": { naam: "Op schema", kleur: "text-positive", uitleg: "Binnen 10 procentpunt van het verstreken deel van de looptijd." },
  "te-snel": { naam: "Sneller dan gepland", kleur: "text-negative", uitleg: "Meer dan 10 procentpunt vóór op de looptijd: het budget raakt eerder op." },
  "te-langzaam": { naam: "Trager dan gepland", kleur: "text-ink-muted", uitleg: "Meer dan 10 procentpunt achter op de looptijd: er blijft budget over." },
};

export const TEMPO_LEADS: Record<LeadTempo, { naam: string; kleur: string }> = {
  voor: { naam: "Voor op schema", kleur: "text-positive" },
  "op-koers": { naam: "Op koers", kleur: "text-positive" },
  achter: { naam: "Achter op schema", kleur: "text-negative" },
};

/**
 * Een voortgangsbalk met een streep voor het verstreken deel van de looptijd: de balk is wat er
 * bereikt is, de streep waar je zou staan bij een gelijk tempo. Begint altijd bij nul; boven de
 * 100% loopt de balk vol en zegt de tekst het percentage.
 */
export function VoortgangBalk({
  pct,
  tijdPct,
  label,
  dun = false,
}: {
  pct: number | null;
  tijdPct: number | null;
  /** Voor schermlezers: wat de balk laat zien. */
  label: string;
  dun?: boolean;
}) {
  const breedte = pct === null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative w-full rounded-full bg-[color-mix(in_srgb,var(--color-ink)_8%,transparent)] ${dun ? "h-1" : "h-1.5"}`}
    >
      {pct !== null && <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${breedte}%` }} />}
      {tijdPct !== null && (
        <div
          aria-hidden="true"
          className="absolute -bottom-[3px] -top-[3px] w-[2px] rounded-full bg-ink"
          style={{ left: `calc(${Math.max(0, Math.min(100, tijdPct))}% - 1px)` }}
        />
      )}
    </div>
  );
}

/** Eén KPI in een gedeeld oppervlak: label, waarde met eenheid, één regel vergelijking en toelichting. */
export function KpiCel({
  label,
  bron,
  waarde,
  eenheid,
  vergelijking,
  toelichting,
  balk,
  oud = false,
}: {
  label: string;
  /** Waar het cijfer vandaan komt ("GA4", "Google, Meta en LinkedIn Ads"). */
  bron?: string;
  waarde: ReactNode;
  /** Klein achter de waarde: "proefritten", "van € 3.150". */
  eenheid?: ReactNode;
  vergelijking?: ReactNode;
  toelichting?: ReactNode;
  balk?: ReactNode;
  /** De cijfers horen nog bij de vorige selectie. */
  oud?: boolean;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 px-4 py-3.5 lg:px-5 lg:py-4 ${oud ? "ma-oud" : ""}`}>
      <p className="flex min-w-0 items-baseline gap-1.5 text-[12px] font-medium text-ink-muted">
        <span className="shrink-0">{label}</span>
        {bron && (
          <span className="min-w-0 truncate text-[11px] font-normal text-ink-faint" title={bron}>
            {bron}
          </span>
        )}
      </p>
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
        <span className="ma-kpi text-ink">{waarde}</span>
        {eenheid && <span className="text-[12.5px] text-ink-muted">{eenheid}</span>}
      </p>
      {balk && <div className="mt-1">{balk}</div>}
      {vergelijking && <div className="text-[12px] leading-snug text-ink-muted">{vergelijking}</div>}
      {toelichting && <div className="text-[11.5px] leading-snug text-ink-faint">{toelichting}</div>}
    </div>
  );
}

/** Een oppervlak voor samenhangende KPI's, gescheiden door haarlijnen. */
export function KpiOppervlak({ children, kolommen = 4 }: { children: ReactNode; kolommen?: 3 | 4 | 5 }) {
  const lg = kolommen === 5 ? "lg:grid-cols-5" : kolommen === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";
  return (
    <section
      className={`grid grid-cols-2 overflow-hidden rounded-[14px] border border-line bg-[var(--ma-ondergrond)] shadow-subtle ${lg} [&>*]:border-line-soft max-lg:[&>*:nth-child(odd)]:border-r max-lg:[&>*:nth-child(n+3)]:border-t lg:[&>*:not(:first-child)]:border-l`}
    >
      {children}
    </section>
  );
}

/** Een tempo als gekleurde tekst; nooit alleen kleur. */
export function TempoTekst({ naam, kleur, titel }: { naam: string; kleur: string; titel?: string }) {
  return (
    <span title={titel} className={`font-medium ${kleur}`}>
      {naam}
    </span>
  );
}

/** Een sectiekop met optionele toelichting en iets aan de rechterkant. */
export function SectieKop({ titel, uitleg, rechts, id }: { titel: string; uitleg?: ReactNode; rechts?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <h2 id={id} className="ma-kop text-ink">
          {titel}
        </h2>
        {uitleg && <p className="mt-0.5 text-[12px] text-ink-muted">{uitleg}</p>}
      </div>
      {rechts}
    </div>
  );
}

/** Een gekleurd stipje voor een kanaal, altijd naast de naam. */
export function KanaalStip({ kleur }: { kleur: string }) {
  return <span aria-hidden="true" className="inline-block h-2 w-2 shrink-0 rounded-[3px]" style={{ backgroundColor: kleur }} />;
}

/** Kosten per lead met de reden als er geen getal kan staan (€ 154 en 0 leads: geen deling door nul). */
export function KplWaarde({ waarde, reden, kosten }: { waarde: number | null; reden: string | null; kosten?: number | null }) {
  if (waarde !== null) return <>{formatWaarde(waarde, "euro")}</>;
  const titel =
    reden === "geen-leads"
      ? `Niet te berekenen: ${kosten != null ? formatWaarde(kosten, "euro") : "er is"} uitgegeven en er zijn 0 leads gemeten.`
      : reden === "geen-kosten"
        ? "Niet te berekenen: geen mediakosten in deze periode."
        : "Niet gemeten in deze analyse.";
  return (
    <span title={titel} aria-label={titel}>
      —
    </span>
  );
}

export function kplUitleg(reden: string | null, kosten?: number | null): string | null {
  if (reden === "geen-leads") return `${kosten != null ? formatWaarde(kosten, "euro") : "Uitgaven"} en 0 leads: niet te delen`;
  if (reden === "geen-kosten") return "Geen mediakosten";
  if (reden === "niet-gemeten") return "Niet gemeten";
  return null;
}
