import { metVerbinding } from "@/lib/kanalen/bron";
import type { SyntecKubus } from "@/lib/leadsSyntec/samenvatting";

/**
 * De leads achter het tabblad Leads Syntec, uit `dataloket.v_leads` (het sheet-tabblad
 * "Data leads", elke nacht gekopieerd door `/api/sync`).
 *
 * Eén groepering over de hele tabel: per dag, kanaal, merk, model, ordersoort, lead type en
 * dubbel-of-niet het aantal leads. Dat is ±0,7 regel per lead (±69.000 voor
 * januari 2024 t/m november 2026), omdat bijna elke combinatie met het model uniek is. Het
 * model staat er letterlijk in, zoals in de sheet; het merk wordt ingedeeld in getest
 * TypeScript (`lib/leadsSyntec/indeling.ts`), niet in SQL.
 *
 * Geen periode in de query: de pagina filtert de periode in het geheugen, dus een andere
 * periode kiezen kost geen tweede ophaalactie.
 */
export async function haalSyntecLeads(): Promise<{
  kubus: SyntecKubus;
  eersteDag: string | null;
  laatsteDag: string | null;
  laatsteLead: string | null;
}> {
  return metVerbinding(async (client) => {
    const res = await client.query(
      `select to_char(aangelegd, 'YYYY-MM-DD') as dag,
              coalesce(trim(kanaal), '') as kanaal,
              coalesce(trim(kanaalgroep), '') as kanaalgroep,
              coalesce(trim(merk), '') as merk,
              coalesce(trim(model), '') as model,
              coalesce(trim(ordersoort), '') as ordersoort,
              coalesce(trim(lead_type), '') as soort,
              coalesce(sluitreden ilike '%dubbel%', false) as dubbel,
              count(*)::int as aantal
         from dataloket.v_leads
        where aangelegd is not null
        group by 1, 2, 3, 4, 5, 6, 7, 8
        order by 1`,
    );
    const grenzen = await client.query(
      `select to_char(min(aangelegd), 'YYYY-MM-DD') as eerste,
              to_char(max(aangelegd), 'YYYY-MM-DD') as laatste,
              to_char(max(aangelegd), 'YYYY-MM-DD"T"HH24:MI') as laatste_lead
         from dataloket.v_leads`,
    );

    const lijst = () => {
      const waarden: string[] = [];
      const index = new Map<string, number>();
      return {
        waarden,
        idx(waarde: string): number {
          let i = index.get(waarde);
          if (i === undefined) {
            i = waarden.length;
            waarden.push(waarde);
            index.set(waarde, i);
          }
          return i;
        },
      };
    };
    const dagen = lijst();
    const kanaalSleutels = lijst();
    const kanalen: SyntecKubus["kanalen"] = [];
    const merken = lijst();
    const modellen = lijst();
    const ordersoorten = lijst();
    const soorten = lijst();

    const regels: number[][] = res.rows.map((r) => {
      const kanaal = String(r.kanaal ?? "");
      const kanaalgroep = String(r.kanaalgroep ?? "");
      const aantalVoor = kanaalSleutels.waarden.length;
      const k = kanaalSleutels.idx(`${kanaal}\u0000${kanaalgroep}`);
      if (k === aantalVoor) kanalen.push({ kanaal, kanaalgroep });
      return [
        dagen.idx(String(r.dag)),
        k,
        merken.idx(String(r.merk ?? "")),
        modellen.idx(String(r.model ?? "")),
        ordersoorten.idx(String(r.ordersoort ?? "")),
        soorten.idx(String(r.soort ?? "")),
        r.dubbel ? 1 : 0,
        Number(r.aantal),
      ];
    });

    const g = grenzen.rows[0] ?? {};
    return {
      kubus: {
        dagen: dagen.waarden,
        kanalen,
        merken: merken.waarden,
        modellen: modellen.waarden,
        ordersoorten: ordersoorten.waarden,
        soorten: soorten.waarden,
        regels,
      },
      eersteDag: (g.eerste as string | null) ?? null,
      laatsteDag: (g.laatste as string | null) ?? null,
      laatsteLead: (g.laatste_lead as string | null) ?? null,
    };
  });
}
