/**
 * De uitsplitsing achter de cijfers in Campagne analyse (de hover): per advertentieplatform, per
 * kanaal, per lead-event, per soort lead en per klantgroep.
 *
 * **Betrouwbaarheid is het hele punt.** De uitsplitsing komt van de analyse (`kerncijfers.uitsplitsing`),
 * maar een model schrijft hem, dus het dashboard vertrouwt hem niet blind: een blok wordt alleen
 * getoond als zijn regels precies optellen tot het cijfer waar het bij hoort (zelfde definitie, zelfde
 * periode). Klopt de som niet, of is het cijfer zelf onbekend, dan blijft het blok weg en is er geen
 * hover. Een uitsplitsing die niet optelt is erger dan geen uitsplitsing.
 *
 * Daarnaast staan hier de afgeleide cijfers die het overzicht al uit zijn eigen getallen kan
 * berekenen (kosten per klik, per bezoeker en per lead; prognose bij het huidige tempo).
 */

import type {
  MaKerncijfers,
  MaUitsplitsingEvent,
  MaUitsplitsingPlatform,
  MaUitsplitsingRegel,
} from "@/lib/marketingAnalyse/types";

/** Hoeveel regels een blok hoogstens krijgt; meer is niet te lezen in een popover. */
const MAX_REGELS = 12;
const MAX_TEKST = 80;

/** Een bedrag mag een euro afwijken (afronding in de analyse), aantallen niet. */
const EURO_MARGE = 1;

function getal(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function tekst(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const t = x.trim();
  return t ? t.slice(0, MAX_TEKST) : null;
}

function som(waarden: readonly number[]): number {
  return waarden.reduce((a, b) => a + b, 0);
}

function leesRegels(ruw: unknown): MaUitsplitsingRegel[] | null {
  if (!Array.isArray(ruw)) return null;
  const regels: MaUitsplitsingRegel[] = [];
  for (const r of ruw) {
    const naam = tekst((r as { naam?: unknown })?.naam);
    const aantal = getal((r as { aantal?: unknown })?.aantal);
    if (!naam || aantal === null || aantal < 0) return null;
    regels.push({ naam, detail: tekst((r as { detail?: unknown }).detail), aantal });
  }
  return regels.length > 0 && regels.length <= MAX_REGELS ? regels : null;
}

function leesEvents(ruw: unknown): MaUitsplitsingEvent[] | null {
  const regels = leesRegels(ruw);
  if (!regels || !Array.isArray(ruw)) return null;
  return regels.map((r, i) => ({ ...r, telt: (ruw[i] as { telt?: unknown })?.telt === true }));
}

function leesPlatforms(ruw: unknown): MaUitsplitsingPlatform[] | null {
  if (!Array.isArray(ruw) || ruw.length === 0 || ruw.length > MAX_REGELS) return null;
  const platforms: MaUitsplitsingPlatform[] = [];
  for (const r of ruw) {
    const naam = tekst((r as { naam?: unknown })?.naam);
    if (!naam) return null;
    platforms.push({
      naam,
      kosten: getal((r as { kosten?: unknown }).kosten),
      vertoningen: getal((r as { vertoningen?: unknown }).vertoningen),
      klikken: getal((r as { klikken?: unknown }).klikken),
    });
  }
  return platforms;
}

/** Tellen de regels precies op tot het cijfer? Zonder cijfer is er niets om tegen te controleren. */
function klopt(regels: readonly { aantal: number }[], totaal: number | null | undefined): boolean {
  return typeof totaal === "number" && Number.isFinite(totaal) && som(regels.map((r) => r.aantal)) === totaal;
}

/** Het platform met alle drie de getallen die voor de CTR nodig zijn (klikken ÷ vertoningen). */
export type PlatformRegel = MaUitsplitsingPlatform & { ctr: number | null };

export interface GeldigeUitsplitsing {
  /** Kosten per platform, tegen `kosten`. */
  kosten: MaUitsplitsingPlatform[] | null;
  /** Klikken en vertoningen per platform, tegen `klikken` en `vertoningenAds`; met de CTR per platform. */
  ctr: PlatformRegel[] | null;
  sessies: MaUitsplitsingRegel[] | null;
  leadsGa4: MaUitsplitsingEvent[] | null;
  /** De leads in Google Analytics per kanaal, tegen `leadsGa4`. */
  leadsKanaal: MaUitsplitsingRegel[] | null;
  leadsInternet: MaUitsplitsingRegel[] | null;
  orders: MaUitsplitsingRegel[] | null;
}

export const GEEN_UITSPLITSING: GeldigeUitsplitsing = {
  kosten: null,
  ctr: null,
  sessies: null,
  leadsGa4: null,
  leadsKanaal: null,
  leadsInternet: null,
  orders: null,
};

/**
 * De uitsplitsingen van een analyse die kloppen met haar eigen kerncijfers, grootste eerst. Elk blok
 * dat niet klopt of ontbreekt is `null`.
 */
export function leesUitsplitsing(k: MaKerncijfers | null | undefined): GeldigeUitsplitsing {
  const u = k?.uitsplitsing;
  if (!k || !u || typeof u !== "object") return GEEN_UITSPLITSING;

  const platforms = leesPlatforms(u.platforms);
  let kosten: MaUitsplitsingPlatform[] | null = null;
  let ctr: PlatformRegel[] | null = null;
  if (platforms) {
    const metKosten = platforms.every((p) => p.kosten !== null);
    if (metKosten && typeof k.kosten === "number" && Math.abs(som(platforms.map((p) => p.kosten ?? 0)) - k.kosten) <= EURO_MARGE) {
      kosten = [...platforms].sort((a, b) => (b.kosten ?? 0) - (a.kosten ?? 0));
    }
    const metCtr = platforms.every((p) => p.klikken !== null && p.vertoningen !== null);
    if (
      metCtr &&
      typeof k.klikken === "number" &&
      typeof k.vertoningenAds === "number" &&
      som(platforms.map((p) => p.klikken ?? 0)) === k.klikken &&
      som(platforms.map((p) => p.vertoningen ?? 0)) === k.vertoningenAds
    ) {
      ctr = platforms
        .map((p) => ({ ...p, ctr: p.vertoningen ? ((p.klikken ?? 0) / p.vertoningen) * 100 : null }))
        .sort((a, b) => (b.vertoningen ?? 0) - (a.vertoningen ?? 0));
    }
  }

  const sorteer = <T extends { aantal: number }>(regels: T[] | null) =>
    regels ? [...regels].sort((a, b) => b.aantal - a.aantal) : null;

  const sessies = leesRegels(u.sessies);
  const events = leesEvents(u.leadsGa4);
  const telt = events?.filter((e) => e.telt) ?? [];
  // De regels die meetellen moeten optellen tot `leadsGa4`. Staat er ook een cijfer voor alle
  // lead-events (`leadEvents`) en tellen alle regels daar niet toe op, dan houden we alleen de regels
  // die meetellen: dat is dan nog steeds een kloppende uitsplitsing van het getal in het overzicht.
  let leadsGa4: MaUitsplitsingEvent[] | null = null;
  if (events && telt.length > 0 && klopt(telt, k.leadsGa4)) {
    leadsGa4 = k.leadEvents != null && !klopt(events, k.leadEvents) ? telt : events;
  }
  const leadsKanaal = leesRegels(u.leadsKanaal);
  const leadsInternet = leesRegels(u.leadsInternet);
  const orders = leesRegels(u.orders);

  return {
    kosten,
    ctr,
    sessies: sessies && klopt(sessies, k.sessies) ? sorteer(sessies) : null,
    leadsGa4: sorteer(leadsGa4),
    leadsKanaal: leadsKanaal && klopt(leadsKanaal, k.leadsGa4) ? sorteer(leadsKanaal) : null,
    leadsInternet: leadsInternet && klopt(leadsInternet, k.leadsInternet) ? sorteer(leadsInternet) : null,
    orders: orders && klopt(orders, k.ordersSyntec) ? sorteer(orders) : null,
  };
}

/** Een naam om platform en kanaal mee te vergelijken: zonder hoofdletters en overtollige spaties. */
export function vergelijkNaam(naam: string): string {
  return naam.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Het aandeel van een regel in het totaal, in procenten; null als het totaal nul is. */
export function aandeel(deel: number | null | undefined, totaal: number | null | undefined): number | null {
  if (typeof deel !== "number" || typeof totaal !== "number" || totaal <= 0) return null;
  return (deel / totaal) * 100;
}

/** Kosten per eenheid (klik, bezoeker, lead); null zonder kosten of zonder eenheden. */
export function kostenPer(kosten: number | null | undefined, aantal: number | null | undefined): number | null {
  if (typeof kosten !== "number" || typeof aantal !== "number" || aantal <= 0) return null;
  return kosten / aantal;
}

/**
 * Wat er aan het einde van de looptijd uitkomt als het tempo van tot nu toe gelijk blijft: een
 * rechte lijn (waarde ÷ verstreken dagen × alle dagen), zoals de forecast op Budget beheer.
 * Pas zinvol vanaf een paar dagen; daaronder is één dag te veel van de uitkomst.
 */
export function prognoseBijHuidigTempo(
  waarde: number | null | undefined,
  dag: number | null | undefined,
  dagen: number | null | undefined,
): number | null {
  if (typeof waarde !== "number" || !dag || !dagen || dag < 3 || dagen <= 0) return null;
  return (waarde / dag) * dagen;
}
