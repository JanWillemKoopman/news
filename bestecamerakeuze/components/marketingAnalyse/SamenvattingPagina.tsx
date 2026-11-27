"use client";

import { useEffect, useState, type ReactNode } from "react";
import Markdown from "@/components/chat/Markdown";
import { IconChevronDown } from "@/components/icons";
import { OordeelBadge, PrioriteitLabel } from "@/components/marketingAnalyse/onderdelen";
import { datumKort, formatWaarde, sorteerOpPrioriteit, type AnalyseTab } from "@/lib/marketingAnalyse/rekenen";
import { DOEL_STATUS_NAAM, type DoelStatus, type MaActieKlaar, type MaAnalyse, type MaResultaat } from "@/lib/marketingAnalyse/types";

const KAART = "rounded-[14px] border border-line bg-[var(--ma-ondergrond)] shadow-subtle";

const DOEL_KLEUR: Record<DoelStatus, string> = {
  voor: "text-positive",
  "op-koers": "text-positive",
  achter: "text-negative",
  onbekend: "text-ink-muted",
};

/** Acties afvinken: gedeeld voor het hele team (migratie 0051). */
function useAfgevinkt(versieId: string) {
  const [afgevinkt, setAfgevinkt] = useState<Map<string, MaActieKlaar>>(new Map());
  const [fout, setFout] = useState<string | null>(null);
  const basis = `/api/marketing-analyse/acties?versie=${encodeURIComponent(versieId)}`;
  const zet = (lijst: MaActieKlaar[] | undefined) => setAfgevinkt(new Map((lijst ?? []).map((a) => [a.actie, a])));

  useEffect(() => {
    let actief = true;
    fetch(basis)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { afgevinkt?: MaActieKlaar[]; fout?: string };
        if (!res.ok) throw new Error(data.fout ?? "Kon de afgevinkte acties niet laden.");
        if (actief) zet(data.afgevinkt);
      })
      .catch((err) => actief && setFout(err instanceof Error ? err.message : String(err)));
    return () => {
      actief = false;
    };
  }, [basis]);

  async function wissel(actie: string) {
    const klaar = !afgevinkt.has(actie);
    setFout(null);
    setAfgevinkt((huidig) => {
      const nieuw = new Map(huidig);
      if (klaar) nieuw.set(actie, { actie, afgevinktOp: new Date().toISOString(), door: null });
      else nieuw.delete(actie);
      return nieuw;
    });
    const res = await fetch(basis, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actie, klaar }),
    });
    const data = (await res.json().catch(() => ({}))) as { afgevinkt?: MaActieKlaar[]; fout?: string };
    if (!res.ok) {
      setFout(data.fout ?? "Afvinken is niet gelukt.");
      setAfgevinkt((huidig) => {
        const terug = new Map(huidig);
        if (klaar) terug.delete(actie);
        return terug;
      });
      return;
    }
    zet(data.afgevinkt);
  }

  return { afgevinkt, wissel, fout };
}

/**
 * De eerste pagina van een analyse: de conclusie naast de ontwikkeling per week, wat aandacht
 * vraagt, wat nu te doen (af te vinken door het team) en de hele funnel in één lijst. De voortgang
 * tegen doel en budget staat sinds de redesign van november 2026 in het KPI-oppervlak erboven
 * (`AnalyseKpis`), met dezelfde rekenregel (`voortgangVanAnalyse`).
 */
export default function SamenvattingPagina({
  analyse,
  resultaat: r,
  tabs,
  onKies,
  trend,
}: {
  analyse: MaAnalyse;
  resultaat: MaResultaat;
  tabs: AnalyseTab[];
  onKies: (sleutel: string) => void;
  /** De hoofdvisualisatie naast de conclusie (`TrendDuo`). */
  trend?: ReactNode;
}) {
  const [toelichtingOpen, setToelichtingOpen] = useState(false);
  const { afgevinkt, wissel, fout } = useAfgevinkt(analyse.id);
  const tabPerSleutel = new Map(tabs.map((t) => [t.sleutel, t]));
  const nummer = new Map(tabs.map((t, i) => [t.sleutel, i + 1]));
  const problemen = tabs.filter((t) => t.oordeel === "probleem");

  // De acties houden hun plek in de opgeslagen lijst als sleutel; getoond op prioriteit.
  const acties = sorteerOpPrioriteit(
    (r.aanbevelingen ?? []).map((a, i) => ({ ...a, sleutel: `geheel-${i}` })),
    (a) => a.prioriteit,
  );
  const aantalKlaar = acties.filter((a) => afgevinkt.has(a.sleutel)).length;
  const stappenMetActies = tabs
    .map((t) => ({ tab: t, aantal: t.secties.reduce((n, s) => n + (s.acties?.length ?? 0), 0) }))
    .filter((x) => x.aantal > 0);

  return (
    <div className="flex flex-col gap-5">
      <div className={`grid items-start gap-5 ${trend ? "xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" : ""}`}>
        <section aria-labelledby="ma-conclusie" className={`${KAART} px-5 py-5 lg:px-6`}>
          <h2 id="ma-conclusie" className="ma-kolomkop">
            Conclusie
          </h2>
          {r.samenvatting.kop && <p className="mt-2 max-w-[62ch] font-sans-w7 text-[17px] font-semibold leading-snug text-ink">{r.samenvatting.kop}</p>}
          {r.samenvatting.regels.length > 0 && (
            <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-[13px] leading-relaxed text-ink marker:text-ink-faint">
              {r.samenvatting.regels.map((regel, i) => (
                <li key={i}>{regel}</li>
              ))}
            </ul>
          )}
          {r.formaat === 1 && (r.inzichten?.length ?? 0) > 0 && (
            <ul className="mt-4 flex flex-col gap-2 border-t border-line-soft pt-4">
              {r.inzichten?.map((z, i) => (
                <li key={i} className="text-[13px]">
                  <span className="font-semibold text-ink">{z.titel}</span>
                  <span className="text-ink-muted"> {z.toelichting}</span>
                </li>
              ))}
            </ul>
          )}
          {r.doel && (
            <p className="mt-4 rounded-[10px] bg-surface-tint px-3.5 py-2.5 text-[12.5px] leading-snug text-ink-muted">
              <span className={`font-semibold ${DOEL_KLEUR[r.doel.status] ?? ""}`}>{DOEL_STATUS_NAAM[r.doel.status]}.</span> {r.doel.toelichting}
            </p>
          )}
          {r.samenvatting.tekst && (
            <div className="mt-3 border-t border-line-soft pt-3">
              <button
                type="button"
                onClick={() => setToelichtingOpen((x) => !x)}
                aria-expanded={toelichtingOpen}
                className="flex items-center gap-1.5 text-[12px] text-ink-muted transition-colors hover:text-ink"
              >
                <IconChevronDown className={`h-3.5 w-3.5 transition-transform duration-[var(--ma-duur-klein)] ${toelichtingOpen ? "rotate-180" : ""}`} />
                {toelichtingOpen ? "Toelichting inklappen" : "Lees toelichting"}
              </button>
              {toelichtingOpen && (
                <div className="ma-in mt-2 text-[13px]">
                  <Markdown tekst={r.samenvatting.tekst} />
                </div>
              )}
            </div>
          )}
        </section>
        {trend}
      </div>

      {problemen.map((t) => (
        <div key={t.sleutel} role="note" className="flex flex-wrap items-start gap-x-4 gap-y-2 rounded-[14px] border border-negative/25 bg-negative/5 px-4 py-3.5 lg:px-5">
          <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-negative text-meta font-bold text-on-primary">
            !
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-ink">Probleem bij {t.naam}</p>
            <p className="mt-0.5 text-[13px] text-ink-muted">{t.secties.find((s) => s.kop)?.kop ?? "Bekijk deze stap."}</p>
          </div>
          <button
            type="button"
            onClick={() => onKies(t.sleutel)}
            className="ma-knop shrink-0 border border-line bg-[var(--ma-ondergrond)]"
          >
            Bekijk {t.naam}
          </button>
        </div>
      ))}

      <section className={KAART}>
        <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 pb-1 pt-4 lg:px-6">
          <h2 className="ma-kop text-ink">{analyse.label === "eind" ? "Lessen en aanbevelingen" : "Wat nu te doen"}</h2>
          {acties.length > 0 && (
            <span className="text-meta text-ink-muted">
              {aantalKlaar} van {acties.length} afgevinkt
            </span>
          )}
        </div>
        {fout && <p className="px-5 text-meta text-negative lg:px-6">{fout}</p>}
        {acties.length === 0 ? (
          <p className="px-5 pb-5 pt-2 text-[13px] text-ink-muted lg:px-6">Geen overkoepelende acties in deze versie.</p>
        ) : (
          <ol className="flex flex-col px-1.5 pb-2 pt-0.5 lg:px-2.5">
            {acties.map((a) => {
              const klaar = afgevinkt.get(a.sleutel);
              const id = `actie-${analyse.id}-${a.sleutel}`;
              return (
                <li key={a.sleutel} className="flex items-start gap-3 rounded-[10px] px-3.5 py-3">
                  <input
                    id={id}
                    type="checkbox"
                    checked={!!klaar}
                    onChange={() => wissel(a.sleutel)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <label htmlFor={id} className={`cursor-pointer text-[13px] font-semibold ${klaar ? "text-ink-faint line-through" : "text-ink"}`}>
                        {a.titel}
                      </label>
                      <PrioriteitLabel prioriteit={a.prioriteit} />
                    </div>
                    {a.toelichting && <p className={`mt-1 text-[13px] leading-snug ${klaar ? "text-ink-faint" : "text-ink-muted"}`}>{a.toelichting}</p>}
                    {klaar && (
                      <p className="mt-1 text-meta text-ink-faint">
                        Afgevinkt{klaar.door ? ` door ${klaar.door}` : ""} op {datumKort(klaar.afgevinktOp)}
                      </p>
                    )}
                    {a.tabs && a.tabs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {a.tabs.map((s) => {
                          const tab = tabPerSleutel.get(s);
                          return tab ? (
                            <button
                              key={s}
                              type="button"
                              onClick={() => onKies(s)}
                              className="whitespace-nowrap rounded-pill border border-line bg-surface-tint px-2.5 py-0.5 text-meta text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                            >
                              {tab.naam} →
                            </button>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {stappenMetActies.length > 0 && r.formaat !== 1 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line-soft px-5 py-3.5 lg:px-6">
            <span className="text-meta text-ink-muted">Acties per stap:</span>
            {stappenMetActies.map(({ tab, aantal }) => (
              <button
                key={tab.sleutel}
                type="button"
                onClick={() => onKies(tab.sleutel)}
                className="whitespace-nowrap rounded-pill border border-line bg-surface-tint px-2.5 py-0.5 text-meta text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
              >
                {tab.naam} ({aantal})
              </button>
            ))}
          </div>
        )}
      </section>

      {tabs.length > 0 && (
        <section aria-labelledby="ma-funnel" className={`${KAART} overflow-hidden`}>
          <div className="px-5 pb-2.5 pt-4 lg:px-6">
            <h2 id="ma-funnel" className="ma-kop text-ink">
              De funnel in één oogopslag
            </h2>
            <p className="mt-0.5 text-[12px] text-ink-muted">Elke stap met zijn hoofdgetal en het oordeel. Klik voor de verdieping.</p>
          </div>
          {tabs.map((t) => (
            <button
              key={t.sleutel}
              type="button"
              onClick={() => onKies(t.sleutel)}
              className={`grid w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-line-soft px-5 py-3 text-left transition-colors duration-[var(--ma-duur-klein)] hover:bg-[color-mix(in_srgb,var(--color-ink)_2.5%,transparent)] lg:grid-cols-[22px_180px_120px_minmax(0,1fr)_14px] lg:px-6 ${
                t.leeg ? "opacity-60" : ""
              }`}
            >
              <span className="ma-getal text-center text-[12px] font-semibold text-ink-faint">{nummer.get(t.sleutel)}</span>
              <span className="truncate text-[13px] font-semibold text-ink">{t.naam}</span>
              <span className="ma-getal truncate text-right text-[13px] font-semibold text-ink lg:text-left">
                {t.hoofdcijfer ? formatWaarde(t.hoofdcijfer.waarde, t.hoofdcijfer.eenheid) : "—"}
              </span>
              <span className="col-span-3 col-start-2 flex min-w-0 items-center gap-2.5 lg:col-span-1 lg:col-start-auto">
                <OordeelBadge oordeel={t.oordeel} />
                <span className="truncate text-[12.5px] text-ink-muted">{t.secties.find((s) => s.kop)?.kop ?? t.reden ?? ""}</span>
              </span>
              <span aria-hidden="true" className="hidden text-ink-faint lg:block">
                ›
              </span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
