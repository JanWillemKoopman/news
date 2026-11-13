/**
 * De Selligent-export als compacte tabel in het geheugen.
 *
 * ## Het probleem dat dit oplost
 *
 * Het dashboard moet op élke kolom kunnen filteren, en de uitkomst moet aanvoelen als
 * een dashboard en niet als een download. Die twee eisen botsen: het bestand is 36 MB en
 * duurt bijna acht seconden om op te halen, en naar de browser sturen kan niet — daar
 * zitten persoonsgegevens in, en 36 MB stuurt niemand naar een browser.
 *
 * Dus wordt er server-side gefilterd, en wordt het bestand één keer omgebouwd tot een
 * vorm waarin filteren niets meer kost. Elke kolom wordt **woordenboek-gecodeerd**: de
 * verschillende waarden komen één keer in een lijst (`waarden`), en per rij staat er
 * alleen de index in die lijst (`codes`, een `Int32Array`). Filteren is daarna geen
 * stringvergelijking over 169.000 rijen maar een opzoeking in een byte-array op code.
 *
 * Wat dat kost en oplevert, gemeten op het echte bestand:
 *
 * | | |
 * |---|---|
 * | Ombouwen | eenmalig ~2,5 s bovenop de download |
 * | Geheugen | ~55 MB voor de hele tabel |
 * | Filteren | enkele milliseconden over alle 26 kolommen |
 *
 * ## Wat per code is voorberekend, en waarom juist per code
 *
 * Een datumkolom krijgt `dagPerCode` en `maandPerCode`. Dat is bewust per **code** en
 * niet per rij: er zijn 8.848 verschillende creatiedatums tegen 169.290 rijen, dus per
 * code is het twintig keer kleiner én twintig keer minder parse-werk. Een datumfilter is
 * daarna een vergelijking van twee getallen, en de maandgrafiek hoeft geen datum meer te
 * lezen.
 *
 * ## De waarden blijven precies zoals ze in de CSV staan
 *
 * Er gaat geen enkele bewerking overheen: geen opschoning, geen vertaaltabel, en ook geen
 * spaties weghalen. `B` en `Benzine` blijven twee verschillende brandstoffen, `BWG` blijft
 * tussen de merken staan, en een waarde van één spatie is een waarde en niet "leeg" — hij
 * krijgt een eigen code naast de lege string. Dat is een bewuste eis: het dashboard moet
 * laten zien wat er in het bestand staat, niet wat ervan te maken valt.
 *
 * Eén uitzondering, en die is noodzakelijk: om te bepalen of een kolom een **datumkolom**
 * is, wordt de waarde voor de herkenning wél ontdaan van spaties. Anders is `" 3/02/2021"`
 * geen datum en krijgt die kolom geen van/tot-filter. De waarde zelf blijft onaangeroerd;
 * alleen de vraag "wat voor soort waarde is dit" wordt op de getrimde tekst beantwoord.
 *
 * ## Niets hiervan raakt schijf
 *
 * De tabel leeft in het geheugen van de serverless instance en verdwijnt met hem. Er
 * wordt niets opgeslagen, niet in Supabase en niet in een bestand; zie `bron.ts` voor hoe
 * hij wordt bewaard en wanneer hij vervalt.
 */

export type WaardeType = "leeg" | "getal" | "datum" | "booleaans" | "tekst";

export interface Kolom {
  naam: string;
  /** Het meestvoorkomende type van de gevulde waarden. */
  type: WaardeType;
  /**
   * De verschillende waarden, aflopend op hoe vaak ze voorkomen. Index 0 is altijd de
   * lege waarde, zodat "leeg" een code heeft als elke andere en nergens een
   * uitzondering nodig is.
   */
  waarden: string[];
  /** Hoe vaak elke waarde voorkomt, in dezelfde volgorde als `waarden`. */
  aantallen: Int32Array;
  /** Per rij de index in `waarden`. */
  codes: Int32Array;
  /** Hoeveel rijen een waarde hebben (alles behalve code 0). */
  gevuld: number;
  /** Per code het aantal dagen sinds 1970; −1 als die waarde geen datum is. Alleen bij een datumkolom. */
  dagPerCode: Int32Array | null;
  /** Per code `jaar * 12 + maand`; −1 als die waarde geen datum is. Alleen bij een datumkolom. */
  maandPerCode: Int32Array | null;
}

export interface Tabel {
  pad: string;
  bytes: number;
  gewijzigdOp: string | null;
  etag: string | null;
  rijen: number;
  /** Rijen met een ander aantal velden dan de koprij; die doen niet mee. */
  overgeslagenRijen: number;
  kolommen: Kolom[];
  /** Wanneer deze tabel is opgebouwd (ISO). */
  gebouwdOp: string;
  /** Hoe lang het ophalen duurde, in milliseconden. */
  ophalenMs: number;
  /** Hoe lang het ombouwen duurde, in milliseconden. */
  bouwenMs: number;
}

/**
 * Het datumformaat van de export: `3/02/2021 6:00:22` — dag eerst, met enkelcijferige
 * dagen en maanden, en soms zonder tijd.
 *
 * Bewust geen `new Date()`: die leest `3/02/2021` als 2 maart, want JavaScript gaat uit
 * van maand-eerst. Dat levert geen foutmelding op maar een stil verkeerde datum, en bij
 * elke dag boven de twaalf een `Invalid Date` — precies het soort fout dat pas opvalt als
 * er een grafiek op staat.
 */
export function leesDatum(waarde: string): Date | null {
  const m = waarde
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const [, dag, maand, jaar, uur, minuut, seconde] = m;
  const d = Number(dag);
  const mnd = Number(maand);
  if (d < 1 || d > 31 || mnd < 1 || mnd > 12) return null;
  const datum = new Date(
    Date.UTC(Number(jaar), mnd - 1, d, Number(uur ?? 0), Number(minuut ?? 0), Number(seconde ?? 0)),
  );
  // 31/02/2021 bestaat niet; Date.UTC rolt dat door naar maart. Terugcontroleren dus.
  if (datum.getUTCDate() !== d || datum.getUTCMonth() !== mnd - 1) return null;
  return datum;
}

export function typeVan(waarde: string): WaardeType {
  const schoon = waarde.trim();
  if (!schoon) return "leeg";
  if (schoon === "True" || schoon === "False" || schoon === "true" || schoon === "false") {
    return "booleaans";
  }
  if (leesDatum(schoon)) return "datum";
  // Een kenteken als "JV239Z" is geen getal, en "0" en "-2" wel. Niet op parseFloat
  // vertrouwen: die maakt van "9 appels" een 9.
  if (/^-?\d+(?:[.,]\d+)?$/.test(schoon)) return "getal";
  return "tekst";
}

/**
 * De CSV regel voor regel doorlopen, zonder de rijen te bewaren.
 *
 * `onRij` krijgt per rij een array met de velden. De parser kent gequote velden met
 * verdubbelde aanhalingstekens en regeleindes binnen een veld, want die zitten in de
 * export.
 */
export function doorloopCsv(
  tekst: string,
  scheiding: string,
  onRij: (velden: string[]) => void,
): void {
  let veld = "";
  let rij: string[] = [];
  let inQuote = false;

  for (let i = 0; i < tekst.length; i++) {
    const teken = tekst[i];
    if (inQuote) {
      if (teken === '"') {
        if (tekst[i + 1] === '"') {
          veld += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        veld += teken;
      }
      continue;
    }
    if (teken === '"') {
      inQuote = true;
    } else if (teken === scheiding) {
      rij.push(veld);
      veld = "";
    } else if (teken === "\n") {
      rij.push(veld);
      onRij(rij);
      rij = [];
      veld = "";
    } else if (teken !== "\r") {
      veld += teken;
    }
  }
  // Een laatste regel zonder regeleinde eronder hoort er net zo goed bij.
  if (veld !== "" || rij.length > 0) {
    rij.push(veld);
    onRij(rij);
  }
}

/**
 * Het scheidingsteken bepalen uit de koprij.
 *
 * De export is puntkomma-gescheiden, maar dat is een keuze van Selligent en niet van ons.
 * Een export die ooit op komma overgaat hoort geen tabblad met één kolom op te leveren.
 */
export function bepaalScheiding(eersteRegel: string): string {
  const kandidaten = [";", ",", "\t", "|"];
  let beste = ";";
  let meeste = 0;
  for (const k of kandidaten) {
    const aantal = eersteRegel.split(k).length - 1;
    if (aantal > meeste) {
      meeste = aantal;
      beste = k;
    }
  }
  return beste;
}

const MS_PER_DAG = 86_400_000;

/**
 * Kolommen die het dashboard niet toont, op verzoek.
 *
 * Geslacht hoort niet op dit tabblad thuis, en de kolom gaat ook uit de export zelf
 * verdwijnen. Tot die tijd wordt hij hier overgeslagen, en dat gebeurt met opzet in
 * `bouwTabel` en niet pas in de weergave: zo komt de kolom helemaal niet in het geheugen
 * en kan hij dus ook niet per ongeluk ergens opduiken — niet in een filter, niet in het
 * kolomoverzicht, niet in een antwoord van de API. Verdwijnt hij uit de export, dan
 * verandert er niets en mag deze regel weg.
 *
 * Vergelijking op de hele naam, ongeacht hoofdletters.
 */
export const VERBORGEN_KOLOMMEN = ["GENDER", "GESLACHT"];

export function isVerborgenKolom(naam: string): boolean {
  const klein = naam.trim().toLowerCase();
  return VERBORGEN_KOLOMMEN.some((verborgen) => verborgen.toLowerCase() === klein);
}

/** Wat we per kolom bijhouden tijdens het inlezen. */
interface Bouwer {
  naam: string;
  /** Waarde → code. Code 0 is de lege waarde en zit er vanaf het begin in. */
  index: Map<string, number>;
  waarden: string[];
  aantallen: number[];
  codes: number[];
  types: Map<WaardeType, number>;
}

/**
 * De tekst van de export ombouwen naar een `Tabel`.
 *
 * Schema-gestuurd: nergens staat een lijst met verwachte kolommen. De koprij bepaalt wat
 * er is. Dat is met opzet — mailadres en geslacht gaan uit de export, en een pagina die
 * daarop crasht of stilletjes nullen toont is erger dan een pagina die een filter minder
 * laat zien.
 */
export function bouwTabel(
  tekst: string,
  meta: { pad: string; bytes: number; gewijzigdOp: string | null; etag: string | null },
  ophalenMs = 0,
): Tabel {
  const begin = Date.now();
  const eersteRegeleinde = tekst.indexOf("\n");
  const scheiding = bepaalScheiding(
    eersteRegeleinde === -1 ? tekst : tekst.slice(0, eersteRegeleinde),
  );

  let kop: string[] | null = null;
  let overslaan: boolean[] = [];
  let bouwers: Bouwer[] = [];
  let rijen = 0;
  let overgeslagen = 0;

  doorloopCsv(tekst, scheiding, (velden) => {
    if (!kop) {
      // De kolomnaam wél trimmen: dat is een koprij en geen data, en een kop met een
      // spatie erachter zou een filterlabel met een spatie erachter opleveren.
      kop = velden.map((v) => v.trim());
      // `overslaan` werkt op positie, want de rijen eronder worden op positie gelezen.
      overslaan = kop.map(isVerborgenKolom);
      bouwers = kop
        .filter((_, i) => !overslaan[i])
        .map((naam) => ({
          naam,
          index: new Map([["", 0]]),
          waarden: [""],
          aantallen: [0],
          codes: [],
          types: new Map(),
        }));
      return;
    }
    // Een rij met een ander aantal velden is niet betrouwbaar uit te splitsen; het
    // analyse-notebook sloeg die ook over (`on_bad_lines='skip'`). We tellen ze wel, want
    // het hoort niet onzichtbaar te blijven als het er ineens duizenden zijn.
    if (velden.length !== kop.length) {
      if (velden.length === 1 && velden[0].trim() === "") return; // lege staartregel
      overgeslagen++;
      return;
    }
    rijen++;
    let b = 0;
    for (let k = 0; k < velden.length; k++) {
      if (overslaan[k]) continue;
      const bouwer = bouwers[b++];
      // Onbewerkt, precies zoals het in de CSV staat. Het type wordt wél op de getrimde
      // tekst bepaald, anders is " 3/02/2021" geen datum — zie de kop van dit bestand.
      const waarde = velden[k];
      const type = typeVan(waarde);
      bouwer.types.set(type, (bouwer.types.get(type) ?? 0) + 1);

      let code = bouwer.index.get(waarde);
      if (code === undefined) {
        code = bouwer.waarden.length;
        bouwer.index.set(waarde, code);
        bouwer.waarden.push(waarde);
        bouwer.aantallen.push(0);
      }
      bouwer.aantallen[code]++;
      bouwer.codes.push(code);
    }
  });

  const kolommen: Kolom[] = bouwers.map((b) => {
    // Het type van de kolom is het meestvoorkomende type van zijn gevúlde waarden: een
    // kolom die voor 60% leeg is en voor 40% een datum, is een datumkolom.
    let type: WaardeType = "leeg";
    let hoogste = 0;
    for (const [soort, aantal] of b.types) {
      if (soort === "leeg") continue;
      if (aantal > hoogste) {
        hoogste = aantal;
        type = soort;
      }
    }

    // De waarden aflopend op aantal, zodat de filterlijst met de gewone gevallen opent in
    // plaats van met een tikfout die één keer voorkomt. Code 0 (leeg) blijft code 0: de
    // codes in `codes` verwijzen ernaar, dus die mag niet verschuiven.
    const orde = b.waarden
      .map((_, i) => i)
      .slice(1)
      .sort((a, c) => b.aantallen[c] - b.aantallen[a]);
    const nieuweCode = new Int32Array(b.waarden.length);
    const waarden: string[] = [""];
    const aantallen: number[] = [b.aantallen[0]];
    for (const oud of orde) {
      nieuweCode[oud] = waarden.length;
      waarden.push(b.waarden[oud]);
      aantallen.push(b.aantallen[oud]);
    }
    const codes = new Int32Array(b.codes.length);
    for (let i = 0; i < b.codes.length; i++) codes[i] = nieuweCode[b.codes[i]];

    let dagPerCode: Int32Array | null = null;
    let maandPerCode: Int32Array | null = null;
    if (type === "datum") {
      dagPerCode = new Int32Array(waarden.length).fill(-1);
      maandPerCode = new Int32Array(waarden.length).fill(-1);
      for (let c = 1; c < waarden.length; c++) {
        const d = leesDatum(waarden[c]);
        if (!d) continue;
        dagPerCode[c] = Math.floor(d.getTime() / MS_PER_DAG);
        maandPerCode[c] = d.getUTCFullYear() * 12 + d.getUTCMonth();
      }
    }

    return {
      naam: b.naam,
      type,
      waarden,
      aantallen: Int32Array.from(aantallen),
      codes,
      gevuld: rijen - aantallen[0],
      dagPerCode,
      maandPerCode,
    };
  });

  return {
    pad: meta.pad,
    bytes: meta.bytes,
    gewijzigdOp: meta.gewijzigdOp,
    etag: meta.etag,
    rijen,
    overgeslagenRijen: overgeslagen,
    kolommen,
    gebouwdOp: new Date().toISOString(),
    ophalenMs,
    bouwenMs: Date.now() - begin,
  };
}

/** Een dag-nummer (sinds 1970) uit een `yyyy-mm-dd`-tekst; `null` als die niet klopt. */
export function dagNummer(isoDatum: string): number | null {
  const m = isoDatum.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const tijd = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(tijd)) return null;
  return Math.floor(tijd / MS_PER_DAG);
}

/** `jaar * 12 + maand` terug naar `yyyy-mm`. */
export function maandSleutel(maand: number): string {
  const jaar = Math.floor(maand / 12);
  const nr = (maand % 12) + 1;
  return `${jaar}-${String(nr).padStart(2, "0")}`;
}
