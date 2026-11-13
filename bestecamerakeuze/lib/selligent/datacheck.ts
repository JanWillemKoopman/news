/**
 * Van 36 MB Selligent-export naar een paar kilobyte datacheck.
 *
 * ## Wat dit is, en wat het niet is
 *
 * Dit is de tegenhanger van het notebook waarmee de export tot nu toe werd ingezien:
 * hoeveel rijen, welke kolommen, wat voor waarden, hoe vol, en hoe vers. Het is
 * uitdrukkelijk nog geen dashboard — eerst moet zichtbaar zijn wát er in het bestand zit
 * voordat er cijfers op gebouwd worden, want de export is rommeliger dan hij lijkt
 * (`FUEL_TYPE` bevat zowel `B` als `Benzine`, `BRAND` bevat ook codes als `AM_PKW`).
 *
 * ## Schema-gestuurd, met opzet
 *
 * Nergens staat een lijst met verwachte kolommen. De functie leest de koprij en
 * beschrijft wat ze daar vindt. Dat is geen luiheid maar een eis: de export verandert —
 * mailadres en geslacht gaan eruit omdat het persoonsgegevens zijn — en een tabblad dat
 * daarop crasht of stilletjes nullen toont is erger dan een tabblad dat gewoon een kolom
 * minder laat zien. Nieuwe kolommen verschijnen om dezelfde reden vanzelf.
 *
 * ## Waarom er geen enkele voorbeeldwaarde van een persoon in het antwoord staat
 *
 * Twee sloten, onafhankelijk van elkaar:
 *
 * 1. **Cardinaliteit.** Voorbeeldwaarden komen alleen mee bij een kolom met weinig
 *    verschillende waarden (`MAX_WAARDEN_IN_ANTWOORD`). Een kolom met 125.000
 *    verschillende waarden is per definitie een identificerend veld en levert dus alleen
 *    een aantal, nooit de waarden zelf.
 * 2. **Naam.** Kolommen die naar een persoon of voertuig verwijzen staan op
 *    `NOOIT_WAARDEN` en leveren nooit waarden, ook niet als er maar drie verschillende
 *    in staan.
 *
 * Het antwoord dat de browser bereikt bevat daarom aantallen en verdelingen van
 * categorieën, en geen rij die naar een persoon te herleiden is. Dat is wat het mogelijk
 * maakt dit tabblad voor alle collega's open te zetten.
 */

/** Boven dit aantal verschillende waarden tonen we alleen het aantal, niet de waarden. */
const MAX_WAARDEN_IN_ANTWOORD = 40;

/** Hoeveel verschillende waarden we per kolom bijhouden voordat we stoppen met tellen. */
const MAX_WAARDEN_IN_GEHEUGEN = 50_000;

/**
 * Kolomnamen die nooit voorbeeldwaarden opleveren, hoe weinig verschillende er ook in
 * staan. Gematcht op fragment, ongeacht hoofdletters — `VDUVEHICLES_LICENSE_PLATE` valt
 * onder `plate`, `MAIL` onder `mail`.
 */
const NOOIT_WAARDEN = [
  "mail",
  "email",
  "plate",
  "kenteken",
  "naam",
  "name",
  "gender",
  "geslacht",
  "telefoon",
  "phone",
  "mobiel",
  "adres",
  "address",
  "straat",
  "postcode",
  "woonplaats",
  "geboorte",
  "birth",
  "bsn",
  "iban",
];

export type WaardeType = "leeg" | "getal" | "datum" | "booleaans" | "tekst";

export interface KolomCheck {
  naam: string;
  /** Het type dat de meeste waarden in deze kolom hebben. */
  type: WaardeType;
  /** Hoeveel rijen een waarde hebben (niet leeg, niet alleen spaties). */
  gevuld: number;
  /** `gevuld` als deel van het totaal, 0–1. */
  vulgraad: number;
  /** Hoeveel verschillende waarden; `null` zodra de teller is afgekapt. */
  verschillend: number | null;
  /**
   * De meestvoorkomende waarden met hun aantal — alleen bij een kolom die weinig
   * verschillende waarden heeft én niet naar een persoon verwijst. Anders leeg.
   */
  waarden: { waarde: string; aantal: number }[];
  /** Waarom er geen waarden staan, zodat de UI het verschil kan uitleggen. */
  waardenVerborgen: null | "te-veel-verschillend" | "persoonsgegeven";
  /** Voor een datumkolom: de vroegste en laatste datum die erin voorkomt (ISO). */
  bereik: { van: string; tot: string } | null;
}

export interface Datacheck {
  /** Hoe vers het bestand op Azure is. */
  bestand: {
    pad: string;
    bytes: number;
    gewijzigdOp: string | null;
  };
  rijen: number;
  /** Rijen met een ander aantal velden dan de koprij — die slaan we over. */
  overgeslagenRijen: number;
  kolommen: KolomCheck[];
  /** Hoe lang het ophalen en doorrekenen duurde, in milliseconden. */
  duurMs: number;
  /** Wanneer deze doorrekening is gemaakt (ISO) — de UI toont dit bij een cache-treffer. */
  berekendOp: string;
}

/** Of een kolomnaam naar een persoon of voertuig verwijst. */
export function isPersoonsgegeven(naam: string): boolean {
  const klein = naam.toLowerCase();
  return NOOIT_WAARDEN.some((fragment) => klein.includes(fragment));
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
  const m = waarde.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
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

function typeVan(waarde: string): WaardeType {
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

/** Wat we per kolom bijhouden tijdens het doorlopen van de rijen. */
interface Teller {
  naam: string;
  gevuld: number;
  types: Map<WaardeType, number>;
  waarden: Map<string, number>;
  /** Afgekapt omdat er te veel verschillende waarden zijn om nog te tellen. */
  afgekapt: boolean;
  vroegste: Date | null;
  laatste: Date | null;
}

/**
 * De CSV regel voor regel doorlopen, zonder de rijen te bewaren.
 *
 * Dit is waarom het binnen een serverless functie past. De tekst van 36 MB staat één keer
 * in het geheugen; de rijen eroverheen niet. Een `parse()` die een array van 169.000
 * objecten teruggeeft kost een paar honderd megabyte en levert niets op wat deze
 * doorrekening nodig heeft.
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

export function berekenDatacheck(
  tekst: string,
  bestand: Datacheck["bestand"],
  duurOphalenMs = 0,
): Datacheck {
  const begin = Date.now();
  const eersteRegeleinde = tekst.indexOf("\n");
  const scheiding = bepaalScheiding(
    eersteRegeleinde === -1 ? tekst : tekst.slice(0, eersteRegeleinde),
  );

  let kop: string[] | null = null;
  let tellers: Teller[] = [];
  let rijen = 0;
  let overgeslagen = 0;

  doorloopCsv(tekst, scheiding, (velden) => {
    if (!kop) {
      kop = velden.map((v) => v.trim());
      tellers = kop.map((naam) => ({
        naam,
        gevuld: 0,
        types: new Map(),
        waarden: new Map(),
        afgekapt: false,
        vroegste: null,
        laatste: null,
      }));
      return;
    }
    // Een rij met een ander aantal velden is niet betrouwbaar uit te splitsen; het
    // notebook sloeg die ook over (`on_bad_lines='skip'`). We tellen ze wel, zodat het
    // niet onzichtbaar blijft als het er ineens duizenden zijn.
    if (velden.length !== kop.length) {
      // Een lege staartregel is geen fout.
      if (velden.length === 1 && velden[0].trim() === "") return;
      overgeslagen++;
      return;
    }
    rijen++;
    for (let k = 0; k < velden.length; k++) {
      const teller = tellers[k];
      const ruw = velden[k];
      const waarde = ruw.trim();
      const type = typeVan(ruw);
      teller.types.set(type, (teller.types.get(type) ?? 0) + 1);
      if (type === "leeg") continue;
      teller.gevuld++;

      if (!teller.afgekapt) {
        const al = teller.waarden.get(waarde);
        if (al !== undefined) {
          teller.waarden.set(waarde, al + 1);
        } else if (teller.waarden.size < MAX_WAARDEN_IN_GEHEUGEN) {
          teller.waarden.set(waarde, 1);
        } else {
          // Verder tellen zou het geheugen onbeperkt laten groeien voor een cijfer dat
          // toch niet in het antwoord komt (zie MAX_WAARDEN_IN_ANTWOORD).
          teller.afgekapt = true;
          teller.waarden.clear();
        }
      }

      if (type === "datum") {
        const d = leesDatum(waarde);
        if (d) {
          if (!teller.vroegste || d < teller.vroegste) teller.vroegste = d;
          if (!teller.laatste || d > teller.laatste) teller.laatste = d;
        }
      }
    }
  });

  const kolommen: KolomCheck[] = tellers.map((t) => {
    // Het type van de kolom is het meestvoorkomende type van zijn gevúlde waarden: een
    // kolom die voor 60% leeg is en voor 40% een datum, is een datumkolom.
    let type: WaardeType = "leeg";
    let hoogste = 0;
    for (const [soort, aantal] of t.types) {
      if (soort === "leeg") continue;
      if (aantal > hoogste) {
        hoogste = aantal;
        type = soort;
      }
    }

    const verschillend = t.afgekapt ? null : t.waarden.size;
    const persoonlijk = isPersoonsgegeven(t.naam);
    const teVeel = verschillend === null || verschillend > MAX_WAARDEN_IN_ANTWOORD;
    const mag = !persoonlijk && !teVeel;

    return {
      naam: t.naam,
      type,
      gevuld: t.gevuld,
      vulgraad: rijen > 0 ? t.gevuld / rijen : 0,
      verschillend,
      waarden: mag
        ? [...t.waarden]
            .sort((a, b) => b[1] - a[1])
            .map(([waarde, aantal]) => ({ waarde, aantal }))
        : [],
      // De naam weegt zwaarder dan de cardinaliteit: bij een kolom die beide is, hoort de
      // UI te zeggen dat het een persoonsgegeven is.
      waardenVerborgen: mag ? null : persoonlijk ? "persoonsgegeven" : "te-veel-verschillend",
      bereik:
        t.vroegste && t.laatste
          ? { van: t.vroegste.toISOString(), tot: t.laatste.toISOString() }
          : null,
    };
  });

  return {
    bestand,
    rijen,
    overgeslagenRijen: overgeslagen,
    kolommen,
    duurMs: duurOphalenMs + (Date.now() - begin),
    berekendOp: new Date().toISOString(),
  };
}
