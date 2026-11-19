"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import FilterSelect from "@/components/FilterSelect";
import Inlogprompt from "@/components/Inlogprompt";
import { getBrandLogo } from "@/components/brandLogos";
import { formatteer } from "@/components/chat/chartTheme";
import { IconInfo } from "@/components/icons";
import { EigenPeriode } from "@/components/kanalen/KanalenFilterBalk";
import Verschilregel from "@/components/kanalen/Verschilregel";
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
  korrelVoor,
  modelSleutelVan,
  opties,
  pakUit,
  reeks,
  tel,
  vastePeriodes,
  verschil,
  vorigJaar,
  type Groep,
  type HerkomstFilter,
  type LeadsSyntecAntwoord,
  type Periode,
  type SyntecFilters,
  type SyntecRegel,
  type Telling,
} from "@/lib/leadsSyntec/samenvatting";

/**
 * Leads Syntec: alle leads die bij Van den Udenhout binnenkomen, uit Syntec via het
 * sheet-tabblad "Data leads" — per merk, model en kanaal, en overal uitgesplitst in
 * internet en offline.
 *
 * Van boven naar beneden: de filterbalk (periode, internet/offline, filters, vergelijken
 * met vorig jaar), vier kerncijfers, de grafiek, de merken en de soort aanvraag, de
 * modellen, de kanalen per merk, en nieuw of gebruikt. Eén ophaalactie voor alle jaren;
 * alles daarna gebeurt in het geheugen.
 *
 * De indeling (wat internet is, welk merk, welke modelfamilie) staat in
 * `lib/leadsSyntec/indeling.ts`, het rekenwerk in `lib/leadsSyntec/samenvatting.ts`, en de
 * keuzes erachter in CLAUDE.md onder "Kanalen → Leads Syntec".
 */

const VIEW = "leads-syntec";
const STANDAARD_PERIODE = "30d";
const MERK_KOLOMMEN = [...EIGEN_MERKEN, OVERIGE_MERKEN, ONBEKEND];

const HERKOMST_KEUZES: { id: HerkomstFilter; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "internet", label: "Internet" },
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
const SLEUTEL_OVERIG = "\u0001overig";

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

function Kaart({
  label,
  waarde,
  toelichting,
  vergelijking,
}: {
  label: string;
  waarde: string;
  toelichting: ReactNode;
  vergelijking?: ReactNode;
}) {
  return (
    <div className="kaart-omlijst flex min-h-32 flex-col justify-center gap-1.5 rounded-card border border-line bg-card px-4 py-4 shadow-subtle">
      <span className="label-theme text-label text-ink-faint">{label}</span>
      <span className="titel-theme font-sans-w7 text-title font-semibold text-ink">{waarde}</span>
      <span className="text-meta text-ink-muted">{toelichting}</span>
      {vergelijking}
    </div>
  );
}

function Schakelaar({ aan, onClick, children, uit, titel }: {
  aan: boolean;
  onClick: () => void;
  children: ReactNode;
  uit?: boolean;
  titel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={uit}
      aria-pressed={aan}
      title={titel}
      className={`whitespace-nowrap rounded-control border px-2.5 py-1.5 text-sm transition-colors duration-[var(--duur-snel)] ease-merk disabled:cursor-not-allowed disabled:opacity-50 ${
        aan
          ? "border-primary bg-primary-light font-medium text-primary"
          : "border-line text-ink-muted hover:bg-surface hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** De tellingen per sleutel als map, voor de vergelijking met vorig jaar. */
function alsMap(groepen: Groep[]): Map<string, Telling> {
  return new Map(groepen.map((g) => [g.sleutel, { totaal: g.totaal, internet: g.internet, offline: g.offline }]));
}

/** Eén groep met een eigen sleutel, opgeteld over de gegeven regels (voor vastgezette rijen). */
function samen(regels: SyntecRegel[], sleutel: string): Groep[] {
  return groepeer(regels, () => sleutel);
}

/** Modellen: de modelfamilies van de eigen merken, plus twee vaste rijen zodat de tabel optelt. */
function modelGroepen(regels: SyntecRegel[]) {
  const metModel = regels.filter((r) => isEigenMerk(r.merk) && r.model !== ONBEKEND);
  return {
    groepen: groepeer(metModel, modelSleutelVan, (r) => r.modelRuw || ONBEKEND),
    vastgezet: [
      ...samen(
        regels.filter((r) => isEigenMerk(r.merk) && r.model === ONBEKEND),
        SLEUTEL_MODEL_ONBEKEND,
      ),
      ...samen(
        regels.filter((r) => !isEigenMerk(r.merk)),
        SLEUTEL_OVERIG,
      ),
    ],
  };
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
  const [vergelijk, setVergelijk] = useState(false);
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
    } else if (stand.periodeId) {
      setPeriodeId(stand.periodeId);
    }
    const f = stand.filters;
    const herkomst = f.herkomst?.[0];
    setFilters({
      ...GEEN_FILTERS,
      herkomst: herkomst === "internet" || herkomst === "offline" ? herkomst : "alle",
      zonderDubbel: f.dubbel?.[0] === "weg",
      ...Object.fromEntries(Object.entries(URL_LIJSTEN).map(([url, veld]) => [veld, f[url] ?? []])),
    });
    setVergelijk(f.vergelijk?.[0] === "1");
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
    if (vergelijk) urlFilters.vergelijk = ["1"];
    schrijfUrlStand({
      periodeId,
      van: eigen?.van ?? null,
      tot: eigen?.tot ?? null,
      filters: urlFilters,
    });
  }, [actief, periodeId, eigen, filters, vergelijk]);

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

  const vergelijkPeriode = useMemo(() => (periode ? vorigJaar(periode) : null), [periode]);
  const vergelijkMogelijk = Boolean(
    data?.eersteDag && vergelijkPeriode && vergelijkPeriode.van >= data.eersteDag,
  );
  const vergelijkAan = vergelijk && vergelijkMogelijk;

  // Alle regels in de periode, zonder filters: daaruit komen de keuzelijsten.
  const inPeriode = useMemo(
    () => (periode ? filterRegels(regels, GEEN_FILTERS, periode) : []),
    [regels, periode],
  );
  const selectie = useMemo(
    () => (periode ? filterRegels(regels, filters, periode) : []),
    [regels, filters, periode],
  );
  const selectieVorig = useMemo(
    () => (vergelijkAan && vergelijkPeriode ? filterRegels(regels, filters, vergelijkPeriode) : null),
    [regels, filters, vergelijkAan, vergelijkPeriode],
  );

  const totaal = useMemo(() => tel(selectie), [selectie]);
  const totaalVorig = useMemo(() => (selectieVorig ? tel(selectieVorig) : null), [selectieVorig]);
  const totaalPeriode = useMemo(() => tel(inPeriode), [inPeriode]);

  const keuzes = useMemo(
    () => ({
      kanaalgroepen: opties(inPeriode, (r) => r.kanaalgroep),
      kanalen: opties(inPeriode, (r) => r.kanaal),
      merken: [
        ...EIGEN_MERKEN.filter((m) => inPeriode.some((r) => r.merk === m)),
        ...[OVERIGE_MERKEN, ONBEKEND].filter((m) => inPeriode.some((r) => r.merk === m)),
      ],
      modellen: opties(
        inPeriode.filter((r) => isEigenMerk(r.merk) && r.model !== ONBEKEND),
        modelSleutelVan,
      ),
      ordersoorten: opties(inPeriode, (r) => r.ordersoort),
      soorten: opties(inPeriode, (r) => r.soort),
    }),
    [inPeriode],
  );
  const modelLabels = useMemo(
    () =>
      Object.fromEntries(
        keuzes.modellen.map((k) => {
          const [merk, model] = k.split("|");
          return [k, `${model} · ${merk}`];
        }),
      ),
    [keuzes.modellen],
  );

  const merken = useMemo(() => merkGroepen(selectie), [selectie]);
  const merkenVorig = useMemo(
    () => (selectieVorig ? alsMap(groepeer(selectieVorig, (r) => r.merk)) : null),
    [selectieVorig],
  );
  const overigeMerken = useMemo(
    () => groepeer(selectie.filter((r) => r.merk === OVERIGE_MERKEN), (r) => r.merkDetail),
    [selectie],
  );

  const modellen = useMemo(() => modelGroepen(selectie), [selectie]);
  const modellenVorig = useMemo(() => {
    if (!selectieVorig) return null;
    const m = modelGroepen(selectieVorig);
    return alsMap([...m.groepen, ...m.vastgezet]);
  }, [selectieVorig]);

  const soorten = useMemo(() => metVast(groepeer(selectie, (r) => r.soort), ["Overig", ONBEKEND]), [selectie]);
  const soortenVorig = useMemo(
    () => (selectieVorig ? alsMap(groepeer(selectieVorig, (r) => r.soort)) : null),
    [selectieVorig],
  );
  const ordersoorten = useMemo(() => groepeer(selectie, (r) => r.ordersoort), [selectie]);
  const ordersoortenVast = useMemo(() => metVast(ordersoorten, [ONBEKEND]), [ordersoorten]);
  const ordersoortenVorig = useMemo(
    () => (selectieVorig ? alsMap(groepeer(selectieVorig, (r) => r.ordersoort)) : null),
    [selectieVorig],
  );

  const korrel = periode ? korrelVoor(periode) : "dag";
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
  const puntenVorig = useMemo(
    () => (selectieVorig && vergelijkPeriode ? reeks(selectieVorig, vergelijkPeriode, korrel) : null),
    [selectieVorig, vergelijkPeriode, korrel],
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
  const delta = (nu: number, toen: number | undefined) =>
    totaalVorig ? (
      <Verschilregel verschil={verschil(nu, toen ?? 0)} waarmee="vorig jaar" />
    ) : undefined;

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

  const modelTooltip = (g: Groep) => {
    const delen = Object.entries(g.onderdelen).sort((a, b) => b[1] - a[1]);
    if (delen.length <= 1) return null;
    return `In Syntec als: ${delen.map(([naam, n]) => `${naam} (${formatteer(n, "aantal")})`).join(", ")}`;
  };

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
            <div className="flex rounded-control border border-line p-0.5" role="group" aria-label="Internet of offline">
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
                labels={modelLabels}
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
                aan={vergelijkAan}
                onClick={() => setVergelijk((v) => !v)}
                uit={!vergelijkMogelijk}
                titel={
                  vergelijkMogelijk
                    ? `Zet ernaast: ${vergelijkPeriode ? periodeTekst(vergelijkPeriode) : ""}`
                    : "Vergelijken kan alleen als dezelfde datums vorig jaar in de sheet staan (vanaf januari 2024)."
                }
              >
                Vergelijk met vorig jaar
              </Schakelaar>
              <Schakelaar
                aan={filters.zonderDubbel}
                onClick={() => setFilters((f) => ({ ...f, zonderDubbel: !f.zonderDubbel }))}
                titel="Laat leads met sluitreden 'Dubbel' of '[SA] Dubbel' weg (±9% van alle leads)."
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
          {vergelijkAan && vergelijkPeriode && (
            <p className="mt-2 text-meta text-ink-faint">
              Vergeleken met {periodeTekst(vergelijkPeriode)}.
            </p>
          )}
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
          vergelijking={delta(totaal.totaal, totaalVorig?.totaal)}
        />
        <Kaart
          label="Internet"
          waarde={formatteer(totaal.internet, "aantal")}
          toelichting={`${pct(totaal.internet)} van de leads · kanaalgroep Internet`}
          vergelijking={delta(totaal.internet, totaalVorig?.internet)}
        />
        <Kaart
          label="Offline"
          waarde={formatteer(totaal.offline, "aantal")}
          toelichting={`${pct(totaal.offline)} van de leads · showroom, acquisitie, mail, telefoon`}
          vergelijking={delta(totaal.offline, totaalVorig?.offline)}
        />
        <Kaart
          label="Nieuw · gebruikt"
          waarde={`${formatteer(nieuw, "aantal")} · ${formatteer(gebruikt, "aantal")}`}
          toelichting={`${pct(nieuw)} nieuw, ${pct(gebruikt)} gebruikt (ordersoort)`}
          vergelijking={
            totaalVorig && ordersoortenVorig ? (
              <span className="flex gap-3">
                <Verschilregel
                  verschil={verschil(nieuw, ordersoortenVorig.get("Nieuw")?.totaal ?? 0)}
                  compact
                  waarmee="vorig jaar"
                />
                <Verschilregel
                  verschil={verschil(gebruikt, ordersoortenVorig.get("Gebruikt")?.totaal ?? 0)}
                  compact
                  waarmee="vorig jaar"
                />
              </span>
            ) : undefined
          }
        />
      </div>

      <SyntecGrafiek punten={punten} vorig={puntenVorig} korrel={korrel} />

      <div className="grid grid-cols-2 items-start gap-6">
        <SyntecTabel
          titel="Merken"
          toelichting="Per merk het aantal leads, uitgesplitst in internet en offline. Overige merken (vooral occasions en inruil) zijn uit te klappen."
          labelKop="Merk"
          groepen={merken.groepen}
          vastgezet={merken.vastgezet}
          totaal={totaal}
          vorig={merkenVorig}
          totaalVorig={totaalVorig}
          labelVan={(g) => <MerkNaam merk={g.sleutel} />}
          uitklap={(g) => (g.sleutel === OVERIGE_MERKEN ? overigeMerken : null)}
          csvNaam="leads-syntec-merken"
        />
        <SyntecTabel
          titel="Soort aanvraag"
          toelichting="Het Lead Type in Syntec. Alleen bij internetleads ingevuld (offerte, proefrit, private lease …); een offline lead is altijd Overig."
          labelKop="Soort"
          groepen={soorten.groepen}
          vastgezet={soorten.vastgezet}
          totaal={totaal}
          vorig={soortenVorig}
          totaalVorig={totaalVorig}
          csvNaam="leads-syntec-soort-aanvraag"
        />
      </div>

      <SyntecTabel
        titel="Modellen"
        toelichting="Per modelfamilie van de eigen merken. Schrijfwijzen zijn samengevoegd (POLO, Polo (6) GP en VOLKSWAGEN POLO zijn allemaal Polo); ga met de muis op een model staan om te zien welke."
        labelKop="Model"
        groepen={modellen.groepen}
        vastgezet={modellen.vastgezet}
        totaal={totaal}
        vorig={modellenVorig}
        totaalVorig={totaalVorig}
        labelVan={(g) =>
          g.sleutel === SLEUTEL_MODEL_ONBEKEND
            ? "Model onbekend"
            : g.sleutel === SLEUTEL_OVERIG
              ? "Overige en onbekende merken"
              : g.sleutel.split("|")[1]
        }
        tekstVan={(g) =>
          g.sleutel === SLEUTEL_MODEL_ONBEKEND
            ? "Model onbekend"
            : g.sleutel === SLEUTEL_OVERIG
              ? "Overige en onbekende merken"
              : g.sleutel.split("|")[1]
        }
        tooltipVan={modelTooltip}
        extraKolom={{
          kop: "Merk",
          waarde: (g) =>
            g.sleutel.startsWith("\u0001") ? null : <MerkNaam merk={g.sleutel.split("|")[0]} />,
          tekst: (g) => (g.sleutel.startsWith("\u0001") ? "" : g.sleutel.split("|")[0]),
        }}
        maxRijen={15}
        csvNaam="leads-syntec-modellen"
      />

      <SyntecKanaalMatrix
        regels={selectie}
        merken={MERK_KOLOMMEN}
        toelichting="Per kanaal hoeveel leads er binnenkwamen, per merk. Eerst internet, dan offline per kanaalgroep, elk met een subtotaal."
      />

      <div className="grid grid-cols-2 items-start gap-6">
        <SyntecTabel
          titel="Nieuw of gebruikt"
          toelichting="De ordersoort in Syntec: gaat de lead over een nieuwe of een gebruikte auto."
          labelKop="Ordersoort"
          groepen={ordersoortenVast.groepen}
          vastgezet={ordersoortenVast.vastgezet}
          totaal={totaal}
          vorig={ordersoortenVorig}
          totaalVorig={totaalVorig}
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
              <strong className="text-ink">Internet of offline</strong> volgt uit de kolom{" "}
              <em>Kanaalgroep</em>: &quot;Internet&quot; is internet, Showroom, Acquisitie, Mail en Telefoon zijn
              offline. Een handvol oude leads zonder kanaalgroep telt als offline. De kolom <em>Status</em>{" "}
              (Online/Offline) in de sheet gaat over de campagne, niet over de lead.
            </li>
            <li>
              <strong className="text-ink">CST is de grootste bron</strong> (ruim 40% van alle leads): offertes
              die verkopers in de showroom maken. Wie alleen de aanvragen van buitenaf wil zien, kiest Internet.
            </li>
            <li>
              <strong className="text-ink">Modellen</strong> zijn samengevoegd tot modelfamilies: generatie
              (&quot;(6)&quot;), GP/FL, kentekenkleur en de merknaam ervoor vallen weg, en de carrosserie gaat mee
              in de familie (Golf Variant is Golf, ID.7 Tourer is ID.7). Overige merken tonen het model zoals het
              in Syntec staat.
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
              lichter in de grafiek. Vergelijk met vorig jaar zet dezelfde datums een jaar eerder ernaast; de
              sheet begint op 1 januari 2024.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
