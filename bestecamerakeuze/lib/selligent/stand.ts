/**
 * De filters, de metric en de maandgrafiek van het tabblad Selligent.
 *
 * ## Eén filter per kolom, en drie soorten
 *
 * Er is gevraagd om een filter op élke kolom, met de kolommen precies zoals ze zijn. Dat
 * kan niet met één soort control: een kolom met tien merken en een kolom met 125.000
 * mailadressen vragen iets anders van een gebruiker. De soort volgt daarom uit de data en
 * is nergens met de hand ingevuld:
 *
 * | Soort | Wanneer | Wat je doet |
 * |---|---|---|
 * | `lijst` | tot {@link MAX_OPTIES} verschillende waarden | aanvinken wat je wil zien |
 * | `datum` | de kolom bevat datums | van/tot invullen |
 * | `tekst` | meer verschillende waarden dan dat | zoeken op een stuk van de waarde |
 *
 * Een kolom met 125.000 verschillende waarden krijgt dus een zoekveld, geen keuzelijst.
 * Dat is zowel de enige bruikbare control als de reden dat er nooit een lijst
 * mailadressen of kentekens naar de browser gaat: de optielijsten die wél meegaan zijn
 * per definitie categorieën en geen personen. Dat is geen aparte beveiliging die iemand
 * kan vergeten aan te zetten, maar een gevolg van de vorm.
 *
 * ## Waarom het filteren op codes gebeurt en niet op tekst
 *
 * Elke filter wordt eerst omgezet naar een `Uint8Array` over de **codes** van zijn kolom:
 * "mag deze waarde door, ja of nee". Een kolom heeft duizenden codes en honderdduizenden
 * rijen, dus die vertaling gebeurt één keer op het kleine aantal en daarna is de toets
 * per rij één array-opzoeking. Dat is wat het filteren binnen milliseconden houdt in
 * plaats van zes keer een string vergelijken over 169.000 rijen.
 *
 * ## Contacten, en waarom dat niet het aantal rijen is
 *
 * Een rij in de export is een klant mét een voertuig: 169.290 rijen tegen 137.424
 * verschillende `ID`'s. Wie drie auto's heeft staat er drie keer in. "Contacten" telt
 * daarom het aantal verschillende id's binnen de selectie, nooit het aantal rijen. Dat
 * geldt ook in de grafiek: een contact met drie auto's hoort één keer in de maand te
 * staan waarin zijn account is aangemaakt.
 */

import { dagNummer, maandSleutel, type Kolom, type Tabel, type WaardeType } from "./tabel";

/** Tot hoeveel verschillende waarden een kolom een aanvinklijst krijgt in plaats van een zoekveld. */
export const MAX_OPTIES = 1000;

/** Boven dit aantal opties zet de lijst een zoekveld boven de opties (`FilterSelect`'s `zoekbaar`). */
export const ZOEKBAAR_VANAF = 12;

/**
 * Welke kolom "contacten" telt, in volgorde van voorkeur.
 *
 * `ID` is de sleutel van de contactentabel van Selligent en is in elke rij gevuld;
 * `CUSTOMER_ID` komt uit het dealersysteem en mist in 4% van de rijen. Staat de eerste
 * er niet, dan pakt de pagina de volgende — en ze zegt in beeld welke ze telde, want het
 * zijn verschillende aantallen.
 */
export const CONTACT_KOLOMMEN = ["ID", "CUSTOMER_ID"];

/** Welke datumkolom de contactengrafiek tekent, in volgorde van voorkeur. */
export const CREATIE_KOLOMMEN = ["CREATED_DT"];

/**
 * Welke kolom "auto's" telt, in volgorde van voorkeur.
 *
 * `VDUVEHICLES_VEHICLE_ID` is de sleutel van het voertuig; het kenteken is de terugval
 * omdat een auto in de loop van zijn leven een nieuw kenteken kan krijgen en dan twee
 * keer zou tellen. De aantallen liggen in de praktijk dicht bij elkaar (108.470 tegen
 * 108.480), en de pagina zegt in beeld welke kolom ze telde.
 */
export const AUTO_KOLOMMEN = ["VDUVEHICLES_VEHICLE_ID", "VDUVEHICLES_LICENSE_PLATE"];

/**
 * Welke datumkolom de autografiek tekent.
 *
 * De afleverdatum en niet de creatiedatum van het account: een auto hoort thuis in de
 * maand waarin hij is afgeleverd, niet in de maand waarin zijn eigenaar ooit een account
 * kreeg. Wil je hem op een andere datumkolom, dan is dit de regel die je verzet.
 */
export const LEVER_KOLOMMEN = ["VDUVEHICLES_DELIVERY_DT"];

/**
 * Welke waarde als "aangevinkt" geldt bij een opt-in.
 *
 * De export schrijft `True`/`False`; de vergelijking is hoofdletterongevoelig en negeert
 * spaties aan de rand, zodat een rij met `"true "` niet stilletjes buiten de telling
 * valt. De waarde zelf blijft onbewerkt — zie `lib/selligent/tabel.ts`.
 */
function isWaar(waarde: string): boolean {
  return waarde.trim().toLowerCase() === "true";
}

export type FilterSoort = "lijst" | "tekst" | "datum";

export interface Veld {
  naam: string;
  type: WaardeType;
  soort: FilterSoort;
  /** Bij `lijst`: de aanvinkbare waarden, aflopend op hoe vaak ze voorkomen. */
  opties?: string[];
  /** Bij `lijst`: of de control een zoekveld boven de opties zet. */
  zoekbaar?: boolean;
  /** Bij `tekst`: hoeveel verschillende waarden erin staan — uitleg waarom het geen lijst is. */
  verschillend?: number;
  /** Bij `datum`: de vroegste en laatste datum in de kolom, als `yyyy-mm-dd`. */
  bereik?: { van: string; tot: string };
  /** Hoeveel rijen een waarde hebben, zodat de UI kan zeggen hoe vol een kolom is. */
  gevuld: number;
}

export interface Filter {
  kolom: string;
  /** Bij `lijst`: de aangevinkte waarden. Leeg of afwezig betekent "alles". */
  waarden?: string[];
  /** Bij `tekst`: een stuk van de waarde, hoofdletterongevoelig. */
  bevat?: string;
  /** Bij `datum`: `yyyy-mm-dd`, allebei optioneel. */
  van?: string;
  tot?: string;
}

export interface MaandPunt {
  /** `yyyy-mm`. */
  maand: string;
  /** Het aantal — contacten in de ene grafiek, auto's in de andere. */
  aantal: number;
}

/** Eén opt-in-tegel: hoeveel contacten er in deze kolom op `True` staan. */
export interface Optin {
  /** De kolomnaam, onbewerkt — dezelfde naam als in de filterbalk en het kolomoverzicht. */
  kolom: string;
  contacten: number;
  /** Hoeveel contacten in deze selectie een waarde in deze kolom hebben (True of False). */
  ingevuld: number;
}

export interface Stand {
  /** Het aantal verschillende id's binnen de selectie. */
  contacten: number;
  /** Welke kolom daarvoor geteld is, zodat het cijfer navraagbaar is. */
  contactKolom: string | null;
  /** Het totaal zonder enig filter, zodat de UI "van" kan zeggen. */
  contactenTotaal: number;
  /** Het aantal verschillende voertuigen binnen de selectie. */
  autos: number;
  autoKolom: string | null;
  autosTotaal: number;
  /** Hoeveel rijen aan de selectie voldoen; context bij de metrics, geen derde metric. */
  rijen: number;
  /** Per booleaanse kolom het aantal contacten dat erop `True` staat, in de volgorde van het bestand. */
  optins: Optin[];
  /** De maandreeks contacten op creatiedatum, oplopend; lege maanden zitten erin met 0. */
  maanden: MaandPunt[];
  creatieKolom: string | null;
  /** Contacten binnen de selectie zonder leesbare creatiedatum — die staan in geen enkele maand. */
  zonderCreatiedatum: number;
  /** De maandreeks auto's op afleverdatum. */
  autoMaanden: MaandPunt[];
  leverKolom: string | null;
  /** Auto's binnen de selectie zonder leesbare afleverdatum. */
  autosZonderDatum: number;
  /** Hoe lang het filteren en tellen duurde, in milliseconden. */
  duurMs: number;
}

function soortVan(kolom: Kolom): FilterSoort {
  if (kolom.type === "datum") return "datum";
  // `waarden` bevat de lege waarde op index 0; die telt niet als optie.
  return kolom.waarden.length - 1 <= MAX_OPTIES ? "lijst" : "tekst";
}

/** De filtercontrols die bij deze tabel horen — één per kolom, in de volgorde van het bestand. */
export function veldenVan(tabel: Tabel): Veld[] {
  return tabel.kolommen.map((kolom) => {
    const soort = soortVan(kolom);
    const veld: Veld = { naam: kolom.naam, type: kolom.type, soort, gevuld: kolom.gevuld };

    if (soort === "lijst") {
      // De lege waarde als expliciete optie: "nog niets ingevuld" is een antwoord waar je
      // op wil kunnen filteren, en bij deze export vaak de grootste groep.
      const opties = kolom.waarden.slice(1);
      if (kolom.aantallen[0] > 0) opties.push(LEEG_OPTIE);
      veld.opties = opties;
      veld.zoekbaar = opties.length > ZOEKBAAR_VANAF;
    } else if (soort === "tekst") {
      veld.verschillend = kolom.waarden.length - 1;
    } else if (kolom.dagPerCode) {
      let van = Infinity;
      let tot = -Infinity;
      for (let c = 1; c < kolom.dagPerCode.length; c++) {
        const dag = kolom.dagPerCode[c];
        if (dag < 0) continue;
        if (dag < van) van = dag;
        if (dag > tot) tot = dag;
      }
      if (van <= tot) {
        veld.bereik = { van: isoVanDag(van), tot: isoVanDag(tot) };
      }
    }
    return veld;
  });
}

/**
 * De waarde waarmee je op "leeg" filtert.
 *
 * Een lege string zou in een keuzelijst een onzichtbare optie zijn en in een URL
 * verdwijnen. Dit is daarom een afspraak tussen server en UI, en geen waarde die in het
 * bestand voorkomt.
 */
export const LEEG_OPTIE = "(leeg)";

function isoVanDag(dag: number): string {
  return new Date(dag * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Eén filter omzetten naar "welke codes van deze kolom mogen door".
 *
 * `null` betekent dat het filter niets uitsluit en dus overgeslagen mag worden — dat is
 * niet alleen sneller, het voorkomt ook dat een leeg filter per ongeluk alles wegfiltert.
 */
function codesDoor(kolom: Kolom, filter: Filter): Uint8Array | null {
  const door = new Uint8Array(kolom.waarden.length);

  if (kolom.type === "datum" && (filter.van || filter.tot)) {
    const vanaf = filter.van ? dagNummer(filter.van) : null;
    const tot = filter.tot ? dagNummer(filter.tot) : null;
    if (vanaf === null && tot === null) return null;
    const dagen = kolom.dagPerCode;
    if (!dagen) return null;
    for (let c = 1; c < kolom.waarden.length; c++) {
      const dag = dagen[c];
      // Een waarde zonder leesbare datum valt buiten elk datumbereik; hem laten
      // doorglippen zou een "van 2020" stilletjes rijen uit 1900 laten bevatten.
      if (dag < 0) continue;
      if (vanaf !== null && dag < vanaf) continue;
      if (tot !== null && dag > tot) continue;
      door[c] = 1;
    }
    return door;
  }

  if (filter.waarden && filter.waarden.length > 0) {
    const gekozen = new Set(filter.waarden);
    if (gekozen.has(LEEG_OPTIE)) door[0] = 1;
    for (let c = 1; c < kolom.waarden.length; c++) {
      if (gekozen.has(kolom.waarden[c])) door[c] = 1;
    }
    return door;
  }

  const term = filter.bevat?.trim().toLowerCase();
  if (term) {
    for (let c = 1; c < kolom.waarden.length; c++) {
      if (kolom.waarden[c].toLowerCase().includes(term)) door[c] = 1;
    }
    return door;
  }

  return null;
}

/**
 * Welke rijen aan alle filters voldoen.
 *
 * Teruggegeven als `Uint8Array` van één byte per rij, en niet als lijst met indexen: de
 * selectie is vaak groot (zonder filter alle 169.290 rijen), en een byte-array is dan
 * zowel kleiner als sneller te doorlopen dan een array met getallen.
 */
export function selectie(tabel: Tabel, filters: Filter[]): { masker: Uint8Array; rijen: number } {
  const masker = new Uint8Array(tabel.rijen).fill(1);
  let rijen = tabel.rijen;

  for (const filter of filters) {
    const kolom = tabel.kolommen.find((k) => k.naam === filter.kolom);
    // Een filter op een kolom die niet meer in de export zit, wordt genegeerd in plaats
    // van alles weg te filteren: de kolommen veranderen, en een bewaarde selectie uit de
    // URL mag daar geen leeg scherm van maken.
    if (!kolom) continue;
    const door = codesDoor(kolom, filter);
    if (!door) continue;

    const codes = kolom.codes;
    for (let i = 0; i < masker.length; i++) {
      if (masker[i] === 0) continue;
      if (door[codes[i]] === 0) {
        masker[i] = 0;
        rijen--;
      }
    }
  }

  return { masker, rijen };
}

/** De eerste kolom uit `voorkeur` die in de tabel zit, anders de eerste die `pas` goedkeurt. */
function kiesKolom(
  tabel: Tabel,
  voorkeur: string[],
  pas?: (kolom: Kolom) => boolean,
): Kolom | null {
  for (const naam of voorkeur) {
    const kolom = tabel.kolommen.find((k) => k.naam === naam);
    if (kolom) return kolom;
  }
  if (pas) return tabel.kolommen.find(pas) ?? null;
  return null;
}

/** Het aantal verschillende codes dat in de selectie voorkomt, code 0 (leeg) niet meegeteld. */
function telVerschillend(codes: Int32Array, aantalWaarden: number, masker?: Uint8Array): number {
  const gezien = new Uint8Array(aantalWaarden);
  let aantal = 0;
  for (let i = 0; i < codes.length; i++) {
    if (masker && masker[i] === 0) continue;
    const code = codes[i];
    // Code 0 is de lege waarde; alle lege cellen zouden anders samen voor één contact of
    // één auto doorgaan.
    if (code === 0 || gezien[code]) continue;
    gezien[code] = 1;
    aantal++;
  }
  return aantal;
}

/**
 * Een maandreeks zonder gaten, van de vroegste tot de laatste maand.
 *
 * Een lijngrafiek die een stille maand overslaat trekt een rechte lijn over het gat en
 * suggereert aanwas die er niet was.
 */
function maandReeks(perMaand: Map<number, number>): MaandPunt[] {
  if (perMaand.size === 0) return [];
  const sleutels = [...perMaand.keys()].sort((a, b) => a - b);
  const reeks: MaandPunt[] = [];
  for (let m = sleutels[0]; m <= sleutels[sleutels.length - 1]; m++) {
    reeks.push({ maand: maandSleutel(m), aantal: perMaand.get(m) ?? 0 });
  }
  return reeks;
}

/**
 * Per sleutel (een contact, een auto) de maand waarin hij hoort, en hoeveel het er zijn.
 *
 * Eén `Int32Array` over de codes van de sleutelkolom, en geen `Set` per maand: 484 maanden
 * × 137.000 id's als aparte sets zou tientallen megabytes kosten, terwijl elk contact per
 * definitie één creatiedatum heeft en elke auto één afleverdatum. Staan er voor dezelfde
 * sleutel tóch twee verschillende datums in het bestand, dan telt de laatste rij — dat is
 * een tegenstrijdigheid in de export, geen keuze van de grafiek.
 *
 * −1 betekent "nog niet gezien", −2 "gezien maar zonder leesbare datum".
 */
function perMaandGeteld(
  sleutelCodes: Int32Array,
  aantalSleutels: number,
  datumKolom: Kolom | null,
  masker: Uint8Array,
): { aantal: number; maanden: MaandPunt[]; zonderDatum: number } {
  const maandVan = new Int32Array(aantalSleutels).fill(-1);
  const maandPerCode = datumKolom?.maandPerCode ?? null;
  const datumCodes = datumKolom?.codes ?? null;
  let aantal = 0;

  for (let i = 0; i < masker.length; i++) {
    if (masker[i] === 0) continue;
    const sleutel = sleutelCodes[i];
    if (sleutel === 0) continue;
    const maand = maandPerCode && datumCodes ? maandPerCode[datumCodes[i]] : -1;
    if (maandVan[sleutel] === -1) {
      aantal++;
      maandVan[sleutel] = maand >= 0 ? maand : -2;
    } else if (maand >= 0) {
      maandVan[sleutel] = maand;
    }
  }

  const perMaand = new Map<number, number>();
  let zonderDatum = 0;
  for (let c = 1; c < maandVan.length; c++) {
    const maand = maandVan[c];
    if (maand === -1) continue;
    if (maand === -2) {
      zonderDatum++;
      continue;
    }
    perMaand.set(maand, (perMaand.get(maand) ?? 0) + 1);
  }

  return { aantal, maanden: maandReeks(perMaand), zonderDatum };
}

/**
 * Hoeveel contacten er per opt-in op `True` staan.
 *
 * Welke kolommen dit zijn staat nergens opgesomd: het zijn de kolommen die als booleaans
 * uit de data komen. Komt er een voorkeur bij in de export, dan verschijnt de tegel
 * vanzelf; verdwijnt er een, dan verdwijnt de tegel. Dat is dezelfde regel als bij de
 * filters en het kolomoverzicht.
 *
 * Geteld worden **contacten** en geen rijen: wie drie auto's heeft en één keer opt-in
 * gaf, is één opt-in. Daarnaast telt `ingevuld` hoeveel contacten er überhaupt een
 * antwoord gaven, want bij deze export is leeg vaak de grootste groep en dan zegt "47.084
 * van 137.424" iets heel anders dan "47.084 van 68.533".
 */
function telOptins(
  tabel: Tabel,
  idCodes: Int32Array,
  aantalIds: number,
  masker: Uint8Array,
): Optin[] {
  const kolommen = tabel.kolommen.filter((k) => k.type === "booleaans");
  if (kolommen.length === 0) return [];

  const opzet = kolommen.map((kolom) => {
    // Een vlag per code en niet één "True"-code: de waarden staan onbewerkt in de tabel,
    // dus "True", "true" en "True " zijn drie verschillende codes die alle drie waar zijn.
    // Alleen de eerste pakken telde de rest stilzwijgend als niet-aangevinkt.
    const waarCodes = new Uint8Array(kolom.waarden.length);
    for (let c = 1; c < kolom.waarden.length; c++) {
      if (isWaar(kolom.waarden[c])) waarCodes[c] = 1;
    }
    return {
      kolom,
      waarCodes,
      gezienWaar: new Uint8Array(aantalIds),
      gezienIngevuld: new Uint8Array(aantalIds),
      waar: 0,
      ingevuld: 0,
    };
  });

  for (let i = 0; i < masker.length; i++) {
    if (masker[i] === 0) continue;
    const id = idCodes[i];
    if (id === 0) continue;
    for (const o of opzet) {
      const code = o.kolom.codes[i];
      if (code === 0) continue;
      if (!o.gezienIngevuld[id]) {
        o.gezienIngevuld[id] = 1;
        o.ingevuld++;
      }
      if (o.waarCodes[code] === 1 && !o.gezienWaar[id]) {
        o.gezienWaar[id] = 1;
        o.waar++;
      }
    }
  }

  return opzet.map((o) => ({ kolom: o.kolom.naam, contacten: o.waar, ingevuld: o.ingevuld }));
}

/**
 * De metrics en de twee maandreeksen voor één filterselectie.
 *
 * Alles komt uit dezelfde doorloop over dezelfde selectie, zodat de cijfers op het scherm
 * per definitie bij elkaar horen: de som van de contactengrafiek kan niet afwijken van de
 * metric erboven, en een opt-in kan niet hoger uitkomen dan het aantal contacten.
 */
export function standVan(tabel: Tabel, filters: Filter[]): Stand {
  const begin = Date.now();
  const { masker, rijen } = selectie(tabel, filters);

  const idKolom = kiesKolom(tabel, CONTACT_KOLOMMEN);
  const autoKolom = kiesKolom(tabel, AUTO_KOLOMMEN);
  const creatie = kiesKolom(tabel, CREATIE_KOLOMMEN, (k) => k.type === "datum");
  const lever = kiesKolom(tabel, LEVER_KOLOMMEN);

  const contact = idKolom
    ? perMaandGeteld(idKolom.codes, idKolom.waarden.length, creatie, masker)
    : { aantal: 0, maanden: [] as MaandPunt[], zonderDatum: 0 };

  const auto = autoKolom
    ? perMaandGeteld(autoKolom.codes, autoKolom.waarden.length, lever, masker)
    : { aantal: 0, maanden: [] as MaandPunt[], zonderDatum: 0 };

  return {
    contacten: contact.aantal,
    contactKolom: idKolom?.naam ?? null,
    // Het totaal zonder filter, zodat de UI "van" kan zeggen zonder een tweede verzoek.
    contactenTotaal: idKolom ? telVerschillend(idKolom.codes, idKolom.waarden.length) : 0,
    autos: auto.aantal,
    autoKolom: autoKolom?.naam ?? null,
    autosTotaal: autoKolom ? telVerschillend(autoKolom.codes, autoKolom.waarden.length) : 0,
    rijen,
    optins: idKolom ? telOptins(tabel, idKolom.codes, idKolom.waarden.length, masker) : [],
    maanden: contact.maanden,
    creatieKolom: creatie?.naam ?? null,
    zonderCreatiedatum: contact.zonderDatum,
    autoMaanden: auto.maanden,
    leverKolom: lever?.naam ?? null,
    autosZonderDatum: auto.zonderDatum,
    duurMs: Date.now() - begin,
  };
}
