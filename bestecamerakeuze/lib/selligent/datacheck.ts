/**
 * De datacheck: wat zit er in het bestand, per kolom.
 *
 * Dit stond er vóór het dashboard, en het staat er nog steeds — ingeklapt onder de
 * filters. Het is de tegenhanger van het notebook waarmee de export tot nu toe werd
 * ingezien, en het blijft nodig omdat de export rommeliger is dan hij lijkt: `OPTOUT` is
 * geen ja/nee maar een reeks codes, `FUEL_TYPE` bevat `B` naast `Benzine`, `BRAND` bevat
 * naast merken ook codes als `AM_PKW`, en `DATE_1A` loopt door tot 2106. Wie een cijfer
 * uit dit dashboard moet verdedigen, hoort dat hier te kunnen nazoeken.
 *
 * Het rekent niet zelf meer door het bestand: het beschrijft de `Tabel` die
 * `lib/selligent/tabel.ts` al heeft opgebouwd voor de filters. Eén doorloop, twee
 * weergaven — anders zouden de filterlijst en de kolomlijst van elkaar kunnen afwijken.
 *
 * ## Waarom hier een naamregel staat en in de filters niet
 *
 * In de filters volgt alles uit de data: een kolom met 125.000 verschillende waarden
 * krijgt een zoekveld in plaats van een keuzelijst, en daarmee gaat er nooit een lijst
 * mailadressen naar de browser. Deze pagina toont per kolom bewust de *meestvoorkomende
 * waarden*, en daar is cardinaliteit alleen niet genoeg: een kolom als `GENDER` heeft er
 * negen, en die hoort in een kolomoverzicht niet als voorbeeldrijtje te staan. Vandaar de
 * tweede regel, op naam.
 */

import type { Tabel, WaardeType } from "./tabel";

export type { WaardeType } from "./tabel";
export { bepaalScheiding, doorloopCsv, leesDatum, typeVan } from "./tabel";

/** Boven dit aantal verschillende waarden tonen we alleen het aantal, niet de waarden. */
const MAX_WAARDEN_IN_ANTWOORD = 40;

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

export interface KolomCheck {
  naam: string;
  type: WaardeType;
  /** Hoeveel rijen een waarde hebben (niet leeg, niet alleen spaties). */
  gevuld: number;
  /** `gevuld` als deel van het totaal, 0–1. */
  vulgraad: number;
  verschillend: number;
  /** De meestvoorkomende waarden met hun aantal; leeg als ze verborgen zijn. */
  waarden: { waarde: string; aantal: number }[];
  /** Waarom er geen waarden staan, zodat de UI het verschil kan uitleggen. */
  waardenVerborgen: null | "te-veel-verschillend" | "persoonsgegeven";
  /** Voor een datumkolom: de vroegste en laatste datum die erin voorkomt (ISO). */
  bereik: { van: string; tot: string } | null;
}

export interface Datacheck {
  bestand: { pad: string; bytes: number; gewijzigdOp: string | null };
  rijen: number;
  /** Rijen met een ander aantal velden dan de koprij — die slaan we over. */
  overgeslagenRijen: number;
  kolommen: KolomCheck[];
  /** Ophalen plus ombouwen, in milliseconden. */
  duurMs: number;
  /** Wanneer de tabel is opgebouwd (ISO). */
  berekendOp: string;
}

/** Of een kolomnaam naar een persoon of voertuig verwijst. */
export function isPersoonsgegeven(naam: string): boolean {
  const klein = naam.toLowerCase();
  return NOOIT_WAARDEN.some((fragment) => klein.includes(fragment));
}

export function datacheckVan(tabel: Tabel): Datacheck {
  const kolommen: KolomCheck[] = tabel.kolommen.map((kolom) => {
    const verschillend = kolom.waarden.length - 1;
    const persoonlijk = isPersoonsgegeven(kolom.naam);
    const teVeel = verschillend > MAX_WAARDEN_IN_ANTWOORD;
    const mag = !persoonlijk && !teVeel;

    let bereik: { van: string; tot: string } | null = null;
    if (kolom.dagPerCode) {
      let van = Infinity;
      let tot = -Infinity;
      for (let c = 1; c < kolom.dagPerCode.length; c++) {
        const dag = kolom.dagPerCode[c];
        if (dag < 0) continue;
        if (dag < van) van = dag;
        if (dag > tot) tot = dag;
      }
      if (van <= tot) {
        bereik = {
          van: new Date(van * 86_400_000).toISOString(),
          tot: new Date(tot * 86_400_000).toISOString(),
        };
      }
    }

    return {
      naam: kolom.naam,
      type: kolom.type,
      gevuld: kolom.gevuld,
      vulgraad: tabel.rijen > 0 ? kolom.gevuld / tabel.rijen : 0,
      verschillend,
      // `waarden` staat al aflopend op aantal (zie `bouwTabel`), dus hier niet opnieuw
      // sorteren — de volgorde van de filterlijst en die van dit overzicht horen gelijk
      // te zijn.
      waarden: mag
        ? kolom.waarden
            .slice(1)
            .map((waarde, i) => ({ waarde, aantal: kolom.aantallen[i + 1] }))
        : [],
      // De naam weegt zwaarder dan de cardinaliteit: bij een kolom die beide is, hoort de
      // UI te zeggen dat het een persoonsgegeven is.
      waardenVerborgen: mag ? null : persoonlijk ? "persoonsgegeven" : "te-veel-verschillend",
      bereik,
    };
  });

  return {
    bestand: { pad: tabel.pad, bytes: tabel.bytes, gewijzigdOp: tabel.gewijzigdOp },
    rijen: tabel.rijen,
    overgeslagenRijen: tabel.overgeslagenRijen,
    kolommen,
    duurMs: tabel.ophalenMs + tabel.bouwenMs,
    berekendOp: tabel.gebouwdOp,
  };
}
