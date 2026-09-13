/**
 * Grafiekthema voor de chatantwoorden en de kostengrafiek.
 *
 * De huisstijlkleuren zijn ontworpen voor tekst en vlakken, niet voor datavisualisatie.
 * Het merkblauw #003da5 is te donker voor een grafiekmark (het valt buiten de
 * lichtheidsband waarin marks naast elkaar leesbaar blijven), en het zand #e2ddd1 heeft
 * te weinig contrast met het witte vlak. De reeks per theme is daarom afgeleid van de
 * huisstijl maar doorgerekend op leesbaarheid: lichtheidsband, chroma-ondergrens,
 * onderscheid bij kleurenblindheid (protan/deutan/tritan) en contrast met de
 * achtergrond van dat theme (bij Audi en CUPRA dus een donkere achtergrond).
 *
 * Alle zes de controles zijn gehaald voor het standaardtheme; de zwaarste combinatie is
 * teal↔oranje met een ΔE van 9,4 bij protanopie — ruim boven de ondergrens van 8.
 *
 * Belangrijk bij gebruik: een staafdiagram van categorieën is ÉÉN serie en krijgt dus
 * één kleur voor alle staven. De categoriereeks is uitsluitend voor échte identiteit —
 * donutsegmenten en meerdere lijnen — en wordt op volgorde toegekend, nooit herhaald.
 *
 * De kleuren zelf staan per theme in `lib/themes.ts`: Recharts zet ze als
 * SVG-attribuut (`fill`, `stroke`) en die lezen geen CSS-variabelen, dus ze kunnen niet
 * uit de tokens in globals.css komen. Componenten halen ze op met `useGrafiekKleuren()`
 * uit `components/ThemeProvider`.
 */

/** Astekst; de grootte is voor elk theme gelijk, alleen de kleur volgt het theme. */
export const AS_GROOTTE = 12;

/**
 * De eenheden die `formatteer` kent.
 *
 * Drie smaken euro, omdat één regel niet voor alle bedragen werkt. `euro` rondt af op
 * hele euro's behalve als het bedrag zelf klein is — prima voor een los bedrag in een
 * chatantwoord of op het kostentabblad. In een **kolom** valt die regel juist uit elkaar:
 * dan staat "€ 9,80" naast "€ 10" en zijn ze niet meer te vergelijken. Vandaar `euro-heel`
 * (altijd hele euro's, voor bedragen) en `euro-exact` (altijd twee decimalen, voor kosten
 * per klik of per lead — daar ís vijf cent het verschil).
 */
export type Eenheid =
  | "geen"
  | "euro"
  | "euro-heel"
  | "euro-exact"
  | "aantal"
  | "procent"
  | "seconden";

/**
 * Getalweergave in Nederlandse notatie. `compact` is voor astikken, waar 128400 als
 * "128k" moet passen; de volledige waarde staat altijd in de tooltip en de tabel.
 */
export function formatteer(
  waarde: number | null | undefined,
  eenheid: Eenheid,
  compact = false,
): string {
  if (waarde === null || waarde === undefined || Number.isNaN(waarde)) return "—";

  if (eenheid === "procent") {
    // Altijd één decimaal, ook bij een rond getal: zonder dat staat "3%" naast "2,8%" in
    // dezelfde kolom en lijnen de cijfers niet meer uit.
    return `${waarde.toLocaleString("nl-NL", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}%`;
  }

  if (eenheid === "seconden") {
    // De eenheid stond wel in het model maar werd nergens getoond: gemiddelde kijktijd
    // was een kaal getal waarvan je moest raden of het seconden of minuten waren.
    if (Math.abs(waarde) < 60) {
      return `${waarde.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} s`;
    }
    const minuten = Math.floor(Math.abs(waarde) / 60);
    const seconden = Math.round(Math.abs(waarde) % 60);
    const teken = waarde < 0 ? "−" : "";
    return `${teken}${minuten} m ${String(seconden).padStart(2, "0")} s`;
  }

  const euroachtig = eenheid === "euro" || eenheid === "euro-heel" || eenheid === "euro-exact";

  if (compact && Math.abs(waarde) >= 1000) {
    const kort =
      Math.abs(waarde) >= 1_000_000
        ? `${(waarde / 1_000_000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })}mln`
        : `${(waarde / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })}k`;
    return euroachtig ? `€ ${kort}` : kort;
  }

  // Bedragen afronden op hele euro's — behalve als het bedrag zelf klein is. Kosten per
  // klik van vijf cent werd zo "€ 0", en dan lijkt adverteren gratis terwijl het cijfer
  // juist het meest bekeken getal op de advertentiepagina is. Onder de tien euro dus twee
  // decimalen; daarboven zijn centen alleen maar ruis. In een kolom is die wisseling
  // juist het probleem — daar gebruik je `euro-heel` of `euro-exact`.
  const decimalen =
    eenheid === "euro-exact"
      ? 2
      : eenheid === "euro-heel"
        ? 0
        : eenheid === "euro"
          ? Math.abs(waarde) < 10 && waarde !== 0
            ? 2
            : 0
          : 2;
  const getal = waarde.toLocaleString("nl-NL", {
    minimumFractionDigits: euroachtig && decimalen === 2 ? 2 : 0,
    maximumFractionDigits: decimalen,
  });
  return euroachtig ? `€ ${getal}` : getal;
}

/** Zet een databasewaarde om naar een getal; geeft null als het er geen is. */
export function alsGetal(waarde: unknown): number | null {
  if (typeof waarde === "number") return Number.isFinite(waarde) ? waarde : null;
  if (typeof waarde === "string") {
    const n = Number(waarde);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Leesbaar label van een willekeurige databasewaarde. */
export function alsLabel(waarde: unknown): string {
  if (waarde === null || waarde === undefined) return "onbekend";
  if (waarde instanceof Date) return waarde.toLocaleDateString("nl-NL");
  return String(waarde);
}
