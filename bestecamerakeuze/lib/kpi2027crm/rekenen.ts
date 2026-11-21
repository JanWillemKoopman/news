import { KPI_DOELJAAR, KPI_JAAR } from "@/lib/kpi2027/definities";
import { dagenInMaand, type KpiUitkomst, type MaandUitkomst } from "@/lib/kpi2027/rekenen";
import {
  ALGEMENE_OPTINS,
  AUTOS_OPTIN_SLEUTEL,
  AUTOS_SLEUTEL,
  CONTACTEN_SLEUTEL,
  CRM_GROEI,
  MET_OPTIN_SLEUTEL,
  algemenePlek,
  keuzesVoor,
  optinNaam,
  optinSleutel,
} from "@/lib/kpi2027crm/definities";
import type { Tabel } from "@/lib/selligent/tabel";

/**
 * Het rekenwerk achter KPI's 2027 CRM. Puur: geen netwerk, geen React — getest in
 * `rekenen.test.ts`. Het bestand zelf komt uit `lib/selligent/bron.ts` (dezelfde tabel in het
 * geheugen als Tools → Selligent database); hier staat alleen het tellen en de stand.
 *
 * ## Tellen (`telCrm`)
 *
 * Eén doorloop over de rijen. Per e-mailadres (code in de kolom `MAIL`) wordt per opt-inkolom
 * bijgehouden of het ergens `True` heeft; een contact met drie auto's staat in drie rijen maar
 * telt één keer, in de sterkste stand die het ergens heeft.
 *
 * ## De stand (`berekenStand`)
 *
 * Elke vrijdag (en op 31 december) en bij elk bezoek aan het tabblad wordt van elke KPI het aantal
 * van die dag bewaard (`kpi_2027_crm_standen`, migratie 0040, alleen
 * aantallen — zie `bron.ts` en `bijwerken.ts`), plus de stand van de export die nu openstaat. Per
 * KPI is er dus een reeks dag → aantal. Daaruit, per jaar:
 *
 *  1. **Maanden vóór de eerste meting** (in 2026: vóór 20 november, toen het bewaren begon):
 *     dezelfde stand als de eerste meting — een aanname (soort `bijgeschat`, gestippeld, met
 *     uitleg in de tooltip). Zo wilde de eigenaar het: een rechte lijn tot de eerste meting.
 *  2. **Maanden met een meting**: de laatste stand in die maand (soort `gerealiseerd`).
 *  3. **Een maand zonder meting tussen twee metingen** (de taak liep niet): de vorige stand,
 *     gestippeld (`bijgeschat`).
 *  4. **Maanden na de laatste meting** t/m december: de laatste stand doorgetrokken (soort
 *     `verwachting`), geen trend.
 *  5. **Stand eind 2026** = de laatste meting in 2026; **target eind 2027** = die stand × (1 + 10%).
 *     In de grafiek een vlakke lijn "Doel eind 2027", net als volgers op KPI's social media.
 *
 * **Realisatie 2027** is de laatste meting in 2027. Omdat de dagstanden bewaard worden, blijft
 * de stand eind 2026 ook in 2027 gewoon te lezen.
 */

/**
 * Contacten, Contacten met opt-in (minstens één opt-in True), Aantal auto's (unieke kentekens),
 * Auto's met opt-in (kentekens van een contact met opt-in), of één opt-inkolom.
 */
export type CrmSoort = "contacten" | "met-optin" | "autos" | "autos-optin" | "optin";

/** Wat de stand van één KPI is in de export. */
export interface CrmTelling {
  sleutel: string;
  naam: string;
  soort: CrmSoort;
  /** De kolom waaruit geteld is: `MAIL`, de kentekenkolom of de opt-inkolom. */
  kolom: string;
  /** Unieke e-mailadressen (bij de auto-KPI's: unieke kentekens). */
  aantal: number;
}

export interface CrmTellingen {
  /** De kolom met de e-mailadressen, of null als die ontbreekt. */
  mailKolom: string | null;
  tellingen: CrmTelling[];
  /** Rijen in de export, en hoeveel daarvan geen e-mailadres hebben. */
  rijen: number;
  rijenZonderMail: number;
  /** De algemene opt-ins (VDU, Service) waarvoor geen booleaanse kolom in de export staat. */
  ontbrekend: string[];
  /** De kolom met de kentekens, of null als die ontbreekt (dan geen auto-KPI's). */
  kentekenKolom: string | null;
}

/**
 * De kolom met kentekens: eerst `VDUVEHICLES_LICENSE_PLATE`, anders de eerste kolom met
 * "PLATE" of "KENTEKEN" in de naam.
 */
const KENTEKEN_KOLOMMEN = ["VDUVEHICLES_LICENSE_PLATE"];

/** De kolommen met e-mailadressen, in volgorde van voorkeur (zelfde als Tools → Selligent). */
const MAIL_KOLOMMEN = ["MAIL", "EMAIL"];

function isWaar(waarde: string): boolean {
  return waarde.trim().toLowerCase() === "true";
}

/** Telt de contacten en per booleaanse kolom de opt-ins, in unieke e-mailadressen. */
export function telCrm(tabel: Tabel): CrmTellingen {
  const mail = MAIL_KOLOMMEN.map((n) => tabel.kolommen.find((k) => k.naam === n)).find(Boolean) ?? null;
  if (!mail) {
    return { mailKolom: null, tellingen: [], rijen: tabel.rijen, rijenZonderMail: tabel.rijen, ontbrekend: [], kentekenKolom: null };
  }

  const aantalMails = mail.waarden.length;
  const gezien = new Uint8Array(aantalMails);
  let contacten = 0;
  let rijenZonderMail = 0;
  for (let i = 0; i < tabel.rijen; i++) {
    const code = mail.codes[i];
    if (code === 0) {
      rijenZonderMail++;
      continue;
    }
    if (!gezien[code]) {
      gezien[code] = 1;
      contacten++;
    }
  }

  // Per e-mailadres: staat er ergens een opt-in op True? Een *of* over alle booleaanse
  // kolommen, per contact — dezelfde definitie als het filter "Minimaal 1 opt-in" op Tools →
  // Selligent database.
  const metEenOptin = new Uint8Array(aantalMails);
  const optins = tabel.kolommen
    .filter((k) => k.type === "booleaans")
    .map((k) => {
      // Per code of die waarde True is: de waarden staan onbewerkt in de tabel, dus "True",
      // "true" en "True " zijn drie codes die alle drie meetellen.
      const waar = Uint8Array.from(k.waarden, (w, c) => (c > 0 && isWaar(w) ? 1 : 0));
      const metOptin = new Uint8Array(aantalMails);
      let aantal = 0;
      for (let i = 0; i < tabel.rijen; i++) {
        const m = mail.codes[i];
        if (m === 0 || metOptin[m] || !waar[k.codes[i]]) continue;
        metOptin[m] = 1;
        metEenOptin[m] = 1;
        aantal++;
      }
      return {
        sleutel: optinSleutel(k.naam),
        naam: optinNaam(k.naam),
        soort: "optin" as const,
        kolom: k.naam,
        aantal,
      };
    });

  // Auto's: unieke kentekens. Een auto heeft een opt-in als hij op minstens één rij bij een
  // e-mailadres staat dat ergens een opt-in op True heeft — de auto's van "Contacten met opt-in".
  const kenteken =
    KENTEKEN_KOLOMMEN.map((n) => tabel.kolommen.find((k) => k.naam === n)).find(Boolean) ??
    tabel.kolommen.find((k) => /PLATE|KENTEKEN/i.test(k.naam)) ??
    null;
  const autos: CrmTelling[] = [];
  if (kenteken) {
    const gezienAuto = new Uint8Array(kenteken.waarden.length);
    const autoMetOptin = new Uint8Array(kenteken.waarden.length);
    let aantalAutos = 0;
    let aantalMetOptin = 0;
    for (let i = 0; i < tabel.rijen; i++) {
      const a = kenteken.codes[i];
      if (a === 0) continue;
      if (!gezienAuto[a]) {
        gezienAuto[a] = 1;
        aantalAutos++;
      }
      const m = mail.codes[i];
      if (!autoMetOptin[a] && m !== 0 && metEenOptin[m]) {
        autoMetOptin[a] = 1;
        aantalMetOptin++;
      }
    }
    autos.push(
      { sleutel: AUTOS_SLEUTEL, naam: "Aantal auto's", soort: "autos", kolom: kenteken.naam, aantal: aantalAutos },
      {
        sleutel: AUTOS_OPTIN_SLEUTEL,
        naam: "Auto's met opt-in",
        soort: "autos-optin",
        kolom: kenteken.naam,
        aantal: aantalMetOptin,
      },
    );
  }

  const gevonden = new Set(optins.map((o) => algemenePlek(o.kolom)).filter((p) => p !== null));
  return {
    mailKolom: mail.naam,
    kentekenKolom: kenteken?.naam ?? null,
    ontbrekend: ALGEMENE_OPTINS.filter((_, i) => !gevonden.has(i)).map((a) => a.naam),
    tellingen: [
      { sleutel: CONTACTEN_SLEUTEL, naam: "Contacten", soort: "contacten", kolom: mail.naam, aantal: contacten },
      {
        sleutel: MET_OPTIN_SLEUTEL,
        naam: "Contacten met opt-in",
        soort: "met-optin",
        kolom: mail.naam,
        aantal: metEenOptin.reduce((t, v) => t + v, 0),
      },
      ...autos,
      ...optins,
    ],
    rijen: tabel.rijen,
    rijenZonderMail,
  };
}

/** Een stand als uitkomst, in de vorm die de gedeelde kaart en tabel lezen. */
export interface CrmUitkomst extends KpiUitkomst {
  /** De dag van de laatste meting in het jaar. */
  standDatum: string;
  /** De dag van de eerste meting in het jaar; de maanden ervóór zijn aangenomen. */
  eersteDatum: string;
  /** Hoeveel dagen in het jaar een meting hebben. */
  metingen: number;
}

/** Per KPI-sleutel een reeks dag (YYYY-MM-DD) → aantal. */
export type CrmReeksen = Record<string, Record<string, number>>;

const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function datumKort(datum: string): string {
  return `${Number(datum.slice(8, 10))} ${MAANDEN[Number(datum.slice(5, 7)) - 1]}`;
}

function rondAf(n: number): string {
  return Math.round(n).toLocaleString("nl-NL");
}

/** De metingen van één jaar, op datum gesorteerd. */
function metingenIn(reeks: Readonly<Record<string, number>>, jaar: number): [string, number][] {
  return Object.entries(reeks)
    .filter(([d, n]) => d.startsWith(`${jaar}-`) && Number.isFinite(Number(n)))
    .map(([d, n]): [string, number] => [d, Number(n)])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * De stand van één KPI over het jaar, uit zijn dagstanden (zie de kop van dit bestand). Null als
 * er in `jaar` geen enkele meting is.
 *
 * `vandaag` bepaalt alleen of het jaar voorbij is (`definitief`): na 31 december verandert de
 * basis niet meer, ook als de laatste meting van een paar dagen eerder is.
 */
export function berekenStand(
  reeks: Readonly<Record<string, number>>,
  opties: { jaar?: number; groei?: number; vandaag?: string } = {},
): CrmUitkomst | null {
  const jaar = opties.jaar ?? KPI_JAAR;
  const groei = opties.groei ?? CRM_GROEI;
  const metingen = metingenIn(reeks, jaar);
  if (metingen.length === 0) return null;
  const [eersteDatum, eerste] = metingen[0];
  const [laatsteDatum, laatste] = metingen[metingen.length - 1];
  const eersteMaand = Number(eersteDatum.slice(5, 7));
  const laatsteMaand = Number(laatsteDatum.slice(5, 7));

  let vorige = eerste;
  let vorigeDatum = eersteDatum;
  const maanden: MaandUitkomst[] = Array.from({ length: 12 }, (_, i) => {
    const maand = i + 1;
    const mm = String(maand).padStart(2, "0");
    const inMaand = metingen.filter(([d]) => d.slice(5, 7) === mm);
    const basis = { maand, dagenInMaand: dagenInMaand(jaar, maand), dagenGemeten: inMaand.length };
    if (maand < eersteMaand) {
      return {
        ...basis,
        soort: "bijgeschat",
        gerealiseerd: null,
        verwacht: eerste,
        toelichting: `Aangenomen: gelijk aan de eerste bewaarde stand (${rondAf(eerste)} op ${datumKort(eersteDatum)}). Van vóór die dag is niets bewaard.`,
      };
    }
    if (inMaand.length > 0) {
      const [d, n] = inMaand[inMaand.length - 1];
      vorige = n;
      vorigeDatum = d;
      return {
        ...basis,
        soort: "gerealiseerd",
        gerealiseerd: n,
        verwacht: n,
        toelichting: `Stand op ${datumKort(d)}${inMaand.length > 1 ? ` (${inMaand.length} metingen deze maand, de laatste telt)` : ""}`,
      };
    }
    if (maand < laatsteMaand) {
      return {
        ...basis,
        soort: "bijgeschat",
        gerealiseerd: null,
        verwacht: vorige,
        toelichting: `Geen meting in deze maand: de vorige stand (${rondAf(vorige)} op ${datumKort(vorigeDatum)}).`,
      };
    }
    return {
      ...basis,
      soort: "verwachting",
      gerealiseerd: null,
      verwacht: laatste,
      toelichting:
        maand === 12
          ? "De laatste stand doorgetrokken tot 31 december: de basis voor het target"
          : "De laatste stand doorgetrokken",
    };
  });

  const target = laatste * (1 + groei);
  const eindJaar = `${jaar}-12-31`;
  return {
    peildatum: laatsteDatum,
    gerealiseerd: laatste,
    perDag: 0,
    dagenGemeten: metingen.length,
    dagenNietGemeten: 0,
    dagenBijgeschat: 0,
    bijgeschat: 0,
    verwacht: laatste,
    groei,
    target,
    // Een stand heeft geen maandtarget: de lijn in de grafiek is het doel eind volgend jaar.
    targetPerMaand: target,
    maanden,
    definitief: laatsteDatum >= eindJaar || (opties.vandaag ?? "") > eindJaar,
    standDatum: laatsteDatum,
    eersteDatum,
    metingen: metingen.length,
  };
}

/** De laatste meting in `jaar`, als realisatie; 0 zonder meting. */
export function realisatieUit(
  reeks: Readonly<Record<string, number>>,
  jaar: number = KPI_DOELJAAR,
): { waarde: number; peildatum: string | null } {
  const laatste = metingenIn(reeks, jaar).at(-1);
  return laatste ? { waarde: laatste[1], peildatum: laatste[0] } : { waarde: 0, peildatum: null };
}

/**
 * De bewaarde dagstanden met de stand van de export van nu erbij; de export van nu gaat voor
 * als dezelfde dag al bewaard is (die is dan van een eerdere export van dezelfde dag).
 */
export function metHuidigeStand(historie: CrmReeksen, telling: CrmTellingen, standDatum: string): CrmReeksen {
  const uit: CrmReeksen = {};
  for (const [kpi, reeks] of Object.entries(historie)) uit[kpi] = { ...reeks };
  for (const t of telling.tellingen) uit[t.sleutel] = { ...(uit[t.sleutel] ?? {}), [standDatum]: t.aantal };
  return uit;
}

/** Alles wat het tabblad van één KPI nodig heeft. */
export interface CrmKpiRegel {
  sleutel: string;
  naam: string;
  soort: CrmSoort;
  /** De kolom waaruit geteld is: `MAIL`, de kentekenkolom of de opt-inkolom. */
  kolom: string;
  /** De kolom met e-mailadressen. */
  mailKolom: string;
  /** Alle opt-inkolommen in de export (voor "met opt-in": welke kolommen meetellen). */
  optinKolommen: string[];
  /** Bij een opt-in: "VDU" of "Service" als het een algemene opt-in is, anders null. */
  algemeen: string | null;
  uitkomst: CrmUitkomst | null;
  realisatie: { waarde: number; peildatum: string | null };
  keuzes: string[];
}

export interface CrmGroep {
  sleutel: "algemeen" | "merken";
  naam: string;
  kpis: CrmKpiRegel[];
}

/** Wat `/api/kpi-2027-crm` teruggeeft. */
export interface Kpi2027CrmAntwoord {
  /** De dag van de export (Nederlandse kalender), of null. */
  standDatum: string | null;
  /** Wanneer Selligent de export neerzette (ISO). */
  gewijzigdOp: string | null;
  /** Wanneer de tabel in het geheugen is opgebouwd (ISO). */
  gebouwdOp: string | null;
  mailKolom: string | null;
  rijen: number;
  rijenZonderMail: number;
  /** De algemene opt-ins (VDU, Service) die niet als booleaanse kolom in de export staan. */
  ontbrekend: string[];
  /** De kolom met kentekens, of null (dan staan de auto-KPI's er niet). */
  kentekenKolom: string | null;
  /**
   * De bewaarde dagstanden: vanaf welke dag (de eerste meting van Contacten), hoeveel dagen, en
   * of het lezen of het vastleggen van vandaag mislukte. `vanaf` null = nog niets bewaard.
   */
  historie: { vanaf: string | null; dagen: number; leesFout: string | null; schrijfFout: string | null };
  groepen: CrmGroep[];
  fout?: string;
}

/**
 * Het overzicht uit de tellingen van de export van nu (gemeten op `standDatum`) en de bewaarde
 * dagstanden (`historie`). Zonder historie rekent elke KPI met alleen de meting van nu.
 */
export function crmOverzicht(
  telling: CrmTellingen,
  standDatum: string,
  opties: { historie?: CrmReeksen; vandaag?: string } = {},
): CrmGroep[] {
  const reeksen = metHuidigeStand(opties.historie ?? {}, telling, standDatum);
  const mailKolom = telling.mailKolom ?? "MAIL";
  const optinKolommen = telling.tellingen.filter((t) => t.soort === "optin").map((t) => t.kolom);
  const regel = (t: CrmTelling): CrmKpiRegel => {
    const plekAlgemeen = t.soort === "optin" ? algemenePlek(t.kolom) : null;
    const algemeen = plekAlgemeen === null ? null : ALGEMENE_OPTINS[plekAlgemeen].naam;
    return {
      sleutel: t.sleutel,
      naam: t.naam,
      soort: t.soort,
      kolom: t.kolom,
      mailKolom,
      optinKolommen,
      algemeen,
      uitkomst: berekenStand(reeksen[t.sleutel] ?? {}, { vandaag: opties.vandaag }),
      realisatie: realisatieUit(reeksen[t.sleutel] ?? {}),
      keuzes: keuzesVoor({ soort: t.soort, mailKolom, kolom: t.kolom, algemeen }),
    };
  };
  // Bovenaan Contacten, Contacten met opt-in, Aantal auto's, Auto's met opt-in, dan de algemene
  // opt-ins in hun vaste volgorde (VDU, Service); daaronder de merk-opt-ins in de volgorde van het
  // bestand.
  const VOORAAN: Partial<Record<CrmSoort, number>> = { contacten: -4, "met-optin": -3, autos: -2, "autos-optin": -1 };
  const plek = (t: CrmTelling) => VOORAAN[t.soort] ?? algemenePlek(t.kolom);
  const algemeen = telling.tellingen.filter((t) => plek(t) !== null).sort((a, b) => plek(a)! - plek(b)!);
  const merken = telling.tellingen.filter((t) => plek(t) === null);
  const groepen: CrmGroep[] = [
    { sleutel: "algemeen", naam: "Contacten, auto's en algemene opt-ins", kpis: algemeen.map(regel) },
    { sleutel: "merken", naam: "Opt-ins per merk", kpis: merken.map(regel) },
  ];
  return groepen.filter((g) => g.kpis.length > 0);
}
