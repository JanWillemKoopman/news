import {
  SYNTEC_GROEPEN,
  SYNTEC_COMBINATIES,
  SYNTEC_KPIS,
  SYNTEC_TOTAAL_KEUZES,
  type SyntecCombinatie,
  beschrijfRegel,
  classificeerLead,
  type SyntecGroep,
  type SyntecKpi,
} from "@/lib/kpi2027syntec/definities";
import { KPI_GROEI } from "@/lib/kpi2027/definities";
import {
  berekenKpi,
  maandInvoerUitMaanden,
  metGroei,
  type KpiUitkomst,
  type MaandSoort,
  type MaandUitkomst,
} from "@/lib/kpi2027/rekenen";

/** De voortgang staat bij KPI's 2027 (ook gebruikt door de overzichtstabel daar). */
export { voortgang } from "@/lib/kpi2027/rekenen";

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
  /** Bij een totaal of combinatie: de sleutels van die KPI's; leeg bij een gewone KPI. */
  onderdeelSleutels: string[];
  /**
   * True als het groeipercentage met de hand is aangepast. Alleen een gewone KPI heeft een
   * eigen percentage; bij een totaal volgt het uit zijn kaarten.
   */
  groeiAangepast: boolean;
  /** De beslissingen achter de definitie, in gewone taal. */
  keuzes: string[];
  /**
   * Wat deze definitie over heel 2025 telt — de controle op de definitie: de doelen voor
   * 2026 waren de telling van 2025 × 1,2. Null als 2025 niet is meegegeven.
   */
  vorigJaar: number | null;
  /**
   * De eerdere jaren (2024, 2025) per maand, met dezelfde definitie en zoals gemeten — voor
   * de extra lijnen in de grafiek. Ze tellen nergens mee: geen verwachting, geen target.
   */
  eerdereJaren: { jaar: number; maanden: number[]; totaal: number }[];
  uitkomst: KpiUitkomst;
  /** De realisatie van 2027: 0 met `peildatum: null` zolang 2027 niet begonnen is. */
  realisatie: { waarde: number; peildatum: string | null };
}

export interface SyntecGroepOverzicht {
  sleutel: SyntecGroep;
  naam: string;
  kpis: SyntecKpiRegel[];
  /** Extra kaarten die een paar KPI's samen tonen (`SYNTEC_COMBINATIES`); niet in het totaal. */
  combinaties: SyntecKpiRegel[];
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
    combinaties?: readonly SyntecCombinatie[];
    vorigJaar?: readonly SyntecTelling[] | null;
    /** Hele eerdere jaren voor de extra lijnen in de grafiek (2024, 2025). */
    eerdereJaren?: readonly { jaar: number; tellingen: readonly SyntecTelling[] }[];
    doeljaar?: { tellingen: readonly SyntecTelling[]; peildatum: string } | null;
    /** Met de hand aangepaste percentages per KPI-sleutel; de rest rekent met +5%. */
    groei?: ReadonlyMap<string, number>;
  } = {},
): SyntecOverzicht {
  const kpis = opties.kpis ?? SYNTEC_KPIS;
  const combinaties = opties.combinaties ?? SYNTEC_COMBINATIES;
  const totalenVorigJaar = opties.vorigJaar ? jaartotalen(opties.vorigJaar, kpis) : null;
  const somVorigJaar = (delen: readonly SyntecKpi[]) =>
    totalenVorigJaar ? delen.reduce((t, k) => t + (totalenVorigJaar.get(k.sleutel) ?? 0), 0) : null;
  // Per eerder jaar en per KPI de twaalf maanden — gewoon geteld, zonder meetVanaf: die
  // geldt alleen voor de verwachting van 2026.
  const eerdereJaren = [...(opties.eerdereJaren ?? [])]
    .sort((a, b) => a.jaar - b.jaar)
    .map(({ jaar, tellingen }) => {
      const perKpiMaand = new Map<string, number[]>(kpis.map((k) => [k.sleutel, nulreeks()]));
      for (const t of tellingen) {
        const aantal = Number(t.aantal) || 0;
        if (t.maand < 1 || t.maand > 12 || aantal <= 0) continue;
        const treffer = classificeerLead(t.kanaal, t.onderwerp, kpis);
        if (treffer) perKpiMaand.get(treffer.kpi.sleutel)![t.maand - 1] += aantal;
      }
      return { jaar, perKpiMaand };
    });
  const eerdereJarenVan = (delen: readonly SyntecKpi[]) =>
    eerdereJaren.map(({ jaar, perKpiMaand }) => {
      const maanden = nulreeks();
      for (const k of delen) perKpiMaand.get(k.sleutel)!.forEach((n, i) => (maanden[i] += n));
      return { jaar, maanden, totaal: maanden.reduce((t, n) => t + n, 0) };
    });

  const doeljaar = opties.doeljaar ?? null;
  const totalenDoeljaar = doeljaar ? jaartotalen(doeljaar.tellingen, kpis) : null;
  const realisatieVan = (delen: readonly SyntecKpi[]) =>
    doeljaar && totalenDoeljaar
      ? { waarde: delen.reduce((t, k) => t + (totalenDoeljaar.get(k.sleutel) ?? 0), 0), peildatum: doeljaar.peildatum }
      : { waarde: 0, peildatum: null };

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
    // "Wat telt mee" toont alleen wat in de verwachting meetelt: niet de maanden vóór meetVanaf.
    if (t.maand >= eersteMaand(treffer.kpi)) doel.perRegel[treffer.regel] += aantal;
  }

  const uitkomsten = new Map<string, KpiUitkomst>(
    kpis.map((k) => [k.sleutel, uitkomstVoorKpi(k, perKpi.get(k.sleutel)!.maanden, peildatum, opties.groei?.get(k.sleutel))]),
  );

  const regelVoor = (kpi: SyntecKpi): SyntecKpiRegel => {
    const data = perKpi.get(kpi.sleutel)!;
    return {
      sleutel: kpi.sleutel,
      naam: kpi.naam,
      doel2026: kpi.doel2026,
      bron: kpi.regels.map((r, i) => ({ tekst: beschrijfRegel(r), periode: r.periode ?? null, aantal: data.perRegel[i] })),
      onderdelen: [],
      onderdeelSleutels: [],
      groeiAangepast: opties.groei?.has(kpi.sleutel) ?? false,
      keuzes: [...kpi.keuzes],
      vorigJaar: somVorigJaar([kpi]),
      eerdereJaren: eerdereJarenVan([kpi]),
      uitkomst: uitkomsten.get(kpi.sleutel)!,
      realisatie: realisatieVan([kpi]),
    };
  };

  const totaalVan = (sleutel: string, naam: string, delen: readonly SyntecKpi[]): SyntecKpiRegel => {
    const vanafApril = delen.filter((k) => k.meetVanaf);
    return {
      sleutel,
      naam,
      doel2026: delen.reduce((t, k) => t + k.doel2026, 0),
      bron: [],
      onderdelen: delen.map((k) => k.naam),
      onderdeelSleutels: delen.map((k) => k.sleutel),
      groeiAangepast: false,
      keuzes: [
        ...SYNTEC_TOTAAL_KEUZES,
        ...(vanafApril.length > 0
          ? [
              `${vanafApril.map((k) => k.naam).join(" en ")} ${vanafApril.length > 1 ? "rekenen" : "rekent"} vanaf ${datumTekst(vanafApril[0].meetVanaf!)}: ${vanafApril.length > 1 ? "hun" : "zijn"} maanden daarvóór zijn bijgeschat. Daarom staan die maanden in dit totaal gestippeld.`,
            ]
          : []),
      ],
      vorigJaar: somVorigJaar(delen),
      eerdereJaren: eerdereJarenVan(delen),
      uitkomst: somVanUitkomsten(delen.map((k) => ({ naam: k.naam, uitkomst: uitkomsten.get(k.sleutel)! }))),
      realisatie: realisatieVan(delen),
    };
  };

  const combinatieVan = (c: SyntecCombinatie): SyntecKpiRegel => {
    const delen = c.onderdelen.map((s) => {
      const kpi = kpis.find((k) => k.sleutel === s);
      if (!kpi) throw new Error(`Combinatie ${c.sleutel} verwijst naar onbekende KPI ${s}.`);
      return kpi;
    });
    const som = totaalVan(c.sleutel, c.naam, delen);
    return { ...som, keuzes: [...c.keuzes] };
  };

  const groepen = SYNTEC_GROEPEN.map((g) => {
    const delen = kpis.filter((k) => k.groep === g.sleutel);
    return {
      sleutel: g.sleutel,
      naam: g.naam,
      kpis: delen.map(regelVoor),
      combinaties: combinaties.filter((c) => c.groep === g.sleutel).map(combinatieVan),
      totaal: totaalVan(`totaal-${g.sleutel}`, g.totaalNaam, delen),
    };
  }).filter((g) => g.kpis.length > 0);

  return {
    groepen,
    totaal: totaalVan("totaal", "Totaal", kpis),
    nietIngedeeld,
  };
}

/** De eerste maand (1–12) die in de verwachting meetelt. */
function eersteMaand(kpi: SyntecKpi): number {
  return kpi.meetVanaf ? Number(kpi.meetVanaf.slice(5, 7)) : 1;
}

function datumTekst(datum: string): string {
  return new Date(`${datum}T00:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Eén KPI uitrekenen. Syntec telt elke dag, dus de gemeten dagen zijn alle dagen t/m de
 * peildatum — behalve bij een KPI met `meetVanaf`: dan tellen pas de dagen vanaf die datum,
 * en vult `berekenKpi` de maanden ervóór met het gemiddelde (soort "bijgeschat").
 */
export function uitkomstVoorKpi(
  kpi: SyntecKpi,
  maanden: readonly number[],
  peildatum: string,
  groei?: number,
): KpiUitkomst {
  // De dagen vóór meetVanaf gaan als "niet gemeten" (uitval) mee: 1 januari t/m de dag ervoor.
  const uitval = kpi.meetVanaf
    ? [{ van: `${kpi.meetVanaf.slice(0, 4)}-01-01`, tot: dagErvoor(kpi.meetVanaf) }]
    : [];
  return berekenKpi(maandInvoerUitMaanden(maanden, peildatum, uitval), peildatum, { groei });
}

function dagErvoor(datum: string): string {
  return new Date(Date.parse(`${datum}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}

/**
 * Een totaal als optelsom van de uitkomsten van zijn KPI's — niet opnieuw uitgerekend uit
 * de opgetelde maanden. Dat zou hetzelfde zijn zolang elke KPI over dezelfde dagen rekent,
 * maar inruilvoorstel en contact rekenen vanaf april: een totaal hoort dan precies de som
 * te zijn van de kaarten erboven, target voor target.
 *
 * Een maand is in het totaal pas "gemeten" als hij dat bij elke KPI is. Is hij bij een
 * deel bijgeschat, dan zegt de tooltip welk deel gemeten is en wat er is bijgeschat.
 */
export function somVanUitkomsten(delen: readonly { naam: string; uitkomst: KpiUitkomst }[]): KpiUitkomst {
  const eerste = delen[0].uitkomst;
  const som = (f: (u: KpiUitkomst) => number) => delen.reduce((t, d) => t + f(d.uitkomst), 0);

  const maanden: MaandUitkomst[] = eerste.maanden.map((m0, i) => {
    const per = delen.map((d) => ({ naam: d.naam, m: d.uitkomst.maanden[i] }));
    const soorten = per.map((p) => p.m.soort);
    const soort: MaandSoort = soorten.includes("verwachting")
      ? "verwachting"
      : soorten.includes("deels")
        ? "deels"
        : soorten.includes("bijgeschat")
          ? "bijgeschat"
          : "gerealiseerd";
    const gemeten = per.reduce((t, p) => t + (p.m.gerealiseerd ?? 0), 0);
    const bijgeschatteDelen = per.filter((p) => p.m.soort === "bijgeschat").map((p) => p.naam);
    return {
      maand: m0.maand,
      soort,
      gerealiseerd: per.some((p) => p.m.gerealiseerd !== null) ? gemeten : null,
      verwacht: per.reduce((t, p) => t + p.m.verwacht, 0),
      dagenGemeten: Math.min(...per.map((p) => p.m.dagenGemeten)),
      dagenInMaand: m0.dagenInMaand,
      ...(soort === "bijgeschat"
        ? {
            toelichting: `waarvan ${Math.round(gemeten).toLocaleString("nl-NL")} gemeten; ${bijgeschatteDelen.join(" en ")} ${bijgeschatteDelen.length > 1 ? "zijn" : "is"} voor deze maand bijgeschat met het gemiddelde vanaf april`,
          }
        : {}),
    };
  });

  const verwacht = som((u) => u.verwacht);
  const target = som((u) => u.target);
  return {
    peildatum: eerste.peildatum,
    gerealiseerd: som((u) => u.gerealiseerd),
    perDag: som((u) => u.perDag),
    dagenGemeten: Math.max(...delen.map((d) => d.uitkomst.dagenGemeten)),
    dagenNietGemeten: 0,
    dagenBijgeschat: Math.max(...delen.map((d) => d.uitkomst.dagenBijgeschat)),
    bijgeschat: som((u) => u.bijgeschat),
    verwacht,
    // Met verschillende percentages per KPI is de groei van een totaal het gewogen
    // gemiddelde: wat het opgetelde target boven de opgetelde verwachting ligt.
    groei: verwacht > 0 ? target / verwacht - 1 : eerste.groei,
    target,
    targetPerMaand: som((u) => u.targetPerMaand),
    maanden,
    definitief: delen.every((d) => d.uitkomst.definitief),
  };
}

/**
 * Het overzicht met een ander percentage voor één KPI (null = terug naar de standaard),
 * zonder de leads opnieuw te tellen: de KPI krijgt het nieuwe target (`metGroei`) en elk
 * totaal en elke combinatie waar hij in zit wordt opnieuw opgeteld. Voor de browser, direct
 * na het typen; de server rekent bij het volgende verzoek hetzelfde uit (`syntecOverzicht`
 * met `groei`).
 */
export function pasSyntecGroeiToe(overzicht: SyntecOverzicht, sleutel: string, groei: number | null): SyntecOverzicht {
  const kpis = new Map<string, SyntecKpiRegel>();
  const groepen = overzicht.groepen.map((g) => ({
    ...g,
    kpis: g.kpis.map((k) => {
      const nieuw =
        k.sleutel === sleutel
          ? { ...k, uitkomst: metGroei(k.uitkomst, groei ?? KPI_GROEI), groeiAangepast: groei !== null }
          : k;
      kpis.set(nieuw.sleutel, nieuw);
      return nieuw;
    }),
  }));
  const optellen = (r: SyntecKpiRegel): SyntecKpiRegel =>
    r.onderdeelSleutels.includes(sleutel)
      ? {
          ...r,
          uitkomst: somVanUitkomsten(
            r.onderdeelSleutels.map((s) => {
              const kpi = kpis.get(s)!;
              return { naam: kpi.naam, uitkomst: kpi.uitkomst };
            }),
          ),
        }
      : r;
  return {
    ...overzicht,
    groepen: groepen.map((g) => ({ ...g, combinaties: g.combinaties.map(optellen), totaal: optellen(g.totaal) })),
    totaal: optellen(overzicht.totaal),
  };
}
