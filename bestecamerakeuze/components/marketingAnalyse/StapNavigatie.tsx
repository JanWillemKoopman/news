"use client";

import { useEffect, useRef } from "react";
import { OordeelStip } from "@/components/marketingAnalyse/onderdelen";
import { formatWaarde, type AnalyseTab } from "@/lib/marketingAnalyse/rekenen";
import { TAB_OORDEEL_NAAM } from "@/lib/marketingAnalyse/types";

/** De vaste plekken in de navigatie naast de stappen van de funnel. */
export const SAMENVATTING = "samenvatting";
export const VERANTWOORDING = "verantwoording";

type Groep = { naam: string | null; tabs: { tab: AnalyseTab; nr: number }[] };

/** Opeenvolgende stappen met dezelfde groep bij elkaar; losse secties onder "Overig". */
function groepeer(tabs: AnalyseTab[]): Groep[] {
  const metGroepen = tabs.some((t) => t.groep);
  const groepen: Groep[] = [];
  tabs.forEach((tab, i) => {
    const naam = tab.groep ?? (metGroepen ? "Overig" : null);
    const laatste = groepen[groepen.length - 1];
    if (laatste && laatste.naam === naam) laatste.tabs.push({ tab, nr: i + 1 });
    else groepen.push({ naam, tabs: [{ tab, nr: i + 1 }] });
  });
  return groepen;
}

function Regel({
  actief,
  leeg,
  onClick,
  nr,
  naam,
  rechts,
  titel,
}: {
  actief: boolean;
  leeg?: boolean;
  onClick: () => void;
  nr: React.ReactNode;
  naam: string;
  rechts?: React.ReactNode;
  titel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={actief ? "page" : undefined}
      title={titel}
      className={`ma-nav-item flex h-[28px] w-full items-center gap-2 pl-2 pr-2 text-left text-[12.5px] ${
        actief ? "font-semibold text-ink" : "text-ink-muted hover:text-ink"
      } ${leeg && !actief ? "opacity-55" : ""}`}
    >
      <span aria-hidden="true" className={`ma-getal w-4 shrink-0 text-center text-[11px] ${actief ? "text-primary" : "text-ink-faint"}`}>
        {nr}
      </span>
      <span className="min-w-0 flex-1 truncate">{naam}</span>
      {rechts}
    </button>
  );
}

/**
 * De stappen van een geopende analyse, als geneste lijst onder "Marketing analyse" in de zijbalk
 * (redesign november 2026): zo is er één navigatiekolom en zegt de zijbalk precies waar je bent.
 * Elke stap met zijn oordeelstip; het hoofdgetal staat in de tooltip en op de stap zelf.
 */
export default function StapNavigatie({
  tabs,
  actief,
  onKies,
  naam,
}: {
  tabs: AnalyseTab[];
  actief: string;
  onKies: (sleutel: string) => void;
  /** De campagne, als kopje boven de stappen. */
  naam: string;
}) {
  return (
    <nav aria-label={`Onderdelen van de analyse ${naam}`} className="mb-1 ml-[18px] mt-0.5 border-l border-[var(--ma-zijbalk-lijn)] pl-1.5">
      <p className="truncate px-2 pb-0.5 pt-1 text-[11.5px] font-semibold text-ink" title={naam}>
        {naam}
      </p>
      <Regel actief={actief === SAMENVATTING} onClick={() => onKies(SAMENVATTING)} nr="•" naam="Samenvatting" />
      {groepeer(tabs).map((g, gi) => (
        <div key={`${g.naam}-${gi}`}>
          {g.naam && <p className="px-2 pb-0.5 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-ink-faint">{g.naam}</p>}
          {g.tabs.map(({ tab, nr }) => {
            const cijfer = tab.hoofdcijfer ? formatWaarde(tab.hoofdcijfer.waarde, tab.hoofdcijfer.eenheid) : null;
            return (
              <Regel
                key={tab.sleutel}
                actief={actief === tab.sleutel}
                leeg={tab.leeg}
                onClick={() => onKies(tab.sleutel)}
                nr={nr}
                naam={tab.naam}
                titel={`${tab.naam}${tab.oordeel ? ` · ${TAB_OORDEEL_NAAM[tab.oordeel]}` : ""}${cijfer ? ` · ${cijfer} ${tab.hoofdcijfer?.label.toLowerCase()}` : tab.leeg ? " · geen data" : ""}`}
                rechts={<OordeelStip oordeel={tab.oordeel} className="!h-[7px] !w-[7px]" />}
              />
            );
          })}
        </div>
      ))}
      <Regel actief={actief === VERANTWOORDING} onClick={() => onKies(VERANTWOORDING)} nr="i" naam="Verantwoording" />
    </nav>
  );
}

/**
 * Dezelfde stappen als schuifbare rij bovenaan de inhoud, voor een smal scherm (daar is de
 * zijbalk een lade). De gekozen stap schuift vanzelf in beeld.
 */
export function StapChips({ tabs, actief, onKies }: { tabs: AnalyseTab[]; actief: string; onKies: (sleutel: string) => void }) {
  const rij = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rij.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [actief]);
  const alle = [
    { sleutel: SAMENVATTING, naam: "Samenvatting", oordeel: null, nr: null as number | null },
    ...tabs.map((t, i) => ({ sleutel: t.sleutel, naam: t.naam, oordeel: t.oordeel, nr: i + 1 })),
    { sleutel: VERANTWOORDING, naam: "Verantwoording", oordeel: null, nr: null },
  ];
  return (
    <div ref={rij} role="navigation" aria-label="Stappen van de analyse" className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] sm:-mx-4 sm:px-4">
      {alle.map((s) => {
        const isActief = actief === s.sleutel;
        return (
          <button
            key={s.sleutel}
            type="button"
            aria-current={isActief ? "page" : undefined}
            onClick={() => onKies(s.sleutel)}
            className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition-colors duration-[var(--ma-duur-klein)] ${
              isActief ? "border-transparent bg-ink text-card" : "border-line bg-[var(--ma-ondergrond)] text-ink-muted"
            }`}
          >
            {s.nr !== null && <span className={`ma-getal text-[11px] ${isActief ? "opacity-70" : "text-ink-faint"}`}>{s.nr}</span>}
            {s.naam}
            {s.oordeel && <OordeelStip oordeel={s.oordeel} className="!h-1.5 !w-1.5" />}
          </button>
        );
      })}
    </div>
  );
}
