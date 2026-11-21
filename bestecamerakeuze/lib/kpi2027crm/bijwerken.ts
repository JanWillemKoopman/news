import { datumInNederland } from "@/lib/kpi2027/rekenen";
import { metSchrijfverbinding, schrijfCrmStand } from "@/lib/kpi2027crm/bron";
import { telCrm } from "@/lib/kpi2027crm/rekenen";
import { haalTabel } from "@/lib/selligent/bron";
import { isSelligentGeconfigureerd } from "@/lib/selligent/verbinding";

/**
 * De wekelijkse vastlegging van KPI's 2027 CRM (`/api/kpi-2027-crm/bijwerken`, Vercel Cron,
 * zie `vercel.json`): elke vrijdag om 11:00 UTC (12:00 in de winter, 13:00 in de zomer — Vercel
 * kent geen tijdzones), plus één extra run op 31 december om 11:00 UTC. Die laatste is nodig omdat
 * de laatste vrijdag van 2026 op 25 december valt en de vrijdag erna (1 januari 2027) al een
 * export uit 2027 leest: zonder die run zou de basis voor het target de stand van eerste kerstdag
 * zijn.
 *
 * Leest de Selligent-export (dezelfde tabel als Tools → Selligent database), telt de KPI's
 * (`telCrm`) en schrijft per KPI één aantal weg onder de dag van de export
 * (`kpi_2027_crm_standen`). Zonder deze taak is de stand van 31 december 2026 in 2027 niet meer
 * te lezen: de export bevat alleen de stand van vandaag.
 *
 * De dag is die waarop Selligent de export neerzette (Last-Modified, Nederlandse kalender), niet
 * de dag van de taak: staat er nog een export van gisteren, dan wordt gisteren nog een keer
 * vastgelegd en niet vandaag met de cijfers van gisteren. Het tabblad zelf legt bij elk bezoek
 * dezelfde stand vast: tussen twee vrijdagen in komt er zo een stand bij op elke dag dat iemand het
 * tabblad opent.
 *
 * De run staat in `sync_runs` (bron `kpi-2027-crm`).
 */

export interface CrmBijwerkUitkomst {
  ok: boolean;
  datum: string | null;
  kpis: number;
  duurMs: number;
  fout?: string;
}

export async function werkCrmStandBij(opties: { vers?: boolean } = {}): Promise<CrmBijwerkUitkomst> {
  const start = Date.now();
  if (!isSelligentGeconfigureerd()) throw new Error("Selligent is niet aangesloten (SELLIGENT_BLOB_URL of SELLIGENT_AZURE_CONNECTION_STRING).");

  return metSchrijfverbinding(async (client) => {
    const run = await client.query<{ id: string }>(
      `insert into dataloket.sync_runs (bron) values ('kpi-2027-crm') returning id`,
    );
    const runId = run.rows[0].id;
    let uitkomst: CrmBijwerkUitkomst;
    try {
      const tabel = await haalTabel(Boolean(opties.vers));
      const telling = telCrm(tabel);
      if (!telling.mailKolom) throw new Error("De export heeft geen kolom MAIL (of EMAIL).");
      const datum = datumInNederland(tabel.gewijzigdOp ? new Date(tabel.gewijzigdOp) : new Date());
      const kpis = await schrijfCrmStand(client, datum, telling.tellingen, tabel.gewijzigdOp);
      uitkomst = { ok: true, datum, kpis, duurMs: Date.now() - start };
    } catch (err) {
      uitkomst = { ok: false, datum: null, kpis: 0, duurMs: Date.now() - start, fout: err instanceof Error ? err.message : String(err) };
    }
    await client.query(
      `update dataloket.sync_runs
          set geeindigd_op = now(), rijen_gelezen = $2, rijen_geplaatst = $2, gelukt = $3, fout = $4
        where id = $1`,
      [runId, uitkomst.kpis, uitkomst.ok, uitkomst.fout ?? null],
    );
    return uitkomst;
  });
}
