import type { Ga4Koppeling } from "@/lib/ga4Koppeling";

/**
 * Waar de resultaten van een campagne vandaan komen: uit Syntec (leads en orders in de
 * sheet) of uit Google Analytics (de GA-koppeling op Campagnebeheer). Een campagne meet
 * het één óf het ander; de groep die niet van toepassing is toont "n.v.t." en staat
 * gedimd in de campagnetabel, zodat een lege Leads-rij niet leest als "nul leads".
 *
 * - **Google Analytics** zodra er een GA-koppeling (regels) of een GA-doel is.
 * - **Syntec** zodra er leads binnen zijn of er een doel op leads of orders staat.
 * - Staan ze er allebei, dan wint Google Analytics: een koppeling is een bewuste keuze
 *   voor díe campagne, terwijl een sheetveld ook een doorgetrokken formule of een
 *   restant kan zijn.
 * - Geen van beide: `null`, en dan wordt niets gedimd — er valt nog niets te kiezen.
 *
 * Bewust zonder React en zonder database, zodat de regel getest is (`campagneBron.test.ts`).
 */
export type CampagneBron = "syntec" | "ga";

export interface SyntecVelden {
  leads: number | null;
  doelLeads: number | null;
  doelOrders: number | null;
}

export function bronVanCampagne(
  campagne: SyntecVelden,
  koppeling: Pick<Ga4Koppeling, "regels" | "doelConversies"> | undefined,
): CampagneBron | null {
  if (koppeling && (koppeling.regels.length > 0 || koppeling.doelConversies !== null)) return "ga";
  if ((campagne.leads ?? 0) > 0 || campagne.doelLeads !== null || campagne.doelOrders !== null) {
    return "syntec";
  }
  return null;
}
