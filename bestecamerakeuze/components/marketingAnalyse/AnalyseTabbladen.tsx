"use client";

import SectieBlok from "@/components/marketingAnalyse/SectieBlok";
import { OordeelStip, PrioriteitLabel } from "@/components/marketingAnalyse/onderdelen";
import { formatWaarde, type AnalyseTab } from "@/lib/marketingAnalyse/rekenen";
import type { Aanbeveling } from "@/lib/marketingAnalyse/types";

/** De sleutel van het vaste tabblad achteraan. */
export const VERANTWOORDING = "verantwoording";

type Groep = { naam: string | null; tabs: AnalyseTab[] };

/** Opeenvolgende tabbladen met dezelfde groep bij elkaar; losse secties onder "Overig". */
function groepeer(tabs: AnalyseTab[]): Groep[] {
  const metGroepen = tabs.some((t) => t.groep);
  const groepen: Groep[] = [];
  for (const tab of tabs) {
    const naam = tab.groep ?? (metGroepen ? "Overig" : null);
    const laatste = groepen[groepen.length - 1];
    if (laatste && laatste.naam === naam) laatste.tabs.push(tab);
    else groepen.push({ naam, tabs: [tab] });
  }
  return groepen;
}

function TabKnop({
  actief,
  naam,
  onKies,
  tab,
}: {
  actief: boolean;
  naam: string;
  onKies: () => void;
  tab?: AnalyseTab;
}) {
  const cijfer = tab?.hoofdcijfer ? formatWaarde(tab.hoofdcijfer.waarde, tab.hoofdcijfer.eenheid) : null;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={actief}
      onClick={onKies}
      title={tab?.hoofdcijfer ? `${tab.hoofdcijfer.label}: ${cijfer}` : (tab?.reden ?? undefined)}
      className={`-mb-px flex min-w-0 flex-col items-start border-b-2 px-2.5 pb-2.5 pt-1 text-left transition-colors duration-[var(--duur-snel)] ease-merk ${
        actief ? "border-primary text-ink" : "border-transparent text-ink-muted hover:text-ink"
      } ${tab?.leeg && !actief ? "opacity-60" : ""}`}
    >
      <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium">
        {naam}
        <OordeelStip oordeel={tab?.oordeel} />
      </span>
      <span className="mt-0.5 whitespace-nowrap text-meta tabular-nums text-ink-faint">{cijfer ?? (tab?.leeg ? "geen data" : " ")}</span>
    </button>
  );
}

/**
 * De tabbalk in funnelvolgorde: een klein kopje per groep, onder elke naam het hoofdgetal en
 * naast de naam het stipje met het oordeel. Verantwoording staat los achteraan.
 */
export function AnalyseTabbalk({
  tabs,
  actief,
  onKies,
}: {
  tabs: AnalyseTab[];
  actief: string;
  onKies: (sleutel: string) => void;
}) {
  const groepen = groepeer(tabs);
  return (
    <div className="overflow-x-auto border-b border-line" role="tablist" aria-label="Onderdelen van de analyse">
      <div className="flex min-w-max items-end gap-4">
        {groepen.map((g, i) => (
          <div key={`${g.naam}-${i}`} className="flex flex-col">
            {g.naam && <p className="label-theme px-2.5 text-label text-ink-faint">{g.naam}</p>}
            <div className="flex">
              {g.tabs.map((t) => (
                <TabKnop key={t.sleutel} tab={t} naam={t.naam} actief={actief === t.sleutel} onKies={() => onKies(t.sleutel)} />
              ))}
            </div>
          </div>
        ))}
        <div className="ml-auto flex flex-col pl-4">
          <TabKnop naam="Verantwoording" actief={actief === VERANTWOORDING} onKies={() => onKies(VERANTWOORDING)} />
        </div>
      </div>
    </div>
  );
}

/** De rechterkolom (1/4): het oordeel, de bevindingen en de aanbevolen acties van dit tabblad. */
function BevindingenKolom({ tab, formaat }: { tab: AnalyseTab; formaat: 1 | 2 }) {
  const kop = tab.secties.find((s) => s.kop)?.kop ?? null;
  const bevindingen = tab.secties.flatMap((s) => s.bevindingen ?? []);
  const acties: Aanbeveling[] = tab.secties.flatMap((s) => s.acties ?? []);

  if (formaat === 1) {
    return (
      <p className="text-sm text-ink-muted">
        Deze versie is gemaakt vóór de bevindingen per tabblad. De inzichten en aanbevelingen staan in de samenvatting bovenaan.
      </p>
    );
  }
  if (tab.secties.length === 0) return <p className="text-sm text-ink-muted">Geen bevindingen of acties voor dit onderdeel.</p>;

  return (
    <div className="flex flex-col">
      <h2 className="label-theme text-label text-ink-muted">Bevindingen</h2>
      {kop && (
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-ink">
          <OordeelStip oordeel={tab.oordeel} className="mt-1.5" />
          <span>{kop}</span>
        </p>
      )}
      {bevindingen.length > 0 ? (
        <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink">
          {bevindingen.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      ) : (
        !kop && <p className="mt-2 text-sm text-ink-muted">Geen bevindingen voor dit onderdeel.</p>
      )}

      <div className="mt-5 border-t border-line-soft pt-4">
        <h2 className="label-theme text-label text-ink-muted">Aanbevolen acties</h2>
        {acties.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">Geen acties voor dit onderdeel.</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-3">
            {acties.map((a, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 w-4 shrink-0 text-right text-sm font-semibold tabular-nums text-ink-faint">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{a.titel}</p>
                    <PrioriteitLabel prioriteit={a.prioriteit} />
                  </div>
                  {a.toelichting && <p className="mt-0.5 text-sm text-ink-muted">{a.toelichting}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

/**
 * Eén tabblad: links (3/4) de cijfers, grafieken en tabellen, rechts (1/4) de bevindingen en
 * acties. De rechterkolom blijft staan als je door lange tabellen scrolt.
 */
export function TabbladInhoud({ tab, formaat }: { tab: AnalyseTab; formaat: 1 | 2 }) {
  return (
    <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)] items-start gap-5" role="tabpanel" aria-label={tab.naam}>
      <div className="flex min-w-0 flex-col gap-5">
        {tab.secties.length === 0 ? (
          <section className="rounded-panel border border-dashed border-line bg-card px-6 py-10 text-center">
            <p className="font-semibold text-ink">{tab.naam}</p>
            <p className="mx-auto mt-1 max-w-xl text-sm text-ink-muted">{tab.reden}</p>
          </section>
        ) : (
          tab.secties.map((s, i) => <SectieBlok key={`${s.stap}-${i}`} sectie={s} />)
        )}
      </div>
      <aside className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-panel border border-line bg-card px-5 py-5 shadow-subtle">
        <BevindingenKolom tab={tab} formaat={formaat} />
      </aside>
    </div>
  );
}
