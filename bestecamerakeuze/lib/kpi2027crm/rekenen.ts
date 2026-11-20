import { KPI_DOELJAAR, KPI_JAAR } from "@/lib/kpi2027/definities";
import { dagenInMaand, type KpiUitkomst, type MaandUitkomst } from "@/lib/kpi2027/rekenen";
import { CONTACTEN_SLEUTEL, CRM_GROEI, keuzesVoor, optinNaam, optinSleutel } from "@/lib/kpi2027crm/definities";
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
 * Er is precies één meting: de export van vandaag. Daarom, op verzoek van de eigenaar:
 *
 *  1. **Januari t/m de maand vóór de meting**: dezelfde stand als de meting — een aanname
 *     (soort `bijgeschat`, gestippeld, met uitleg in de tooltip).
 *  2. **De maand van de meting**: de gemeten stand (soort `gerealiseerd`).
 *  3. **De maanden erna t/m december**: de stand doorgetrokken (soort `verwachting`).
 *  4. **Stand eind 2026** = de laatste stand; **target eind 2027** = die stand × (1 + 10%). In de
 *     grafiek een vlakke lijn "Doel eind 2027", net als volgers op KPI's social media.
 *
 * Zodra de export in 2027 ligt, is de stand van 2027 de **realisatie**. De stand eind 2026 is
 * dan niet meer te lezen (er wordt niets bewaard), dus dan valt er voor 2026 niets te rekenen.
 */

/** Wat de stand van één KPI is in de export. */
export interface CrmTelling {
  sleutel: string;
  naam: string;
  soort: "contacten" | "optin";
  /** De kolom waaruit geteld is: `MAIL` of de opt-inkolom. */
  kolom: string;
  /** Unieke e-mailadressen. */
  aantal: number;
}

export interface CrmTellingen {
  /** De kolom met de e-mailadressen, of null als die ontbreekt. */
  mailKolom: string | null;
  tellingen: CrmTelling[];
  /** Rijen in de export, en hoeveel daarvan geen e-mailadres hebben. */
  rijen: number;
  rijenZonderMail: number;
}

/** De kolommen met e-mailadressen, in volgorde van voorkeur (zelfde als Tools → Selligent). */
const MAIL_KOLOMMEN = ["MAIL", "EMAIL"];

function isWaar(waarde: string): boolean {
  return waarde.trim().toLowerCase() === "true";
}

/** Telt de contacten en per booleaanse kolom de opt-ins, in unieke e-mailadressen. */
export function telCrm(tabel: Tabel): CrmTellingen {
  const mail = MAIL_KOLOMMEN.map((n) => tabel.kolommen.find((k) => k.naam === n)).find(Boolean) ?? null;
  if (!mail) return { mailKolom: null, tellingen: [], rijen: tabel.rijen, rijenZonderMail: tabel.rijen };

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

  return {
    mailKolom: mail.naam,
    tellingen: [
      { sleutel: CONTACTEN_SLEUTEL, naam: "Contacten", soort: "contacten", kolom: mail.naam, aantal: contacten },
      ...optins,
    ],
    rijen: tabel.rijen,
    rijenZonderMail,
  };
}

/** Een stand als uitkomst, in de vorm die de gedeelde kaart en tabel lezen. */
export interface CrmUitkomst extends KpiUitkomst {
  /** De dag van de meting (de export). */
  standDatum: string;
}

const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function datumKort(datum: string): string {
  return `${Number(datum.slice(8, 10))} ${MAANDEN[Number(datum.slice(5, 7)) - 1]}`;
}

function rondAf(n: number): string {
  return Math.round(n).toLocaleString("nl-NL");
}

/**
 * De stand van één KPI over het jaar, uit één meting (zie de kop van dit bestand). Null als de
 * meting niet in `jaar` valt.
 */
export function berekenStand(
  stand: number,
  standDatum: string,
  groei: number = CRM_GROEI,
  jaar: number = KPI_JAAR,
): CrmUitkomst | null {
  if (!standDatum.startsWith(`${jaar}-`)) return null;
  const meetmaand = Number(standDatum.slice(5, 7));
  const maanden: MaandUitkomst[] = Array.from({ length: 12 }, (_, i) => {
    const maand = i + 1;
    const basis = { maand, dagenInMaand: dagenInMaand(jaar, maand) };
    if (maand < meetmaand) {
      return {
        ...basis,
        soort: "bijgeschat",
        gerealiseerd: null,
        verwacht: stand,
        dagenGemeten: 0,
        toelichting: `Aangenomen: gelijk aan de stand van ${datumKort(standDatum)} (${rondAf(stand)}). Er wordt geen historie bewaard.`,
      };
    }
    if (maand === meetmaand) {
      return {
        ...basis,
        soort: "gerealiseerd",
        gerealiseerd: stand,
        verwacht: stand,
        dagenGemeten: 1,
        toelichting: `Gemeten in de export van ${datumKort(standDatum)}`,
      };
    }
    return {
      ...basis,
      soort: "verwachting",
      gerealiseerd: null,
      verwacht: stand,
      dagenGemeten: 0,
      toelichting: maand === 12 ? "De laatste stand doorgetrokken tot 31 december: de basis voor het target" : "De laatste stand doorgetrokken",
    };
  });

  const target = stand * (1 + groei);
  return {
    peildatum: standDatum,
    gerealiseerd: stand,
    perDag: 0,
    dagenGemeten: 1,
    dagenNietGemeten: 0,
    dagenBijgeschat: 0,
    bijgeschat: 0,
    verwacht: stand,
    groei,
    target,
    // Een stand heeft geen maandtarget: de lijn in de grafiek is het doel eind volgend jaar.
    targetPerMaand: target,
    maanden,
    definitief: standDatum >= `${jaar}-12-31`,
    standDatum,
  };
}

/** Alles wat het tabblad van één KPI nodig heeft. */
export interface CrmKpiRegel {
  sleutel: string;
  naam: string;
  soort: "contacten" | "optin";
  kolom: string;
  uitkomst: CrmUitkomst | null;
  realisatie: { waarde: number; peildatum: string | null };
  keuzes: string[];
}

export interface CrmGroep {
  sleutel: "contacten" | "optins";
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
  groepen: CrmGroep[];
  fout?: string;
}

/** Het overzicht uit de tellingen van één export, gemeten op `standDatum`. */
export function crmOverzicht(telling: CrmTellingen, standDatum: string): CrmGroep[] {
  const regel = (t: CrmTelling): CrmKpiRegel => ({
    sleutel: t.sleutel,
    naam: t.naam,
    soort: t.soort,
    kolom: t.kolom,
    uitkomst: berekenStand(t.aantal, standDatum),
    realisatie: standDatum.startsWith(`${KPI_DOELJAAR}-`)
      ? { waarde: t.aantal, peildatum: standDatum }
      : { waarde: 0, peildatum: null },
    keuzes: keuzesVoor(t.soort),
  });
  const groepen: CrmGroep[] = [
    { sleutel: "contacten", naam: "Contacten", kpis: telling.tellingen.filter((t) => t.soort === "contacten").map(regel) },
    { sleutel: "optins", naam: "Opt-ins", kpis: telling.tellingen.filter((t) => t.soort === "optin").map(regel) },
  ];
  return groepen.filter((g) => g.kpis.length > 0);
}
