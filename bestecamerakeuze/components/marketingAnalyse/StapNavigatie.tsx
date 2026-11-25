"use client";

import { OordeelStip } from "@/components/marketingAnalyse/onderdelen";
import { formatWaarde, type AnalyseTab } from "@/lib/marketingAnalyse/rekenen";

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

function knopKlasse(actief: boolean, leeg = false) {
  return `flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left transition-colors duration-[var(--duur-snel)] ease-merk ${
    actief ? "bg-primary-light" : "hover:bg-surface-tint"
  } ${leeg && !actief ? "opacity-60" : ""}`;
}

function Vak({ actief, children }: { actief: boolean; children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-meta font-semibold tabular-nums ${
        actief ? "bg-primary text-on-primary" : "bg-surface text-ink-muted"
      }`}
    >
      {children}
    </span>
  );
}

/**
 * De navigatie links op de analysepagina: bovenaan de samenvatting, dan de stappen van de
 * funnel in hun groepen (Media, Content, Website, Resultaat), elk met het hoofdgetal en het
 * stipje met het oordeel, en onderaan de verantwoording.
 */
export default function StapNavigatie({
  tabs,
  actief,
  onKies,
}: {
  tabs: AnalyseTab[];
  actief: string;
  onKies: (sleutel: string) => void;
}) {
  return (
    <nav
      aria-label="Onderdelen van de analyse"
      className="sticky top-6 flex flex-col gap-0.5 rounded-panel border border-line bg-card p-3 shadow-subtle"
    >
      <button type="button" onClick={() => onKies(SAMENVATTING)} aria-current={actief === SAMENVATTING ? "page" : undefined} className={knopKlasse(actief === SAMENVATTING)}>
        <Vak actief={actief === SAMENVATTING}>✓</Vak>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold text-ink">Samenvatting</span>
          <span className="text-meta text-ink-muted">Conclusie en wat nu te doen</span>
        </span>
      </button>

      {groepeer(tabs).map((g, gi) => (
        <div key={`${g.naam}-${gi}`} className="flex flex-col gap-0.5">
          {g.naam && <p className="label-theme mt-3 px-2.5 pb-1 text-label text-ink-faint">{g.naam}</p>}
          {!g.naam && gi === 0 && <span className="my-2 h-px bg-line-soft" />}
          {g.tabs.map(({ tab, nr }) => {
            const isActief = actief === tab.sleutel;
            const cijfer = tab.hoofdcijfer ? formatWaarde(tab.hoofdcijfer.waarde, tab.hoofdcijfer.eenheid) : null;
            return (
              <button
                key={tab.sleutel}
                type="button"
                onClick={() => onKies(tab.sleutel)}
                aria-current={isActief ? "page" : undefined}
                title={tab.hoofdcijfer ? `${tab.hoofdcijfer.label}: ${cijfer}` : (tab.reden ?? undefined)}
                className={knopKlasse(isActief, tab.leeg)}
              >
                <Vak actief={isActief}>{nr}</Vak>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold text-ink">{tab.naam}</span>
                  <span className="truncate text-meta tabular-nums text-ink-muted">
                    {cijfer ? `${cijfer} · ${tab.hoofdcijfer?.label.toLowerCase()}` : tab.leeg ? "geen data" : " "}
                  </span>
                </span>
                <OordeelStip oordeel={tab.oordeel} />
              </button>
            );
          })}
        </div>
      ))}

      <span className="mx-1.5 my-2 h-px bg-line-soft" />
      <button type="button" onClick={() => onKies(VERANTWOORDING)} aria-current={actief === VERANTWOORDING ? "page" : undefined} className={knopKlasse(actief === VERANTWOORDING)}>
        <Vak actief={actief === VERANTWOORDING}>i</Vak>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold text-ink">Verantwoording</span>
          <span className="text-meta text-ink-muted">Bronnen, herkenning, datakwaliteit</span>
        </span>
      </button>
    </nav>
  );
}
