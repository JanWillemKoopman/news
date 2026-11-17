import {
  PLATFORM_LABEL,
  campagneSleutel,
  heeftKostenbron,
  isKoppelbareCampagne,
  kanaalVan,
  type BetaaldPlatform,
} from "@/lib/leads/kanaal";

/**
 * Leads (GA4) koppelen aan uitgaven (Google Ads en Meta Ads).
 *
 * De vraag die dit beantwoordt: van de leads die binnenkwamen, hoeveel waren betaald, en
 * wat is daarvoor uitgegeven? De koppeling loopt over **platform én campagnenaam**, niet
 * over de naam alleen. Bing-verkeer in GA4 heeft dezelfde campagnenamen als Google
 * ("T | Branding VDU"); op naam alleen zouden Google's kosten aan Bing-leads blijven
 * hangen, en dat is een fout die er plausibel uitziet.
 *
 * ## Hoe kosten worden toegerekend
 *
 * Een campagne kost een bedrag en levert leads. Elke lead van die campagne krijgt
 * `uitgaven ÷ leads` mee: een campagne van € 500 met tien leads maakt elke lead € 50. Een
 * rij (dag × merk × model × …) krijgt `aantal × dat bedrag`, zodat de kosten ook per merk,
 * model of formulier op te tellen zijn zonder dat er iets bij komt of af valt.
 *
 * Dat is een **verdeling**, geen meting. Google en Meta weten niet welke lead welk geld
 * kostte; het is het gemiddelde van de campagne. Een proefritlead en een vacaturelead uit
 * dezelfde campagne kosten hier evenveel, ook al waren ze in werkelijkheid niet even
 * moeilijk te krijgen. De UI zegt dat er expliciet bij.
 *
 * ## Wat er niet in verdwijnt
 *
 * Er mag geen euro zoekraken, in geen van beide richtingen:
 *
 *  - **Uitgaven zonder lead**: een campagne met kosten en nul leads krijgt niets
 *    toegerekend en staat in `zonderLead`. Zonder dat zou de som van de kosten per lead
 *    lager uitvallen dan wat er werkelijk is uitgegeven, en leest elke campagne die niets
 *    opleverde als gratis.
 *  - **Betaald zonder kosten**: een betaalde lead waarvan we de kosten niet vinden (Bing,
 *    LinkedIn, of een campagnenaam die niet meer bestaat) krijgt `kosten: null` en een
 *    status die zegt waarom. Dat is iets anders dan `0` — nul zou beweren dat het gratis was.
 *
 * `koppel.test.ts` rekent na dat toegerekende kosten plus uitgaven zonder lead precies de
 * uitgaven zijn.
 *
 * Pure functies: geen database, geen React.
 */

/** Wat de database van een leadrij levert (zie `lib/leads/normaliseer.ts`). */
export interface LeadInvoer {
  datum: string;
  event: string;
  bronMedium: string;
  campagne: string;
  merk: string;
  model: string;
  formulier: string;
  aantal: number;
}

/** De uitgaven van één campagne over het hele venster, uit `v_leads_uitgaven`. */
export interface UitgavenInvoer {
  bron: "google" | "meta";
  campagne: string;
  uitgaven: number;
  klikken: number;
  vertoningen: number;
}

/**
 * Waarom een lead wel of geen kosten heeft.
 *
 *  - `toegerekend`  — betaald, en de campagne is bij Google of Meta teruggevonden
 *  - `onbetaald`    — geen betaald verkeer; kosten zijn € 0
 *  - `geen-match`   — betaald via Google of Meta, maar de campagne is er niet te vinden
 *                     (leeg, "(not set)", een andere naam dan in Ads)
 *  - `geen-bron`    — betaald via een platform zonder kostenbron hier (Bing, LinkedIn)
 */
export type KostenStatus = "toegerekend" | "onbetaald" | "geen-match" | "geen-bron";

export interface LeadRegel extends LeadInvoer {
  kanaal: string;
  platform: BetaaldPlatform | null;
  status: KostenStatus;
  /** Toegerekende kosten; `null` als ze onbekend zijn (zie `status`), `0` als onbetaald. */
  kosten: number | null;
}

/** Eén regel in de tabel Betaalde campagnes. */
export interface CampagneRegel {
  platform: BetaaldPlatform;
  campagne: string;
  /** `null` als de kosten niet te vinden zijn: een andere campagnenaam of geen kostenbron. */
  uitgaven: number | null;
  klikken: number | null;
  leads: number;
  status: Exclude<KostenStatus, "onbetaald">;
}

export interface Koppeling {
  regels: LeadRegel[];
  campagnes: CampagneRegel[];
  /** Uitgaven van campagnes die in dit venster geen enkele lead opleverden. */
  zonderLead: { uitgaven: number; campagnes: number };
  /** Alles wat Google en Meta in dit venster uitgaven. */
  uitgavenTotaal: number;
}

function sleutelVan(platform: BetaaldPlatform, campagne: string): string {
  return `${platform}\u0000${campagneSleutel(campagne)}`;
}

interface UitgavenPerCampagne {
  naam: string;
  uitgaven: number;
  klikken: number;
}

/**
 * Leads en uitgaven → regels met toegerekende kosten.
 *
 * Twee campagnes die alleen in hoofdletters of streepjes verschillen vallen samen: hun
 * uitgaven tellen op, net als hun leads. Wie de laatste liet winnen, gooide een deel van
 * het geld weg zonder dat iets dat meldde.
 */
export function koppelLeads(leads: LeadInvoer[], uitgaven: UitgavenInvoer[]): Koppeling {
  // 1. De uitgaven per (platform, campagne). Het eerste voorkomen levert de weergavenaam.
  const kosten = new Map<string, UitgavenPerCampagne>();
  let uitgavenTotaal = 0;
  for (const u of uitgaven) {
    // Ook een Ads-campagne zonder bruikbare naam telt mee: ze kan nooit aan GA4 gekoppeld
    // worden (een lead met zo'n campagne is niet te herleiden), maar het geld is wel
    // uitgegeven en hoort dus in het totaal en in "zonder lead".
    uitgavenTotaal += u.uitgaven;
    const naam = u.campagne || "(zonder naam)";
    const sleutel = sleutelVan(u.bron, naam);
    const bestaand = kosten.get(sleutel);
    if (bestaand) {
      bestaand.uitgaven += u.uitgaven;
      bestaand.klikken += u.klikken;
    } else {
      kosten.set(sleutel, { naam, uitgaven: u.uitgaven, klikken: u.klikken });
    }
  }

  // 2. Hoeveel leads heeft elke campagne? Alleen betaalde leads van platformen met een
  //    kostenbron tellen mee; dat is de noemer van "uitgaven ÷ leads".
  const leadsPerCampagne = new Map<string, number>();
  const ingedeeld = leads.map((lead) => {
    const { kanaal, platform } = kanaalVan(lead.bronMedium);
    const koppelbaar =
      platform !== null && heeftKostenbron(platform) && isKoppelbareCampagne(lead.campagne);
    const sleutel = koppelbaar && platform ? sleutelVan(platform, lead.campagne) : null;
    const gevonden = sleutel !== null && kosten.has(sleutel);
    if (gevonden && sleutel) {
      leadsPerCampagne.set(sleutel, (leadsPerCampagne.get(sleutel) ?? 0) + lead.aantal);
    }
    return { lead, kanaal, platform, sleutel: gevonden ? sleutel : null };
  });

  // 3. Per leadrij de status en de toegerekende kosten.
  const regels: LeadRegel[] = ingedeeld.map(({ lead, kanaal, platform, sleutel }) => {
    if (platform === null) {
      return { ...lead, kanaal, platform, status: "onbetaald", kosten: 0 };
    }
    if (!heeftKostenbron(platform)) {
      return { ...lead, kanaal, platform, status: "geen-bron", kosten: null };
    }
    if (sleutel === null) {
      return { ...lead, kanaal, platform, status: "geen-match", kosten: null };
    }
    const campagne = kosten.get(sleutel);
    const aantalLeads = leadsPerCampagne.get(sleutel) ?? 0;
    const perLead = campagne && aantalLeads > 0 ? campagne.uitgaven / aantalLeads : 0;
    return { ...lead, kanaal, platform, status: "toegerekend", kosten: lead.aantal * perLead };
  });

  // 4. De campagnetabel: alle campagnes mét uitgaven, plus betaalde campagnes uit GA4
  //    waarvan de kosten ontbreken — dié moeten zichtbaar zijn, niet wegvallen.
  const campagnes: CampagneRegel[] = [];
  let zonderLead = { uitgaven: 0, campagnes: 0 };

  for (const [sleutel, k] of kosten) {
    const platform = sleutel.split("\u0000")[0] as BetaaldPlatform;
    const leadsAantal = leadsPerCampagne.get(sleutel) ?? 0;
    campagnes.push({
      platform,
      campagne: k.naam,
      uitgaven: k.uitgaven,
      klikken: k.klikken,
      leads: leadsAantal,
      status: "toegerekend",
    });
    if (leadsAantal === 0 && k.uitgaven > 0) {
      zonderLead = { uitgaven: zonderLead.uitgaven + k.uitgaven, campagnes: zonderLead.campagnes + 1 };
    }
  }

  const zonderKosten = new Map<string, CampagneRegel>();
  for (const r of regels) {
    if (r.platform === null || r.status === "toegerekend") continue;
    const naam = r.campagne || "(geen campagne)";
    const sleutel = `${r.platform}\u0000${campagneSleutel(naam)}`;
    const bestaand = zonderKosten.get(sleutel);
    if (bestaand) bestaand.leads += r.aantal;
    else {
      zonderKosten.set(sleutel, {
        platform: r.platform,
        campagne: naam,
        uitgaven: null,
        klikken: null,
        leads: r.aantal,
        status: r.status === "geen-bron" ? "geen-bron" : "geen-match",
      });
    }
  }
  campagnes.push(...zonderKosten.values());

  campagnes.sort(
    (a, b) =>
      (b.uitgaven ?? -1) - (a.uitgaven ?? -1) ||
      b.leads - a.leads ||
      a.campagne.localeCompare(b.campagne, "nl"),
  );

  return { regels, campagnes, zonderLead, uitgavenTotaal };
}

/** Hoe een platform in een zin heet, voor de uitleg bij "kosten onbekend". */
export function platformNaam(platform: BetaaldPlatform): string {
  return PLATFORM_LABEL[platform];
}
