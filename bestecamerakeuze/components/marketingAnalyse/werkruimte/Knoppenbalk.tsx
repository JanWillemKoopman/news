"use client";

import type { ReactNode } from "react";
import { IconSidebar } from "@/components/icons";
import { useGescrold, useWerkruimte } from "@/components/marketingAnalyse/werkruimte/WerkruimteContext";

/**
 * De ene knoppenbalk boven de werkruimte (redesign november 2026): links waar je bent (titel),
 * daarnaast de selectie (periode, vergelijking, soort, filters) en rechts de acties. Liquid Glass:
 * de inhoud schuift er zichtbaar onderdoor, en zodra dat gebeurt krijgt het glas meer dekking en
 * een haarlijn (`.ma-balk[data-gescrold]`), zodat tekst en grafieklijnen er nooit doorheen lezen.
 *
 * Op een smal scherm staat de selectie op een tweede regel die horizontaal schuift, en opent de
 * knop links de navigatie als lade. Rechts blijft 56px vrij voor het oogje (ThemeSwitcher).
 */
export default function Knoppenbalk({
  titel,
  ondertitel,
  voor,
  selectie,
  acties,
}: {
  titel: ReactNode;
  /** Een kleine regel onder de titel op brede schermen (bijv. "Stand t/m 26 nov"). */
  ondertitel?: ReactNode;
  /** Vóór de titel: een terugknop. */
  voor?: ReactNode;
  /** De selectie: periode en vergelijking, soort en filters. */
  selectie?: ReactNode;
  acties?: ReactNode;
}) {
  const gescrold = useGescrold();
  const { openNavigatie, breed } = useWerkruimte();
  return (
    <header data-gescrold={gescrold} className="ma-balk ma-glas sticky top-0 z-30">
      <div className="flex min-h-[var(--ma-balk-hoogte)] flex-wrap items-center gap-x-2 pl-2.5 pr-14 lg:flex-nowrap lg:pl-5">
        {!breed && (
          <button type="button" onClick={openNavigatie} aria-label="Navigatie openen" title="Navigatie" className="ma-knop px-2">
            <IconSidebar />
          </button>
        )}
        {voor}
        <div className="flex min-h-[var(--ma-balk-hoogte)] min-w-0 flex-1 flex-col justify-center lg:max-w-[300px] lg:flex-none lg:shrink lg:pr-2">
          <h1 className="ma-titel truncate text-ink">{titel}</h1>
          {ondertitel && <p className="hidden truncate text-[11.5px] leading-tight text-ink-muted lg:block">{ondertitel}</p>}
        </div>
        {selectie && (
          <div className="order-last -mx-2.5 flex w-[calc(100%+20px)] items-center gap-1.5 overflow-x-auto px-2.5 pb-2.5 [scrollbar-width:none] lg:order-none lg:mx-0 lg:w-auto lg:min-w-0 lg:flex-1 lg:overflow-visible lg:px-0 lg:pb-0">
            {selectie}
          </div>
        )}
        {acties && <div className="ml-auto flex shrink-0 items-center gap-1">{acties}</div>}
      </div>
    </header>
  );
}
