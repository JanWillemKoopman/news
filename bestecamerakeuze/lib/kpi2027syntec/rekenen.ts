import {
  SYNTEC_GROEPEN,
  SYNTEC_KPIS,
  beschrijfRegel,
  classificeerLead,
  type SyntecGroep,
  type SyntecKpi,
} from "@/lib/kpi2027syntec/definities";
import { berekenKpi, type KpiUitkomst } from "@/lib/kpi2027/rekenen";

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
  opmerking: string | null;
  uitkomst: KpiUitkomst;
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

/**
 * Deelt de tellingen in en rekent elke KPI, elke groep en het totaal uit.
 *
 * Tellingen moeten al beperkt zijn tot kanaalgroep Internet, het basisjaar en t/m de
 * peildatum — dat doet de query (`bron.ts`). Een maand buiten 1–12 wordt genegeerd.
 */
export function syntecOverzicht(
  tellingen: readonly SyntecTelling[],
  peildatum: string,
  kpis: readonly SyntecKpi[] = SYNTEC_KPIS,
): SyntecOverzicht {
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
      bron: kpi.regels.map((r, i) => ({ tekst: beschrijfRegel(r), aantal: data.perRegel[i] })),
      onderdelen: [],
      opmerking: kpi.opmerking ?? null,
      uitkomst: berekenKpi(data.maanden, peildatum),
    };
  };

  const totaalVan = (sleutel: string, naam: string, delen: readonly SyntecKpi[]): SyntecKpiRegel => ({
    sleutel,
    naam,
    doel2026: delen.reduce((t, k) => t + k.doel2026, 0),
    bron: [],
    onderdelen: delen.map((k) => k.naam),
    opmerking: null,
    // Optellen vóór het rekenen of erna geeft hetzelfde (alles is lineair); zo staat er
    // gewoon één berekening, met dezelfde maandlijn als elke andere kaart.
    uitkomst: berekenKpi(telOp(delen.map((k) => perKpi.get(k.sleutel)!.maanden)), peildatum),
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
