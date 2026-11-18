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
  /** Een extra opmerking onder de bron, als er iets is wat de lezer moet weten. */
  opmerking?: string;
}

const GEEN_DOORGESTUURDE_MAIL = ["fw:"] as const;

export const SYNTEC_KPIS: readonly SyntecKpi[] = [
  // --- Eigen website ------------------------------------------------------------------
  {
    sleutel: "offerte",
    naam: "Udenhout.nl offerteaanvraag",
    groep: "eigen-website",
    doel2026: 3250,
    regels: [
      { kanalen: ["Udenhout.nl offerteaanv."], onderwerpBevatNiet: ["growlease"] },
      { kanalen: ["Udenhout.nl"], onderwerpIs: ["Offerte aanvraag", "Offerteaanvraag"] },
    ],
    nooitOnderwerpBegintMet: GEEN_DOORGESTUURDE_MAIL,
    opmerking:
      "Sinds april 2026 komt een offerte voor private lease binnen als ‘Offerte private lease’ en telt die bij Private lease; ook de Private Groeilease telt daar. Het doel 2026 rekende die nog hier.",
  },
  {
    sleutel: "proefrit",
    naam: "Udenhout.nl proefritaanvraag",
    groep: "eigen-website",
    doel2026: 1875,
    regels: [
      { kanalen: ["Udenhout.nl proefritaanv."] },
      { kanalen: ["Udenhout.nl"], onderwerpBegintMet: ["Proefrit"] },
    ],
    nooitOnderwerpBegintMet: GEEN_DOORGESTUURDE_MAIL,
    opmerking: "Inclusief proefritformulieren van campagnes, zoals ‘Proefrit Raval Breda’.",
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
      },
      { kanalen: ["Udenhout.nl offerteaanv."], onderwerpBevat: ["growlease"] },
      { kanalen: ["Udenhout.nl"], onderwerpBegintMet: ["Offerte private lease", "Private lease offerte"] },
    ],
    nooitOnderwerpBegintMet: GEEN_DOORGESTUURDE_MAIL,
    opmerking:
      "Inclusief de Private Groeilease (t/m maart onder het offertekanaal). Het doel 2026 rekende de groeilease nog bij offerte; daarom ligt dit cijfer er ver boven.",
  },
  {
    sleutel: "inruil",
    naam: "Udenhout.nl inruilvoorstel",
    groep: "eigen-website",
    doel2026: 7,
    regels: [
      { kanalen: ["Udenhout.nl inruilvoorstel"] },
      { kanalen: ["Udenhout.nl"], onderwerpBegintMet: ["inruil"] },
    ],
    nooitOnderwerpBegintMet: GEEN_DOORGESTUURDE_MAIL,
    opmerking:
      "Het formulier van de nieuwe website (sinds april 2026) levert veel meer inruilvoorstellen op dan het oude: ±1 per maand tot en met maart, daarna ±25. Het jaargemiddelde mengt die twee periodes.",
  },
  {
    sleutel: "contact",
    naam: "Udenhout.nl contact",
    groep: "eigen-website",
    doel2026: 122,
    regels: [
      { kanalen: ["Udenhout.nl contact"] },
      { kanalen: ["Udenhout.nl"], onderwerpBegintMet: ["Algemeen contactformulier"] },
    ],
    nooitOnderwerpBegintMet: GEEN_DOORGESTUURDE_MAIL,
    opmerking:
      "Het contactformulier van de nieuwe website (sinds april 2026) levert meer aanvragen op dan het oude kanaal.",
  },

  // --- PAH-websites -------------------------------------------------------------------
  { sleutel: "volkswagen-nl", naam: "Volkswagen.nl", groep: "pah", doel2026: 1378, regels: [{ kanalen: ["Volkswagen.nl"] }] },
  { sleutel: "skoda-nl", naam: "Skoda.nl", groep: "pah", doel2026: 1282, regels: [{ kanalen: ["Skoda.nl"] }] },
  {
    sleutel: "audi-nl",
    naam: "Audi.nl",
    groep: "pah",
    doel2026: 828,
    regels: [{ kanalen: ["Audi.nl", "Audi Proefritmodule"] }],
    opmerking: "Inclusief de Audi Proefritmodule (sinds april 2025).",
  },
  { sleutel: "seat-nl", naam: "Seat.nl", groep: "pah", doel2026: 214, regels: [{ kanalen: ["Seat.nl"] }] },
  {
    sleutel: "vwpfs",
    naam: "VW PFS private lease aanvraag",
    groep: "pah",
    doel2026: 460,
    regels: [{ kanalen: ["VWPFS private lease aanvraag"], onderwerpBevatNiet: ["retentie"] }],
    opmerking:
      "Zonder retentieleads (een bestaand contract dat afloopt): dat is geen nieuwe aanvraag. Het doel 2026 rekende die nog wel mee.",
  },
  {
    sleutel: "vw-bedrijfswagens-nl",
    naam: "VW Bedrijfswagens.nl",
    groep: "pah",
    doel2026: 50,
    regels: [{ kanalen: ["Vwbedrijfswagens.nl"] }],
  },

  // --- Externe portals ----------------------------------------------------------------
  {
    sleutel: "autoscout24",
    naam: "Autoscout24.nl & Autotrader",
    groep: "portals",
    doel2026: 457,
    regels: [{ kanalen: ["Autoscout24.nl & Autotrader", "Autotrader.nl"] }],
  },
  { sleutel: "autotrack", naam: "Autotrack.nl", groep: "portals", doel2026: 318, regels: [{ kanalen: ["Autotrack.nl"] }] },
  {
    sleutel: "viabovag",
    naam: "ViaBovag.nl",
    groep: "portals",
    doel2026: 402,
    regels: [{ kanalen: ["ViaBovag.nl", "viaBOVAG.nl_TB"] }],
  },
  {
    sleutel: "financiallease",
    naam: "Financiallease.nl",
    groep: "portals",
    doel2026: 14,
    regels: [{ kanalen: ["Financiallease.nl", "Financiallease.nl_TB"] }],
  },
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
