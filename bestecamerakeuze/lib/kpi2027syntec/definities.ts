/**
 * De KPI's uit Syntec waarvoor het tabblad KPI's 2027 Syntec een target zet: de
 * websiteleads per bron, zoals het team ze in 2025 als doel voor 2026 vastlegde.
 *
 * Dit bestand is de enige plek die zegt welke Syntec-leads bij welke KPI horen. De bron is
 * het sheet-tabblad "Data leads" (elke nacht gekopieerd naar `dataloket.v_leads`, zie
 * `lib/sync/bronnen.ts`); geteld worden de leads met Kanaalgroep "Internet", op de datum
 * Aangelegd.
 *
 * ## Waarom de eigen website twee soorten regels heeft
 *
 * In april 2026 veranderde er in Syntec iets aan de achterkant. Tot en met maart had elk
 * formulier van udenhout.nl een eigen kanaal (`Udenhout.nl offerteaanv.`,
 * `Udenhout.nl proefritaanv.` …). Vanaf april komt alles binnen onder het ene kanaal
 * `Udenhout.nl`, en zegt het Onderwerp wat voor aanvraag het is. Elke KPI van de eigen
 * website heeft dus een regel voor het oude kanaal en een voor het nieuwe kanaal plus
 * onderwerp. De regels hangen niet aan een datum: de oude kanalen komen na maart vrijwel
 * niet meer voor, en het nieuwe kanaal niet ervoor.
 *
 * Bij de merksites (PAH) en de portals veranderde niets; daar is het kanaal genoeg.
 *
 * ## Keuzes van het team (november 2026)
 *
 *  - **Private Groeilease telt bij Private lease.** Tot en met maart kwam hij binnen in het
 *    offertekanaal, met onderwerp `Module.Car.Index.Mail.Request.Subject.growLease`; vanaf
 *    april als `Offerte private lease` onder `Udenhout.nl`, en dan niet meer van gewone
 *    private lease te scheiden. Alleen zo zijn de twee periodes vergelijkbaar. De doelen
 *    voor 2026 rekenden hem nog bij offerte: dáárom ligt offerte in 2026 onder en private
 *    lease ver boven het doel.
 *  - **Doorgestuurde mails tellen niet mee** bij de eigen website (onderwerp begint met
 *    "FW:"). Dat zijn mails die een collega handmatig doorstuurde, geen websiteformulier —
 *    na april bleven er zo ±50 per maand onder het oude offertekanaal hangen.
 *  - **VW PFS zonder retentieleads** (onderwerp met "retentie": een bestaand contract dat
 *    afloopt), want dat is geen nieuwe private lease-aanvraag.
 *  - **Audi.nl inclusief Audi Proefritmodule** (sinds april 2025) — het doel klopt alleen
 *    zo.
 *  - **ID.Polo Reservering (PAH)** valt bewust buiten Volkswagen.nl; chat, WhatsApp en
 *    bel-me-terug vallen buiten alle KPI's.
 *
 * Gecontroleerd in november 2026: met deze regels is voor tien van de vijftien KPI's het
 * doel 2026 precies de telling van 2025 × 1,2 — zo waren de doelen gesteld.
 */

export type SyntecGroep = "eigen-website" | "pah" | "portals";

export const SYNTEC_GROEPEN: readonly { sleutel: SyntecGroep; naam: string; totaalNaam: string }[] = [
  { sleutel: "eigen-website", naam: "Eigen website", totaalNaam: "Totaal eigen website" },
  { sleutel: "pah", naam: "PAH-websites", totaalNaam: "Totaal PAH" },
  { sleutel: "portals", naam: "Externe portals", totaalNaam: "Totaal externe portals" },
];

/** Alleen leads met deze kanaalgroep tellen mee. */
export const SYNTEC_KANAALGROEP = "Internet";

/**
 * Eén manier waarop een lead bij een KPI hoort: het kanaal is een van `kanalen`, en als er
 * een onderwerp-voorwaarde staat, voldoet het onderwerp daaraan. Alles hoofdletter-
 * ongevoelig en zonder spaties aan de randen.
 */
export interface SyntecRegel {
  kanalen: readonly string[];
  /** Het onderwerp is precies een van deze waarden. */
  onderwerpIs?: readonly string[];
  /** Het onderwerp begint met een van deze waarden. */
  onderwerpBegintMet?: readonly string[];
  /** Het onderwerp bevat een van deze waarden. */
  onderwerpBevat?: readonly string[];
  /** Het onderwerp bevat géén van deze waarden. */
  onderwerpBevatNiet?: readonly string[];
  /** Wanneer deze regel leads oplevert, voor de bron onder de grafiek ("t/m maart 2026"). */
  periode?: string;
}

export interface SyntecKpi {
  sleutel: string;
  naam: string;
  groep: SyntecGroep;
  /** Het doel voor 2026 zoals het team het vastlegde, ter vergelijking onder de grafiek. */
  doel2026: number;
  /** Een lead hoort bij deze KPI als hij aan minstens één regel voldoet. */
  regels: readonly SyntecRegel[];
  /** Onderwerpen die bij deze KPI nooit meetellen, wat de regel ook zegt. */
  nooitOnderwerpBegintMet?: readonly string[];
  /**
   * De beslissingen achter deze definitie, in gewone taal, onder de grafiek. Een target is
   * pas bruikbaar als iedereen weet wat er wel en niet in zit, en waarom.
   */
  keuzes: readonly string[];
}

const GEEN_DOORGESTUURDE_MAIL = ["fw:"] as const;

const OUD = "t/m maart 2026, eigen kanaal per formulier";
const NIEUW = "vanaf april 2026, kanaal Udenhout.nl + onderwerp";

const KEUZE_NAAMSWISSEL =
  "In april 2026 veranderde Syntec de indeling: tot en met maart had elk formulier van udenhout.nl een eigen kanaal, sindsdien komt alles binnen onder het kanaal ‘Udenhout.nl’ en zegt het onderwerp wat voor aanvraag het is. Daarom telt deze KPI een regel voor elke periode.";
const KEUZE_DOORGESTUURD =
  "Doorgestuurde mails (onderwerp begint met ‘FW:’) tellen niet mee: dat zijn mails die een collega handmatig doorstuurde, geen websiteformulieren.";
const KEUZE_HEEL_KANAAL = "Alle leads met dit kanaal tellen mee, ongeacht het onderwerp.";

export const SYNTEC_KPIS: readonly SyntecKpi[] = [
  // --- Eigen website ------------------------------------------------------------------
  {
    sleutel: "offerte",
    naam: "Udenhout.nl offerteaanvraag",
    groep: "eigen-website",
    doel2026: 3250,
    regels: [
      { kanalen: ["Udenhout.nl offerteaanv."], onderwerpBevatNiet: ["growlease"], periode: OUD },
      { kanalen: ["Udenhout.nl"], onderwerpBegintMet: ["Offerte aanvraag", "Offerteaanvraag"], periode: NIEUW },
    ],
    nooitOnderwerpBegintMet: GEEN_DOORGESTUURDE_MAIL,
    keuzes: [
      KEUZE_NAAMSWISSEL,
      "De Private Groeilease telt hier niet, maar bij Private lease. Tot en met maart kwam hij binnen in dit kanaal (onderwerp ‘…growLease’); sinds april als ‘Offerte private lease’, en dan is hij niet meer van gewone private lease te scheiden. Alleen zo zijn beide periodes vergelijkbaar.",
      "Een offerte voor private lease (onderwerp ‘Offerte private lease’) telt bij Private lease.",
      KEUZE_DOORGESTUURD,
      "Het doel 2026 rekende de groeilease nog hier. Daardoor ligt de realisatie onder dat doel en die van Private lease er ver boven; samen kloppen ze wel.",
    ],
  },
  {
    sleutel: "proefrit",
    naam: "Udenhout.nl proefritaanvraag",
    groep: "eigen-website",
    doel2026: 1875,
    regels: [
      { kanalen: ["Udenhout.nl proefritaanv."], periode: OUD },
      { kanalen: ["Udenhout.nl"], onderwerpBegintMet: ["Proefrit"], periode: NIEUW },
    ],
    nooitOnderwerpBegintMet: GEEN_DOORGESTUURDE_MAIL,
    keuzes: [
      KEUZE_NAAMSWISSEL,
      "Proefritformulieren van campagnes tellen mee (bijvoorbeeld ‘Proefrit Raval Breda’): het blijft een proefritaanvraag.",
      KEUZE_DOORGESTUURD,
    ],
  },
  {
    sleutel: "private-lease",
    naam: "Udenhout.nl private lease aanvraag",
    groep: "eigen-website",
    doel2026: 500,
    regels: [
      {
        kanalen: [
          "Udenhout.nl privatelease aanv.",
          "Udenhout.nl privelease expats",
          "Udenhout.nl Private Groeilease",
          "UdenhoutPrivateLease.nl",
        ],
        periode: OUD,
      },
      { kanalen: ["Udenhout.nl offerteaanv."], onderwerpBevat: ["growlease"], periode: "t/m maart 2026, Private Groeilease" },
      { kanalen: ["Udenhout.nl"], onderwerpBegintMet: ["Offerte private lease", "Private lease offerte"], periode: NIEUW },
    ],
    nooitOnderwerpBegintMet: GEEN_DOORGESTUURDE_MAIL,
    keuzes: [
      KEUZE_NAAMSWISSEL,
      "Inclusief de Private Groeilease: tot en met maart kwam die binnen in het offertekanaal (onderwerp ‘…growLease’), sinds april als ‘Offerte private lease’. Na april is hij niet meer van gewone private lease te scheiden, dus telt hij in beide periodes hier.",
      "Ook private lease voor expats en het kanaal ‘UdenhoutPrivateLease.nl’ tellen mee.",
      KEUZE_DOORGESTUURD,
      "Het doel 2026 rekende de groeilease nog bij offerte. Daardoor ligt de realisatie ver boven dat doel en die van offerte eronder; samen kloppen ze wel.",
    ],
  },
  {
    sleutel: "inruil",
    naam: "Udenhout.nl inruilvoorstel",
    groep: "eigen-website",
    doel2026: 7,
    regels: [
      { kanalen: ["Udenhout.nl inruilvoorstel"], periode: OUD },
      { kanalen: ["Udenhout.nl"], onderwerpBegintMet: ["inruil"], periode: NIEUW },
    ],
    nooitOnderwerpBegintMet: GEEN_DOORGESTUURDE_MAIL,
    keuzes: [
      KEUZE_NAAMSWISSEL,
      KEUZE_DOORGESTUURD,
      "Het formulier van de nieuwe website levert veel meer inruilvoorstellen op dan het oude: ±1 per maand tot en met maart, daarna ±25. Dat is geen telfout. Het jaargemiddelde, en dus het target, mengt die twee periodes; het doel 2026 is daarmee achterhaald.",
    ],
  },
  {
    sleutel: "contact",
    naam: "Udenhout.nl contact",
    groep: "eigen-website",
    doel2026: 122,
    regels: [
      { kanalen: ["Udenhout.nl contact"], periode: OUD },
      { kanalen: ["Udenhout.nl"], onderwerpBegintMet: ["Algemeen contactformulier"], periode: NIEUW },
    ],
    nooitOnderwerpBegintMet: GEEN_DOORGESTUURDE_MAIL,
    keuzes: [
      KEUZE_NAAMSWISSEL,
      KEUZE_DOORGESTUURD,
      "Het contactformulier van de nieuwe website levert sinds april meer aanvragen op dan het oude kanaal. Het jaargemiddelde, en dus het target, mengt die twee periodes.",
    ],
  },

  // --- PAH-websites -------------------------------------------------------------------
  {
    sleutel: "volkswagen-nl",
    naam: "Volkswagen.nl",
    groep: "pah",
    doel2026: 1378,
    regels: [{ kanalen: ["Volkswagen.nl"] }],
    keuzes: [
      KEUZE_HEEL_KANAAL,
      "Reserveringen voor de ID. Polo (kanaal ‘ID.Polo Reservering (PAH)’) tellen niet mee: het zijn reserveringen en ze zaten niet in het doel 2026.",
    ],
  },
  { sleutel: "skoda-nl", naam: "Skoda.nl", groep: "pah", doel2026: 1282, regels: [{ kanalen: ["Skoda.nl"] }], keuzes: [KEUZE_HEEL_KANAAL] },
  {
    sleutel: "audi-nl",
    naam: "Audi.nl",
    groep: "pah",
    doel2026: 828,
    regels: [{ kanalen: ["Audi.nl", "Audi Proefritmodule"] }],
    keuzes: [
      KEUZE_HEEL_KANAAL,
      "Inclusief de Audi Proefritmodule (een eigen kanaal sinds april 2025, voor proefritten via Audi). Het doel 2026 klopt alleen als die meetelt.",
    ],
  },
  { sleutel: "seat-nl", naam: "Seat.nl", groep: "pah", doel2026: 214, regels: [{ kanalen: ["Seat.nl"] }], keuzes: [KEUZE_HEEL_KANAAL] },
  {
    sleutel: "vwpfs",
    naam: "VW PFS private lease aanvraag",
    groep: "pah",
    doel2026: 460,
    regels: [{ kanalen: ["VWPFS private lease aanvraag"], onderwerpBevatNiet: ["retentie"] }],
    keuzes: [
      "Retentieleads tellen niet mee (onderwerp met ‘retentie’, en het aparte kanaal ‘VWPFS Retentie_TB’): dat zijn bestaande klanten van wie het contract afloopt, geen nieuwe private lease-aanvraag.",
      "Het doel 2026 rekende de retentieleads nog wel mee. Daarom ligt de realisatie eronder; het kanaal loopt daarnaast ook echt terug.",
    ],
  },
  {
    sleutel: "vw-bedrijfswagens-nl",
    naam: "VW Bedrijfswagens.nl",
    groep: "pah",
    doel2026: 50,
    regels: [{ kanalen: ["Vwbedrijfswagens.nl"] }],
    keuzes: [KEUZE_HEEL_KANAAL],
  },

  // --- Externe portals ----------------------------------------------------------------
  {
    sleutel: "autoscout24",
    naam: "Autoscout24.nl & Autotrader",
    groep: "portals",
    doel2026: 457,
    regels: [{ kanalen: ["Autoscout24.nl & Autotrader", "Autotrader.nl"] }],
    keuzes: [KEUZE_HEEL_KANAAL, "Ook het losse kanaal ‘Autotrader.nl’ (een paar leads per jaar) telt mee."],
  },
  {
    sleutel: "autotrack",
    naam: "Autotrack.nl",
    groep: "portals",
    doel2026: 318,
    regels: [{ kanalen: ["Autotrack.nl"] }],
    keuzes: [KEUZE_HEEL_KANAAL],
  },
  {
    sleutel: "viabovag",
    naam: "ViaBovag.nl",
    groep: "portals",
    doel2026: 402,
    regels: [{ kanalen: ["ViaBovag.nl", "viaBOVAG.nl_TB"] }],
    keuzes: [KEUZE_HEEL_KANAAL, "Ook de variant ‘viaBOVAG.nl_TB’ telt mee: dezelfde bron, anders gespeld."],
  },
  {
    sleutel: "financiallease",
    naam: "Financiallease.nl",
    groep: "portals",
    doel2026: 14,
    regels: [{ kanalen: ["Financiallease.nl", "Financiallease.nl_TB"] }],
    keuzes: [KEUZE_HEEL_KANAAL, "Ook de variant ‘Financiallease.nl_TB’ telt mee: dezelfde bron, anders gespeld."],
  },
];

/** De keuzes die voor elk totaal gelden, onder de totaalkaarten. */
export const SYNTEC_TOTAAL_KEUZES: readonly string[] = [
  "Een totaal is de optelsom van de KPI's erboven; elke lead telt bij hoogstens één KPI. De keuzes per KPI staan onder de afzonderlijke kaarten.",
  "Chat, WhatsApp (SaySimple), bel-me-terug en reserveringen voor de ID. Polo tellen bij geen enkele KPI: ze zaten niet in de doelen voor 2026.",
];

function schoon(tekst: string | null | undefined): string {
  return (tekst ?? "").trim().toLowerCase();
}

function lijst(waarden: readonly string[] | undefined): string[] {
  return (waarden ?? []).map(schoon);
}

/** Voldoet een lead (kanaal + onderwerp) aan deze regel? */
export function voldoetAanRegel(regel: SyntecRegel, kanaal: string, onderwerp: string): boolean {
  const k = schoon(kanaal);
  const o = schoon(onderwerp);
  if (!lijst(regel.kanalen).includes(k)) return false;
  if (regel.onderwerpIs && !lijst(regel.onderwerpIs).includes(o)) return false;
  if (regel.onderwerpBegintMet && !lijst(regel.onderwerpBegintMet).some((w) => o.startsWith(w))) return false;
  if (regel.onderwerpBevat && !lijst(regel.onderwerpBevat).some((w) => o.includes(w))) return false;
  if (regel.onderwerpBevatNiet && lijst(regel.onderwerpBevatNiet).some((w) => o.includes(w))) return false;
  return true;
}

/**
 * Bij welke KPI (en welke regel daarvan) hoort deze lead? `null` als hij bij geen enkele
 * KPI hoort. Een lead telt bij hoogstens één KPI; dat de regels elkaar niet overlappen
 * staat in de test.
 */
export function classificeerLead(
  kanaal: string,
  onderwerp: string,
  kpis: readonly SyntecKpi[] = SYNTEC_KPIS,
): { kpi: SyntecKpi; regel: number } | null {
  const o = schoon(onderwerp);
  for (const kpi of kpis) {
    if (lijst(kpi.nooitOnderwerpBegintMet).some((w) => o.startsWith(w))) continue;
    const regel = kpi.regels.findIndex((r) => voldoetAanRegel(r, kanaal, onderwerp));
    if (regel >= 0) return { kpi, regel };
  }
  return null;
}

function opsomming(waarden: readonly string[], voegwoord = "of"): string {
  const q = waarden.map((w) => `‘${w}’`);
  if (q.length <= 1) return q.join("");
  return `${q.slice(0, -1).join(", ")} ${voegwoord} ${q[q.length - 1]}`;
}

/** Een regel in gewone taal, voor de bronregel onder de grafiek. */
export function beschrijfRegel(regel: SyntecRegel): string {
  const delen = [`kanaal ${opsomming(regel.kanalen)}`];
  if (regel.onderwerpIs) delen.push(`onderwerp ${opsomming(regel.onderwerpIs)}`);
  if (regel.onderwerpBegintMet) delen.push(`onderwerp begint met ${opsomming(regel.onderwerpBegintMet)}`);
  if (regel.onderwerpBevat) delen.push(`onderwerp bevat ${opsomming(regel.onderwerpBevat)}`);
  if (regel.onderwerpBevatNiet) delen.push(`onderwerp zonder ${opsomming(regel.onderwerpBevatNiet)}`);
  return delen.join(", ");
}
