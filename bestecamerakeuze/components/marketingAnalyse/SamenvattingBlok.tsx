"use client";

import { useEffect, useState } from "react";
import Markdown from "@/components/chat/Markdown";
import { IconChevronDown, IconClose } from "@/components/icons";
import { DoelRegel, PrioriteitLabel } from "@/components/marketingAnalyse/onderdelen";
import {
  bedrijvenLabel,
  formatWaarde,
  looptijdLabel,
  sorteerOpPrioriteit,
  type AnalyseTab,
  type TabActie,
} from "@/lib/marketingAnalyse/rekenen";
import type { InzichtSoort, Label, MaAnalyse, MaCampagne, MaResultaat } from "@/lib/marketingAnalyse/types";

const BRIEFING_OPEN_SLEUTEL = "ma-briefing-open";

const SOORT_LABEL: Record<InzichtSoort, string> = { sterk: "Sterk", zwak: "Zwak", kans: "Kans", risico: "Risico" };

/** Alleen zwak en risico vragen om aandacht; de rest blijft rustig. */
const SOORT_KLEUR: Record<InzichtSoort, string> = {
  sterk: "border-positive/40 text-positive",
  kans: "border-line text-ink-muted",
  zwak: "border-negative/40 text-negative",
  risico: "border-negative/40 text-negative",
};

type BriefingVelden = Partial<MaCampagne> & { bedrijf?: string };

/** Bedrijven uit een briefing; versies van vóór migratie 0045 hebben één `bedrijf`. */
function bedrijvenUitBriefing(b: BriefingVelden): string {
  if (b.bedrijven && b.bedrijven.length > 0) return bedrijvenLabel(b.bedrijven);
  return b.bedrijf || "—";
}

/** De velden van een briefing, in vaste volgorde. Lege velden vallen weg, behalve de vaste. */
function briefingRegels(b: BriefingVelden, opzet: string | undefined, rapportage: boolean): [string, string][] {
  if (rapportage) {
    return [
      ["Analyse opzet", opzet || "—"],
      ["Bedrijf", bedrijvenUitBriefing(b)],
      ["Periode", b.periodeTekst || "—"],
    ];
  }
  return [
    ...(opzet ? ([["Analyse opzet", opzet]] as [string, string][]) : []),
    ["Bedrijf", bedrijvenUitBriefing(b)],
    ["Looptijd", looptijdLabel(b.startdatum ?? null, b.einddatum ?? null)],
    ["Totaalbudget", b.budget != null ? formatWaarde(b.budget, "euro") : "—"],
    ["Merk en model", [b.merk, (b.modellen ?? []).join(", ")].filter(Boolean).join(" · ") || "—"],
  ];
}

/** De briefing als los blok (alleen zolang er nog geen analyse is). */
export function Briefing({ b, titel, opzet, rapportage }: { b: BriefingVelden; titel: string; opzet?: string; rapportage: boolean }) {
  return (
    <section className="rounded-panel border border-line bg-card px-6 py-5 shadow-subtle">
      <h2 className="label-theme mb-3 text-label text-ink-muted">{titel}</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
        {briefingRegels(b, opzet, rapportage).map(([label, waarde]) => (
          <div key={label}>
            <dt className="text-meta text-ink-faint">{label}</dt>
            <dd className="mt-0.5 text-sm text-ink">{waarde}</dd>
          </div>
        ))}
      </dl>
      {b.doel && (
        <div className="mt-4">
          <p className="text-meta text-ink-faint">Doel</p>
          <p className="mt-0.5 max-w-[90ch] whitespace-pre-line text-sm text-ink">{b.doel}</p>
        </div>
      )}
      {b.omschrijving && <p className="mt-4 max-w-[90ch] whitespace-pre-line text-sm text-ink-muted">{b.omschrijving}</p>}
    </section>
  );
}

/** De briefing bij deze versie als smalle kolom, onder elkaar. */
function BriefingKolom({ analyse, onSluit }: { analyse: MaAnalyse; onSluit: () => void }) {
  const b = analyse.briefing;
  const rapportage = b.formulier === "rapportage";
  const tekstVelden: [string, string | null | undefined][] = [
    ["Doel", b.doel],
    ["Omschrijving", b.omschrijving],
    ["Data correctie bij deze versie", b.dataCorrectie],
  ];
  return (
    <div className="flex w-[340px] shrink-0 flex-col border-l border-line-soft">
      <div className="flex items-center justify-between gap-2 border-b border-line-soft px-5 py-3">
        <h2 className="label-theme text-label text-ink-muted">Briefing bij v{analyse.versie}</h2>
        <button
          type="button"
          onClick={onSluit}
          aria-label="Briefing inklappen"
          title="Briefing inklappen"
          className="flex h-7 w-7 items-center justify-center rounded-control text-ink-faint transition-colors hover:bg-surface hover:text-ink"
        >
          <IconClose className="h-4 w-4" />
        </button>
      </div>
      <dl className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
        {briefingRegels(b, b.opzet, rapportage).map(([label, waarde]) => (
          <div key={label}>
            <dt className="text-meta text-ink-faint">{label}</dt>
            <dd className="mt-0.5 text-sm text-ink">{waarde}</dd>
          </div>
        ))}
        {tekstVelden
          .filter(([, waarde]) => waarde && waarde.trim())
          .map(([label, waarde]) => (
            <div key={label}>
              <dt className="text-meta text-ink-faint">{label}</dt>
              <dd className="mt-0.5 whitespace-pre-line text-sm text-ink">{waarde}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

/** Een klein knopje naar een tabblad. */
function TabKnop({ tab, onKies }: { tab: Pick<AnalyseTab, "sleutel" | "naam">; onKies: (sleutel: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onKies(tab.sleutel)}
      className="whitespace-nowrap rounded-control border border-line-soft bg-surface-tint px-1.5 py-0.5 text-meta text-ink-muted transition-colors hover:border-line hover:text-ink"
    >
      {tab.naam} →
    </button>
  );
}

/** Formaat 2: de acties voor de campagne als geheel, en daaronder die uit de tabbladen. */
function ActiesFormaat2({
  resultaat,
  tabs,
  tabActies,
  onKiesTab,
}: {
  resultaat: MaResultaat;
  tabs: AnalyseTab[];
  tabActies: TabActie[];
  onKiesTab: (sleutel: string) => void;
}) {
  const [alles, setAlles] = useState(false);
  const geheel = sorteerOpPrioriteit(resultaat.aanbevelingen ?? [], (a) => a.prioriteit);
  const hoog = tabActies.filter((a) => a.actie.prioriteit === "hoog");
  // Standaard alleen hoog; is er geen enkele actie met hoog, dan de eerste drie.
  const standaard = hoog.length > 0 ? hoog : tabActies.slice(0, 3);
  const zichtbaar = alles ? tabActies : standaard;
  const tabPerSleutel = new Map(tabs.map((t) => [t.sleutel, t]));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="label-theme text-label text-ink-muted">De campagne als geheel</h2>
        {geheel.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">Geen overkoepelende acties in deze versie.</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-3">
            {geheel.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 w-4 shrink-0 text-right text-sm font-semibold tabular-nums text-ink-faint">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">{a.titel}</p>
                    <PrioriteitLabel prioriteit={a.prioriteit} />
                  </div>
                  {a.toelichting && <p className="mt-0.5 text-sm text-ink-muted">{a.toelichting}</p>}
                  {a.tabs && a.tabs.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {a.tabs.map((s) => {
                        const tab = tabPerSleutel.get(s);
                        return tab ? <TabKnop key={s} tab={tab} onKies={onKiesTab} /> : null;
                      })}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {tabActies.length > 0 && (
        <div className="border-t border-line-soft pt-4">
          <h2 className="label-theme text-label text-ink-muted">Uit de tabbladen</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {zichtbaar.map((a, i) => (
              <li key={i} className="flex items-start gap-2" title={a.actie.toelichting || undefined}>
                <PrioriteitLabel prioriteit={a.actie.prioriteit} />
                <p className="min-w-0 flex-1 text-sm text-ink">{a.actie.titel}</p>
                <TabKnop tab={{ sleutel: a.tabSleutel, naam: a.tabNaam }} onKies={onKiesTab} />
              </li>
            ))}
          </ul>
          {tabActies.length > standaard.length && (
            <button
              type="button"
              onClick={() => setAlles((x) => !x)}
              className="mt-2 text-meta text-primary underline-offset-2 hover:underline"
            >
              {alles ? "Alleen de belangrijkste" : `Toon alle acties (${tabActies.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Formaat 1: de aanbevelingen zoals ze toen werden gemaakt. */
function ActiesFormaat1({ resultaat, label }: { resultaat: MaResultaat; label: Label | null }) {
  const lijst = resultaat.aanbevelingen ?? [];
  return (
    <div>
      <h2 className="label-theme text-label text-ink-muted">{label === "eind" ? "Lessen en aanbevelingen" : "Aanbevolen acties"}</h2>
      {lijst.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">Geen aanbevelingen in deze versie.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-3">
          {sorteerOpPrioriteit(lijst, (a) => a.prioriteit).map((a, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 w-4 shrink-0 text-right text-sm font-semibold tabular-nums text-ink-faint">{i + 1}.</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
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
  );
}

/**
 * Het blok bovenaan de analyse: links de samenvatting, in het midden de aanbevolen acties op
 * prioriteit, rechts de briefing bij deze versie (standaard ingeklapt tot een smalle strook).
 */
export default function SamenvattingBlok({
  analyse,
  resultaat: r,
  tabs,
  tabActies,
  onKiesTab,
}: {
  analyse: MaAnalyse;
  resultaat: MaResultaat;
  tabs: AnalyseTab[];
  tabActies: TabActie[];
  onKiesTab: (sleutel: string) => void;
}) {
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [toelichtingOpen, setToelichtingOpen] = useState(false);

  // Per browser onthouden; na het laden, zodat de server altijd "dicht" rendert.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(BRIEFING_OPEN_SLEUTEL) === "1") setBriefingOpen(true);
    } catch {
      // Geen opslag beschikbaar: dan blijft hij dicht.
    }
  }, []);

  function zetBriefing(open: boolean) {
    setBriefingOpen(open);
    try {
      window.localStorage.setItem(BRIEFING_OPEN_SLEUTEL, open ? "1" : "0");
    } catch {
      // Niet erg: dan onthoudt hij het niet.
    }
  }

  return (
    <section className="kaart-accent kaart-omlijst flex rounded-panel border border-line bg-card shadow-card">
      <div className="grid min-w-0 flex-1 grid-cols-2 divide-x divide-line-soft">
        <div className="min-w-0 px-6 py-5">
          <h2 className="label-theme text-label text-ink-muted">Samenvatting</h2>
          {r.samenvatting.kop && <p className="mt-2 font-sans-w7 text-lg font-bold text-ink">{r.samenvatting.kop}</p>}
          {r.samenvatting.regels.length > 0 && (
            <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm text-ink">
              {r.samenvatting.regels.map((regel, i) => (
                <li key={i}>{regel}</li>
              ))}
            </ul>
          )}
          {r.doel && (
            <p className="mt-4 text-sm">
              <span className="text-ink-faint">Doel </span>
              <span className="font-semibold">
                <DoelRegel doel={r.doel} />
              </span>
              <span className="text-ink-muted">. {r.doel.toelichting}</span>
            </p>
          )}
          {r.formaat === 1 && (r.inzichten?.length ?? 0) > 0 && (
            <div className="mt-4 border-t border-line-soft pt-4">
              <h3 className="label-theme mb-2 text-label text-ink-muted">Inzichten</h3>
              <ul className="flex flex-col gap-2">
                {r.inzichten?.map((z, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={`mt-0.5 shrink-0 rounded-control border px-1.5 py-0.5 text-meta ${SOORT_KLEUR[z.soort] ?? SOORT_KLEUR.kans}`}>
                      {SOORT_LABEL[z.soort] ?? z.soort}
                    </span>
                    <p className="min-w-0 text-sm">
                      <span className="font-semibold text-ink">{z.titel}</span>
                      <span className="text-ink-muted"> {z.toelichting}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {r.samenvatting.tekst && (
            <div className="mt-4 border-t border-line-soft pt-3">
              <button
                type="button"
                onClick={() => setToelichtingOpen((x) => !x)}
                aria-expanded={toelichtingOpen}
                className="flex items-center gap-1.5 text-meta text-ink-muted transition-colors hover:text-ink"
              >
                <IconChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-[var(--duur-snel)] ease-merk ${toelichtingOpen ? "rotate-180" : ""}`}
                />
                {toelichtingOpen ? "Toelichting inklappen" : "Lees toelichting"}
              </button>
              {toelichtingOpen && (
                <div className="mt-2 text-sm">
                  <Markdown tekst={r.samenvatting.tekst} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="min-w-0 px-6 py-5">
          {r.formaat === 2 ? (
            <ActiesFormaat2 resultaat={r} tabs={tabs} tabActies={tabActies} onKiesTab={onKiesTab} />
          ) : (
            <ActiesFormaat1 resultaat={r} label={analyse.label} />
          )}
        </div>
      </div>

      {briefingOpen ? (
        <BriefingKolom analyse={analyse} onSluit={() => zetBriefing(false)} />
      ) : (
        <button
          type="button"
          onClick={() => zetBriefing(true)}
          aria-label={`Briefing bij v${analyse.versie} uitklappen`}
          title="Briefing uitklappen"
          className="flex w-11 shrink-0 flex-col items-center gap-2 border-l border-line-soft py-4 text-ink-faint transition-colors hover:bg-surface-tint hover:text-ink"
        >
          <IconChevronDown className="h-4 w-4 rotate-90" />
          <span className="label-theme text-label [writing-mode:vertical-rl]">Briefing</span>
        </button>
      )}
    </section>
  );
}
