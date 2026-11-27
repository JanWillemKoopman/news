"use client";

import Markdown from "@/components/chat/Markdown";
import AnalyseGrafiek from "@/components/marketingAnalyse/AnalyseGrafiek";
import { AnalyseTabel, KerncijferRij } from "@/components/marketingAnalyse/SectieBlok";
import { OordeelBadge, PrioriteitLabel } from "@/components/marketingAnalyse/onderdelen";
import type { AnalyseTab } from "@/lib/marketingAnalyse/rekenen";
import type { Aanbeveling } from "@/lib/marketingAnalyse/types";

export type Buur = { sleutel: string; naam: string };

const KAART = "rounded-panel border border-line bg-card shadow-subtle";

/**
 * Eén stap van de funnel, altijd in dezelfde volgorde: eerst het oordeel in één zin met de
 * kerncijfers, dan wat we zien naast wat nu te doen, dan de grafieken en tabellen, en
 * ingeklapt hoe het gemeten is. Onderaan naar de vorige en volgende stap.
 */
export default function StapPagina({
  tab,
  nr,
  aantal,
  formaat,
  vorige,
  volgende,
  onKies,
}: {
  tab: AnalyseTab;
  nr: number;
  aantal: number;
  formaat: 1 | 2 | 3 | 4;
  vorige: Buur;
  volgende: Buur;
  onKies: (sleutel: string) => void;
}) {
  const kop = tab.secties.find((s) => s.kop)?.kop ?? null;
  const kerncijfers = tab.secties.flatMap((s) => s.kerncijfers ?? []);
  const bevindingen = tab.secties.flatMap((s) => s.bevindingen ?? []);
  const acties: Aanbeveling[] = tab.secties.flatMap((s) => s.acties ?? []);
  const metTitels = tab.secties.length > 1;
  const uitleg = tab.secties.filter((s) => s.tekst?.trim());

  return (
    <div className="flex flex-col gap-5" aria-label={tab.naam}>
      <section className={`${KAART} px-8 py-6`}>
        <p className="text-meta text-ink-muted">
          Stap {nr} van {aantal}
          {tab.groep ? ` · ${tab.groep}` : ""}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h2 className="font-sans-w7 text-title font-bold text-ink">{tab.naam}</h2>
          <OordeelBadge oordeel={tab.oordeel} />
        </div>
        {kop && <p className="mt-2.5 max-w-[72ch] text-base leading-relaxed text-ink">{kop}</p>}
        {!kop && tab.secties[0]?.ondertitel && <p className="mt-2 text-sm text-ink-muted">{tab.secties[0].ondertitel}</p>}
        {kerncijfers.length > 0 && (
          <div className="mt-5">
            <KerncijferRij cijfers={kerncijfers} />
          </div>
        )}
      </section>

      {tab.secties.length === 0 ? (
        <section className="rounded-panel border border-dashed border-line bg-card px-6 py-10 text-center">
          <p className="font-semibold text-ink">Nog geen data voor deze stap</p>
          <p className="mx-auto mt-1 max-w-xl text-sm text-ink-muted">{tab.reden}</p>
        </section>
      ) : (
        <>
          {formaat !== 1 && (
            <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-5">
              <section className={`${KAART} px-6 py-5`}>
                <h3 className="text-sm font-semibold text-ink">Wat we zien</h3>
                {bevindingen.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-muted">Geen bevindingen voor deze stap.</p>
                ) : (
                  <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm text-ink">
                    {bevindingen.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="rounded-panel border border-primary/15 bg-primary-light px-6 py-5">
                <h3 className="text-sm font-semibold text-primary">Wat nu te doen</h3>
                {acties.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-muted">Geen actie nodig voor deze stap.</p>
                ) : (
                  <ol className="mt-3 flex flex-col gap-3.5">
                    {acties.map((a, i) => (
                      <li key={i}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-ink">{a.titel}</p>
                          <PrioriteitLabel prioriteit={a.prioriteit} />
                        </div>
                        {a.toelichting && <p className="mt-0.5 text-sm text-ink-muted">{a.toelichting}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          )}

          {tab.secties.map((s, i) => {
            const grafieken = s.grafieken ?? [];
            const tabellen = s.tabellen ?? [];
            if (!metTitels && grafieken.length === 0 && tabellen.length === 0) return null;
            return (
              <div key={`${s.stap}-${i}`} className="flex flex-col gap-5">
                {metTitels && (
                  <div className="px-1">
                    <h3 className="font-sans-w7 text-base font-bold text-ink">{s.titel}</h3>
                    {s.ondertitel && <p className="text-meta text-ink-muted">{s.ondertitel}</p>}
                  </div>
                )}
                {grafieken.length > 0 && (
                  <div className={`grid gap-5 ${grafieken.length > 1 ? "xl:grid-cols-2" : ""}`}>
                    {grafieken.map((g, j) => (
                      <div key={j} className="rounded-panel bg-card shadow-subtle">
                        <AnalyseGrafiek grafiek={g} />
                      </div>
                    ))}
                  </div>
                )}
                {tabellen.map((t, j) => (
                  <section key={j} className={`${KAART} px-6 py-5`}>
                    <AnalyseTabel tabel={t} />
                  </section>
                ))}
              </div>
            );
          })}

          {uitleg.length > 0 && (
            <details className={`${KAART} px-6 py-4`}>
              <summary className="cursor-pointer text-sm font-semibold text-ink-muted">Hoe is dit gemeten?</summary>
              <div className="mt-3 flex max-w-[90ch] flex-col gap-3 text-sm text-ink-muted">
                {uitleg.map((s, i) => (
                  <div key={i}>
                    {metTitels && <p className="font-semibold text-ink">{s.titel}</p>}
                    <Markdown tekst={s.tekst ?? ""} />
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}

      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={() => onKies(vorige.sleutel)}
          className="rounded-button border border-line bg-card px-4 py-2 text-sm text-ink transition-colors duration-[var(--duur-snel)] ease-merk hover:bg-surface"
        >
          ← {vorige.naam}
        </button>
        <button
          type="button"
          onClick={() => onKies(volgende.sleutel)}
          className="rounded-button bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors duration-[var(--duur-snel)] ease-merk hover:bg-primary-dark"
        >
          {volgende.naam} →
        </button>
      </div>
    </div>
  );
}
