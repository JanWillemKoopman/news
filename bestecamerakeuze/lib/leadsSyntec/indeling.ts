/**
 * Hoe een lead uit Syntec wordt ingedeeld: online of offline, en welk merk.
 *
 * Het model wordt bewust **niet** ingedeeld: op verzoek (november 2026) staat het precies
 * zoals in de kolom Model van de sheet, dus "POLO" en "Polo (6) GP" zijn twee waarden.
 *
 * Bron is het sheet-tabblad "Data leads" (via `dataloket.v_leads`). Wat hier staat is
 * afgeleid van een telling over alle ±97.750 leads van januari 2024 t/m november 2026
 * (november 2026); zie CLAUDE.md onder "Kanalen → Leads Syntec".
 *
 * Pure functies zonder React of database, zodat ze zonder bundler te testen zijn.
 */

// ---------------------------------------------------------------------------
// Online of offline
// ---------------------------------------------------------------------------

/**
 * Op het dashboard heet het **Online** (op verzoek van de eigenaar, november 2026); in Syntec
 * heet die kanaalgroep "Internet". De sheetwaarde blijft daarom `INTERNET_GROEP`, de naam op
 * het scherm is `ONLINE`.
 *
 * De kolom die online en offline scheidt is **Kanaalgroep**: "Internet" tegenover
 * Showroom, Acquisitie, Mail en Telefoon. De sheet heeft ook een kolom "Status" met
 * Online/Offline, maar dat is de status van de *campagne* (een lookup uit de Campagnes-tab,
 * alleen gevuld bij de ±18% leads met een campagne) en zegt niets over de lead zelf.
 *
 * Een lege kanaalgroep (±240 leads, allemaal 2024–2025: Mailing, Pon Lead, Werkplaats, Chat)
 * telt als offline — de sheet noemt ze niet "Internet", en raden hoort niet in een telling.
 */
export const INTERNET_GROEP = "Internet";

/** De naam op het scherm voor de kanaalgroep "Internet". */
export const ONLINE = "Online";

export type Herkomst = "online" | "offline";

export function herkomstVan(kanaalgroep: string): Herkomst {
  return kanaalgroep.trim() === INTERNET_GROEP ? "online" : "offline";
}

/** Leesbare naam voor een kanaalgroep: "Internet" heet Online, een lege waarde krijgt een naam. */
export const GEEN_KANAALGROEP = "Geen kanaalgroep";

export function kanaalgroepLabel(kanaalgroep: string): string {
  const s = kanaalgroep.trim();
  if (s === INTERNET_GROEP) return ONLINE;
  return s || GEEN_KANAALGROEP;
}

/** De vaste volgorde van de kanaalgroepen (zoals op het scherm): online eerst, dan offline op grootte. */
export const KANAALGROEP_VOLGORDE = [ONLINE, "Showroom", "Acquisitie", "Mail", "Telefoon", GEEN_KANAALGROEP];

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
