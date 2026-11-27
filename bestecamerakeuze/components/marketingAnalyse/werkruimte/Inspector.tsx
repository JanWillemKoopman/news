"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getBrandLogo } from "@/components/brandLogos";
import { useGrafiekKleuren } from "@/components/ThemeProvider";
import { IconArrowRight, IconClose, IconMail, IconPencil } from "@/components/icons";
import { LabelBadge } from "@/components/marketingAnalyse/onderdelen";
import { useOvergang } from "@/components/marketingAnalyse/werkruimte/Bediening";
import {
  KanaalStip,
  KplWaarde,
  TEMPO_KOSTEN,
  TEMPO_LEADS,
  TempoTekst,
  VoortgangBalk,
  kplUitleg,
} from "@/components/marketingAnalyse/werkruimte/Visueel";
import { kanaalKleur } from "@/lib/marketingAnalyse/kanaalKleur";
import type { CampagneVoortgang } from "@/lib/marketingAnalyse/portefeuille";
import { bedrijvenLabel, datumKort, formatWaarde, looptijdLabel, overzichtCijfers } from "@/lib/marketingAnalyse/rekenen";
import { kostenPer, leesUitsplitsing, prognoseBijHuidigTempo } from "@/lib/marketingAnalyse/uitsplitsing";
import { DOEL_STATUS_NAAM, type MaOverzichtRegel } from "@/lib/marketingAnalyse/types";

/**
 * Het detailpaneel van één campagne in het overzicht (redesign november 2026). Komt van rechts
 * binnen, houdt de gekozen regel herkenbaar en geeft de focus bij sluiten terug aan die regel; de
 * scrollpositie van het overzicht blijft staan. Alles komt uit de laatste analyse (de kerncijfers
 * en hun uitsplitsing); een uitsplitsing die niet optelt tot het cijfer, valt weg (`leesUitsplitsing`).
 */
export default function Inspector({
  regel,
  voortgang,
  open,
  onSluit,
  onOpenAnalyse,
  onBriefing,
  onVolgers,
}: {
  regel: MaOverzichtRegel | null;
  voortgang: CampagneVoortgang | null;
  open: boolean;
  onSluit: () => void;
  onOpenAnalyse: (id: string) => void;
  onBriefing: (r: MaOverzichtRegel) => void;
  onVolgers: (r: MaOverzichtRegel) => void;
}) {
  const { aanwezig, stand } = useOvergang(open, 170);
  const paneel = useRef<HTMLElement>(null);
  const kleuren = useGrafiekKleuren();

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => paneel.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true }), 40);
    const toets = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector(".ma-pop")) onSluit();
    };
    document.addEventListener("keydown", toets);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", toets);
    };
  }, [open, onSluit]);

  if (!aanwezig || !regel || !voortgang) return null;
  const c = voortgang;
  const k = regel.laatsteAnalyse?.kerncijfers;
  const o = overzichtCijfers(regel, k);
  const u = leesUitsplitsing(k);
  const Logo = regel.merk ? getBrandLogo(regel.merk) : null;
  const prognoseKosten = prognoseBijHuidigTempo(c.kosten, c.dag, c.dagen);
  const prognoseLeads = prognoseBijHuidigTempo(c.leads, c.dag, c.dagen);
  const kleur = (naam: string, i: number) => kanaalKleur(naam, kleuren.categorieen, kleuren.context) ?? kleuren.categorieen[i % kleuren.categorieen.length];
  const doel = k?.doel;

  return createPortal(
    <>
      {/* Op een smal scherm een sheet over de pagina; op desktop blijft het overzicht bruikbaar. */}
      <div
        aria-hidden="true"
        onClick={onSluit}
        data-stand={stand}
        className="ma-scherm fixed inset-0 z-[55] bg-[rgb(15_23_42/0.18)] lg:hidden"
      />
      <aside
        ref={paneel}
        role="dialog"
        aria-modal="false"
        aria-label={`Details van ${regel.naam}`}
        data-stand={stand}
        className="ma-paneel fixed inset-y-0 right-0 z-[56] flex w-full flex-col border-l border-line bg-[var(--ma-ondergrond)] shadow-[0_0_0_0.5px_var(--ma-glas-lijn),-24px_0_60px_-28px_rgb(15_23_42/0.35)] sm:w-[440px] lg:top-[var(--ma-balk-hoogte)]"
      >
        <header className="flex items-start gap-3 border-b border-line-soft px-5 pb-4 pt-4">
          {Logo && <Logo role="img" aria-label={regel.merk ?? undefined} className="mt-1 h-5 w-5 shrink-0 text-ink-muted" />}
          <div className="min-w-0 flex-1">
            <h2 className="ma-kop text-[16px] leading-snug text-ink">{regel.naam}</h2>
            <p className="mt-0.5 text-[12px] text-ink-muted">
              {bedrijvenLabel(regel.bedrijven)} · {looptijdLabel(regel.startdatum, regel.einddatum)}
            </p>
            {regel.laatsteAnalyse && (
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-faint">
                <span>
                  v{regel.laatsteAnalyse.versie} · geanalyseerd {datumKort(regel.laatsteAnalyse.geanalyseerdOp)}
                  {c.standTot ? ` · stand t/m ${datumKort(c.standTot)}` : ""}
                </span>
                <LabelBadge label={regel.laatsteAnalyse.label} />
              </p>
            )}
          </div>
          <button type="button" onClick={onSluit} aria-label="Detailpaneel sluiten" title="Sluiten (Esc)" className="ma-knop -mr-1.5 -mt-0.5 px-2">
            <IconClose />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!regel.laatsteAnalyse ? (
            <p className="text-[13px] text-ink-muted">Nog niet geanalyseerd: er zijn nog geen cijfers.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {c.dag !== null && c.dagen !== null && (
                <div>
                  <p className="flex items-baseline justify-between text-[12px] text-ink-muted">
                    <span>Looptijd</span>
                    <span className="ma-getal">
                      dag {c.dag} van {c.dagen} · {formatWaarde(c.tijdPct, "procent")}
                    </span>
                  </p>
                </div>
              )}

              <Blok titel="Uitgaven tegen budget" rechts={c.kostenTempo ? <TempoTekst {...TEMPO_KOSTEN[c.kostenTempo]} /> : undefined}>
                <p className="ma-getal text-[20px] font-semibold text-ink">
                  {formatWaarde(c.kosten, "euro")}
                  <span className="ml-1.5 text-[12.5px] font-normal text-ink-muted">
                    {c.budget !== null ? `van ${formatWaarde(c.budget, "euro")}` : "geen budget in de briefing"}
                  </span>
                </p>
                <div className="mt-2">
                  <VoortgangBalk pct={c.besteedPct} tijdPct={c.tijdPct} label="Uitgaven tegen budget, streep is de looptijd" />
                </div>
                <p className="mt-1.5 text-[11.5px] text-ink-muted">
                  {c.verwachtKosten !== null && <>Verwacht bij de looptijd {formatWaarde(c.verwachtKosten, "euro")}. </>}
                  {prognoseKosten !== null && <>Bij dit tempo eind looptijd ± {formatWaarde(prognoseKosten, "euro")}.</>}
                </p>
              </Blok>

              <Blok
                titel={`Leads${c.leadSoort ? ` · ${c.leadSoort}` : ""}`}
                rechts={c.leadTempo ? <TempoTekst {...TEMPO_LEADS[c.leadTempo]} /> : undefined}
              >
                <p className="ma-getal text-[20px] font-semibold text-ink">
                  {formatWaarde(c.leads)}
                  <span className="ml-1.5 text-[12.5px] font-normal text-ink-muted">
                    {c.doelLeads !== null ? `van ${formatWaarde(c.doelLeads)} (GA4)` : "geen aantal in het doel (GA4)"}
                  </span>
                </p>
                {c.doelLeads !== null && (
                  <div className="mt-2">
                    <VoortgangBalk pct={c.gehaaldPct} tijdPct={c.tijdPct} label="Leads tegen doel, streep is de looptijd" />
                  </div>
                )}
                <p className="mt-1.5 text-[11.5px] text-ink-muted">
                  {c.verwachtLeads !== null && <>Verwacht bij de looptijd {formatWaarde(c.verwachtLeads)}. </>}
                  {prognoseLeads !== null && c.leads !== null && c.leads > 0 && <>Bij dit tempo eind looptijd ± {formatWaarde(prognoseLeads)}.</>}
                </p>
                {doel?.toelichting && (
                  <p className="mt-2 rounded-[8px] bg-surface-tint px-3 py-2 text-[12px] leading-snug text-ink-muted">
                    <span className="font-medium text-ink">{DOEL_STATUS_NAAM[doel.status] ?? "Doel"}.</span> {doel.toelichting}
                  </p>
                )}
              </Blok>

              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line-soft bg-line-soft">
                <Mini label="Kosten per lead" waarde={<KplWaarde waarde={c.kostenPerLead} reden={c.kplReden} kosten={c.kosten} />} uitleg={kplUitleg(c.kplReden, c.kosten)} />
                <Mini label="Bezoekers" waarde={formatWaarde(c.bezoekers)} uitleg="sessies op de campagnepagina" />
                <Mini label="CTR advertenties" waarde={formatWaarde(c.ctr, "procent")} uitleg="klikken ÷ vertoningen, gewogen" />
                <Mini label="Kosten per bezoeker" waarde={formatWaarde(kostenPer(c.kosten, c.bezoekers), "euro")} uitleg="mediakosten ÷ sessies" />
              </dl>

              {(u.kosten || u.ctr) && (
                <Blok titel="Per platform" uitleg="Uit de uitsplitsing van de analyse; telt op tot de mediakosten.">
                  <ul className="flex flex-col gap-2.5">
                    {(u.ctr ?? u.kosten ?? []).map((pf, i) => {
                      const aandeel = c.kosten && pf.kosten !== null ? (pf.kosten / c.kosten) * 100 : null;
                      const ctr = "ctr" in pf ? (pf as { ctr: number | null }).ctr : null;
                      return (
                        <li key={pf.naam}>
                          <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                            <span className="flex items-center gap-1.5 font-medium text-ink">
                              <KanaalStip kleur={kleur(pf.naam, i)} />
                              {pf.naam}
                            </span>
                            <span className="ma-getal text-ink">
                              {formatWaarde(pf.kosten, "euro")}
                              <span className="text-ink-faint"> · {aandeel === null ? "—" : `${Math.round(aandeel)}%`}</span>
                            </span>
                          </div>
                          <div className="mt-1 h-1 rounded-full bg-[color-mix(in_srgb,var(--color-ink)_7%,transparent)]">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, aandeel ?? 0)}%`, backgroundColor: kleur(pf.naam, i) }} />
                          </div>
                          <p className="ma-getal mt-1 text-[11.5px] text-ink-faint">
                            {formatWaarde(pf.klikken)} klikken · CTR {formatWaarde(ctr, "procent")} · {formatWaarde(kostenPer(pf.kosten, pf.klikken), "euro")} per klik
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </Blok>
              )}

              {u.sessies && (
                <Blok titel="Bezoekers per kanaal" uitleg="Sessies die op de campagnepagina begonnen.">
                  <Staafjes regels={u.sessies.map((r, i) => ({ naam: r.naam, aantal: r.aantal, kleur: kleur(r.naam, i) }))} />
                </Blok>
              )}

              {u.leadsGa4 && (
                <Blok titel="Lead-events per soort (GA4)" uitleg="Gemarkeerd = telt mee voor het doel.">
                  <ul className="flex flex-col gap-1">
                    {u.leadsGa4.map((e) => (
                      <li key={e.naam} className="flex items-baseline justify-between gap-2 text-[12.5px]">
                        <span className={e.telt ? "font-medium text-ink" : "text-ink-muted"}>
                          {e.telt ? "● " : "○ "}
                          {e.naam}
                        </span>
                        <span className="ma-getal text-ink">{formatWaarde(e.aantal)}</span>
                      </li>
                    ))}
                  </ul>
                </Blok>
              )}

              {o.syntec.stand === "cijfers" && (o.syntec.leads !== null || o.syntec.orders !== null) && (
                <Blok titel="Syntec (context, niet het leadcijfer)" uitleg={o.syntec.alleenVdu ? "Alleen Van den Udenhout." : undefined}>
                  <ul className="flex flex-col gap-1 text-[12.5px]">
                    <li className="flex justify-between gap-2">
                      <span className="text-ink-muted">Internetleads{o.syntec.leadsSoort ? ` · ${o.syntec.leadsSoort}` : ""}</span>
                      <span className="ma-getal text-ink">{formatWaarde(o.syntec.leads)}</span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className="min-w-0 text-ink-muted">Orders{o.syntec.ordersSoort ? ` · ${o.syntec.ordersSoort}` : ""}</span>
                      <span className="ma-getal text-ink">{formatWaarde(o.syntec.orders)}</span>
                    </li>
                  </ul>
                </Blok>
              )}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-line-soft px-5 py-3">
          <button type="button" data-autofocus onClick={() => onOpenAnalyse(regel.id)} className="ma-knop ma-knop-primair">
            Open volledige analyse
            <IconArrowRight />
          </button>
          <button type="button" onClick={() => onBriefing(regel)} className="ma-knop">
            <IconPencil />
            Briefing
          </button>
          <button type="button" onClick={() => onVolgers(regel)} className="ma-knop">
            <IconMail />
            Volgers <span className="ma-getal text-ink-faint">{regel.aantalVolgers}</span>
          </button>
        </footer>
      </aside>
    </>,
    document.body,
  );
}

function Blok({ titel, uitleg, rechts, children }: { titel: string; uitleg?: string; rechts?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-[12.5px] font-semibold text-ink">{titel}</h3>
        {rechts && <span className="text-[12px]">{rechts}</span>}
      </div>
      {uitleg && <p className="-mt-1.5 mb-2 text-[11.5px] text-ink-faint">{uitleg}</p>}
      {children}
    </section>
  );
}

function Mini({ label, waarde, uitleg }: { label: string; waarde: ReactNode; uitleg?: string | null }) {
  return (
    <div className="bg-[var(--ma-ondergrond)] px-3 py-2.5">
      <dt className="text-[11.5px] text-ink-muted">{label}</dt>
      <dd className="ma-getal mt-0.5 text-[15px] font-semibold text-ink">{waarde}</dd>
      {uitleg && <dd className="text-[11px] leading-tight text-ink-faint">{uitleg}</dd>}
    </div>
  );
}

/** Gesorteerde horizontale staafjes: een rangorde, met het aantal en het aandeel erbij. */
function Staafjes({ regels }: { regels: { naam: string; aantal: number; kleur: string }[] }) {
  const totaal = regels.reduce((s, r) => s + r.aantal, 0);
  const max = Math.max(1, ...regels.map((r) => r.aantal));
  const lijst = [...regels].sort((a, b) => b.aantal - a.aantal);
  return (
    <ul className="flex flex-col gap-1.5">
      {lijst.map((r) => (
        <li key={r.naam} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 text-[12.5px]">
          <span className="flex min-w-0 items-center gap-1.5 text-ink">
            <KanaalStip kleur={r.kleur} />
            <span className="truncate">{r.naam}</span>
          </span>
          <span className="ma-getal text-right text-ink">
            {formatWaarde(r.aantal)} <span className="text-ink-faint">· {totaal ? Math.round((r.aantal / totaal) * 100) : 0}%</span>
          </span>
          <div className="col-span-2 mt-0.5 h-1 rounded-full bg-[color-mix(in_srgb,var(--color-ink)_7%,transparent)]">
            <div className="h-full rounded-full" style={{ width: `${(r.aantal / max) * 100}%`, backgroundColor: r.kleur }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
