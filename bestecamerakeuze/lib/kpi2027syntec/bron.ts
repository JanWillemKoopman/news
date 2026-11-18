import { metVerbinding } from "@/lib/kanalen/bron";
import { KPI_JAAR } from "@/lib/kpi2027/definities";
import { SYNTEC_KANAALGROEP } from "@/lib/kpi2027syntec/definities";
import type { SyntecTelling } from "@/lib/kpi2027syntec/rekenen";

/**
 * De Syntec-leads achter het tabblad KPI's 2027 Syntec, uit `dataloket.v_leads` (het
 * sheet-tabblad "Data leads", elke nacht gekopieerd door `/api/sync`).
 *
 * Eén kleine groepering: per kanaal, onderwerp en maand het aantal leads met kanaalgroep
 * Internet in het basisjaar, t/m de peildatum. Een paar duizend regels. Welke regel bij
 * welke KPI hoort beslist `definities.ts` in getest TypeScript, niet een `case when` in SQL
 * die niemand terugleest.
 *
 * Geen opgeslagen stand zoals bij KPI's 2027: de data staat al in de database, en de
 * peildatum (de laatste zaterdag) houdt het target een hele week gelijk.
 */
export async function haalSyntecTellingen(peildatum: string): Promise<SyntecTelling[]> {
  return metVerbinding(async (client) => {
    const res = await client.query(
      `select kanaal,
              coalesce(onderwerp, '') as onderwerp,
              extract(month from aangelegd)::int as maand,
              count(*)::int as aantal
         from dataloket.v_leads
        where trim(kanaalgroep) = $1
          and aangelegd >= make_date($2, 1, 1)
          and aangelegd < $3::date + 1
        group by 1, 2, 3`,
      [SYNTEC_KANAALGROEP, KPI_JAAR, peildatum],
    );
    return res.rows.map((r) => ({
      kanaal: String(r.kanaal ?? ""),
      onderwerp: String(r.onderwerp ?? ""),
      maand: Number(r.maand),
      aantal: Number(r.aantal),
    }));
  });
}

/** Wanneer "Data leads" voor het laatst gelukt naar de database is gekopieerd. */
export async function haalSyntecIngelezenOp(): Promise<string | null> {
  return metVerbinding(async (client) => {
    const res = await client.query(
      `select max(geeindigd_op) as moment
         from dataloket.sync_runs
        where bron = 'Data leads' and gelukt = true`,
    );
    const moment = res.rows[0]?.moment;
    return moment ? new Date(moment as string).toISOString() : null;
  });
}
