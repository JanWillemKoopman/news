"use client";

import { useEffect, useMemo, useState } from "react";
import KanalenFilterBalk, { type FilterDimensie } from "@/components/kanalen/KanalenFilterBalk";
import KerncijferStrip from "@/components/kanalen/KerncijferStrip";
import StatistiekTabel from "@/components/kanalen/StatistiekTabel";
import TijdGrafiek from "@/components/kanalen/TijdGrafiek";
import Inlogprompt from "@/components/Inlogprompt";
import {
  eigenPeriode,
  standaardPeriodes,
  useKanaalData,
  useSelectie,
  type PaginaSleutel,
  type PeriodeKeuze,
} from "@/lib/kanalen/gebruik";
import { useIsActief } from "@/lib/kanalen/actieveWeergave";
import { leesUrlStand, schrijfUrlStand } from "@/lib/kanalen/urlstand";
import { filter, type Kubus } from "@/lib/kanalen/kubus";
import type { Statistiek } from "@/lib/windsor/velden";

/**
 * De gedeelde opbouw van een Kanalen-pagina: filterbalk bovenaan, kerncijfers, grafiek,
 * tabellen daaronder.
 *
 * Eén component voor alle vier de datapagina's in plaats van vier vrijwel gelijke
 * bestanden. Wat per pagina verschilt staat in de props: welke statistieken er zijn,
 * waarop je kunt filteren, en welke tabellen eronder horen. Wat hetzelfde is — de
 * volgorde, de plakkende balk, het instant filteren, de vergelijking met de vorige
 * periode — staat één keer hier.
 */

export interface TabelConfig {
  titel: string;
  toelichting: string;
  /** Uit welke kubus: `reeks` heeft de tijdas, `detail` de fijnste korrel. */
  bron: "reeks" | "detail";
  groepeerOp: string;
  groepLabel: string;
  /**
   * Het metaveld met de leesbare naam, als `groepeerOp` een id is.
   *
   * Groeperen op naam laat twee advertenties die toevallig hetzelfde heten tot één regel
   * samenvallen — en advertentienamen als "Carrousel 1" komen in meerdere campagnes voor.
   * Groeperen gaat daarom op het id, en de naam komt uit de meta van de kubus.
   */
  labelVeld?: string;
  toonBeeld?: boolean;
  /** Zet een sorteerbare datumkolom vóór de cijfers — alleen zinnig bij losse posts. */
  toonDatum?: boolean;
}

/** Dezelfde pagina, maar dan over alle betaalde kanalen tegelijk. */
export interface KanaalWissel {
  pagina: PaginaSleutel;
  /** Wat de knop zegt als hij uit staat, en wat hij aanzet. */
  eigenLabel: string;
  allesLabel: string;
  /** De dimensie die er in de gecombineerde weergave bij komt. */
  dimensie: FilterDimensie;
  /** Statistieken die in de gecombineerde weergave gelden (Google mist er een paar). */
  statistieken: Statistiek[];
}

type Props = {
  pagina: PaginaSleutel;
  /** De sleutel van dit tabblad in de sidebar; bepaalt wie de URL mag bijwerken. */
  weergave: string;
  ingelogd: boolean;
  statistieken: Statistiek[];
  standaardStatistiek: string;
  filterDimensies: FilterDimensie[];
  uitsplitsbaar: { id: string; label: string }[];
  tabellen: TabelConfig[];
  /** Eén regel context onder de grafiek, als er iets is dat je moet weten om het goed te lezen. */
  leeswijzer?: string;
  alleKanalen?: KanaalWissel;
};

export default function KanaalPagina({
  pagina,
  weergave,
  ingelogd,
  statistieken,
  standaardStatistiek,
  filterDimensies,
  uitsplitsbaar,
  tabellen,
  leeswijzer,
  alleKanalen,
}: Props) {
  const periodes = useMemo(() => standaardPeriodes(), []);
  // De URL wint bij het openen: een gedeelde link hoort te tonen wat de afzender zag.
  // Dit paneel wordt pas gemount als het tabblad voor het eerst open gaat, dus er is geen
  // serverrender die hiermee uit de pas kan lopen.
  const beginStand = useMemo(() => leesUrlStand(), []);
  const [periode, setPeriode] = useState<PeriodeKeuze>(() => {
    const lijst = standaardPeriodes();
    if (beginStand.periodeId === "eigen" && beginStand.van && beginStand.tot) {
      return eigenPeriode(beginStand.van, beginStand.tot);
    }
    return lijst.find((p) => p.id === beginStand.periodeId) ?? lijst[1];
  });
  const [uitlegAan, setUitlegAan] = useState(false);
  const [vergelijk, setVergelijk] = useState(false);
  const [samen, setSamen] = useState(false);
  const actief = useIsActief(weergave);

  const actievePagina = samen && alleKanalen ? alleKanalen.pagina : pagina;
  const actieveStatistieken = samen && alleKanalen ? alleKanalen.statistieken : statistieken;
  const dimensies = useMemo(
    () => (samen && alleKanalen ? [alleKanalen.dimensie, ...filterDimensies] : filterDimensies),
    [samen, alleKanalen, filterDimensies],
  );
  const splitsbaar = useMemo(
    () => (samen && alleKanalen ? [alleKanalen.dimensie, ...uitsplitsbaar] : uitsplitsbaar),
    [samen, alleKanalen, uitsplitsbaar],
  );

  const data = useKanaalData(actievePagina, periode, vergelijk);
  const dimensieIds = useMemo(() => dimensies.map((d) => d.id), [dimensies]);
  const { selectie, zet, wis, aantalActief } = useSelectie(dimensieIds, beginStand.filters);

  // Alleen het zichtbare tabblad schrijft; de andere panelen blijven gemount en zouden
  // elkaars parameters anders overschrijven.
  useEffect(() => {
    if (!actief) return;
    const filters: Record<string, string[]> = {};
    Object.entries(selectie).forEach(([dimensie, waarden]) => {
      if (waarden.length > 0) filters[dimensie] = waarden;
    });
    schrijfUrlStand({
      periodeId: periode.id,
      van: periode.van,
      tot: periode.tot,
      filters,
    });
  }, [actief, periode, selectie]);

  // Hier gebeurt het filteren: twee passes over een paar duizend rijen, zonder netwerk.
  // Alles wat de gebruiker aanklikt behalve de periode komt hier langs.
  const reeksRijen = useMemo(() => filter(data.reeks, selectie), [data.reeks, selectie]);
  const detailRijen = useMemo(() => filter(data.detail, selectie), [data.detail, selectie]);

  // Dezelfde selectie op de vorige periode: de kubussen delen hun dimensies, dus een
  // filter dat nu op Instagram staat kijkt vanzelf ook toen naar Instagram.
  const vorigeReeks = useMemo(
    () => (data.vorige ? { kubus: data.vorige.reeks, rijen: filter(data.vorige.reeks, selectie) } : null),
    [data.vorige, selectie],
  );
  const vorigeDetail = useMemo(
    () => (data.vorige ? { kubus: data.vorige.detail, rijen: filter(data.vorige.detail, selectie) } : null),
    [data.vorige, selectie],
  );

  const gefilterdeReeks: Kubus = useMemo(
    () => ({ ...data.reeks, rijen: reeksRijen }),
    [data.reeks, reeksRijen],
  );
  const gefilterdeVorigeReeks: Kubus | null = useMemo(
    () => (vorigeReeks ? { ...vorigeReeks.kubus, rijen: vorigeReeks.rijen } : null),
    [vorigeReeks],
  );

  const [statistiekId, setStatistiekId] = useState(standaardStatistiek);
  const gekozenStatistiek =
    actieveStatistieken.find((s) => s.id === statistiekId) ??
    actieveStatistieken.find((s) => s.id === standaardStatistiek) ??
    actieveStatistieken[0];

  if (!ingelogd) {
    return <Inlogprompt tekst="Log in om de kanaalcijfers te bekijken." />;
  }

  return (
    <div>
      <KanalenFilterBalk
        kubus={data.reeks}
        selectie={selectie}
        dimensies={dimensies}
        periodes={periodes}
        periode={periode}
        onPeriode={setPeriode}
        onFilter={zet}
        onWis={wis}
        aantalActief={aantalActief}
        aantalRijen={reeksRijen.length}
        aantalTotaal={data.reeks.rijen.length}
        uitlegAan={uitlegAan}
        onUitleg={() => setUitlegAan((v) => !v)}
        bezig={data.bezig}
        onHerlaad={data.herlaad}
        laatsteSync={data.laatsteSync}
        syncLoopt={data.syncLoopt}
        vergelijk={vergelijk}
        onVergelijk={() => setVergelijk((v) => !v)}
        vergelijkBezig={data.vorigeBezig}
        vorigeGrenzen={data.vorigeGrenzen}
        alleKanalen={alleKanalen}
        samen={samen}
        onSamen={() => setSamen((v) => !v)}
      />

      {data.fout && (
        <p className="mb-5 rounded-panel border border-line bg-card px-4 py-3 text-sm text-negative">
          {data.fout}
        </p>
      )}

      {!data.fout && data.bezig && data.reeks.rijen.length === 0 && <Laadvlak />}

      {!data.fout && !data.bezig && data.reeks.rijen.length === 0 && (
        <LegeStaat laatsteSync={data.laatsteSync} />
      )}

      {data.reeks.rijen.length > 0 && (
        <div className="flex flex-col gap-5">
          <KerncijferStrip
            kubus={data.reeks}
            rijen={reeksRijen}
            vorige={vorigeReeks}
            statistieken={actieveStatistieken}
            gekozen={gekozenStatistiek?.id ?? ""}
            onKies={setStatistiekId}
            vergelijk={vergelijk}
          />

          <TijdGrafiek
            kubus={gefilterdeReeks}
            vorigeKubus={gefilterdeVorigeReeks}
            statistieken={actieveStatistieken}
            uitsplitsbaar={splitsbaar}
            statistiekId={gekozenStatistiek?.id ?? ""}
            onStatistiek={setStatistiekId}
          />

          {uitlegAan && leeswijzer && (
            <p className="rounded-panel border border-line bg-surface-tint px-4 py-3 text-meta text-ink-muted">
              {leeswijzer}
            </p>
          )}

          {tabellen.map((tabel) => (
            <StatistiekTabel
              key={tabel.titel}
              titel={tabel.titel}
              toelichting={tabel.toelichting}
              kubus={tabel.bron === "reeks" ? data.reeks : data.detail}
              rijen={tabel.bron === "reeks" ? reeksRijen : detailRijen}
              vorige={tabel.bron === "reeks" ? vorigeReeks : vorigeDetail}
              groepeerOp={tabel.groepeerOp}
              groepLabel={tabel.groepLabel}
              labelVeld={tabel.labelVeld}
              statistieken={actieveStatistieken}
              toonBeeld={tabel.toonBeeld}
              toonDatum={tabel.toonDatum}
              uitlegAan={uitlegAan}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Wat er staat terwijl de eerste ophaalactie loopt.
 *
 * Bewust vormen in plaats van het woord "laden": bij twaalf maanden is de payload een
 * paar honderd kilobyte, en een lege pagina met alleen een woordje in de balk voelt in
 * die seconden alsof er iets stuk is.
 */
function Laadvlak() {
  return (
    <div className="flex animate-pulse flex-col gap-5" aria-hidden="true">
      <div className="h-24 rounded-panel border border-line bg-card" />
      <div className="h-96 rounded-panel border border-line bg-card" />
      <div className="h-64 rounded-panel border border-line bg-card" />
    </div>
  );
}

/**
 * Wat er staat zolang de sync nog niet gedraaid heeft.
 *
 * Bewust geen lege tabel met streepjes: die suggereert dat er niets ís, terwijl er nog
 * niets is opgehaald. Het verschil tussen "geen resultaten" en "nog geen data" is voor
 * wie op een cijfer wacht het hele verschil.
 */
function LegeStaat({ laatsteSync }: { laatsteSync: string | null }) {
  return (
    <div className="kaart-omlijst rounded-panel border border-line bg-card px-6 py-12 text-center shadow-subtle">
      <p className="font-sans-w7 text-cell font-semibold text-ink">
        Nog geen kanaaldata in deze periode
      </p>
      <p className="mx-auto mt-2 max-w-lg text-meta text-ink-muted">
        {laatsteSync
          ? `De laatste sync draaide op ${new Date(laatsteSync).toLocaleString("nl-NL", {
              dateStyle: "long",
              timeStyle: "short",
            })}, maar leverde voor deze periode geen rijen op. Probeer een ruimere periode.`
          : "De nachtelijke sync met Windsor.ai heeft nog niet gedraaid. Zodra hij dat doet, staan de cijfers hier."}
      </p>
    </div>
  );
}
