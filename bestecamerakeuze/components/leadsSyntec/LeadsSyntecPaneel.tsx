"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import FilterSelect from "@/components/FilterSelect";
import Inlogprompt from "@/components/Inlogprompt";
import { getBrandLogo } from "@/components/brandLogos";
import { formatteer } from "@/components/chat/chartTheme";
import { IconInfo } from "@/components/icons";
import { EigenPeriode } from "@/components/kanalen/KanalenFilterBalk";
import SyntecGrafiek from "@/components/leadsSyntec/SyntecGrafiek";
import SyntecKanaalMatrix from "@/components/leadsSyntec/SyntecKanaalMatrix";
import SyntecTabel from "@/components/leadsSyntec/SyntecTabel";
import { useIsActief } from "@/lib/kanalen/actieveWeergave";
import { eigenPeriode as maakEigenPeriode, type PeriodeKeuze } from "@/lib/kanalen/gebruik";
import { leesUrlStand, schrijfUrlStand } from "@/lib/kanalen/urlstand";
import { EIGEN_MERKEN, ONBEKEND, OVERIGE_MERKEN, isEigenMerk } from "@/lib/leadsSyntec/indeling";
import {
  GEEN_FILTERS,
  dagenTussen,
  filterRegels,
  groepeer,
  heeftFilters,
  modelRijSleutel,
  opties,
  pakUit,
  reeks,
  tel,
  STANDAARD_KORREL,
  VASTE_PERIODE_IDS,
  vastePeriodes,
  type Groep,
  type Korrel,
  type HerkomstFilter,
  type LeadsSyntecAntwoord,
  type Periode,
  type SyntecFilters,
  type SyntecRegel,
} from "@/lib/leadsSyntec/samenvatting";

/**
 * Leads Syntec: alle leads die bij Van den Udenhout binnenkomen, uit Syntec via het
 * sheet-tabblad "Data leads" — per merk, model en kanaal, en overal uitgesplitst in
 * online en offline.
 *
 * Van boven naar beneden: de filterbalk (periode, online/offline, filters, zonder dubbele
 * leads), vier kerncijfers, de grafiek, de merken en de soort aanvraag, de
 * modellen, de kanalen per merk, en nieuw of gebruikt. Eén ophaalactie voor alle jaren;
 * alles daarna gebeurt in het geheugen.
 *
 * De indeling (wat online is, welk merk) staat in
 * `lib/leadsSyntec/indeling.ts`, het rekenwerk in `lib/leadsSyntec/samenvatting.ts`, en de
 * keuzes erachter in CLAUDE.md onder "Kanalen → Leads Syntec".
 */

const VIEW = "leads-syntec";
// Standaard de afgelopen twaalf maanden (verzoek november 2026).
const STANDAARD_PERIODE = "12m";
const MERK_KOLOMMEN = [...EIGEN_MERKEN, OVERIGE_MERKEN, ONBEKEND];

const HERKOMST_KEUZES: { id: HerkomstFilter; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "online", label: "Online" },
  { id: "offline", label: "Offline" },
];

/** Welke filters er in de URL staan, en onder welke naam. */
const URL_LIJSTEN = {
  kanaalgroep: "kanaalgroepen",
  kanaal: "kanalen",
  merk: "merken",
  model: "modellen",
  ordersoort: "ordersoorten",
  soort: "soorten",
} as const satisfies Record<string, keyof SyntecFilters>;

const SLEUTEL_MODEL_ONBEKEND = "\u0001model-onbekend";

function momentTekst(iso: string | null): string {
  if (!iso) return "onbekend";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "onbekend";
  return d.toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** "2026-11-17T12:40" zoals Syntec het noteerde — Nederlandse tijd, dus niet omrekenen. */
function laatsteLeadTekst(waarde: string | null): string {
  if (!waarde) return "—";
  const [dag, tijd] = waarde.split("T");
  const d = new Date(`${dag}T00:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return tijd ? `${d} ${tijd}` : d;
}

function periodeTekst(p: Periode): string {
  const f = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  return `${f(p.van)} t/m ${f(p.tot)}`;
}

function MerkNaam({ merk, toon = merk }: { merk: string; toon?: string }) {
  const Logo = isEigenMerk(merk) ? getBrandLogo(merk) : null;
  return (
    <span className="inline-flex items-center gap-2">
      {Logo ? <Logo className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" /> : <span className="w-4" />}
      <span>{toon}</span>
    </span>
  );
}

function Kaart({ label, waarde, toelichting }: { label: string; waarde: string; toelichting: ReactNode }) {
  return (
    <div className="kaart-omlijst flex min-h-32 flex-col justify-center gap-1.5 rounded-card border border-line bg-card px-4 py-4 shadow-subtle">
      <span className="label-theme text-label text-ink-faint">{label}</span>
      <span className="titel-theme font-sans-w7 text-title font-semibold text-ink">{waarde}</span>
      <span className="text-meta text-ink-muted">{toelichting}</span>
    </div>
  );
}

function Schakelaar({ aan, onClick, children, titel }: {
  aan: boolean;
  onClick: () => void;
  children: ReactNode;
  titel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aan}
      title={titel}
      className={`whitespace-nowrap rounded-control border px-2.5 py-1.5 text-sm transition-colors duration-[var(--duur-snel)] ease-merk ${
        aan
          ? "border-primary bg-primary-light font-medium text-primary"
          : "border-line text-ink-muted hover:bg-surface hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** Eén groep met een eigen sleutel, opgeteld over de gegeven regels (voor vastgezette rijen). */
function samen(regels: SyntecRegel[], sleutel: string): Groep[] {
  return groepeer(regels, () => sleutel);
}

/**
 * Modellen: merk en model precies zoals in de sheet, niets samengevoegd. Leads zonder model
 * staan als één vaste rij onderaan, zodat de tabel optelt tot het totaal.
 */
function modelGroepen(regels: SyntecRegel[]) {
  return {
    groepen: groepeer(
      regels.filter((r) => r.model !== ONBEKEND),
      modelRijSleutel,
    ),
    vastgezet: samen(
      regels.filter((r) => r.model === ONBEKEND),
      SLEUTEL_MODEL_ONBEKEND,
    ),
  };
}

/** Een sleutel uit `modelRijSleutel` terug naar merk en model (het merk bevat nooit een "|"). */
function deelRij(sleutel: string): { merk: string; model: string } {
  const i = sleutel.indexOf("|");
  return { merk: sleutel.slice(0, i), model: sleutel.slice(i + 1) };
}

function merkGroepen(regels: SyntecRegel[]) {
  const alle = groepeer(regels, (r) => r.merk);
  return {
    groepen: alle.filter((g) => isEigenMerk(g.sleutel)),
    vastgezet: [OVERIGE_MERKEN, ONBEKEND]
      .map((m) => alle.find((g) => g.sleutel === m))
      .filter((g): g is Groep => g !== undefined),
  };
}

function metVast(groepen: Groep[], vastSleutels: string[]) {
  return {
    groepen: groepen.filter((g) => !vastSleutels.includes(g.sleutel)),
    vastgezet: groepen.filter((g) => vastSleutels.includes(g.sleutel)),
  };
}

export default function LeadsSyntecPaneel({ ingelogd }: { ingelogd: boolean }) {
  const [data, setData] = useState<LeadsSyntecAntwoord | null>(null);
  const [bezig, setBezig] = useState(true);
  const [fout, setFout] = useState<string | null>(null);

  const [periodeId, setPeriodeId] = useState(STANDAARD_PERIODE);
  const [eigen, setEigen] = useState<Periode | null>(null);
  const [filters, setFilters] = useState<SyntecFilters>(GEEN_FILTERS);
  const [korrel, setKorrel] = useState<Korrel>(STANDAARD_KORREL);
  const actief = useIsActief(VIEW);
  const urlGelezen = useRef(false);

  useEffect(() => {
    if (!ingelogd) return;
    let afgebroken = false;
    fetch("/api/leads-syntec")
      .then(async (res) => {
        const antwoord = (await res.json()) as LeadsSyntecAntwoord;
        if (afgebroken) return;
        if (!res.ok) {
          setFout(antwoord.fout ?? `Ophalen mislukt (${res.status}).`);
          return;
        }
        setData(antwoord);
        setFout(null);
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
  }, [ingelogd]);

  // De selectie staat in de URL, zodat hij een refresh overleeft en te delen is — net als op
  // de andere kanaalpagina's. Eén keer lezen bij het openen; daarna schrijft alleen het
  // zichtbare tabblad (alle panelen blijven gemount).
  useEffect(() => {
    if (!actief || urlGelezen.current) return;
    urlGelezen.current = true;
    const stand = leesUrlStand();
    if (stand.periodeId === "eigen" && stand.van && stand.tot) {
      setPeriodeId("eigen");
      setEigen({ van: stand.van, tot: stand.tot });
    } else if (stand.periodeId && (VASTE_PERIODE_IDS as readonly string[]).includes(stand.periodeId)) {
      setPeriodeId(stand.periodeId);
    }
    const f = stand.filters;
    const herkomst = f.herkomst?.[0];
    setFilters({
      ...GEEN_FILTERS,
      // "internet" is de oude naam in links van vóór de hernoeming naar Online.
      herkomst:
        herkomst === "online" || herkomst === "internet" ? "online" : herkomst === "offline" ? "offline" : "alle",
      zonderDubbel: f.dubbel?.[0] === "weg",
      ...Object.fromEntries(Object.entries(URL_LIJSTEN).map(([url, veld]) => [veld, f[url] ?? []])),
    });
    const k = f.korrel?.[0];
    if (k === "dag" || k === "week" || k === "maand") setKorrel(k);
  }, [actief]);

  useEffect(() => {
    if (!actief || !urlGelezen.current) return;
    const urlFilters: Record<string, string[]> = Object.fromEntries(
      Object.entries(URL_LIJSTEN)
        .map(([url, veld]) => [url, filters[veld] as string[]])
        .filter(([, w]) => (w as string[]).length > 0),
    );
    if (filters.herkomst !== "alle") urlFilters.herkomst = [filters.herkomst];
    if (filters.zonderDubbel) urlFilters.dubbel = ["weg"];
    if (korrel !== STANDAARD_KORREL) urlFilters.korrel = [korrel];
    schrijfUrlStand({
      periodeId,
      van: eigen?.van ?? null,
      tot: eigen?.tot ?? null,
      filters: urlFilters,
    });
  }, [actief, periodeId, eigen, filters, korrel]);

  const regels = useMemo(() => (data ? pakUit(data.kubus) : []), [data]);
  const periodes = useMemo(
    () => (data?.eersteDag && data.laatsteDag ? vastePeriodes(data.eersteDag, data.laatsteDag) : []),
    [data],
  );
  const periode: Periode | null = useMemo(() => {
    if (periodeId === "eigen" && eigen) return eigen;
    const p = periodes.find((x) => x.id === periodeId) ?? periodes.find((x) => x.id === STANDAARD_PERIODE);
    return p ? { van: p.van, tot: p.tot } : null;
  }, [periodeId, eigen, periodes]);

  // Alle regels in de periode, zonder filters: daaruit komen de keuzelijsten.
  const inPeriode = useMemo(
    () => (periode ? filterRegels(regels, GEEN_FILTERS, periode) : []),
    [regels, periode],
  );
  const selectie = useMemo(
    () => (periode ? filterRegels(regels, filters, periode) : []),
    [regels, filters, periode],
  );
  const totaal = useMemo(() => tel(selectie), [selectie]);
  const totaalPeriode = useMemo(() => tel(inPeriode), [inPeriode]);

  const keuzes = useMemo(
    () => ({
      kanaalgroepen: opties(inPeriode, (r) => r.kanaalgroep),
      kanalen: opties(inPeriode, (r) => r.kanaal),
      merken: [
        ...EIGEN_MERKEN.filter((m) => inPeriode.some((r) => r.merk === m)),
        ...[OVERIGE_MERKEN, ONBEKEND].filter((m) => inPeriode.some((r) => r.merk === m)),
      ],
      // De letterlijke waarden uit de kolom Model, groot eerst; "Onbekend" (leeg) achteraan.
      modellen: [
        ...opties(
          inPeriode.filter((r) => r.model !== ONBEKEND),
          (r) => r.model,
        ),
        ...(inPeriode.some((r) => r.model === ONBEKEND) ? [ONBEKEND] : []),
      ],
      ordersoorten: opties(inPeriode, (r) => r.ordersoort),
      soorten: opties(inPeriode, (r) => r.soort),
    }),
    [inPeriode],
  );
  const merken = useMemo(() => merkGroepen(selectie), [selectie]);
  const overigeMerken = useMemo(
    () => groepeer(selectie.filter((r) => r.merk === OVERIGE_MERKEN), (r) => r.merkDetail),
    [selectie],
  );

  const modellen = useMemo(() => modelGroepen(selectie), [selectie]);

  const soorten = useMemo(() => metVast(groepeer(selectie, (r) => r.soort), ["Overig", ONBEKEND]), [selectie]);
  const ordersoorten = useMemo(() => groepeer(selectie, (r) => r.ordersoort), [selectie]);
  const ordersoortenVast = useMemo(() => metVast(ordersoorten, [ONBEKEND]), [ordersoorten]);

  // De export van de sheet loopt soms halverwege een dag (17 november, laatste lead 12:40):
  // die dag is dan nog niet compleet en wordt in de grafiek lichter getekend.
  const halveDag = useMemo(() => {
    const [dag, tijd] = (data?.laatsteLead ?? "").split("T");
    return dag && tijd && tijd < "23:00" ? dag : null;
  }, [data]);
  const punten = useMemo(
    () => (periode ? reeks(selectie, periode, korrel, halveDag) : []),
    [selectie, periode, korrel, halveDag],
  );

  if (!ingelogd) return <Inlogprompt tekst="Log in om de leads te bekijken." />;

  if (fout) {
    return (
      <p className="rounded-panel border border-line bg-surface-tint px-5 py-4 text-sm text-negative">{fout}</p>
    );
  }

  if (bezig && !data) {
    return <div className="laadvlak h-64 rounded-panel border border-line bg-card" aria-busy="true" />;
  }

  if (!data || !periode || regels.length === 0) {
    return (
      <section className="rounded-panel border border-line bg-card px-5 py-6 shadow-subtle">
        <p className="text-sm text-ink-muted">
          Er staan nog geen leads in de database. De nachtelijke sync kopieert het sheet-tabblad
          &quot;Data leads&quot; naar het dashboard.
        </p>
      </section>
    );
  }

  const filtersActief = heeftFilters(filters);
  const pct = (n: number) => (totaal.totaal > 0 ? formatteer((n / totaal.totaal) * 100, "procent") : "—");

  // Hoe vers is dit? De sheet loopt een dag of twee achter; langer dan vier dagen geen
  // nieuwe lead, of twee dagen niet ingelezen, is een reden om de sync na te kijken.
  const dagenSindsLaatste = data.laatsteDag
    ? Math.floor((Date.now() - new Date(`${data.laatsteDag}T00:00:00Z`).getTime()) / 86_400_000)
    : null;
  const urenSindsInlezen = data.ingelezenOp ? (Date.now() - new Date(data.ingelezenOp).getTime()) / 3_600_000 : null;
  const verouderd = (dagenSindsLaatste ?? 0) > 4 || (urenSindsInlezen ?? 0) > 48;

  const nieuw = ordersoorten.find((g) => g.sleutel === "Nieuw")?.totaal ?? 0;
  const gebruikt = ordersoorten.find((g) => g.sleutel === "Gebruikt")?.totaal ?? 0;

  const eigenKeuze: PeriodeKeuze = maakEigenPeriode(periode.van, periode.tot);
  const periodeKeuze: PeriodeKeuze = periodeId === "eigen" ? eigenKeuze : { ...eigenKeuze, id: periodeId };

  const zet = <K extends keyof SyntecFilters>(veld: K) => (waarde: SyntecFilters[K]) =>
    setFilters((f) => ({ ...f, [veld]: waarde }));

  return (
    <div className="flex flex-col gap-6">
      {/* Filterbalk: boven waar je naar kijkt (periode en versheid), onder hoe je kijkt. */}
      <div className="sticky top-0 z-30 -mx-1 px-1 pt-1">
        <div className="kaart-omlijst rounded-panel border border-line bg-card px-4 py-3 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="font-sans-w7 text-sm font-semibold text-ink">
                  {formatteer(totaal.totaal, "aantal")} leads
                </p>
                <p className="text-meta text-ink-faint">{periodeTekst(periode)}</p>
              </div>
              <span aria-hidden="true" className="h-8 w-px bg-line" />
              <div className="flex items-center gap-1">
                <div className="flex rounded-control border border-line p-0.5">
                  {periodes.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPeriodeId(p.id);
                        setEigen(null);
                      }}
                      title={`${periodeTekst(p)}`}
                      className={`whitespace-nowrap rounded-control px-2.5 py-1 text-sm transition-colors duration-[var(--duur-snel)] ease-merk ${
                        p.id === periodeId ? "bg-primary text-on-primary" : "text-ink-muted hover:bg-surface"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <EigenPeriode
                  periode={periodeKeuze}
                  onKies={(p) => {
                    setPeriodeId("eigen");
                    setEigen({ van: p.van, tot: p.tot });
                  }}
                />
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm ${verouderd ? "font-sans-w7 font-semibold text-negative" : "text-ink-muted"}`}>
                Laatste lead {laatsteLeadTekst(data.laatsteLead)}
              </p>
              <p className="text-meta text-ink-faint">Syntec · ingelezen {momentTekst(data.ingelezenOp)}</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line-soft pt-3">
            <div className="flex rounded-control border border-line p-0.5" role="group" aria-label="Online of offline">
              {HERKOMST_KEUZES.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, herkomst: k.id }))}
                  aria-pressed={filters.herkomst === k.id}
                  className={`rounded-control px-3 py-1 text-sm transition-colors duration-[var(--duur-snel)] ease-merk ${
                    filters.herkomst === k.id ? "bg-primary text-on-primary" : "text-ink-muted hover:bg-surface"
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center divide-x divide-line">
              <FilterSelect
                label="Kanaalgroep"
                options={keuzes.kanaalgroepen}
                selected={filters.kanaalgroepen}
                onChange={zet("kanaalgroepen")}
              />
              <FilterSelect
                label="Kanaal"
                options={keuzes.kanalen}
                selected={filters.kanalen}
                onChange={zet("kanalen")}
                zoekbaar
              />
              <FilterSelect label="Merk" options={keuzes.merken} selected={filters.merken} onChange={zet("merken")} />
              <FilterSelect
                label="Model"
                options={keuzes.modellen}
                selected={filters.modellen}
                onChange={zet("modellen")}
                zoekbaar
              />
              <FilterSelect
                label="Nieuw / gebruikt"
                options={keuzes.ordersoorten}
                selected={filters.ordersoorten}
                onChange={zet("ordersoorten")}
              />
              <FilterSelect
                label="Soort aanvraag"
                options={keuzes.soorten}
                selected={filters.soorten}
                onChange={zet("soorten")}
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Schakelaar
                aan={filters.zonderDubbel}
                onClick={() => setFilters((f) => ({ ...f, zonderDubbel: !f.zonderDubbel }))}
                titel={
                  "Laat leads weg die in Syntec zijn afgesloten met sluitreden 'Dubbel' of '[SA] Dubbel' " +
                  "(±9% van alle leads). De oorspronkelijke lead blijft staan.\n\n" +
                  "Let op: een lead telt pas als dubbel als hij met die reden is afgesloten. Recente leads " +
                  "staan vaak nog open (november 2026: de helft), dus in de laatste weken haalt dit minder " +
                  "weg dan er waarschijnlijk dubbel is. Een recente periode lijkt daardoor relatief hoger."
                }
              >
                Zonder dubbele leads
              </Schakelaar>
              {filtersActief && (
                <button
                  type="button"
                  onClick={() => setFilters(GEEN_FILTERS)}
                  className="rounded-control px-2 py-1.5 text-sm font-medium text-primary hover:bg-primary-light"
                >
                  Wis filters
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Kaart
          label="Leads"
          waarde={formatteer(totaal.totaal, "aantal")}
          toelichting={
            filtersActief
              ? `van ${formatteer(totaalPeriode.totaal, "aantal")} in deze periode`
              : `${formatteer(Math.round(totaal.totaal / dagenTussen(periode)), "aantal")} per dag gemiddeld`
          }
        />
        <Kaart
          label="Online"
          waarde={formatteer(totaal.online, "aantal")}
          toelichting={`${pct(totaal.online)} van de leads · in Syntec kanaalgroep Internet`}
        />
        <Kaart
          label="Offline"
          waarde={formatteer(totaal.offline, "aantal")}
          toelichting={`${pct(totaal.offline)} van de leads · showroom, acquisitie, mail, telefoon`}
        />
        <Kaart
          label="Nieuw · gebruikt"
          waarde={`${formatteer(nieuw, "aantal")} · ${formatteer(gebruikt, "aantal")}`}
          toelichting={`${pct(nieuw)} nieuw, ${pct(gebruikt)} gebruikt (ordersoort)`}
        />
      </div>

      <SyntecGrafiek punten={punten} korrel={korrel} onKorrel={setKorrel} />

      <div className="grid grid-cols-2 items-start gap-6">
        <SyntecTabel
          titel="Merken"
          toelichting="Per merk het aantal leads, uitgesplitst in online en offline. Overige merken (vooral occasions en inruil) zijn uit te klappen."
          labelKop="Merk"
          groepen={merken.groepen}
          vastgezet={merken.vastgezet}
          totaal={totaal}
          labelVan={(g) => <MerkNaam merk={g.sleutel} />}
          uitklap={(g) => (g.sleutel === OVERIGE_MERKEN ? overigeMerken : null)}
          csvNaam="leads-syntec-merken"
        />
        <SyntecTabel
          titel="Soort aanvraag"
          toelichting="Het Lead Type in Syntec. Alleen bij online leads ingevuld (offerte, proefrit, private lease …); een offline lead is altijd Overig."
          labelKop="Soort"
          groepen={soorten.groepen}
          vastgezet={soorten.vastgezet}
          totaal={totaal}
          csvNaam="leads-syntec-soort-aanvraag"
        />
      </div>

      <SyntecTabel
        titel="Modellen"
        toelichting="Het model precies zoals het in de kolom Model van Syntec staat, met het merk ernaast. Niets is samengevoegd: verschillende schrijfwijzen van dezelfde auto (POLO, Polo (6) GP) staan als aparte regels."
        labelKop="Model"
        groepen={modellen.groepen}
        vastgezet={modellen.vastgezet}
        totaal={totaal}
        labelVan={(g) => (g.sleutel === SLEUTEL_MODEL_ONBEKEND ? "Model onbekend" : deelRij(g.sleutel).model)}
        tekstVan={(g) => (g.sleutel === SLEUTEL_MODEL_ONBEKEND ? "Model onbekend" : deelRij(g.sleutel).model)}
        extraKolom={{
          kop: "Merk",
          waarde: (g) => {
            if (g.sleutel === SLEUTEL_MODEL_ONBEKEND) return null;
            const { merk } = deelRij(g.sleutel);
            return <MerkNaam merk={merk} />;
          },
          tekst: (g) => (g.sleutel === SLEUTEL_MODEL_ONBEKEND ? "" : deelRij(g.sleutel).merk),
        }}
        maxRijen={15}
        csvNaam="leads-syntec-modellen"
      />

      <SyntecKanaalMatrix
        regels={selectie}
        merken={MERK_KOLOMMEN}
        toelichting="Per kanaal hoeveel leads er binnenkwamen, per merk. Eerst online, dan offline per kanaalgroep, elk met een subtotaal."
      />

      <div className="grid grid-cols-2 items-start gap-6">
        <SyntecTabel
          titel="Nieuw of gebruikt"
          toelichting="De ordersoort in Syntec: gaat de lead over een nieuwe of een gebruikte auto."
          labelKop="Ordersoort"
          groepen={ordersoortenVast.groepen}
          vastgezet={ordersoortenVast.vastgezet}
          totaal={totaal}
          csvNaam="leads-syntec-nieuw-of-gebruikt"
        />
        <section className="kaart-omlijst rounded-panel border border-line bg-card px-5 py-4 shadow-subtle">
          <h2 className="flex items-center gap-2 font-sans-w7 text-cell font-semibold text-ink">
            <IconInfo className="h-4 w-4 text-ink-muted" />
            Zo lees je dit
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-meta text-ink-muted">
            <li>
              <strong className="text-ink">Bron</strong> is Syntec, via het tabblad &quot;Data leads&quot; in
              de campagnesheet. Het dashboard kopieert dat tabblad elke nacht. Elke regel is één lead; geteld
              wordt op de datum <em>Aangelegd</em>. Het telt registraties, geen personen.
            </li>
            <li>
              <strong className="text-ink">Online of offline</strong> volgt uit de kolom{" "}
              <em>Kanaalgroep</em>: wat Syntec &quot;Internet&quot; noemt is online, Showroom, Acquisitie, Mail en Telefoon zijn
              offline. Een handvol oude leads zonder kanaalgroep telt als offline. De kolom <em>Status</em>{" "}
              (Online/Offline) in de sheet gaat over de campagne, niet over de lead.
            </li>
            <li>
              <strong className="text-ink">CST is de grootste bron</strong> (ruim 40% van alle leads): offertes
              die verkopers in de showroom maken. Wie alleen de aanvragen van buitenaf wil zien, kiest Online.
            </li>
            <li>
              <strong className="text-ink">Modellen</strong> staan letterlijk zoals in de kolom Model van Syntec,
              ook in het filter. Dezelfde auto komt daardoor onder meerdere namen voor (POLO, Polo (6) GP,
              VOLKSWAGEN POLO); kies ze samen in het filter Model om ze op te tellen. Alleen een leeg veld heet
              &quot;Onbekend&quot;.
            </li>
            <li>
              <strong className="text-ink">Dubbele leads</strong> (sluitreden Dubbel of [SA] Dubbel, ±9%) tellen
              standaard mee, net als op KPI&apos;s 2027 Syntec. Met &quot;Zonder dubbele leads&quot; vallen ze weg.
            </li>
            <li>
              <strong className="text-ink">Pieken op één dag</strong> zijn meestal een import, geen drukte: zo
              kwamen op 31 juli 2026 476 leads van VDU Retentie tegelijk binnen, en op 2 november 2025 ruim 800
              van Autoline.
            </li>
            <li>
              <strong className="text-ink">De periodes</strong> lopen tot de laatste lead in de sheet (die loopt
              een dag of twee achter), niet tot vandaag. Is die laatste dag nog niet compleet, dan staat hij
              lichter in de grafiek. De sheet begint op 1 januari 2024.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
