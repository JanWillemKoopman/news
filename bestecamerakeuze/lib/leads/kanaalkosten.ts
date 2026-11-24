import type { CampagneRegel, Koppeling, LeadRegel } from "@/lib/leads/koppel";

/**
 * Handmatige kosten per sessiebron/medium en maand, verdeeld over de leads.
 *
 * Sommige kanalen kosten geld zonder dat dit dashboard het weet: Gaspedaal
 * (`gaspedaal.nl / referral`) staat in GA4 als verwijzing, maar wordt per maand
 * gefactureerd. Op het tabblad Leads vult iedere gebruiker daarvoor per bron/medium per maand een
 * bedrag in (de knop "Kostenverdeling", tabel `dataloket.lead_kanaalkosten`). Dit bestand
 * rekent dat bedrag toe aan de leads.
 *
 * ## Hoe het rekent
 *
 * Een maandbedrag hoort bij een hele maand; de leadtabel beslaat dertig dagen die meestal
 * over twee maanden lopen. Daarom telt van elke maand alleen het deel dat in het venster
 * valt, **naar rato van de dagen** (maandbedrag ÷ dagen in de maand × dagen in het venster):
 * van € 20.000 in oktober (31 dagen) telt bij een venster van 23 oktober t/m 21 november
 * 9/31 = € 5.806. Zou de hele € 20.000 over de leads van 23–31 oktober gaan, dan kostte een
 * Gaspedaal-lead daar ineens drie keer zoveel.
 *
 * Voor de lopende maand is dat precies wat de eigenaar vroeg: op de 20e (data t/m de 20e)
 * telt 20 × het daggemiddelde, dus 2/3 van een maand van 30 dagen, gedeeld door de leads van
 * 1 t/m 20 — de geschatte kosten per lead tot nu toe, zonder te wachten op de factuur.
 *
 * Dat deel gaat gelijk over de leads van die bron/medium in die maand (binnen het venster):
 * € 5.806 en twaalf leads is € 484 per lead — net als bij een advertentiecampagne een
 * verdeling, geen meting.
 *
 * ## Wat er niet in verdwijnt
 *
 *  - **Een bedrag zonder lead** in die maand telt mee in het totaal en in "zonder lead", en
 *    staat als regel in de campagnetabel — net als een advertentiecampagne zonder lead.
 *  - **Onbetaald verkeer met een bedrag** (`platform === null`) wordt betaald, met platform
 *    `handmatig`: wie ervoor betaalt, betaalt ervoor.
 *  - **Betaald verkeer met een bedrag** houdt zijn platform. Had het al kosten (Google Ads),
 *    dan komt het bedrag erbij; had het geen kostenbron (Bing), dan zijn de kosten nu bekend.
 *
 * `kanaalkosten.test.ts` rekent na dat er geen euro bij komt of af gaat.
 *
 * Pure functies: geen database, geen React.
 */

/** De jaren waarvoor maandbedragen in te vullen zijn (verzoek van de eigenaar, november 2026). */
export const KOSTEN_JAREN = [2025, 2026, 2027] as const;

/** Eén ingevuld bedrag: bron/medium zoals GA4 hem levert, maand als `JJJJ-MM`. */
export interface Kanaalkost {
  bronMedium: string;
  maand: string;
  bedrag: number;
}

/** Wat er van één ingevuld bedrag in het venster terechtkwam. */
export interface HandmatigePost {
  bronMedium: string;
  maand: string;
  /** Het ingevulde maandbedrag. */
  bedrag: number;
  /** Het deel dat in het venster valt (naar rato van de dagen). */
  inVenster: number;
  leads: number;
}

export interface KoppelingMetKanaalkosten extends Koppeling {
  handmatig: HandmatigePost[];
}

/** Hoofdletters en spaties aan de rand zijn geen verschil tussen twee bronnen. */
export function bronMediumSleutel(bronMedium: string): string {
  return bronMedium.trim().toLowerCase();
}

function dag(datum: string): number {
  return Date.parse(`${datum}T00:00:00Z`) / 86_400_000;
}

function dagenInMaand(maand: string): number {
  const [jaar, m] = maand.split("-").map(Number);
  return new Date(Date.UTC(jaar, m, 0)).getUTCDate();
}

/** Welk deel (0–1) van een maand (`JJJJ-MM`) binnen `van` t/m `tot` valt. */
export function maandAandeel(maand: string, van: string, tot: string): number {
  const totaal = dagenInMaand(maand);
  const begin = dag(`${maand}-01`);
  const eind = begin + totaal - 1;
  const overlap = Math.min(eind, dag(tot)) - Math.max(begin, dag(van)) + 1;
  return overlap > 0 ? overlap / totaal : 0;
}

/** De maanden (`JJJJ-MM`) die `van` t/m `tot` raakt. */
export function maandenInVenster(van: string, tot: string): string[] {
  const uit: string[] = [];
  let [jaar, maand] = van.slice(0, 7).split("-").map(Number);
  const laatste = tot.slice(0, 7);
  for (;;) {
    const m = `${jaar}-${String(maand).padStart(2, "0")}`;
    uit.push(m);
    if (m >= laatste) break;
    maand += 1;
    if (maand > 12) {
      maand = 1;
      jaar += 1;
    }
  }
  return uit;
}

function postSleutel(bronMedium: string, maand: string): string {
  return `${bronMediumSleutel(bronMedium)}\u0000${maand}`;
}

/**
 * Legt de handmatige kosten over een koppeling heen. De koppeling zelf blijft ongemoeid; er
 * komt een nieuwe terug.
 */
export function pasKanaalkostenToe(
  koppeling: Koppeling,
  kosten: Kanaalkost[],
  van: string,
  tot: string,
): KoppelingMetKanaalkosten {
  // 1. Per (bron/medium, maand) het deel dat in het venster valt. Twee regels die alleen in
  //    hoofdletters verschillen tellen op.
  const posten = new Map<string, HandmatigePost>();
  for (const k of kosten) {
    if (!(k.bedrag > 0)) continue;
    const aandeel = maandAandeel(k.maand, van, tot);
    if (aandeel <= 0) continue;
    const sleutel = postSleutel(k.bronMedium, k.maand);
    const bestaand = posten.get(sleutel);
    if (bestaand) {
      bestaand.bedrag += k.bedrag;
      bestaand.inVenster += k.bedrag * aandeel;
    } else {
      posten.set(sleutel, {
        bronMedium: k.bronMedium.trim(),
        maand: k.maand,
        bedrag: k.bedrag,
        inVenster: k.bedrag * aandeel,
        leads: 0,
      });
    }
  }

  if (posten.size === 0) return { ...koppeling, handmatig: [] };

  // 2. Hoeveel leads heeft elke post? Dat is de noemer.
  for (const r of koppeling.regels) {
    const post = posten.get(postSleutel(r.bronMedium, r.datum.slice(0, 7)));
    if (post) post.leads += r.aantal;
  }

  // 3. Per leadrij zijn deel.
  const regels: LeadRegel[] = koppeling.regels.map((r) => {
    const post = posten.get(postSleutel(r.bronMedium, r.datum.slice(0, 7)));
    if (!post || post.leads === 0) return r;
    const extra = (r.aantal * post.inVenster) / post.leads;
    const basis = r.status === "toegerekend" ? (r.kosten ?? 0) : 0;
    return {
      ...r,
      platform: r.platform ?? "handmatig",
      status: "toegerekend",
      kosten: basis + extra,
      handmatigeKosten: extra,
    };
  });

  // 4. Totalen, "zonder lead" en de campagnetabel.
  let inVensterTotaal = 0;
  const zonderLead = { ...koppeling.zonderLead };
  const perBron = new Map<string, CampagneRegel>();
  for (const post of posten.values()) {
    inVensterTotaal += post.inVenster;
    if (post.leads === 0) {
      zonderLead.uitgaven += post.inVenster;
      zonderLead.campagnes += 1;
    }
    const sleutel = bronMediumSleutel(post.bronMedium);
    const rij = perBron.get(sleutel);
    if (rij) {
      rij.uitgaven = (rij.uitgaven ?? 0) + post.inVenster;
      rij.leads += post.leads;
    } else {
      perBron.set(sleutel, {
        platform: "handmatig",
        campagne: post.bronMedium,
        uitgaven: post.inVenster,
        klikken: null,
        leads: post.leads,
        status: "toegerekend",
      });
    }
  }

  return {
    regels,
    campagnes: [...koppeling.campagnes, ...perBron.values()],
    zonderLead,
    uitgavenTotaal: koppeling.uitgavenTotaal + inVensterTotaal,
    uitgavenPerPlatform: {
      ...koppeling.uitgavenPerPlatform,
      handmatig: (koppeling.uitgavenPerPlatform.handmatig ?? 0) + inVensterTotaal,
    },
    handmatig: [...posten.values()].sort(
      (a, b) => a.bronMedium.localeCompare(b.bronMedium, "nl") || a.maand.localeCompare(b.maand),
    ),
  };
}

/** Een geldig maandbedrag uit invoer: leeg = geen bedrag, negatief of geen getal = ongeldig. */
export function leesBedrag(waarde: unknown): number | null | "ongeldig" {
  if (waarde === null || waarde === undefined || waarde === "") return null;
  const n =
    typeof waarde === "number"
      ? waarde
      : Number(String(waarde).replace(/[€\s.]/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return "ongeldig";
  return n === 0 ? null : Math.round(n * 100) / 100;
}
