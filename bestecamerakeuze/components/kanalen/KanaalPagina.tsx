"use client";

import { useEffect, useMemo, useState } from "react";
import Drawer from "@/components/Drawer";
import KanalenFilterBalk, { type FilterDimensie } from "@/components/kanalen/KanalenFilterBalk";
import KerncijferStrip from "@/components/kanalen/KerncijferStrip";
import BudgetPacing from "@/components/kanalen/BudgetPacing";
import SignaalPaneel from "@/components/kanalen/SignaalPaneel";
import StatistiekTabel from "@/components/kanalen/StatistiekTabel";
import TijdGrafiek from "@/components/kanalen/TijdGrafiek";
import Inlogprompt from "@/components/Inlogprompt";
import { IconLightbulb } from "@/components/icons";
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
import { beschikbareWaarden, filter, type Kubus } from "@/lib/kanalen/kubus";
import { bepaalSignalen } from "@/lib/kanalen/signalen";
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
  /** Vergelijk één statistiek met het gemiddelde van de groep waar de regel bij hoort. */
  benchmark?: { dimensie: string; statistiekId: string; waarmee: string };
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
  /**
   * Op welke dimensie de signalen bovenaan gaan (campagne bij advertenties, account bij
   * de accountpagina). Weglaten zet het blok uit — bij losse posts zegt "deze post viel
   * stil" niets, want een post loopt niet.
   */
  signaalDimensie?: string;
  /** Onder welk bedrag een campagne niet meetelt voor de signalen. */
  signaalDrempel?: number;
  /**
   * Statistieken die alleen bestaan zodra er conversie-acties als lead zijn aangewezen.
   *
   * Op Google Ads zijn Leads en Kosten per lead zonder die keuze per definitie leeg — het
   * platform levert er geen veld voor. Ze verschijnen zodra iemand op de Koppeltabel
   * aanwijst welke conversie een lead is.
   */
  verbergZonderConversieLeads?: string[];
  /**
   * Statistieken die alleen bestaan zodra er conversie-acties als conversie zijn aangewezen.
   *
   * Het spiegelbeeld van de regel hierboven: Meta levert geen conversietotaal, dus op
   * Social ads zijn Conversies en Kosten per conversie leeg zolang niemand heeft
   * vastgelegd wát daar een conversie is. Een kolom die om die reden bijna nul is, leest
   * als "er gebeurde niets" en niet als "dit moet nog ingesteld worden" — dus staat hij er
   * dan niet.
   */
  verbergZonderConversieActies?: string[];
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
  signaalDimensie,
  signaalDrempel,
  verbergZonderConversieLeads,
  verbergZonderConversieActies,
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
  const [signalenOpen, setSignalenOpen] = useState(false);
  const actief = useIsActief(weergave);

  // Eén pagina, één set kanalen: `pagina` bepaalt welke bronnen erin zitten en er is
  // geen schakelaar die daar iets anders van maakt. Die was er wel ("Alle betaalde
  // kanalen") en zette op de pagina Google Ads Meta- en LinkedIn-regels onder een filter
  // "Kanaal", terwijl de kop Google Ads bleef — zie CLAUDE.md voordat je hem terugzet.
  const data = useKanaalData(pagina, periode, vergelijk);

  const actieveStatistieken = useMemo(() => {
    const verborgen = new Set<string>();
    if (verbergZonderConversieLeads?.length && !data.leadsUitConversies) {
      for (const id of verbergZonderConversieLeads) verborgen.add(id);
    }
    if (verbergZonderConversieActies?.length && !data.conversiesUitActies) {
      for (const id of verbergZonderConversieActies) verborgen.add(id);
    }
    if (verborgen.size === 0) return statistieken;
    return statistieken.filter((s) => !verborgen.has(s.id));
  }, [
    statistieken,
    verbergZonderConversieLeads,
    verbergZonderConversieActies,
    data.leadsUitConversies,
    data.conversiesUitActies,
  ]);
  const dimensieIds = useMemo(() => filterDimensies.map((d) => d.id), [filterDimensies]);
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

  const signaalInstellingen = useMemo(
    () =>
      signaalDimensie
        ? { dimensie: signaalDimensie, drempelUitgaven: signaalDrempel }
        : null,
    [signaalDimensie, signaalDrempel],
  );

  // Bepaalt alleen of het lampje verschijnt: een knop die naar een lege zijbalk leidt is
  // een doodlopend pad. De zijbalk zelf rekent dit nog een keer uit via SignaalPaneel —
  // die extra berekening is goedkoop en zo blijft de logica op één plek (signalen.ts).
  const heeftSignalen = useMemo(
    () =>
      signaalInstellingen
        ? bepaalSignalen(data.reeks, reeksRijen, actieveStatistieken, signaalInstellingen).length > 0
        : false,
    [signaalInstellingen, data.reeks, reeksRijen, actieveStatistieken],
  );

  // Welke campagnes staan er in de huidige selectie? Bepaalt welke budgetten er
  // meedoen — een pacingblok met campagnes die je net hebt weggefilterd, klopt niet met
  // de rest van de pagina.
  const zichtbareCampagnes = useMemo(
    () => new Set(beschikbareWaarden(data.reeks, reeksRijen, "campagne")),
    [data.reeks, reeksRijen],
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
        dimensies={filterDimensies}
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
          {data.budgetten.length > 0 && (
            <BudgetPacing budgetten={data.budgetten} zichtbareCampagnes={zichtbareCampagnes} />
          )}

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
            uitsplitsbaar={uitsplitsbaar}
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
              benchmark={tabel.benchmark}
              uitlegAan={uitlegAan}
            />
          ))}
        </div>
      )}

      {/* Het lampje staat rechtsboven in het scherm, links naast het oogje
          (`ThemeSwitcher.tsx`) — vaste plek, net als dat oogje, en verschijnt alleen als
          er ook echt iets te melden is (zie `heeftSignalen` hierboven). Klikken opent de
          inzichten ("Wat opvalt") in een zijbalk in plaats van een balk bovenaan de
          pagina: zo blijft de ruimte boven de grafiek voor de cijfers zelf. */}
      {heeftSignalen && signaalInstellingen && (
        <button
          type="button"
          onClick={() => setSignalenOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={signalenOpen}
          aria-label="Wat opvalt"
          title="Wat opvalt"
          className="fixed right-16 top-4 z-50 flex h-9 w-9 items-center justify-center text-ink-muted transition-colors duration-[var(--duur-snel)] hover:text-ink"
        >
          <IconLightbulb className="h-[18px] w-[18px]" />
        </button>
      )}

      {signalenOpen && signaalInstellingen && (
        <Drawer title="Wat opvalt" onClose={() => setSignalenOpen(false)}>
          <SignaalPaneel
            kubus={data.reeks}
            rijen={reeksRijen}
            statistieken={actieveStatistieken}
            instellingen={signaalInstellingen}
            onKies={zet}
            gekozen={selectie[signaalInstellingen.dimensie] ?? []}
          />
        </Drawer>
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
