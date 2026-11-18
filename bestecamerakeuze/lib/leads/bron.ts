import { metVerbinding } from "@/lib/kanalen/bron";
import { LEADS_GOOGLE_ACCOUNT, LEADS_LINKEDIN_ACCOUNT, LEADS_META_ACCOUNT } from "@/lib/leads/bereik";
import type { BetaaldPlatform } from "@/lib/leads/kanaal";
import {
  koppelLeads,
  type CampagneRegel,
  type LeadInvoer,
  type LeadRegel,
  type UitgavenInvoer,
} from "@/lib/leads/koppel";

/**
 * De data achter het tabblad Leads: de leads uit `v_ga4_leads`, de uitgaven uit
 * `v_leads_uitgaven`, en daartussen de koppeling van `koppel.ts`.
 *
 * Twee kleine queries en geen join in SQL. De koppeling gaat over platform én
 * campagnenaam, met een genormaliseerde naam (hoofdletters, soort streepje) — dat hoort
 * in getest TypeScript en niet in een `on lower(...) = lower(...)` die niemand
 * terugleest. Beide tabellen zijn klein: ±1.100 leadrijen en ±70 campagnes.
 *
 * ## Welke uitgaven
 *
 * Dezelfde periode als de leads, en wel de periode die de leadtabel zelf beslaat
 * (`min(datum)` t/m `max(datum)`) en niet "de laatste dertig dagen vanaf nu". Draait de
 * sync een paar nachten niet, dan staan de leads op een oudere stand; de uitgaven van
 * dié periode erbij zoeken is eerlijk, die van de dagen erna zou kosten zonder leads
 * opleveren.
 */

export interface LeadsData {
  /** De periode die de leadtabel beslaat; `null` als hij leeg is. */
  van: string | null;
  tot: string | null;
  regels: LeadRegel[];
  campagnes: CampagneRegel[];
  zonderLead: { uitgaven: number; campagnes: number };
  uitgavenTotaal: number;
  uitgavenPerPlatform: Partial<Record<BetaaldPlatform, number>>;
}

export async function haalLeads(): Promise<LeadsData> {
  return metVerbinding(async (client) => {
    const leadRes = await client.query(
      `select datum::text as datum, event, bron_medium, campagne, merk, model, formulier, aantal
         from dataloket.v_ga4_leads
        order by datum, event`,
    );
    const leads: LeadInvoer[] = leadRes.rows.map((r) => ({
      datum: String(r.datum),
      event: String(r.event),
      bronMedium: String(r.bron_medium),
      campagne: String(r.campagne),
      merk: String(r.merk),
      model: String(r.model),
      formulier: String(r.formulier),
      aantal: Number(r.aantal),
    }));

    if (leads.length === 0) {
      return {
        van: null,
        tot: null,
        regels: [],
        campagnes: [],
        zonderLead: { uitgaven: 0, campagnes: 0 },
        uitgavenTotaal: 0,
        uitgavenPerPlatform: {},
      };
    }

    const van = leads[0].datum;
    const tot = leads[leads.length - 1].datum;

    // Geen `having sum(uitgaven) > 0`: een campagne met € 0 en wél leads (een campagne die
    // in de periode werd gepauzeerd, of een Pmax zonder budget) hoort als "€ 0" gekoppeld
    // te worden en niet als "campagne niet gevonden".
    const uitgavenRes = await client.query(
      `select bron, campagne,
              coalesce(sum(uitgaven), 0) as uitgaven,
              coalesce(sum(klikken), 0) as klikken,
              coalesce(sum(vertoningen), 0) as vertoningen
         from dataloket.v_leads_uitgaven
        where datum between $1 and $2
          and ((bron = 'google' and account_id = $3) or (bron = 'meta' and account_id = $4)
               or (bron = 'linkedin' and account_id = $5))
        group by bron, campagne`,
      [van, tot, LEADS_GOOGLE_ACCOUNT, LEADS_META_ACCOUNT, LEADS_LINKEDIN_ACCOUNT],
    );
    const uitgaven: UitgavenInvoer[] = uitgavenRes.rows.map((r) => ({
      bron: r.bron === "meta" ? "meta" : r.bron === "linkedin" ? "linkedin" : "google",
      campagne: String(r.campagne ?? ""),
      uitgaven: Number(r.uitgaven),
      klikken: Number(r.klikken),
      vertoningen: Number(r.vertoningen),
    }));

    const koppeling = koppelLeads(leads, uitgaven);
    return { van, tot, ...koppeling };
  });
}
