import {
  SYNTEC_GROEPEN,
  SYNTEC_KPIS,
  SYNTEC_TOTAAL_KEUZES,
  beschrijfRegel,
  classificeerLead,
  type SyntecGroep,
  type SyntecKpi,
} from "@/lib/kpi2027syntec/definities";
import { berekenKpi, maandInvoerUitMaanden, type KpiUitkomst } from "@/lib/kpi2027/rekenen";

/**
 * Het rekenwerk achter het tabblad KPI's 2027 Syntec.
 *
 * De rekensom zelf is exact die van KPI's 2027 (`berekenKpi` in `lib/kpi2027/rekenen.ts`):
 * gerealiseerd t/m de peildatum, plus het gemiddelde per dag × de resterende dagen van
 * 2026, en daarop +5% als target voor 2027. Hier staat alleen wat ervóór komt: de
 * Syntec-leads per kanaal, onderwerp en maand indelen in KPI's (`definities.ts`) en optellen
 * tot twaalf maandcijfers per KPI, plus een totaal per groep en over alles.
 *
 * Geen database, geen netwerk, geen React — getest in `rekenen.test.ts`.
 */

/** Het aantal leads met één kanaal en onderwerp in één maand, zoals de query ze telt. */
export interface SyntecTelling {
  kanaal: string;
  onderwerp: string;
  /** 1 = januari. */
  maand: number;
  aantal: number;
}

export interface SyntecBronRegel {
  /** De regel in gewone taal. */
  tekst: string;
  /** Wanneer de regel leads oplevert ("t/m maart 2026 …"), of null. */
  periode: string | null;
  /** Hoeveel leads via deze regel meetelden, t/m de peildatum. */
  aantal: number;
}

/** Alles wat het tabblad van één KPI (of één totaal) nodig heeft. */
export interface SyntecKpiRegel {
  sleutel: string;
  naam: string;
  /** Het doel voor 2026 zoals het team het vastlegde. */
  doel2026: number;
  bron: SyntecBronRegel[];
  /** Bij een totaal: de KPI's die erin zitten. */
  onderdelen: string[];
  /** De beslissingen achter de definitie, in gewone taal. */
  keuzes: string[];
  /**
   * Wat deze definitie over heel 2025 telt — de controle op de definitie: de doelen voor
   * 2026 waren de telling van 2025 × 1,2. Null als 2025 niet is meegegeven.
   */
  vorigJaar: number | null;
  uitkomst: KpiUitkomst;
  /** De realisatie van 2027: 0 met `peildatum: null` zolang 2027 niet begonnen is. */
  realisatie: { waarde: number; peildatum: string | null };
}

export interface SyntecGroepOverzicht {
  sleutel: SyntecGroep;
  naam: string;
  kpis: SyntecKpiRegel[];
  totaal: SyntecKpiRegel;
}

export interface SyntecOverzicht {
  groepen: SyntecGroepOverzicht[];
  totaal: SyntecKpiRegel;
  /** Leads met kanaalgroep Internet die bij geen enkele KPI horen (chat, WhatsApp …). */
  nietIngedeeld: number;
}

/** Wat `/api/kpi-2027-syntec` teruggeeft. */
export interface Kpi2027SyntecAntwoord {
  peildatum: string | null;
  /** T/m welke dag de realisatie van 2027 telt; null zolang 2027 niet begonnen is. */
  peildatumDoeljaar: string | null;
  /** Wanneer de sheet voor het laatst naar de database is gekopieerd. */
  ingelezenOp: string | null;
  volgendeUpdate: string | null;
  overzicht: SyntecOverzicht | null;
  fout?: string;
}

function nulreeks(): number[] {
  return Array.from({ length: 12 }, () => 0);
}

function telOp(reeksen: number[][]): number[] {
  const som = nulreeks();
  for (const reeks of reeksen) for (let i = 0; i < 12; i++) som[i] += reeks[i] ?? 0;
  return som;
}

/** Per KPI het totaal van een jaar, voor de controle op 2025. */
export function jaartotalen(
  tellingen: readonly SyntecTelling[],
  kpis: readonly SyntecKpi[] = SYNTEC_KPIS,
): Map<string, number> {
  const totalen = new Map<string, number>(kpis.map((k) => [k.sleutel, 0]));
  for (const t of tellingen) {
    const treffer = classificeerLead(t.kanaal, t.onderwerp, kpis);
    if (treffer) totalen.set(treffer.kpi.sleutel, totalen.get(treffer.kpi.sleutel)! + (Number(t.aantal) || 0));
  }
  return totalen;
}

/**
 * Deelt de tellingen in en rekent elke KPI, elke groep en het totaal uit.
 *
 * Tellingen moeten al beperkt zijn tot kanaalgroep Internet, het basisjaar en t/m de
 * peildatum — dat doet de query (`bron.ts`). Een maand buiten 1–12 wordt genegeerd.
 *
 *  - `vorigJaar`: de tellingen van heel 2025, voor de controleregel onder de grafiek;
 *  - `doeljaar`: de tellingen van 2027 t/m zijn peildatum, voor het kaartje Realisatie 2027.
 */
export function syntecOverzicht(
  tellingen: readonly SyntecTelling[],
  peildatum: string,
  opties: {
    kpis?: readonly SyntecKpi[];
    vorigJaar?: readonly SyntecTelling[] | null;
    doeljaar?: { tellingen: readonly SyntecTelling[]; peildatum: string } | null;
  } = {},
): SyntecOverzicht {
  const kpis = opties.kpis ?? SYNTEC_KPIS;
  const totalenVorigJaar = opties.vorigJaar ? jaartotalen(opties.vorigJaar, kpis) : null;
  const somVorigJaar = (delen: readonly SyntecKpi[]) =>
    totalenVorigJaar ? delen.reduce((t, k) => t + (totalenVorigJaar.get(k.sleutel) ?? 0), 0) : null;
  const doeljaar = opties.doeljaar ?? null;
  const totalenDoeljaar = doeljaar ? jaartotalen(doeljaar.tellingen, kpis) : null;
  const realisatieVan = (delen: readonly SyntecKpi[]) =>
    doeljaar && totalenDoeljaar
      ? { waarde: delen.reduce((t, k) => t + (totalenDoeljaar.get(k.sleutel) ?? 0), 0), peildatum: doeljaar.peildatum }
      : { waarde: 0, peildatum: null };
  // Syntec telt elke dag; "gemeten dagen" zijn dus gewoon alle dagen t/m de peildatum.
  const uitkomstVan = (maanden: number[]) =>
    berekenKpi(maandInvoerUitMaanden(maanden, peildatum, []), peildatum);

  const perKpi = new Map<string, { maanden: number[]; perRegel: number[] }>(
    kpis.map((k) => [k.sleutel, { maanden: nulreeks(), perRegel: k.regels.map(() => 0) }]),
  );
  let nietIngedeeld = 0;

  for (const t of tellingen) {
    const aantal = Number(t.aantal) || 0;
    if (t.maand < 1 || t.maand > 12 || aantal <= 0) continue;
    const treffer = classificeerLead(t.kanaal, t.onderwerp, kpis);
    if (!treffer) {
      nietIngedeeld += aantal;
      continue;
    }
    const doel = perKpi.get(treffer.kpi.sleutel)!;
    doel.maanden[t.maand - 1] += aantal;
    doel.perRegel[treffer.regel] += aantal;
  }

  const regelVoor = (kpi: SyntecKpi): SyntecKpiRegel => {
    const data = perKpi.get(kpi.sleutel)!;
    return {
      sleutel: kpi.sleutel,
      naam: kpi.naam,
      doel2026: kpi.doel2026,
      bron: kpi.regels.map((r, i) => ({ tekst: beschrijfRegel(r), periode: r.periode ?? null, aantal: data.perRegel[i] })),
      onderdelen: [],
      keuzes: [...kpi.keuzes],
      vorigJaar: somVorigJaar([kpi]),
      uitkomst: uitkomstVan(data.maanden),
      realisatie: realisatieVan([kpi]),
    };
  };

  const totaalVan = (sleutel: string, naam: string, delen: readonly SyntecKpi[]): SyntecKpiRegel => ({
    sleutel,
    naam,
    doel2026: delen.reduce((t, k) => t + k.doel2026, 0),
    bron: [],
    onderdelen: delen.map((k) => k.naam),
    keuzes: [...SYNTEC_TOTAAL_KEUZES],
    vorigJaar: somVorigJaar(delen),
    // Optellen vóór het rekenen of erna geeft hetzelfde (alles is lineair); zo staat er
    // gewoon één berekening, met dezelfde maandlijn als elke andere kaart.
    uitkomst: uitkomstVan(telOp(delen.map((k) => perKpi.get(k.sleutel)!.maanden))),
    realisatie: realisatieVan(delen),
  });

  const groepen = SYNTEC_GROEPEN.map((g) => {
    const delen = kpis.filter((k) => k.groep === g.sleutel);
    return {
      sleutel: g.sleutel,
      naam: g.naam,
      kpis: delen.map(regelVoor),
      totaal: totaalVan(`totaal-${g.sleutel}`, g.totaalNaam, delen),
    };
  }).filter((g) => g.kpis.length > 0);

  return {
    groepen,
    totaal: totaalVan("totaal", "Totaal", kpis),
    nietIngedeeld,
  };
}
