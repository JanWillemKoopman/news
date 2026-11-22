import type { Client } from "pg";
import { metVerbinding } from "@/lib/kanalen/bron";
import {
  LEADS_GA4_PROPERTY,
  LEADS_GOOGLE_ACCOUNT,
  LEADS_LINKEDIN_ACCOUNT,
  LEADS_META_ACCOUNT,
} from "@/lib/leads/bereik";
import {
  maandenInVenster,
  pasKanaalkostenToe,
  type HandmatigePost,
  type Kanaalkost,
} from "@/lib/leads/kanaalkosten";
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
  /** Wat er van de handmatige maandbedragen (Kostenverdeling) in dit venster telt. */
  handmatig: HandmatigePost[];
  /** Gezet als de handmatige kosten niet te lezen waren (bv. migratie 0041 nog niet gedraaid). */
  kanaalkostenFout: string | null;
}

/**
 * De handmatige maandbedragen van `van` t/m `tot` (op maand). In een savepoint: ontbreekt de
 * tabel nog, dan breekt dat de transactie van `metVerbinding` niet en tonen we de leads
 * gewoon zonder die kosten, met een melding.
 */
async function leesKanaalkosten(
  client: Client,
  vanMaand: string,
  totMaand: string,
): Promise<{ kosten: Kanaalkost[]; fout: string | null }> {
  await client.query("savepoint kanaalkosten");
  try {
    const res = await client.query(
      `select bron_medium, to_char(maand, 'YYYY-MM') as maand, bedrag
         from dataloket.lead_kanaalkosten
        where maand between $1::date and $2::date`,
      [`${vanMaand}-01`, `${totMaand}-01`],
    );
    await client.query("release savepoint kanaalkosten");
    return {
      kosten: res.rows.map((r) => ({
        bronMedium: String(r.bron_medium),
        maand: String(r.maand),
        bedrag: Number(r.bedrag),
      })),
      fout: null,
    };
  } catch (err) {
    await client.query("rollback to savepoint kanaalkosten");
    return { kosten: [], fout: err instanceof Error ? err.message : String(err) };
  }
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
        handmatig: [],
        kanaalkostenFout: null,
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

    const maanden = maandenInVenster(van, tot);
    const kanaalkosten = await leesKanaalkosten(client, maanden[0], maanden[maanden.length - 1]);
    const koppeling = pasKanaalkostenToe(koppelLeads(leads, uitgaven), kanaalkosten.kosten, van, tot);
    return { van, tot, ...koppeling, kanaalkostenFout: kanaalkosten.fout };
  });
}

/** Eén regel in de tabel Kostenverdeling. */
export interface KostenverdelingRegel {
  bronMedium: string;
  /** Sessies op udenhout.nl over alle beschikbare verkeersdata (zie `sessiesVan`). */
  sessies: number;
  /** Ingevulde bedragen per maand (`JJJJ-MM` → euro); een lege maand staat er niet in. */
  bedragen: Record<string, number>;
}

export interface KostenverdelingData {
  jaar: number;
  /**
   * De periode waarover de sessies geteld zijn: alles wat de verkeerstabel heeft (hij begint
   * op 1 augustus 2026), los van het gekozen jaar. Zo staat de lijst ook voor 2025 en 2027
   * klaar, jaren zonder sessies in de tabel.
   */
  sessiesVan: string | null;
  sessiesTot: string | null;
  regels: KostenverdelingRegel[];
}

/**
 * De tabel achter de knop Kostenverdeling: elke sessiebron/medium van udenhout.nl, op
 * sessies van hoog naar laag, met de ingevulde bedragen van het gekozen jaar. De sessies zijn
 * die van alle beschikbare data en niet die van het jaar: voor 2025 (vóór de verkeerstabel)
 * en 2027 (nog niet begonnen) zou de lijst anders leeg zijn en viel er niets in te vullen. Een bron/medium met
 * een bedrag maar zonder sessies in dat jaar staat er ook in (onderaan), anders zou een
 * ingevuld bedrag onvindbaar worden.
 *
 * Sessies komen uit `v_ga4_verkeer`; de bedragen worden hier met de leesrol gelezen, het
 * schrijven gaat via de route met de sessie van de gebruiker.
 */
export async function haalKostenverdeling(jaar: number): Promise<KostenverdelingData> {
  return metVerbinding(async (client) => {
    const van = `${jaar}-01-01`;
    const [sessiesRes, kostenRes, bereikRes] = await Promise.all([
      client.query(
        `select bron_medium, sum(sessies)::bigint as sessies
           from dataloket.v_ga4_verkeer
          where account_id = $1
          group by bron_medium`,
        [LEADS_GA4_PROPERTY],
      ),
      client.query(
        `select bron_medium, to_char(maand, 'YYYY-MM') as maand, bedrag
           from dataloket.lead_kanaalkosten
          where maand between $1::date and $2::date`,
        [van, `${jaar}-12-01`],
      ),
      client.query(
        `select min(datum)::text as van, max(datum)::text as tot
           from dataloket.v_ga4_verkeer
          where account_id = $1`,
        [LEADS_GA4_PROPERTY],
      ),
    ]);

    const perBron = new Map<string, KostenverdelingRegel>();
    for (const r of sessiesRes.rows) {
      const bronMedium = String(r.bron_medium ?? "");
      perBron.set(bronMedium, { bronMedium, sessies: Number(r.sessies), bedragen: {} });
    }
    for (const r of kostenRes.rows) {
      const bronMedium = String(r.bron_medium);
      let regel = perBron.get(bronMedium);
      if (!regel) {
        regel = { bronMedium, sessies: 0, bedragen: {} };
        perBron.set(bronMedium, regel);
      }
      regel.bedragen[String(r.maand)] = Number(r.bedrag);
    }

    const regels = [...perBron.values()].sort(
      (a, b) => b.sessies - a.sessies || a.bronMedium.localeCompare(b.bronMedium, "nl"),
    );
    const bereik = bereikRes.rows[0] ?? {};
    return {
      jaar,
      sessiesVan: bereik.van ?? null,
      sessiesTot: bereik.tot ?? null,
      regels,
    };
  });
}
