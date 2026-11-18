import { metVerbinding } from "@/lib/kanalen/bron";
import { KPI_DOELJAAR, KPI_JAAR } from "@/lib/kpi2027/definities";
import { SYNTEC_KANAALGROEP } from "@/lib/kpi2027syntec/definities";
import type { SyntecTelling } from "@/lib/kpi2027syntec/rekenen";

/**
 * De Syntec-leads achter het tabblad KPI's 2027 Syntec, uit `dataloket.v_leads` (het
 * sheet-tabblad "Data leads", elke nacht gekopieerd door `/api/sync`).
 *
 * Eén kleine groepering: per jaar, kanaal, onderwerp en maand het aantal leads met
 * kanaalgroep Internet, van 2025 t/m de laatste zaterdag. Een
 * paar duizend regels. Welke regel bij welke KPI hoort beslist `definities.ts` in getest
 * TypeScript, niet een `case when` in SQL die niemand terugleest.
 *
 * Geen opgeslagen stand zoals bij KPI's 2027: de data staat al in de database, en de
 * peildatum (de laatste zaterdag) houdt het target een hele week gelijk.
 */
export async function haalSyntecTellingen(tot: string): Promise<{
  vorigJaar: SyntecTelling[];
  basisjaar: SyntecTelling[];
  doeljaar: SyntecTelling[];
}> {
  return metVerbinding(async (client) => {
    // Van 1 januari van het jaar vóór het basisjaar t/m `tot` (de laatste zaterdag): 2025
    // voor de controle op de definitie (doel 2026 = 2025 × 1,2), 2026 voor de verwachting
    // en het target, en 2027 zodra dat begonnen is voor de realisatie.
    const res = await client.query(
      `select extract(year from aangelegd)::int as jaar,
              kanaal,
              coalesce(onderwerp, '') as onderwerp,
              extract(month from aangelegd)::int as maand,
              count(*)::int as aantal
         from dataloket.v_leads
        where trim(kanaalgroep) = $1
          and aangelegd >= make_date($2::int - 1, 1, 1)
          and aangelegd < $3::date + 1
        group by 1, 2, 3, 4`,
      [SYNTEC_KANAALGROEP, KPI_JAAR, tot],
    );
    const uitkomst = { vorigJaar: [] as SyntecTelling[], basisjaar: [] as SyntecTelling[], doeljaar: [] as SyntecTelling[] };
    for (const r of res.rows) {
      const jaar = Number(r.jaar);
      const lijst =
        jaar === KPI_JAAR - 1 ? uitkomst.vorigJaar : jaar === KPI_JAAR ? uitkomst.basisjaar : jaar === KPI_DOELJAAR ? uitkomst.doeljaar : null;
      lijst?.push({
        kanaal: String(r.kanaal ?? ""),
        onderwerp: String(r.onderwerp ?? ""),
        maand: Number(r.maand),
        aantal: Number(r.aantal),
      });
    }
    return uitkomst;
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
