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
 * Een contact is een unieke `CUSTOMER_ID` (op verzoek van marketing): dat is de klant
 * zoals het dealersysteem hem kent. `ID` is de sleutel van de contactentabel van Selligent
 * en geeft een hoger aantal (137.424 tegen 130.210), omdat dezelfde klant onder meerdere
 * id's kan staan. Let op: `CUSTOMER_ID` mist in ±4% van de rijen; die rijen tellen niet
 * mee als contact (een lege waarde is geen klant). Staat `CUSTOMER_ID` niet in de export,
 * dan valt de pagina terug op `ID` — en ze zegt in beeld welke ze telde.
 */
export const CONTACT_KOLOMMEN = ["CUSTOMER_ID", "ID"];

/**
 * Welke kolom de e-mailadressen telt.
 *
 * Alleen het **aantal verschillende** waarden komt in beeld; geen enkel adres verlaat de
 * server. Dat is geen aparte beveiliging die iemand kan vergeten aan te zetten: de kolom
 * heeft 125.369 verschillende waarden en valt daarmee ver boven {@link MAX_OPTIES}, dus
 * er bestaat voor deze kolom geen optielijst die naar de browser zou kunnen gaan.
 */
export const MAIL_KOLOMMEN = ["MAIL", "EMAIL"];

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
 * Dezelfde als die van de contacten, en dat is een bewuste keuze die uitleg verdient
 * omdat het er eerst anders stond. Beide grafieken gaan over wat er **in Selligent is
 * bijgekomen** per maand, en dat moment is voor een auto hetzelfde moment als voor zijn
 * contact: `CREATED_DT`. Eerder stond deze grafiek op `VDUVEHICLES_DELIVERY_DT`, de
 * afleverdatum — op zichzelf een zinnig cijfer, maar het antwoordt op een andere vraag
 * ("wanneer is deze auto geleverd") dan de titel stelt. Een auto die in 2018 is
 * afgeleverd aan een contact dat in 2025 is aangemaakt, hoort onder deze titel in 2025.
 *
 * Wil je alsnog de afleverdatum: zet hier `["VDUVEHICLES_DELIVERY_DT"]` en pas de titel
 * in `SelligentPaneel` aan — dat is de hele wijziging.
 */
export const AUTO_DATUM_KOLOMMEN = CREATIE_KOLOMMEN;

/**
 * De afleverdatum, voor de derde grafiek.
 *
 * Die staat er náást de twee "toegevoegd in Selligent"-grafieken en niet in plaats van:
 * het zijn twee verschillende vragen over dezelfde auto's. "Wanneer kwam deze auto in
 * Selligent" volgt zijn contact; "wanneer is deze auto afgeleverd" is een eigenschap van
 * de auto zelf, en dat is het cijfer waar een servicecampagne op rust.
 *
 * Let op bij het lezen: deze kolom bevat sentinel-datums (1 januari 1900) en datums in de
 * toekomst, dus de reeks loopt van 1900 tot 2028. De grafiek opent op de laatste tien
 * jaar; de knop ernaast laat de volle reeks zien, inclusief die rommel.
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

/** De tegenhanger van {@link isWaar}, met dezelfde soepelheid. */
function isOnwaar(waarde: string): boolean {
  return waarde.trim().toLowerCase() === "false";
}

/** Welke van de drie standen een opt-in-tegel laat zien. */
export type OptinStand = "waar" | "onwaar" | "onbekend";

/**
 * De kolom die als merkbalk boven de filters staat in plaats van in het raster.
 *
 * Merk is het filter dat het vaakst wordt aangeraakt, en het is er een waarvan je de
 * stand in één oogopslag wil zien — niet achter een dichtgeklapte balk en een uitklapmenu.
 * Daarom staat hij apart, altijd zichtbaar, met alle merken aan tot je er een uitzet.
 * Zit de kolom niet in de export, dan is er simpelweg geen merkbalk.
 */
export const MERK_KOLOM = "VDUVEHICLES_BRAND";

/** Vanaf hoeveel kolommen met hetzelfde voorvoegsel die een eigen kopje krijgen. */
const MIN_GROEP = 3;

export interface Veldgroep {
  /**
   * Het gedeelde voorvoegsel van de kolomnamen in deze groep, of `null` voor het blok met
   * de kolommen die er geen delen. Dat blok komt eerst — het zijn de id's en de datums,
   * waar je mee begint. Hoe de koppen eruitzien bepaalt de UI (`GROEP_NAMEN` in
   * `components/selligent/SelligentFilters.tsx`); hier staat alleen de indeling.
   */
  voorvoegsel: string | null;
  velden: Veld[];
}

/**
 * De filters in groepen, op het voorvoegsel dat de kolomnamen delen.
 *
 * Vijfentwintig controls op één hoop is een muur; dezelfde vijfentwintig onder de kopjes
 * `PREFERENCES` en `VDUVEHICLES` is een inhoudsopgave. De indeling komt uit de namen zelf
 * en staat nergens met de hand opgesomd: een nieuwe `PREFERENCES_`-kolom schuift vanzelf
 * bij de andere voorkeuren aan, en een nieuw voorvoegsel krijgt vanzelf een eigen kopje
 * zodra er {@link MIN_GROEP} kolommen mee beginnen. Onder die drempel blijft het een los
 * veld, want een kopje boven één filter is geen indeling maar ruis.
 *
 * Binnen een groep blijft de volgorde van het bestand staan, net als in het
 * kolomoverzicht — zo zijn de twee naast elkaar te leggen.
 */
export function groepeerVelden(velden: Veld[]): Veldgroep[] {
  const telling = new Map<string, number>();
  for (const veld of velden) {
    const voorvoegsel = voorvoegselVan(veld.naam);
    if (voorvoegsel) telling.set(voorvoegsel, (telling.get(voorvoegsel) ?? 0) + 1);
  }

  const los: Veld[] = [];
  const groepen = new Map<string, Veld[]>();
  for (const veld of velden) {
    const voorvoegsel = voorvoegselVan(veld.naam);
    if (voorvoegsel && (telling.get(voorvoegsel) ?? 0) >= MIN_GROEP) {
      const groep = groepen.get(voorvoegsel);
      if (groep) groep.push(veld);
      else groepen.set(voorvoegsel, [veld]);
    } else {
      los.push(veld);
    }
  }

  const resultaat: Veldgroep[] = [];
  if (los.length > 0) resultaat.push({ voorvoegsel: null, velden: los });
  for (const [voorvoegsel, groep] of groepen) resultaat.push({ voorvoegsel, velden: groep });
  return resultaat;
}

/** Het stuk vóór de eerste liggende streep, of `null` als de naam er geen heeft. */
function voorvoegselVan(naam: string): string | null {
  const streep = naam.indexOf("_");
  return streep > 0 ? naam.slice(0, streep) : null;
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

/**
 * Eén opt-in-tegel: hoe de contacten in deze kolom verdeeld zijn over `True`, `False` en
 * "nog niets ingevuld".
 *
 * ## De drie standen tellen samen op tot alle contacten
 *
 * Een contact staat in meerdere rijen zodra het meerdere auto's heeft, en die rijen
 * kunnen in theorie verschillende waarden dragen. Een contact telt daarom in de
 * stérkste stand die het ergens heeft: één rij met `True` maakt het contact een opt-in,
 * anders beslist een `False`, en pas als er nergens iets staat is het onbekend. Zo kan
 * een contact nooit in twee tegels tegelijk meetellen en geldt altijd
 * `waar + onwaar + onbekend === Stand.contacten`. Een test legt dat vast.
 *
 * ## Waarom de waarden erbij zitten
 *
 * `waarWaarden` en `onwaarWaarden` zijn de ruwe waarden uit het bestand die in deze
 * kolom als waar respectievelijk onwaar gelden — meestal alleen `"True"` en `"False"`,
 * maar sinds de data onbewerkt is kunnen `"true"` en `"True "` aparte waarden zijn. De
 * UI filtert daarop als je een tegel aanklikt, zodat het filter precies de contacten
 * pakt die in het cijfer zitten. Zou de UI zelf `"True"` verzinnen, dan zou een tegel van
 * 24.273 een filter van 24.270 kunnen opleveren.
 */
export interface Optin {
  /** De kolomnaam, onbewerkt — dezelfde naam als in de filterbalk en het kolomoverzicht. */
  kolom: string;
  /** Contacten met een waarde die als waar geldt. */
  waar: number;
  /** Contacten zonder waar-waarde maar met een onwaar-waarde. */
  onwaar: number;
  /** Contacten die in deze kolom nergens iets hebben staan. */
  onbekend: number;
  waarWaarden: string[];
  onwaarWaarden: string[];
}

export interface Stand {
  /** Het aantal verschillende id's binnen de selectie. */
  contacten: number;
  /** Welke kolom daarvoor geteld is, zodat het cijfer navraagbaar is. */
  contactKolom: string | null;
  /** Het totaal zonder enig filter, zodat de UI "van" kan zeggen. */
  contactenTotaal: number;
  /** Het aantal verschillende e-mailadressen binnen de selectie — alleen het aantal. */
  emails: number;
  emailKolom: string | null;
  emailsTotaal: number;
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
  /** De maandreeks auto's, op dezelfde datumkolom als de contacten. */
  autoMaanden: MaandPunt[];
  autoDatumKolom: string | null;
  /** Auto's binnen de selectie zonder leesbare datum in de bovenstaande reeks. */
  autosZonderDatum: number;
  /** De maandreeks unieke e-mailadressen, op dezelfde datumkolom als de contacten. */
  emailMaanden: MaandPunt[];
  /** Unieke e-mailadressen binnen de selectie zonder leesbare datum. */
  emailsZonderDatum: number;
  /** De maandreeks auto's op afleverdatum — een andere vraag dan `autoMaanden`. */
  leverMaanden: MaandPunt[];
  leverKolom: string | null;
  /** Auto's binnen de selectie zonder leesbare afleverdatum. */
  autosZonderLeverdatum: number;
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
 * gaf, is één opt-in. De noemer op het scherm is het totale aantal contacten in de
 * selectie, dus de tegels zijn onderling te vergelijken.
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
    // Een rang per code en niet één "True"-code: de waarden staan onbewerkt in de tabel,
    // dus "True", "true" en "True " zijn drie verschillende codes die alle drie waar zijn.
    // 3 = waar, 2 = onwaar, 1 = wel iets maar geen van beide, 0 = leeg.
    const rangPerCode = new Uint8Array(kolom.waarden.length);
    const waarWaarden: string[] = [];
    const onwaarWaarden: string[] = [];
    for (let c = 1; c < kolom.waarden.length; c++) {
      const waarde = kolom.waarden[c];
      if (isWaar(waarde)) {
        rangPerCode[c] = 3;
        waarWaarden.push(waarde);
      } else if (isOnwaar(waarde)) {
        rangPerCode[c] = 2;
        onwaarWaarden.push(waarde);
      } else {
        rangPerCode[c] = 1;
      }
    }
    return {
      kolom,
      rangPerCode,
      waarWaarden,
      onwaarWaarden,
      // Per contact de hoogste rang die het ergens heeft; 0 = nergens iets.
      rangVanId: new Uint8Array(aantalIds),
    };
  });

  for (let i = 0; i < masker.length; i++) {
    if (masker[i] === 0) continue;
    const id = idCodes[i];
    if (id === 0) continue;
    for (const o of opzet) {
      const rang = o.rangPerCode[o.kolom.codes[i]];
      if (rang > o.rangVanId[id]) o.rangVanId[id] = rang;
    }
  }

  // Welke id's er in deze selectie überhaupt voorkomen; alleen die mogen meetellen in
  // "onbekend". Zonder deze stap zouden alle id's uit het hele bestand als onbekend
  // gelden zodra je ook maar iets wegfiltert.
  const inSelectie = new Uint8Array(aantalIds);
  for (let i = 0; i < masker.length; i++) {
    if (masker[i] === 1 && idCodes[i] !== 0) inSelectie[idCodes[i]] = 1;
  }

  return opzet.map((o) => {
    let waar = 0;
    let onwaar = 0;
    let onbekend = 0;
    for (let c = 1; c < inSelectie.length; c++) {
      if (inSelectie[c] === 0) continue;
      const rang = o.rangVanId[c];
      if (rang === 3) waar++;
      else if (rang === 2) onwaar++;
      // Rang 1 is een waarde die geen True en geen False is — bij deze export komt die
      // niet voor, maar hij hoort bij "niet aangevinkt" en niet bij "niets ingevuld".
      else if (rang === 0) onbekend++;
    }
    return {
      kolom: o.kolom.naam,
      waar,
      onwaar,
      onbekend,
      waarWaarden: o.waarWaarden,
      onwaarWaarden: o.onwaarWaarden,
    };
  });
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
  const mailKolom = kiesKolom(tabel, MAIL_KOLOMMEN);
  const creatie = kiesKolom(tabel, CREATIE_KOLOMMEN, (k) => k.type === "datum");
  const autoDatum = kiesKolom(tabel, AUTO_DATUM_KOLOMMEN, (k) => k.type === "datum");
  const lever = kiesKolom(tabel, LEVER_KOLOMMEN, (k) => k.type === "datum");

  const contact = idKolom
    ? perMaandGeteld(idKolom.codes, idKolom.waarden.length, creatie, masker)
    : { aantal: 0, maanden: [] as MaandPunt[], zonderDatum: 0 };

  const auto = autoKolom
    ? perMaandGeteld(autoKolom.codes, autoKolom.waarden.length, autoDatum, masker)
    : { aantal: 0, maanden: [] as MaandPunt[], zonderDatum: 0 };

  // Unieke e-mailadressen per maand van aanmaak (de maand van het eerst geziene contact).
  const mail = mailKolom
    ? perMaandGeteld(mailKolom.codes, mailKolom.waarden.length, creatie, masker)
    : { aantal: 0, maanden: [] as MaandPunt[], zonderDatum: 0 };

  // Dezelfde auto's, op een andere datum gegroepeerd. Het aantal komt dus uit op
  // hetzelfde totaal; alleen de verdeling over de maanden verschilt.
  const geleverd =
    autoKolom && lever
      ? perMaandGeteld(autoKolom.codes, autoKolom.waarden.length, lever, masker)
      : { aantal: 0, maanden: [] as MaandPunt[], zonderDatum: 0 };

  return {
    contacten: contact.aantal,
    contactKolom: idKolom?.naam ?? null,
    // Het totaal zonder filter, zodat de UI "van" kan zeggen zonder een tweede verzoek.
    contactenTotaal: idKolom ? telVerschillend(idKolom.codes, idKolom.waarden.length) : 0,
    emails: mailKolom
      ? telVerschillend(mailKolom.codes, mailKolom.waarden.length, masker)
      : 0,
    emailKolom: mailKolom?.naam ?? null,
    emailsTotaal: mailKolom ? telVerschillend(mailKolom.codes, mailKolom.waarden.length) : 0,
    autos: auto.aantal,
    autoKolom: autoKolom?.naam ?? null,
    autosTotaal: autoKolom ? telVerschillend(autoKolom.codes, autoKolom.waarden.length) : 0,
    rijen,
    optins: idKolom ? telOptins(tabel, idKolom.codes, idKolom.waarden.length, masker) : [],
    maanden: contact.maanden,
    creatieKolom: creatie?.naam ?? null,
    zonderCreatiedatum: contact.zonderDatum,
    autoMaanden: auto.maanden,
    autoDatumKolom: autoDatum?.naam ?? null,
    autosZonderDatum: auto.zonderDatum,
    emailMaanden: mail.maanden,
    emailsZonderDatum: mail.zonderDatum,
    leverMaanden: geleverd.maanden,
    leverKolom: lever?.naam ?? null,
    autosZonderLeverdatum: geleverd.zonderDatum,
    duurMs: Date.now() - begin,
  };
}
