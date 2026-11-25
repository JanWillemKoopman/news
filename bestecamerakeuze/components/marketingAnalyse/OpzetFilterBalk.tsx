"use client";

import type { OpzetFilterKnop } from "@/lib/marketingAnalyse/rekenen";

type Props = {
  knoppen: OpzetFilterKnop[];
  /** Totaal aantal analyses, voor de knop Alle. */
  totaal: number;
  /** De gekozen opzet; `null` = Alle. */
  gekozen: string | null;
  onKies: (opzetId: string | null) => void;
};

function Knop({ naam, aantal, aan, onClick }: { naam: string; aantal: number; aan: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={aan}
      onClick={onClick}
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-button border px-3.5 py-1.5 text-sm transition-colors duration-[var(--duur-snel)] ease-merk ${
        aan
          ? "border-primary bg-primary/10 font-medium text-ink"
          : "border-line bg-card text-ink-muted hover:bg-surface hover:text-ink"
      }`}
    >
      {naam}
      <span className={`text-meta tabular-nums ${aan ? "text-ink-muted" : aantal === 0 ? "text-ink-faint/70" : "text-ink-faint"}`}>
        {aantal}
      </span>
    </button>
  );
}

/**
 * Filterbalk boven het overzicht: één knop per analyse opzet (Campagne analyse, de maand- en
 * kwartaalrapportages, …) plus Alle. De knoppen komen uit de opzetten, dus een nieuwe opzet uit
 * Analyse prompts staat er vanzelf bij. Eén keuze tegelijk; nog een klik op de gekozen knop zet
 * het filter terug op Alle.
 */
export default function OpzetFilterBalk({ knoppen, totaal, gekozen, onKies }: Props) {
  return (
    <div role="group" aria-label="Filter op soort analyse" className="flex flex-wrap items-center gap-2">
      <Knop naam="Alle" aantal={totaal} aan={gekozen === null} onClick={() => onKies(null)} />
      <span aria-hidden className="mx-1 h-5 w-px bg-line" />
      {knoppen.map((k) => (
        <Knop key={k.id} naam={k.naam} aantal={k.aantal} aan={gekozen === k.id} onClick={() => onKies(gekozen === k.id ? null : k.id)} />
      ))}
    </div>
  );
}
