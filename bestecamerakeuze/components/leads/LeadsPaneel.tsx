"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import FilterSelect from "@/components/FilterSelect";
import Inlogprompt from "@/components/Inlogprompt";
import { IconCoin, IconInfo } from "@/components/icons";
import { formatteer } from "@/components/chat/chartTheme";
import Kostenverdeling from "@/components/leads/Kostenverdeling";
import LeadsCampagnes from "@/components/leads/LeadsCampagnes";
import LeadsGrafiek, { type LeadsMetriek } from "@/components/leads/LeadsGrafiek";
import { EigenPeriode } from "@/components/kanalen/KanalenFilterBalk";
import LeadsTabel from "@/components/leads/LeadsTabel";
import { bouwCampagneRijen } from "@/lib/leads/campagnes";
import { useIsActief } from "@/lib/kanalen/actieveWeergave";
import type { HandmatigePost } from "@/lib/leads/kanaalkosten";
import { eigenPeriode as maakEigenPeriode, type PeriodeKeuze as KanaalPeriodeKeuze } from "@/lib/kanalen/gebruik";
import {
  PERIODE_KEUZES,
  STANDAARD_PERIODE,
  aantalDagen,
  periodeVoor,
  type LeadsPeriode,
  type PeriodeKeuze,
} from "@/lib/leads/periode";
import { STANDAARD_KORREL, leadsReeks, type Korrel } from "@/lib/leads/reeks";
import type { BetaaldPlatform } from "@/lib/leads/kanaal";
import type { CampagneRegel, LeadRegel } from "@/lib/leads/koppel";
import {
  GEEN_FILTERS,
  ONBEKEND,
  filterRegels,
  groepeer,
  heeftFilters,
  echteUitgavenGelden,
  kostenPerLeadAlle,
  uitgavenVoorSelectie,
  metPlatformUitgaven,
  leadSoort,
  telTotalen,
  waardeOfOnbekend,
  type BetaaldFilter,
  type LeadFilters,
} from "@/lib/leads/samenvatting";

/**
 * Leads: de offerte-, proefrit- en andere aanvragen die udenhout.nl als GA4-event afvuurt,
 * met het merk en model waar het om ging, het kanaal waarlangs ze binnenkwamen — en bij
 * betaalde campagnes wat daarvoor is uitgegeven.
 *
 * Bovenaan de filterbalk, daaronder vijf kerncijfers en de grafiek per dag, dan de
 * tabellen: kanalen, soort lead, merken, modellen, de betaalde campagnes en het formulier
 * waarop de lead werd afgevuurd. Alles filtert in het geheugen; er is één ophaalactie.
 *
 * De bron en de rekenregels staan in `lib/leads/` (en in CLAUDE.md onder "Kanalen →
 * Leads"). Het belangrijkste om te weten: de uitgaven van een campagne worden **verdeeld**
 * over zijn leads, niet gemeten per lead.
 */

interface Antwoord {
  van: string | null;
  tot: string | null;
  beschikbaarVan: string | null;
  beschikbaarTot: string | null;
  regels: LeadRegel[];
  campagnes: CampagneRegel[];
  zonderLead: { uitgaven: number; campagnes: number };
  uitgavenTotaal: number;
  uitgavenPerPlatform: Partial<Record<BetaaldPlatform, number>>;
  handmatig: HandmatigePost[];
  uitgavenPerDag?: Record<string, number>;
  kanaalkostenFout: string | null;
  laatsteSync: string | null;
  syncLoopt: boolean;
  fout?: string;
}

const BETAALD_KEUZES: { id: BetaaldFilter; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "betaald", label: "Betaald" },
  { id: "onbetaald", label: "Onbetaald" },
];

function periodeTekst(p: LeadsPeriode): string {
  const f = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  return `${f(p.van)} t/m ${f(p.tot)}`;
}

function syncTekst(iso: string | null): string {
  if (!iso) return "onbekend";
  return new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Opties op volgorde van grootte, zodat de belangrijkste bovenaan in de keuzelijst staan. */
function opties(regels: LeadRegel[], waardeVan: (r: LeadRegel) => string): string[] {
  const tellers = new Map<string, number>();
  for (const r of regels) tellers.set(waardeVan(r), (tellers.get(waardeVan(r)) ?? 0) + r.aantal);
  return [...tellers.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "nl"))
    .map(([waarde]) => waarde);
}

function Kaart({
  label,
  waarde,
  toelichting,
  noot,
}: {
  label: string;
  waarde: string;
  toelichting: string;
  noot?: string;
}) {
  return (
    <div className="kaart-omlijst flex min-h-32 flex-col justify-center gap-1.5 rounded-card border border-line bg-card px-4 py-4 shadow-subtle">
      <span className="label-theme text-label text-ink-faint">{label}</span>
      <span className="titel-theme font-sans-w7 text-title font-semibold text-ink">{waarde}</span>
      <span className="text-meta text-ink-muted">{toelichting}</span>
      {noot && <span className="text-meta text-ink-faint">{noot}</span>}
    </div>
  );
}

export default function LeadsPaneel({ ingelogd }: { ingelogd: boolean }) {
  const [data, setData] = useState<Antwoord | null>(null);
  const [bezig, setBezig] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [filters, setFilters] = useState<LeadFilters>(GEEN_FILTERS);
  const actief = useIsActief("leads");
  // De periode kies je net als op Syntec leads: vaste knoppen (standaard 12 maanden) of een
  // eigen periode. Een andere periode is een nieuwe ophaalactie (de kosten van een campagne
  // gaan over de leads van dezelfde dagen); de andere filters blijven in het geheugen. De vaste
  // periodes rekenen vanaf de laatste dag in de leadtabel, en die kennen we pas na de eerste
  // ophaalactie (zonder periode: alles wat de tabel beslaat).
  const [periodeId, setPeriodeId] = useState<PeriodeKeuze>(STANDAARD_PERIODE);
  const [eigen, setEigen] = useState<LeadsPeriode | null>(null);
  const [bereik, setBereik] = useState<LeadsPeriode | null>(null);
  const [korrel, setKorrel] = useState<Korrel>(STANDAARD_KORREL);
  const [metriek, setMetriek] = useState<LeadsMetriek>("leads");
  const gevraagd = useMemo<LeadsPeriode | null>(() => {
    if (periodeId === "eigen") return eigen;
    return bereik ? periodeVoor(periodeId, bereik.tot, bereik.van) : null;
  }, [periodeId, eigen, bereik]);
  // Welke periode (en welke verversing) er nu in `data` staat, zodat de eerste ophaalactie
  // niet nog eens over dezelfde dagen gaat als de standaardperiode daar al mee samenvalt.
  const geladen = useRef<string | null>(null);
  const [verdelingOpen, setVerdelingOpen] = useState(false);
  // Na opslaan in Kostenverdeling halen we de leads opnieuw op (zonder de browsercache van
  // vijf minuten), zodat de nieuwe kosten meteen meetellen.
  const [ververs, setVervers] = useState(0);
  const gewijzigd = useRef(false);
  const markeerGewijzigd = useCallback(() => {
    gewijzigd.current = true;
  }, []);
  const sluitVerdeling = useCallback(() => {
    setVerdelingOpen(false);
    if (gewijzigd.current) {
      gewijzigd.current = false;
      setVervers((v) => v + 1);
    }
  }, []);

  const gevraagdVan = gevraagd?.van ?? null;
  const gevraagdTot = gevraagd?.tot ?? null;
  useEffect(() => {
    if (!ingelogd) return;
    if (gevraagdVan && gevraagdTot && geladen.current === `${gevraagdVan}|${gevraagdTot}#${ververs}`) return;
    let afgebroken = false;
    const zoek = gevraagdVan && gevraagdTot ? `?van=${gevraagdVan}&tot=${gevraagdTot}` : "";
    setBezig(true);
    fetch(`/api/leads${zoek}`, ververs > 0 ? { cache: "reload" } : undefined)
      .then(async (res) => {
        const antwoord = (await res.json()) as Antwoord;
        if (afgebroken) return;
        if (!res.ok) {
          setFout(antwoord.fout ?? `Ophalen mislukt (${res.status}).`);
          return;
        }
        setData(antwoord);
        setFout(null);
        geladen.current = `${antwoord.van ?? gevraagdVan}|${antwoord.tot ?? gevraagdTot}#${ververs}`;
        if (antwoord.beschikbaarVan && antwoord.beschikbaarTot) {
          const van = antwoord.beschikbaarVan;
          const tot = antwoord.beschikbaarTot;
          setBereik((b) => (b && b.van === van && b.tot === tot ? b : { van, tot }));
        }
      })
      .catch((err: unknown) => {
        if (!afgebroken) setFout(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!afgebroken) setBezig(false);
      });
    return () => {
      afgebroken = true;
    };
  }, [ingelogd, ververs, gevraagdVan, gevraagdTot]);

  const alleRegels = useMemo(() => data?.regels ?? [], [data]);
  const regels = useMemo(() => filterRegels(alleRegels, filters), [alleRegels, filters]);
  const totalen = useMemo(() => telTotalen(regels), [regels]);
  const totalenAlles = useMemo(() => telTotalen(alleRegels), [alleRegels]);

  const filtersActief = heeftFilters(filters);
  // Zonder filters, of met alleen het filter Betaald, gelden de echte uitgaven: daar valt
  // geen euro door weg (onbetaalde leads hebben geen kosten).
  const echteUitgaven = echteUitgavenGelden(filters);

  const eventOpties = useMemo(() => opties(alleRegels, (r) => r.event), [alleRegels]);
  const kanaalOpties = useMemo(() => opties(alleRegels, (r) => r.kanaal), [alleRegels]);
  // De ruwe GA4-waarden, op volgorde van grootte. Een lege waarde heet "Onbekend", net als
  // bij merk en model: een lege regel in een keuzelijst is niet aan te klikken.
  const bronMediumOpties = useMemo(
    () => opties(alleRegels, (r) => waardeOfOnbekend(r.bronMedium)),
    [alleRegels],
  );
  const campagneOpties = useMemo(
    () => opties(alleRegels, (r) => waardeOfOnbekend(r.campagne)),
    [alleRegels],
  );
  const merkOpties = useMemo(() => opties(alleRegels, (r) => waardeOfOnbekend(r.merk)), [alleRegels]);
  const eventLabels = useMemo(
    () => Object.fromEntries(eventOpties.map((e) => [e, leadSoort(e)])),
    [eventOpties],
  );

  // Zonder filters (of alleen Betaald) tonen de kanalen Google Ads en Meta Ads de echte
  // uitgaven van het platform (ook van campagnes zonder lead); met een ander filter zijn het de
  // toegerekende kosten van de selectie, want de uitgaven van een campagne zijn niet op merk of
  // model te filteren.
  const perKanaal = useMemo(() => {
    const groepen = groepeer(regels, (r) => r.kanaal);
    if (!echteUitgaven) return groepen;
    return metPlatformUitgaven(groepen, data?.uitgavenPerPlatform ?? {}).sort(
      (a, b) => b.leads - a.leads || a.sleutel.localeCompare(b.sleutel, "nl"),
    );
  }, [regels, data, echteUitgaven]);
  const perSoort = useMemo(() => groepeer(regels, (r) => r.event), [regels]);
  // "Onbekend" staat vast onderaan en niet in de uitklapbare lijst: bij een merk of model is
  // hij vaak de grootste groep en zou de echte merken naar beneden duwen, maar hij moet
  // zichtbaar blijven omdat de tabel anders niet optelt tot het totaal.
  const merkGroepen = useMemo(() => groepeer(regels, (r) => waardeOfOnbekend(r.merk)), [regels]);
  const perMerk = useMemo(() => merkGroepen.filter((g) => g.sleutel !== ONBEKEND), [merkGroepen]);
  const merkOnbekend = useMemo(() => merkGroepen.filter((g) => g.sleutel === ONBEKEND), [merkGroepen]);
  const perModel = useMemo(
    () =>
      groepeer(
        regels.filter((r) => r.model !== ""),
        (r) => `${waardeOfOnbekend(r.merk)}\u0000${r.model}`,
        (r) => waardeOfOnbekend(r.merk),
      ),
    [regels],
  );
  const modelOnbekend = useMemo(
    () => groepeer(regels.filter((r) => r.model === ""), () => ONBEKEND),
    [regels],
  );
  const perFormulier = useMemo(() => groepeer(regels, (r) => waardeOfOnbekend(r.formulier)), [regels]);

  const campagneRijen = useMemo(() => {
    // Handmatige kosten gaan per bron/medium, niet per campagne: daar is de bron/medium de
    // "campagne" (zie lib/leads/kanaalkosten.ts).
    const betaald = groepeer(
      regels.filter((r) => r.platform !== null),
      (r) => `${r.platform}\u0000${r.platform === "handmatig" ? r.bronMedium : r.campagne}`,
    );
    // Zonder filter ook de campagnes die geld kostten en niets opleverden: met een filter
    // zegt "geen leads" niets meer over de campagne zelf.
    const zonderLead = !echteUitgaven
      ? []
      : (data?.campagnes ?? []).filter((c) => c.leads === 0 && (c.uitgaven ?? 0) > 0);
    return bouwCampagneRijen(betaald, zonderLead);
  }, [regels, data, echteUitgaven]);

  // De reeks voor de grafiek. Zonder filters tellen de echte uitgaven per dag; met een filter
  // de toegerekende kosten van de selectie (zie lib/leads/reeks.ts).
  const punten = useMemo(
    () =>
      data?.van && data.tot
        ? leadsReeks(regels, { van: data.van, tot: data.tot }, korrel, echteUitgaven ? (data.uitgavenPerDag ?? {}) : null)
        : [],
    [regels, data, korrel, echteUitgaven],
  );

  const metMerk = useMemo(
    () => regels.reduce((t, r) => t + (r.merk !== "" ? r.aantal : 0), 0),
    [regels],
  );
  const metModel = useMemo(
    () => regels.reduce((t, r) => t + (r.model !== "" ? r.aantal : 0), 0),
    [regels],
  );

  if (!ingelogd) return <Inlogprompt tekst="Log in om de leads te bekijken." />;

  if (fout) {
    return (
      <p className="rounded-panel border border-line bg-surface-tint px-5 py-4 text-sm text-negative">
        {fout}
      </p>
    );
  }

  if (bezig && !data) {
    return <div className="laadvlak h-64 rounded-panel border border-line bg-card" aria-busy="true" />;
  }

  const laatsteDag = data?.beschikbaarTot ?? null;
  // De periode die in beeld staat: wat de server teruggaf, anders wat er gevraagd is.
  const huidigePeriode: LeadsPeriode | null =
    data?.van && data.tot ? { van: data.van, tot: data.tot } : gevraagd;
  const eigenKeuze: KanaalPeriodeKeuze | null = huidigePeriode
    ? maakEigenPeriode(huidigePeriode.van, huidigePeriode.tot)
    : null;
  const periodeKeuze: KanaalPeriodeKeuze | null =
    eigenKeuze && (periodeId === "eigen" ? eigenKeuze : { ...eigenKeuze, id: periodeId });
  const metData = Boolean(data?.van && data.tot && alleRegels.length > 0);

  /** Eén filterbalk, net als op Syntec leads: boven de periode en de versheid, onder de filters. */
  const filterBalk = (filterRij: ReactNode) =>
    laatsteDag && (
      <div className="sticky top-0 z-30 -mx-1 px-1 pt-1">
        <div className={`kaart-omlijst rounded-panel border border-line bg-card px-4 py-3 shadow-card ${bezig ? "opacity-90" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="font-sans-w7 text-sm font-semibold text-ink">
                  {metData ? `${formatteer(totalen.leads, "aantal")} leads` : "Geen leads"}
                </p>
                <p className="text-meta text-ink-faint">{huidigePeriode ? periodeTekst(huidigePeriode) : "—"}</p>
              </div>
              <span aria-hidden="true" className="h-8 w-px bg-line" />
              <div className="flex items-center gap-1">
                <div className="flex rounded-control border border-line p-0.5" role="group" aria-label="Periode">
                  {PERIODE_KEUZES.map((k) => {
                    const p = periodeVoor(k.id, laatsteDag, data?.beschikbaarVan ?? undefined);
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => {
                          setPeriodeId(k.id);
                          setEigen(null);
                        }}
                        aria-pressed={periodeId === k.id}
                        title={p.van <= p.tot ? periodeTekst(p) : "Geen dagen met data"}
                        className={`whitespace-nowrap rounded-control px-2.5 py-1 text-sm transition-colors duration-[var(--duur-snel)] ease-merk ${
                          periodeId === k.id ? "bg-primary text-on-primary" : "text-ink-muted hover:bg-surface"
                        }`}
                      >
                        {k.label}
                      </button>
                    );
                  })}
                </div>
                {periodeKeuze && (
                  <EigenPeriode
                    periode={periodeKeuze}
                    onKies={(p) => {
                      setPeriodeId("eigen");
                      setEigen({ van: p.van, tot: p.tot });
                    }}
                  />
                )}
              </div>
              {bezig && <span className="text-meta text-ink-faint">laden…</span>}
            </div>
            <div className="text-right">
              <p className="text-sm text-ink-muted">
                {huidigePeriode ? `${aantalDagen(huidigePeriode)} dagen` : ""} · udenhout.nl
              </p>
              <p className="text-meta text-ink-faint">
                Bijgewerkt {syncTekst(data?.laatsteSync ?? null)}
                {data?.syncLoopt ? " · sync loopt" : ""}
              </p>
            </div>
          </div>
          {filterRij && (
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line-soft pt-3">{filterRij}</div>
          )}
        </div>
      </div>
    );

  if (!data || !data.van || !data.tot || alleRegels.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {filterBalk(null)}
        <section className="rounded-panel border border-line bg-card px-5 py-6 shadow-subtle">
          <p className="text-sm text-ink-muted">
            {data?.beschikbaarTot
              ? "Geen leads in deze periode."
              : "De leadtabel is nog leeg. De nachtelijke sync (onderdeel website) vult hem met de lead-events vanaf 1 juni 2026."}
          </p>
        </section>
      </div>
    );
  }
  const dagenInPeriode = aantalDagen({ van: data.van, tot: data.tot });

  const pct = (n: number) => (totalen.leads > 0 ? (n / totalen.leads) * 100 : null);
  // Kosten per lead is op de hele pagina dezelfde som (definitie van de eigenaar, november
  // 2026): uitgaven ÷ alle leads in de selectie, betaald en onbetaald. Met het filter Betaald
  // dus de uitgaven ÷ de betaalde leads. De uitgaven zijn de echte (zonder filters of met
  // alleen Betaald) of de toegerekende kosten van de selectie (met een ander filter).
  const uitgavenKaart = uitgavenVoorSelectie(totalen, filters, data.uitgavenTotaal);
  const perLead = kostenPerLeadAlle(uitgavenKaart, totalen.leads);
  const zonderLead = echteUitgaven ? data.zonderLead : null;
  const tabelTotaal = {
    totaal: totalen,
    totaalUitgaven: uitgavenKaart,
    totaalPerLead: perLead,
  };
  const campagneLeads = campagneRijen.reduce((t, r) => t + r.leads, 0);
  const campagneUitgaven = campagneRijen.reduce((t, r) => t + (r.kosten ?? 0), 0);
  const campagneTotaal = {
    leads: campagneLeads,
    uitgaven: campagneUitgaven,
    perLead: kostenPerLeadAlle(campagneUitgaven, campagneLeads),
  };

  const knop = actief && (
    <button
      type="button"
      onClick={() => setVerdelingOpen(true)}
      className="fixed right-16 top-4 z-50 flex h-9 items-center gap-2 rounded-button border border-line bg-card px-3 text-sm font-medium text-ink shadow-subtle transition-colors duration-[var(--duur-snel)] ease-merk hover:bg-surface"
    >
      <IconCoin className="h-4 w-4 text-ink-muted" />
      Kostenverdeling
    </button>
  );
  const verdeling = verdelingOpen && (
    <Kostenverdeling onClose={sluitVerdeling} onGewijzigd={markeerGewijzigd} />
  );

  const handmatigTotaal = data.uitgavenPerPlatform.handmatig ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {knop}
      {verdeling}
      {data.kanaalkostenFout && (
        <p className="rounded-panel border border-line bg-surface-tint px-5 py-3 text-sm text-negative">
          De handmatige kosten (Kostenverdeling) konden niet worden gelezen en tellen nu niet mee:{" "}
          {data.kanaalkostenFout}
        </p>
      )}
      {filterBalk(
        <div className="flex flex-wrap items-center divide-x divide-line">
          <FilterSelect
            label="Soort lead"
            options={eventOpties}
            selected={filters.events}
            onChange={(events) => setFilters((f) => ({ ...f, events }))}
            labels={eventLabels}
          />
          <FilterSelect
            label="Kanaal"
            options={kanaalOpties}
            selected={filters.kanalen}
            onChange={(kanalen) => setFilters((f) => ({ ...f, kanalen }))}
          />
          <FilterSelect
            label="Sessiebron / medium"
            options={bronMediumOpties}
            selected={filters.bronMedia}
            onChange={(bronMedia) => setFilters((f) => ({ ...f, bronMedia }))}
            zoekbaar
          />
          <FilterSelect
            label="Sessiecampagne"
            options={campagneOpties}
            selected={filters.campagnes}
            onChange={(campagnes) => setFilters((f) => ({ ...f, campagnes }))}
            zoekbaar
          />
          <FilterSelect
            label="Merk"
            options={merkOpties}
            selected={filters.merken}
            onChange={(merken) => setFilters((f) => ({ ...f, merken }))}
            zoekbaar
          />
          <div className="flex items-center gap-1 pl-3" role="group" aria-label="Betaald of onbetaald">
            {BETAALD_KEUZES.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, betaald: k.id }))}
                aria-pressed={filters.betaald === k.id}
                className={`rounded-control px-3 py-1.5 text-sm font-medium transition-colors duration-[var(--duur-snel)] ${
                  filters.betaald === k.id
                    ? "bg-primary text-on-primary"
                    : "text-ink-muted hover:bg-surface"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          {filtersActief && (
            <div className="pl-3">
              <button
                type="button"
                onClick={() => setFilters(GEEN_FILTERS)}
                className="rounded-control px-2 py-1.5 text-sm font-medium text-primary hover:bg-primary-light"
              >
                Wis filters
              </button>
            </div>
          )}
        </div>,
      )}

      <div className="grid grid-cols-5 gap-3">
        <Kaart
          label="Leads"
          waarde={formatteer(totalen.leads, "aantal")}
          toelichting={
            filtersActief
              ? `van ${formatteer(totalenAlles.leads, "aantal")} in deze periode`
              : `in ${dagenInPeriode} dagen`
          }
        />
        <Kaart
          label="Leads betaald"
          waarde={formatteer(totalen.betaald, "aantal")}
          toelichting={
            pct(totalen.betaald) === null ? "—" : `${formatteer(pct(totalen.betaald), "procent")} van de leads`
          }
          noot={
            totalen.zonderKosten > 0
              ? `waarvan ${formatteer(totalen.zonderKosten, "aantal")} zonder bekende kosten`
              : undefined
          }
        />
        <Kaart
          label="Leads onbetaald"
          waarde={formatteer(totalen.onbetaald, "aantal")}
          toelichting={
            pct(totalen.onbetaald) === null
              ? "—"
              : `${formatteer(pct(totalen.onbetaald), "procent")} van de leads`
          }
        />
        <Kaart
          label="Uitgaven"
          waarde={formatteer(uitgavenKaart, "euro-heel")}
          toelichting={
            !echteUitgaven
              ? `toegerekend aan deze selectie, van ${formatteer(data.uitgavenTotaal, "euro-heel")} in totaal`
              : handmatigTotaal > 0
                ? "Google Ads, Meta Ads, LinkedIn Ads en handmatige kosten"
                : "Google Ads, Meta Ads en LinkedIn Ads"
          }
          noot={
            echteUitgaven
              ? `Google ${formatteer(data.uitgavenPerPlatform.google ?? 0, "euro-heel")} · Meta ${formatteer(
                  data.uitgavenPerPlatform.meta ?? 0,
                  "euro-heel",
                )} · LinkedIn ${formatteer(data.uitgavenPerPlatform.linkedin ?? 0, "euro-heel")}${
                  handmatigTotaal > 0 ? ` · handmatig ${formatteer(handmatigTotaal, "euro-heel")}` : ""
                }`
              : undefined
          }
        />
        <Kaart
          label="Kosten per lead"
          waarde={perLead === null ? "—" : formatteer(perLead, "euro-exact")}
          toelichting={
            totalen.leads === 0
              ? "geen leads in deze selectie"
              : `${echteUitgaven ? "alle uitgaven" : "toegerekende kosten"} ÷ ${formatteer(totalen.leads, "aantal")} ${
                  filters.betaald === "betaald"
                    ? "betaalde leads"
                    : filters.betaald === "onbetaald"
                      ? "onbetaalde leads"
                      : "leads (betaald en onbetaald)"
                }`
          }
        />
      </div>

      <LeadsGrafiek
        punten={punten}
        korrel={korrel}
        onKorrel={setKorrel}
        metriek={metriek}
        onMetriek={setMetriek}
        echteUitgaven={echteUitgaven}
      />

      <div className="grid grid-cols-2 items-start gap-6">
        <LeadsTabel
          titel="Kanalen"
          toelichting={
            !echteUitgaven
              ? "Uit welk kanaal de leads binnenkwamen. Met een filter zijn de uitgaven toegerekend aan de geselecteerde leads."
              : "Uit welk kanaal de leads binnenkwamen, afgeleid van bron en medium in GA4. Bij Google, Meta en LinkedIn Ads staan de echte uitgaven van het platform."
          }
          labelKop="Kanaal"
          groepen={perKanaal}
          {...tabelTotaal}
          toonBetaald={false}
        />
        <LeadsTabel
          titel="Soort lead"
          toelichting="Het GA4-event dat vuurde. Uitgaven zijn een indicatie: de kosten van elke campagne zijn gelijk verdeeld over zijn leads."
          labelKop="Soort"
          groepen={perSoort}
          {...tabelTotaal}
          zonderLead={zonderLead}
          labelVan={(g) => leadSoort(g.sleutel)}
        />
        <LeadsTabel
          titel="Merken"
          toelichting={
            totalen.leads > 0
              ? `${formatteer((metMerk / totalen.leads) * 100, "procent")} van de leads heeft een merk; alleen formulieren voor proefrit, offerte, private lease en financiering sturen het mee. Uitgaven zijn een indicatie: de kosten van elke campagne zijn gelijk verdeeld over zijn leads.`
              : undefined
          }
          labelKop="Merk"
          groepen={perMerk}
          vastgezet={merkOnbekend}
          {...tabelTotaal}
          zonderLead={zonderLead}
          maxRijen={20}
        />
        <LeadsTabel
          titel="Modellen"
          toelichting={
            totalen.leads > 0
              ? `${formatteer((metModel / totalen.leads) * 100, "procent")} van de leads heeft een model. Onbekend is geen model meegestuurd, of de veldnaam (model_titel) in plaats van het model. Uitgaven zijn een indicatie.`
              : undefined
          }
          labelKop="Model"
          groepen={perModel}
          vastgezet={modelOnbekend}
          {...tabelTotaal}
          zonderLead={zonderLead}
          labelVan={(g) => g.sleutel.split("\u0000")[1] ?? g.sleutel}
        />
      </div>

      <LeadsCampagnes rijen={campagneRijen} totaal={campagneTotaal} />

      <div className="grid grid-cols-2 items-start gap-6">
        <LeadsTabel
          titel="Formulier"
          toelichting="Op welke plek op de site het formulier stond (form_location). Uitgaven zijn een indicatie."
          labelKop="Formulier"
          groepen={perFormulier}
          {...tabelTotaal}
          zonderLead={zonderLead}
        />
        <section className="kaart-omlijst rounded-panel border border-line bg-card px-5 py-4 shadow-subtle">
          <h2 className="flex items-center gap-2 font-sans-w7 text-cell font-semibold text-ink">
            <IconInfo className="h-4 w-4 text-ink-muted" />
            Zo lees je dit
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-meta text-ink-muted">
            <li>
              <strong className="text-ink">Een lead</strong> is een GA4-event met &quot;lead&quot; in de
              naam op udenhout.nl, over de gekozen periode (bewaard vanaf 1 juni 2026), plus een paar events die het team
              als lead aanwees (de bedankpagina van de werkplaatsplanner en de verhuurevents). Het
              telt events, niet unieke personen: iemand die twee formulieren invult is twee leads.
              Vacatures en de werkplaatsplanner tellen mee en zijn groot; filter ze weg via Soort
              lead.
            </li>
            <li>
              <strong className="text-ink">Betaald</strong> is verkeer met medium cpc of paid. De
              uitgaven komen uit Google Ads (Udenhout), Meta Ads (Van den Udenhout) en LinkedIn Ads (Van den Udenhout Groep) en horen bij
              een lead als platform en campagnenaam overeenkomen.
            </li>
            <li>
              <strong className="text-ink">Uitgaven en totalen.</strong> Bovenaan staat wat Google Ads,
              Meta Ads en LinkedIn Ads samen uitgaven. Bij kanalen en campagnes zijn dat de echte uitgaven. Per
              merk, model, soort en formulier is het een <strong className="text-ink">indicatie</strong>:
              de uitgaven van een campagne gaan gelijk over zijn leads (€ 500 en tien leads maakt
              elke lead € 50, ook een vacature- of proefritlead). Google en Meta weten niet welke
              lead welk deel kostte.
            </li>
            <li>
              <strong className="text-ink">Kosten per lead</strong> (kerncijfer en grafiek) is alle
              uitgaven ÷ alle leads, betaald én onbetaald. Kies je Betaald, dan zijn het de uitgaven
              ÷ de betaalde leads. Met een ander filter (soort, kanaal, merk …) zijn het de
              toegerekende kosten van de selectie ÷ de leads in de selectie. Zo rekent de hele
              pagina: ook de kolom per lead en de totaalregel in elke tabel. Een rij zonder betaald
              verkeer heeft geen bedrag (—).
            </li>
            <li>
              <strong className="text-ink">Handmatige kosten</strong> komen uit de Kostenverdeling
              (de knop rechtsboven): een bedrag per sessiebron/medium per maand (bijvoorbeeld
              de factuur van Gaspedaal). Van elke maand telt het deel dat in de gekozen periode valt,
              naar rato van de dagen, en dat gaat gelijk over de leads van die bron/medium in die
              maand. Verkeer met zo&apos;n bedrag telt als betaald.
            </li>
            <li>
              <strong className="text-ink">&quot;Onbekend&quot;</strong> bij uitgaven betekent betaald
              verkeer waarvan de kosten niet te vinden zijn: Bing of LinkedIn Ads (geen kostenbron
              hier) of een campagne die niet bij Google Ads of Meta bestaat. Het is niet gratis.
            </li>
            <li>
              <strong className="text-ink">Een sterretje</strong> achter een bedrag betekent dat die rij
              ook betaalde leads bevat waarvan de kosten onbekend zijn. Ze tellen niet mee in het
              bedrag, wel in het aantal leads waardoor de kosten per lead worden gedeeld.
            </li>
            <li>
              <strong className="text-ink">Campagnes zonder lead</strong> hebben uitgaven maar in deze
              periode geen enkele lead in Google Analytics. Ze staan als eigen regel onder de tabellen
              en in de campagnetabel, zodat elke tabel optelt tot de totale uitgaven. Met een filter
              op de leads vervalt die regel, want ze horen dan niet bij de selectie.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
