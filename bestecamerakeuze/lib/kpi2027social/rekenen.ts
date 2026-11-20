import { KPI_DOELJAAR, KPI_JAAR } from "@/lib/kpi2027/definities";
import {
  berekenKpi,
  dagenInJaar,
  dagenInMaand,
  dagenTussen,
  isDefinitief,
  maandInvoerUitDagen,
  volgendeUpdate,
  type KpiUitkomst,
  type MaandUitkomst,
  type Periode,
} from "@/lib/kpi2027/rekenen";
import {
  KANAAL_VOLGORDE,
  accountVoor,
  standSleutel,
  type SocialKanaal,
  type SocialKpi,
  type SocialMaat,
  type SocialMerk,
} from "@/lib/kpi2027social/definities";

/**
 * Het rekenwerk achter KPI's 2027 social media. Puur: geen database, geen netwerk, geen
 * React — getest in `rekenen.test.ts`.
 *
 * ## Vertoningen: precies de som van KPI's 2027 GA
 *
 * Gemeten t/m de peildatum + gemiddelde per dag × de resterende dagen = verwachting 2026;
 * × (1 + groei) = target 2027; ÷ 12 = maandtarget (`berekenKpi` uit `lib/kpi2027/rekenen.ts`).
 * Eén uitzondering: de laatste dagen vóór de peildatum zonder enige vertoning (hooguit
 * drie) tellen als nog niet gemeten, want LinkedIn en Meta leveren hun dagcijfers een tot
 * twee dagen later. Anders zou een zaterdag die nog niet binnen is als een dag met nul
 * vertoningen het gemiddelde drukken.
 *
 * ## Nieuwe volgers: dezelfde som, alleen over de gemeten dagen
 *
 * Instagram en Facebook (`berekenNieuweVolgers`). Een dag die niet in de reeks staat is niet
 * gemeten en wordt met het gemiddelde per gemeten dag ingevuld (`ontbrekendeDagen`).
 *
 * ## Volgers: een stand, geen som (LinkedIn, TikTok, YouTube)
 *
 *  1. **Laatste stand**: de jongste dag t/m de peildatum waarop de stand bekend is.
 *  2. **Trend per dag**: (laatste stand − eerste stand van het jaar) ÷ het aantal dagen
 *     ertussen — alleen als die minstens zeven dagen uit elkaar liggen; anders 0 (geen
 *     trend uit één week ruis).
 *  3. **Verwachting eind 2026**: laatste stand + trend × de dagen tot en met 31 december.
 *  4. **Target eind 2027**: die verwachting × (1 + groei). In de grafiek een vlakke lijn:
 *     de stand die er eind 2027 moet zijn.
 *  5. **Realisatie 2027**: de laatste stand in 2027; **voortgang** vergelijkt de groei sinds
 *     eind 2026 met het lineaire deel van de doelgroei (`voortgangStand`).
 *
 * Per maand staat in de grafiek de stand aan het eind van de maand. Een maand vóór de
 * eerste bekende stand (Instagram: vóór november 2026) blijft leeg — er wordt niets
 * teruggerekend dat niet gemeten is.
 */

/** De ruwe cijfers van één account over één jaar (`kpi_2027_social_standen`). */
export interface SocialStand {
  /** `kanaal:accountId`, zie `standSleutel`. */
  sleutel: string;
  jaar: number;
  peildatum: string;
  berekendOp: string;
  definitief: boolean;
  /**
   * `vertoningen` en `nieuwe-volgers`: datum → aantal (bij nieuwe volgers staat elke gemeten
   * dag erin, ook met 0); `volgers`: datum → stand aan het eind van die dag.
   */
  dagen: Partial<Record<SocialMaat, Record<string, number>>>;
}

/** Een uitkomst met, bij volgers, de dag van de laatste bekende stand. */
export interface SocialUitkomst extends KpiUitkomst {
  maat: SocialMaat;
  /** Volgers: de dag van de laatste stand die in `gerealiseerd` staat. */
  standDatum: string | null;
  /** Volgers: de eerste dag van het jaar met een bekende stand. */
  eersteDatum: string | null;
  /**
   * Volgers op Instagram: de eerste echt gemeten dag; alle dagen ervóór zijn aangevuld met
   * die stand (`aanvullen`). Null als er niets is aangevuld.
   */
  aangevuldTot?: string | null;
}

const DAG_MS = 86_400_000;
const MAX_ACHTERSTAND = 3;

function alsDatum(tekst: string): number {
  return Date.parse(`${tekst}T00:00:00Z`);
}

function tekstVan(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function eindVanJaar(jaar: number): string {
  return `${jaar}-12-31`;
}

function tot(peildatum: string, jaar: number): string {
  return peildatum < eindVanJaar(jaar) ? peildatum : eindVanJaar(jaar);
}

/**
 * De dagen vlak vóór de peildatum zonder enige vertoning, als dat er hooguit drie zijn: die
 * zijn nog niet binnen bij het platform. Meer dan drie lege dagen is geen vertraging maar
 * een account dat stilligt; die tellen als gemeten nul.
 */
export function achterstand(dagwaarden: Readonly<Record<string, number>>, peildatum: string, jaar: number): Periode[] {
  const eind = tot(peildatum, jaar);
  let laatste: string | null = null;
  for (const [datum, n] of Object.entries(dagwaarden)) {
    if (!datum.startsWith(`${jaar}-`) || datum > eind || !(Number(n) > 0)) continue;
    if (!laatste || datum > laatste) laatste = datum;
  }
  if (!laatste || laatste >= eind) return [];
  const leeg = dagenTussen(laatste, eind) - 1;
  if (leeg > MAX_ACHTERSTAND) return [];
  return [{ van: tekstVan(alsDatum(laatste) + DAG_MS), tot: eind }];
}

/**
 * De dagen van het jaar t/m de peildatum die níet in de reeks staan, samengevoegd tot
 * periodes. Bij nieuwe volgers staat elke gemeten dag erin, ook met 0; een ontbrekende dag
 * is dus niet gemeten (Instagram: vóór 16 augustus 2026, toen de nachtelijke sync ermee
 * begon — Meta bewaart het maar dertig dagen).
 */
export function ontbrekendeDagen(dagwaarden: Readonly<Record<string, number>>, peildatum: string, jaar: number): Periode[] {
  const periodes: Periode[] = [];
  const eind = alsDatum(tot(peildatum, jaar));
  for (let t = alsDatum(`${jaar}-01-01`); t <= eind; t += DAG_MS) {
    const d = tekstVan(t);
    if (d in dagwaarden) continue;
    const vorige = periodes[periodes.length - 1];
    if (vorige && tekstVan(alsDatum(vorige.tot) + DAG_MS) === d) vorige.tot = d;
    else periodes.push({ van: d, tot: d });
  }
  return periodes;
}

/**
 * Nieuwe volgers van één account: dezelfde som als vertoningen, maar alleen over de dagen
 * die gemeten zijn; de rest wordt met het gemiddelde per gemeten dag ingevuld (gestippeld),
 * zoals de uitval op KPI's 2027 GA. Een maand zonder één gemeten dag krijgt een eigen uitleg
 * in de tooltip, want de standaardzin daar gaat over sessies.
 */
export function berekenNieuweVolgers(
  dagwaarden: Readonly<Record<string, number>>,
  peildatum: string,
  jaar: number,
  groei: number,
): SocialUitkomst | null {
  const uitval = ontbrekendeDagen(dagwaarden, peildatum, jaar);
  const u = berekenKpi(maandInvoerUitDagen(dagwaarden, peildatum, uitval, jaar), peildatum, { jaar, groei });
  if (u.dagenGemeten === 0) return null;
  const maanden = u.maanden.map((m) =>
    m.soort !== "bijgeschat"
      ? m
      : {
          ...m,
          toelichting:
            m.dagenGemeten > 0
              ? `${m.dagenGemeten} van ${m.dagenInMaand} dagen gemeten; de rest ingevuld met het gemiddelde per gemeten dag`
              : "Niet gemeten; ingevuld met het gemiddelde per gemeten dag",
        },
  );
  return { ...u, maanden, maat: "nieuwe-volgers", standDatum: null, eersteDatum: null };
}

/** Vertoningen van één account: de som van KPI's 2027 GA. */
export function berekenVertoningen(
  dagwaarden: Readonly<Record<string, number>>,
  peildatum: string,
  jaar: number,
  groei: number,
): SocialUitkomst {
  const uitval = achterstand(dagwaarden, peildatum, jaar);
  const u = berekenKpi(maandInvoerUitDagen(dagwaarden, peildatum, uitval, jaar), peildatum, { jaar, groei });
  return { ...u, maat: "vertoningen", standDatum: null, eersteDatum: null };
}

/** De bekende standen van het jaar t/m de peildatum, op datum gesorteerd. */
function standenIn(volgers: Readonly<Record<string, number>>, peildatum: string, jaar: number): [string, number][] {
  const eind = tot(peildatum, jaar);
  return Object.entries(volgers)
    .filter(([d, n]) => d.startsWith(`${jaar}-`) && d <= eind && Number(n) > 0)
    .map(([d, n]): [string, number] => [d, Number(n)])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function datumKort(datum: string): string {
  return `${Number(datum.slice(8, 10))} ${MAANDEN[Number(datum.slice(5, 7)) - 1]}`;
}

function rondAf(n: number): string {
  return Math.round(n).toLocaleString("nl-NL");
}

/**
 * Volgers van één account: de stand eind van het jaar (gemeten of verwacht) en het target
 * eind van het volgende jaar. Null als er in het jaar nog geen enkele stand bekend is.
 */
export function berekenVolgers(
  volgers: Readonly<Record<string, number>>,
  peildatum: string,
  jaar: number,
  groei: number,
  opties: {
    /**
     * De laatste dag waarvan een stand mag meetellen, als die na de peildatum ligt. Een stand
     * is een momentopname van de dag van ophalen (Instagram: zondag), en die hoort niet een
     * week te wachten tot de volgende zaterdag. Standaard de peildatum.
     */
    standTot?: string;
    /**
     * Instagram (besluit van de eigenaar, 20 november 2026): het platform kent geen historie,
     * dus 1 januari t/m de dag vóór de eerste gemeten stand krijgen de waarde van die eerste
     * stand. Gestippeld in de grafiek (soort `bijgeschat`, met uitleg in de tooltip); de
     * trend rekent alleen over de echt gemeten standen.
     */
    aanvullen?: boolean;
  } = {},
): SocialUitkomst | null {
  const standTot = opties.standTot && opties.standTot > peildatum ? opties.standTot : peildatum;
  const standen = standenIn(volgers, standTot, jaar);
  if (standen.length === 0) return null;
  const [eersteDatum, eerste] = standen[0];
  const [laatsteDatum, laatste] = standen[standen.length - 1];
  const tussen = Math.round((alsDatum(laatsteDatum) - alsDatum(eersteDatum)) / DAG_MS);
  const perDag = tussen >= 7 ? (laatste - eerste) / tussen : 0;
  const eindJaar = eindVanJaar(jaar);
  const dagenNaLaatste = Math.round((alsDatum(eindJaar) - alsDatum(laatsteDatum)) / DAG_MS);
  const verwacht = laatste + perDag * dagenNaLaatste;
  const target = verwacht * (1 + groei);
  const grens = tot(standTot, jaar);
  const aangevuld = opties.aanvullen && eersteDatum > `${jaar}-01-01` ? eersteDatum : null;

  const maanden: MaandUitkomst[] = Array.from({ length: 12 }, (_, i) => {
    const maand = i + 1;
    const mm = String(maand).padStart(2, "0");
    const dagen = dagenInMaand(jaar, maand);
    const begin = `${jaar}-${mm}-01`;
    const eind = `${jaar}-${mm}-${String(dagen).padStart(2, "0")}`;
    const inMaand = standen.filter(([d]) => d >= begin && d <= eind);
    const basis = { maand, dagenGemeten: inMaand.length, dagenInMaand: dagen };
    if (eind < eersteDatum && aangevuld) {
      return {
        ...basis,
        soort: "bijgeschat",
        gerealiseerd: null,
        verwacht: eerste,
        toelichting: `Aangenomen: gelijk aan de eerste gemeten stand (${rondAf(eerste)} op ${datumKort(eersteDatum)}). Instagram geeft geen historie.`,
      };
    }
    if (eind < eersteDatum) {
      return {
        ...basis,
        soort: "gerealiseerd",
        gerealiseerd: null,
        verwacht: 0,
        leeg: true,
        toelichting: `Nog geen stand bekend: de eerste is van ${datumKort(eersteDatum)}.`,
      };
    }
    if (eind <= laatsteDatum && eind <= grens) {
      const [d, n] = standen.filter(([sd]) => sd <= eind).at(-1)!;
      return {
        ...basis,
        soort: "gerealiseerd",
        gerealiseerd: n,
        verwacht: n,
        toelichting: d === eind ? undefined : `stand op ${datumKort(d)}`,
      };
    }
    const verwachtEind = laatste + perDag * Math.round((alsDatum(eind) - alsDatum(laatsteDatum)) / DAG_MS);
    if (begin <= laatsteDatum) {
      return {
        ...basis,
        soort: "deels",
        gerealiseerd: laatste,
        verwacht: verwachtEind,
        toelichting: `${rondAf(laatste)} op ${datumKort(laatsteDatum)}, plus de trend tot het eind van de maand`,
      };
    }
    return {
      ...basis,
      soort: "verwachting",
      gerealiseerd: null,
      verwacht: verwachtEind,
      toelichting: perDag === 0 ? "nog geen trend: de laatste stand doorgetrokken" : "laatste stand plus de trend per dag",
    };
  });

  return {
    maat: "volgers",
    peildatum,
    gerealiseerd: laatste,
    perDag,
    dagenGemeten: standen.length,
    dagenNietGemeten: 0,
    dagenBijgeschat: dagenNaLaatste,
    bijgeschat: verwacht - laatste,
    verwacht,
    groei,
    target,
    // Een stand heeft geen maandtarget: de lijn in de grafiek is het doel eind volgend jaar.
    targetPerMaand: target,
    maanden,
    definitief: isDefinitief(peildatum, jaar),
    standDatum: laatsteDatum,
    eersteDatum,
    aangevuldTot: aangevuld,
  };
}

/** Dezelfde uitkomst met een ander groeipercentage (op de server én in de browser). */
export function metSocialGroei(u: SocialUitkomst, groei: number): SocialUitkomst {
  const target = u.verwacht * (1 + groei);
  return { ...u, groei, target, targetPerMaand: u.maat === "volgers" ? target : target / 12 };
}

/**
 * Voortgang van een stand: ligt de groei sinds eind 2026 op schema? Het doel is de groei
 * van de basis naar het target, gelijk verdeeld over de 365 dagen van 2027. Op dag 40 hoort
 * er (target − basis) × 40 ÷ 365 bij te zijn gekomen; de afwijking is de werkelijke groei
 * ten opzichte daarvan. Zelfde vorm als `voortgang` in `lib/kpi2027/rekenen.ts`, zodat de
 * overzichtstabel hem op dezelfde manier toont. Null zonder doelgroei of zonder stand.
 */
export function voortgangStand(
  basis: number,
  target: number,
  realisatie: { waarde: number; peildatum: string | null },
  jaar: number = KPI_DOELJAAR,
): { dagen: number; targetTotNu: number; afwijking: number } | null {
  if (!realisatie.peildatum || realisatie.waarde <= 0) return null;
  const doelgroei = target - basis;
  if (Math.abs(doelgroei) < 1e-9) return null;
  const dagen = dagenTussen(`${jaar}-01-01`, realisatie.peildatum);
  if (dagen <= 0) return null;
  const groeiTotNu = (doelgroei * dagen) / dagenInJaar(jaar);
  return {
    dagen,
    targetTotNu: basis + groeiTotNu,
    afwijking: (realisatie.waarde - basis) / groeiTotNu - 1,
  };
}

/** De realisatie van het doeljaar: vertoningen opgeteld, volgers de laatste stand. */
export function realisatieVoor(
  maat: SocialMaat,
  stand: SocialStand | null,
): { waarde: number; peildatum: string | null } {
  if (!stand) return { waarde: 0, peildatum: null };
  const reeks = stand.dagen[maat] ?? {};
  if (maat !== "volgers") {
    const waarde = Object.entries(reeks)
      .filter(([d]) => d.startsWith(`${stand.jaar}-`) && d <= stand.peildatum)
      .reduce((t, [, n]) => t + (Number(n) || 0), 0);
    return { waarde, peildatum: stand.peildatum };
  }
  const opgehaald = stand.berekendOp.slice(0, 10);
  const standen = standenIn(reeks, opgehaald > stand.peildatum ? opgehaald : stand.peildatum, stand.jaar);
  const laatste = standen.at(-1);
  return laatste ? { waarde: laatste[1], peildatum: laatste[0] } : { waarde: 0, peildatum: null };
}

/** Alles wat de pagina van één KPI nodig heeft. */
export interface SocialKpiRegel {
  sleutel: string;
  naam: string;
  kanaal: SocialKanaal;
  maat: SocialMaat;
  /** De account op dat kanaal; null als het kanaal geen account heeft. */
  account: { naam: string; accountId: string } | null;
  /** Waarom er geen cijfers zijn (niet gekoppeld), als er geen stand is. */
  nietGekoppeld: string | null;
  uitkomst: SocialUitkomst | null;
  /** Het percentage dat het team vastlegde; "terug naar" gaat hierheen. */
  standaardGroei: number;
  groeiAangepast: boolean;
  realisatie: { waarde: number; peildatum: string | null };
  /** Wanneer de stand van 2026 van dit account is bijgewerkt. */
  berekendOp: string | null;
}

export interface SocialKanaalGroep {
  kanaal: SocialKanaal;
  kpis: SocialKpiRegel[];
}

export interface SocialMerkOverzicht {
  sleutel: string;
  naam: string;
  kanalen: SocialKanaalGroep[];
  /** De peildatum van de stand van 2026 (de jongste over de accounts), of null. */
  peildatum: string | null;
  peildatumDoeljaar: string | null;
  berekendOp: string | null;
  volgendeUpdate: string | null;
}

/** Wat `/api/kpi-2027-social` teruggeeft. */
export interface Kpi2027SocialAntwoord {
  merken: SocialMerkOverzicht[];
  /** De fout van de laatste ophaalactie, per account (bv. Facebook niet gekoppeld). */
  laatsteFout: string | null;
  magBijwerken?: boolean;
  fout?: string;
}

function regelVoor(
  merk: SocialMerk,
  kpi: SocialKpi,
  standen: readonly SocialStand[],
  groeiVoor: (kpi: string) => number | undefined,
): SocialKpiRegel {
  const account = accountVoor(merk, kpi.kanaal);
  const sleutel = account?.accountId ? standSleutel(kpi.kanaal, account.accountId) : null;
  const stand = sleutel ? (standen.find((s) => s.sleutel === sleutel && s.jaar === KPI_JAAR) ?? null) : null;
  const standDoeljaar = sleutel ? (standen.find((s) => s.sleutel === sleutel && s.jaar === KPI_DOELJAAR) ?? null) : null;
  const aangepast = groeiVoor(kpi.sleutel);
  const groei = aangepast ?? kpi.groei;
  const reeks = stand?.dagen[kpi.maat] ?? {};
  const uitkomst = !stand
    ? null
    : kpi.maat === "volgers"
      ? berekenVolgers(reeks, stand.peildatum, stand.jaar, groei, {
          standTot: stand.berekendOp.slice(0, 10),
          aanvullen: kpi.kanaal === "instagram",
        })
      : kpi.maat === "nieuwe-volgers"
        ? berekenNieuweVolgers(reeks, stand.peildatum, stand.jaar, groei)
        : Object.keys(reeks).length > 0
          ? berekenVertoningen(reeks, stand.peildatum, stand.jaar, groei)
          : null;
  return {
    sleutel: kpi.sleutel,
    naam: kpi.naam,
    kanaal: kpi.kanaal,
    maat: kpi.maat,
    account: account?.accountId ? { naam: account.naam, accountId: account.accountId } : null,
    nietGekoppeld: uitkomst ? null : (account?.nietGekoppeld ?? null),
    uitkomst,
    standaardGroei: kpi.groei,
    groeiAangepast: aangepast !== undefined,
    realisatie: realisatieVoor(kpi.maat, standDoeljaar),
    berekendOp: stand?.berekendOp ?? null,
  };
}

function maxVan(waarden: (string | null | undefined)[]): string | null {
  return waarden.reduce<string | null>((m, w) => (w && (!m || w > m) ? w : m), null);
}

/** Het overzicht van één merk uit de standen van al zijn accounts. */
export function merkOverzicht(
  merk: SocialMerk,
  standen: readonly SocialStand[],
  groeiVoor: (kpi: string) => number | undefined = () => undefined,
): SocialMerkOverzicht {
  const kanalen: SocialKanaalGroep[] = KANAAL_VOLGORDE.map((kanaal) => ({
    kanaal,
    kpis: merk.kpis.filter((k) => k.kanaal === kanaal).map((k) => regelVoor(merk, k, standen, groeiVoor)),
  })).filter((g) => g.kpis.length > 0);
  const eigen = standen.filter((s) => merk.accounts.some((a) => a.accountId && standSleutel(a.kanaal, a.accountId) === s.sleutel));
  const peildatum = maxVan(eigen.filter((s) => s.jaar === KPI_JAAR).map((s) => s.peildatum));
  const peildatumDoeljaar = maxVan(eigen.filter((s) => s.jaar === KPI_DOELJAAR).map((s) => s.peildatum));
  const laatste = peildatumDoeljaar ?? peildatum;
  return {
    sleutel: merk.sleutel,
    naam: merk.naam,
    kanalen,
    peildatum,
    peildatumDoeljaar,
    berekendOp: maxVan(eigen.map((s) => s.berekendOp)),
    volgendeUpdate: laatste ? volgendeUpdate(laatste) : null,
  };
}

/** Past het percentage van één KPI toe in de browser, na het opslaan. */
export function pasSocialGroeiToe(
  merken: SocialMerkOverzicht[],
  merkSleutel: string,
  kpiSleutel: string,
  groei: number | null,
): SocialMerkOverzicht[] {
  return merken.map((m) =>
    m.sleutel !== merkSleutel
      ? m
      : {
          ...m,
          kanalen: m.kanalen.map((g) => ({
            ...g,
            kpis: g.kpis.map((k) =>
              k.sleutel !== kpiSleutel
                ? k
                : {
                    ...k,
                    uitkomst: k.uitkomst && metSocialGroei(k.uitkomst, groei ?? k.standaardGroei),
                    groeiAangepast: groei !== null,
                  },
            ),
          })),
        },
  );
}
