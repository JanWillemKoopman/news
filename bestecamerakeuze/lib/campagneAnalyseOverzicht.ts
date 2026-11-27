/**
 * Rekenwerk voor het tabblad **Campagne analyse** (Campagnes → Campagne analyse): de Campagne
 * analyses uit Marketing analyse, als campagnes naast elkaar. Los van het component zodat het
 * getest kan worden (`campagneAnalyseOverzicht.test.ts`).
 *
 * De cijfers zelf komen uit dezelfde bron en dezelfde functie als het overzicht in Marketing
 * analyse (`overzichtCijfers`), zodat beide pagina's altijd hetzelfde getal tonen.
 */

import { looptijdDagen, verstrekenPct } from "@/lib/campagneTimeline";
import { isLive, overzichtCijfers } from "@/lib/marketingAnalyse/rekenen";
import { STANDAARD_OPZET_ID, type MaKerncijfers } from "@/lib/marketingAnalyse/types";

/** "Online" = de campagne is nu live (vandaag binnen de looptijd), "offline" = niet. */
export type OnlineFilter = "online" | "offline";

export const ONLINE_FILTERS: readonly { id: OnlineFilter | null; naam: string }[] = [
  { id: null, naam: "Alle" },
  { id: "online", naam: "Online" },
  { id: "offline", naam: "Offline" },
];

/** Een Campagne analyse = een analyse met een opzet met het formulier "campagne" (geen rapportage). */
export function isCampagneAnalyse(
  c: { opzetId: string },
  opzetPerId: ReadonlyMap<string, { formulier: string }>,
): boolean {
  const opzet = opzetPerId.get(c.opzetId);
  return opzet ? opzet.formulier === "campagne" : c.opzetId === STANDAARD_OPZET_ID;
}

/** Alleen de online of offline campagnes; `null` laat alles door. */
export function filterOpOnline<T extends { startdatum: string | null; einddatum: string | null }>(
  campagnes: readonly T[],
  filter: OnlineFilter | null,
  vandaag: string,
): T[] {
  if (filter === null) return [...campagnes];
  return campagnes.filter((c) => isLive(c, vandaag) === (filter === "online"));
}

/** Hoeveel campagnes er online en offline zijn. */
export function telOnline(
  campagnes: readonly { startdatum: string | null; einddatum: string | null }[],
  vandaag: string,
): { online: number; offline: number } {
  const online = campagnes.filter((c) => isLive(c, vandaag)).length;
  return { online, offline: campagnes.length - online };
}

/** Waar een campagne in de looptijd staat: dag x van y en het verstreken deel in procenten. */
export type TijdVoortgang = { dag: number; dagen: number; pct: number };

export function tijdVoortgang(start: string | null, eind: string | null, vandaag: string): TijdVoortgang | null {
  const dagen = looptijdDagen(start, eind);
  const pct = verstrekenPct(start, eind, vandaag);
  if (dagen === null || pct === null) return null;
  return { dag: Math.min(dagen, Math.max(0, Math.round((pct / 100) * dagen))), dagen, pct };
}

type SamenvattingInvoer = {
  bedrijven: readonly string[];
  budget: number | null;
  doel: string | null;
  merk: string | null;
  modellen: readonly string[];
  startdatum: string | null;
  einddatum: string | null;
  laatsteAnalyse: { kerncijfers: MaKerncijfers } | null;
};

export type Samenvatting = {
  aantal: number;
  online: number;
  /** Mediakosten opgeteld over de campagnes met een analyse; null als geen enkele er een heeft. */
  kosten: number | null;
  /** Het budget van precies de campagnes die in `kosten` zitten, zodat beide sommen vergelijkbaar zijn. */
  budget: number | null;
  besteedPct: number | null;
  bezoekers: number | null;
  /** De leads in Google Analytics, opgeteld. De soort lead verschilt per campagne. */
  leads: number | null;
};

function som(waarden: readonly (number | null)[]): number | null {
  const gevuld = waarden.filter((w): w is number => w !== null);
  return gevuld.length === 0 ? null : gevuld.reduce((a, b) => a + b, 0);
}

/** De totalen boven de vergelijking, over de campagnes die op dat moment in beeld zijn. */
export function samenvatting(campagnes: readonly SamenvattingInvoer[], vandaag: string): Samenvatting {
  const cijfers = campagnes.map((c) => overzichtCijfers(c, c.laatsteAnalyse?.kerncijfers));
  const metKosten = cijfers.filter((o) => o.kosten !== null);
  const kosten = som(cijfers.map((o) => o.kosten));
  const budget = som(metKosten.map((o) => o.budget));
  return {
    aantal: campagnes.length,
    online: campagnes.filter((c) => isLive(c, vandaag)).length,
    kosten,
    budget,
    besteedPct: kosten !== null && budget ? (kosten / budget) * 100 : null,
    bezoekers: som(cijfers.map((o) => o.bezoekers)),
    leads: som(cijfers.map((o) => o.ga4Leads)),
  };
}
