/**
 * Hoe een lead uit Syntec wordt ingedeeld: internet of offline, welk merk, welk model.
 *
 * Bron is het sheet-tabblad "Data leads" (via `dataloket.v_leads`). Wat hier staat is
 * afgeleid van een telling over alle ±97.750 leads van januari 2024 t/m november 2026
 * (november 2026); zie CLAUDE.md onder "Kanalen → Leads Syntec".
 *
 * Pure functies zonder React of database, zodat ze zonder bundler te testen zijn.
 */

// ---------------------------------------------------------------------------
// Internet of offline
// ---------------------------------------------------------------------------

/**
 * De kolom die internet en offline scheidt is **Kanaalgroep**: "Internet" tegenover
 * Showroom, Acquisitie, Mail en Telefoon. De sheet heeft ook een kolom "Status" met
 * Online/Offline, maar dat is de status van de *campagne* (een lookup uit de Campagnes-tab,
 * alleen gevuld bij de ±18% leads met een campagne) en zegt niets over de lead zelf.
 *
 * Een lege kanaalgroep (±240 leads, allemaal 2024–2025: Mailing, Pon Lead, Werkplaats, Chat)
 * telt als offline — de sheet noemt ze niet "Internet", en raden hoort niet in een telling.
 */
export const INTERNET_GROEP = "Internet";

export type Herkomst = "internet" | "offline";

export function herkomstVan(kanaalgroep: string): Herkomst {
  return kanaalgroep.trim() === INTERNET_GROEP ? "internet" : "offline";
}

/** Leesbare naam voor een kanaalgroep; een lege waarde krijgt een naam. */
export const GEEN_KANAALGROEP = "Geen kanaalgroep";

export function kanaalgroepLabel(kanaalgroep: string): string {
  return kanaalgroep.trim() || GEEN_KANAALGROEP;
}

/** De vaste volgorde van de kanaalgroepen: internet eerst, daarna offline op grootte. */
export const KANAALGROEP_VOLGORDE = [INTERNET_GROEP, "Showroom", "Acquisitie", "Mail", "Telefoon", GEEN_KANAALGROEP];

// ---------------------------------------------------------------------------
// Merk
// ---------------------------------------------------------------------------

/**
 * De merken die Van den Udenhout verkoopt, in de volgorde van het aantal leads (2024–2026).
 * Alles daarbuiten (Ford, Toyota, Kia …, ±1% van de leads, vooral occasions en inruil) valt
 * onder "Overige merken" en is daar per merk uit te klappen.
 */
export const EIGEN_MERKEN = [
  "Volkswagen",
  "Škoda",
  "Audi",
  "Volkswagen Bedrijfswagens",
  "SEAT",
  "CUPRA",
] as const;

export const OVERIGE_MERKEN = "Overige merken";
export const ONBEKEND = "Onbekend";

function sleutel(tekst: string): string {
  return tekst
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const EIGEN_MERK_SLEUTELS = new Map<string, string>(EIGEN_MERKEN.map((m) => [sleutel(m), m]));

/**
 * Een merkveld dat geen merk is: leeg, "Onbekend", of een opvulwaarde uit Syntec ("Z",
 * "Y", "ZZZ", "P" — samen ±80 leads, vrijwel allemaal offline).
 */
function isGeenMerk(merk: string): boolean {
  const s = merk.trim();
  return s === "" || s.length === 1 || /^z+$/i.test(s) || sleutel(s) === "onbekend";
}

export interface MerkIndeling {
  /** Een van de eigen merken, "Overige merken" of "Onbekend". */
  merk: string;
  /** Bij "Overige merken" het merk zelf (zoals het in Syntec staat), anders gelijk aan `merk`. */
  detail: string;
}

export function deelMerkIn(ruw: string): MerkIndeling {
  if (isGeenMerk(ruw)) return { merk: ONBEKEND, detail: ONBEKEND };
  // "?Volkswagen": een coderingsrestje vóór de naam.
  const eigen = EIGEN_MERK_SLEUTELS.get(sleutel(ruw));
  if (eigen) return { merk: eigen, detail: eigen };
  return { merk: OVERIGE_MERKEN, detail: ruw.trim() };
}

export function isEigenMerk(merk: string): boolean {
  return (EIGEN_MERKEN as readonly string[]).includes(merk);
}

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

/**
 * Syntec schrijft hetzelfde model op veel manieren: "POLO", "Polo (6) GP", "VOLKSWAGEN
 * POLO" en "Polo (5)" zijn allemaal de Polo; "ID. Polo (1)", "ID. Polo" en "ID.Polo" de ID.
 * Polo. Over de eigen merken staan er ±430 verschillende schrijfwijzen in de sheet. Voor
 * de vraag "hoeveel leads voor de Polo" worden ze samengevoegd tot één **modelfamilie**:
 * generatiecodes, GP/FL, kentekenkleur en de merknaam ervoor vallen weg, en de
 * carrosserievorm gaat mee in de familie (Golf Variant → Golf, ID.7 Tourer → ID.7, Q4
 * Sportback e-tron → Q4 e-tron, Enyaq Coupé → Enyaq). De schrijfwijzen staan per familie
 * in de tooltip, zodat na te gaan is wat er is samengevoegd.
 *
 * De lijst geldt alleen voor de eigen merken; bij overige merken blijft het model staan
 * zoals het is. Volgorde telt: de eerste regel die past wint, dus de specifiekere staan
 * boven de algemenere ("ID. Polo" vóór "Polo", "Q8 e-tron" vóór "Q8").
 */
const MODEL_FAMILIES: [RegExp, string][] = [
  // Volkswagen ID.-familie
  [/^id\s*polo\b/, "ID. Polo"],
  [/^id\s*cross\b/, "ID. Cross"],
  [/^id\s*tiguan\b/, "ID. Tiguan"],
  [/^id\s*buzz\b.*\bcargo\b/, "ID. Buzz Cargo"],
  [/^id\s*buzz\b/, "ID. Buzz"],
  [/^id\s*3\b/, "ID.3"],
  [/^id\s*4\b/, "ID.4"],
  [/^id\s*5\b/, "ID.5"],
  [/^id\s*7\b/, "ID.7"],
  // Volkswagen
  [/\bpolo\b/, "Polo"],
  [/\bgolf\b/, "Golf"],
  [/^t\s*roc\b/, "T-Roc"],
  [/^t\s*cross\b/, "T-Cross"],
  [/^tiguan\b/, "Tiguan"],
  [/^tayron\b/, "Tayron"],
  [/^taigo\b/, "Taigo"],
  [/^passat\b/, "Passat"],
  [/^(e\s*)?up\b/, "up!"],
  [/^touareg\b/, "Touareg"],
  [/^arteon\b/, "Arteon"],
  [/^touran\b/, "Touran"],
  [/^(new\s+)?beetle\b/, "Beetle"],
  [/^sharan\b/, "Sharan"],
  [/^jetta\b/, "Jetta"],
  // Volkswagen Bedrijfswagens (deels ook onder Volkswagen geregistreerd)
  [/^multivan\b/, "Multivan"],
  [/^caddy\b/, "Caddy"],
  [/^(e\s*)?crafter\b/, "Crafter"],
  [/^(e\s*)?transporter\b/, "Transporter"],
  [/^(e\s*)?caravelle\b/, "Caravelle"],
  [/^california\b/, "California"],
  [/^amarok\b/, "Amarok"],
  // Škoda
  [/^elroq\b/, "Elroq"],
  [/^enyaq\b/, "Enyaq"],
  [/^epiq\b/, "Epiq"],
  [/^peaq\b/, "Peaq"],
  [/^kodiaq\b/, "Kodiaq"],
  [/^karoq\b/, "Karoq"],
  [/^kamiq\b/, "Kamiq"],
  [/^octavia\b/, "Octavia"],
  [/^superb\b/, "Superb"],
  [/^fabia\b/, "Fabia"],
  [/^scala\b/, "Scala"],
  [/^citigo\b/, "Citigo"],
  [/^rapid\b/, "Rapid"],
  [/^yeti\b/, "Yeti"],
  [/^roomster\b/, "Roomster"],
  // Audi — eerst de RS- en S-modellen en de e-trons, dan de gewone modelreeksen
  [/^(rs\s*)?e\s*tron\s*gt\b|^e\s*tron\s*gt\b/, "e-tron GT"],
  [/^rs\s*q\s*8\b/, "RS Q8"],
  [/^rs\s*q\s*3\b/, "RS Q3"],
  [/^rs\s*(\d)\b/, "RS $1"],
  [/^sq\s*(\d)\b/, "SQ$1"],
  [/^s(\d)\b/, "S$1"],
  [/^q4\b/, "Q4 e-tron"],
  [/^q6\b/, "Q6 e-tron"],
  [/^q8\b.*\be\s*tron\b/, "Q8 e-tron"],
  [/^q(\d)\b/, "Q$1"],
  [/^a6\b.*\be\s*tron\b/, "A6 e-tron"],
  [/^a2\b.*\be\s*tron\b/, "A2 e-tron"],
  [/^a(\d)\b/, "A$1"],
  [/^e\s*tron\b/, "e-tron"],
  [/^tt\b/, "TT"],
  [/^r8\b/, "R8"],
  // SEAT en CUPRA
  [/^ibiza\b/, "Ibiza"],
  [/^leon\b/, "Leon"],
  [/^arona\b/, "Arona"],
  [/^ateca\b/, "Ateca"],
  [/^tarraco\b/, "Tarraco"],
  [/^raval\b/, "Raval"],
  [/^terramar\b/, "Terramar"],
  [/^tavascan\b/, "Tavascan"],
  [/^formentor\b/, "Formentor"],
  [/^born\b/, "Born"],
  [/^mii\b/, "Mii"],
  [/^toledo\b/, "Toledo"],
];

/** Merknamen die Syntec soms vóór het model zet ("VOLKSWAGEN POLO", "AUDI Q3", "CUPRA LEON"). */
const MERK_VOORVOEGSEL = /^(volkswagen|vw|audi|skoda|seat|cupra)\s+/;

/** Een modelveld dat alleen het merk noemt ("Volkswagen", "Skoda", "Audi", "Seat"). */
const ALLEEN_MERK = new Set(["volkswagen", "vw", "skoda", "audi", "seat", "cupra"]);

/**
 * Het model zonder ruis, in kleine letters, voor het matchen: zonder haakjes en wat
 * erin staat, zonder GP/FL, zonder de merknaam ervoor, "ID.Polo" en "ID. Polo" gelijk.
 */
export function modelSleutel(ruw: string): string {
  let s = ruw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(";")[0]
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9!]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  s = s.replace(MERK_VOORVOEGSEL, "");
  s = s.replace(/\b(gp|fl\d?)\b/g, " ").replace(/\s+/g, " ").trim();
  return s;
}

/** Hoofdletters alleen waar Syntec alles in kapitalen schreef ("PASSAT" → "Passat"). */
function netteNaam(ruw: string): string {
  const basis = ruw.split(";")[0].replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (basis === "") return ONBEKEND;
  if (basis !== basis.toUpperCase()) return basis;
  return basis
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_m, voor: string, letter: string) => voor + letter.toUpperCase());
}

/**
 * De modelfamilie van een lead. Leeg of alleen een merknaam → "Onbekend". Bij een merk
 * buiten de eigen merken het model zoals het er staat.
 */
export function modelFamilie(merk: string, ruwModel: string): string {
  const ruw = ruwModel.trim();
  if (ruw === "") return ONBEKEND;
  if (!isEigenMerk(merk)) return ruw;
  const s = modelSleutel(ruw);
  if (s === "" || ALLEEN_MERK.has(s)) return ONBEKEND;
  for (const [patroon, familie] of MODEL_FAMILIES) {
    const m = patroon.exec(s);
    if (m) return familie.replace("$1", m[1] ?? "");
  }
  return netteNaam(ruw);
}
