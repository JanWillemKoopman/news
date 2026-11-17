import { heeftKostenbron, type BetaaldPlatform } from "@/lib/leads/kanaal";
import type { CampagneRegel } from "@/lib/leads/koppel";
import { kostenPerLead, type Groep } from "@/lib/leads/samenvatting";

/**
 * De rijen van de tabel Betaalde campagnes.
 *
 * Staat los van het component zodat de samenstelling te testen is: dit is de plek waar
 * een campagne zonder kosten, een campagne zonder lead en een gewone campagne in dezelfde
 * lijst komen, en waar er dus iets kan wegvallen zonder dat het opvalt.
 */

export interface CampagneRij {
  sleutel: string;
  platform: BetaaldPlatform;
  campagne: string;
  leads: number;
  /** Toegerekende kosten (gefilterd), of de uitgaven (campagne zonder lead). `null` = onbekend. */
  kosten: number | null;
  perLead: number | null;
  /** Waarom de kosten onbekend zijn; `null` als ze bekend zijn. */
  reden: string | null;
}

export function redenZonderKosten(platform: BetaaldPlatform): string {
  return heeftKostenbron(platform)
    ? "campagne niet gevonden bij het platform"
    : "geen kostenbron voor dit platform";
}

/**
 * Bouwt de rijen uit de gefilterde betaalde leads (gegroepeerd op platform + campagne), en
 * voegt daar de campagnes zonder lead aan toe.
 *
 * De aanroeper geeft die laatste alleen mee zonder filters: met een filter op merk of soort
 * zegt "deze campagne leverde niets op" niets meer over de campagne.
 */
export function bouwCampagneRijen(betaald: Groep[], zonderLead: CampagneRegel[]): CampagneRij[] {
  const rijen: CampagneRij[] = betaald.map((g) => {
    const [platform, campagne] = g.sleutel.split("\u0000") as [BetaaldPlatform, string];
    const bekend = g.metKosten > 0;
    return {
      sleutel: g.sleutel,
      platform,
      campagne: campagne || "(geen campagne)",
      leads: g.leads,
      kosten: bekend ? g.kosten : null,
      perLead: kostenPerLead(g),
      reden: bekend ? null : redenZonderKosten(platform),
    };
  });

  for (const c of zonderLead) {
    rijen.push({
      sleutel: `${c.platform}\u0000${c.campagne}\u0000zonder-lead`,
      platform: c.platform,
      campagne: c.campagne,
      leads: 0,
      kosten: c.uitgaven,
      perLead: null,
      reden: null,
    });
  }

  // Duurste eerst; campagnes zonder bekende kosten onderaan.
  return rijen.sort(
    (a, b) =>
      (b.kosten ?? -1) - (a.kosten ?? -1) ||
      b.leads - a.leads ||
      a.campagne.localeCompare(b.campagne, "nl"),
  );
}
