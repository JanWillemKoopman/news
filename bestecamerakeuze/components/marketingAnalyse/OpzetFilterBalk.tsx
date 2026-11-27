"use client";

import type { OpzetFilterKnop, StatusFilter } from "@/lib/marketingAnalyse/rekenen";

type Props = {
  knoppen: OpzetFilterKnop[];
  /** Aantal live en niet-live analyses (binnen het filter op soort). */
  aantalLive: number;
  aantalNietLive: number;
  /** Het gekozen statusfilter; `null` = beide. */
  status: StatusFilter | null;
  onStatus: (status: StatusFilter | null) => void;
  /** De gekozen soort (sleutel). Er staat altijd één soort aan. */
  gekozen: string | null;
  onKies: (soort: string) => void;
};

export function FilterKnop({
  naam,
  aantal,
  aan,
  onClick,
  stip,
}: {
  naam: string;
  aantal: number;
  aan: boolean;
  onClick: () => void;
  stip?: "live" | "niet-live";
}) {
  // Geen analyses van deze soort (binnen het statusfilter): grijs, maar wel aanklikbaar.
  const leeg = aantal === 0 && !aan;
  return (
    <button
      type="button"
      aria-pressed={aan}
      onClick={onClick}
      title={leeg ? `Geen analyses: ${naam}` : undefined}
      // Gekozen: een vol vlak in de inktkleur, zodat de selectie in één oogopslag te zien is. Zelfde
      // gewicht en maat als voorheen, dus de knoppen schuiven niet; hover wisselt alleen rand en tekst.
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-button border px-3.5 py-1.5 text-sm transition-colors duration-[var(--duur-snel)] ease-merk ${
        aan
          ? "border-ink bg-ink font-medium text-card"
          : leeg
            ? "border-line-soft bg-surface text-ink-faint hover:border-line hover:text-ink-muted"
            : "border-line bg-card text-ink-muted hover:border-ink-faint hover:text-ink"
      }`}
    >
      {stip && <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${stip === "live" ? "bg-open" : "bg-closed"}`} />}
      {naam}
      <span className={`text-meta tabular-nums ${aan ? "text-card/70" : "text-ink-faint"}`}>{aantal}</span>
    </button>
  );
}

/**
 * Filterbalk boven het overzicht: één knop per soort analyse (Campagne analyse, Maandrapportage,
 * Kwartaalrapportage, … over de bedrijven heen) met het aantal analyses. Links daarvan
 * het statusfilter: Live (vandaag tussen start- en einddatum) of Niet live. De
 * knoppen komen uit de opzetten, dus een nieuwe opzet uit Analyse prompts staat er vanzelf bij.
 * Er staat altijd precies één soort aan (standaard Campagne analyse): elke soort heeft zijn eigen
 * kolommen, dus soorten komen nooit samen in één lijst. Een klik op de gekozen knop doet niets.
 */
export default function OpzetFilterBalk({ knoppen, aantalLive, aantalNietLive, status, onStatus, gekozen, onKies }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Filter op status" className="flex items-center gap-2">
        <FilterKnop naam="Live" stip="live" aantal={aantalLive} aan={status === "live"} onClick={() => onStatus(status === "live" ? null : "live")} />
        <FilterKnop
          naam="Niet live"
          stip="niet-live"
          aantal={aantalNietLive}
          aan={status === "niet-live"}
          onClick={() => onStatus(status === "niet-live" ? null : "niet-live")}
        />
      </div>
      <span aria-hidden className="mx-1 h-5 w-px bg-line" />
      <div role="group" aria-label="Filter op soort analyse" className="flex flex-wrap items-center gap-2">
        {knoppen.map((k) => (
          <FilterKnop key={k.id} naam={k.naam} aantal={k.aantal} aan={gekozen === k.id} onClick={() => onKies(k.id)} />
        ))}
      </div>
    </div>
  );
}

/**
 * Filterbalk op bedrijf, boven de andere: Alle (standaard) en één knop per bedrijf met het aantal
 * analyses binnen de andere filters. Een analyse over meer bedrijven telt bij elk ervan.
 * Nog een klik op het gekozen bedrijf zet het filter terug op Alle.
 */
export function BedrijfFilterBalk({
  bedrijven,
  totaal,
  gekozen,
  onKies,
}: {
  bedrijven: { naam: string; aantal: number }[];
  totaal: number;
  gekozen: string | null;
  onKies: (bedrijf: string | null) => void;
}) {
  return (
    <div role="group" aria-label="Filter op bedrijf" className="flex flex-wrap items-center gap-2">
      <FilterKnop naam="Alle" aantal={totaal} aan={gekozen === null} onClick={() => onKies(null)} />
      <span aria-hidden className="mx-1 h-5 w-px bg-line" />
      {bedrijven.map((b) => (
        <FilterKnop key={b.naam} naam={b.naam} aantal={b.aantal} aan={gekozen === b.naam} onClick={() => onKies(gekozen === b.naam ? null : b.naam)} />
      ))}
    </div>
  );
}
