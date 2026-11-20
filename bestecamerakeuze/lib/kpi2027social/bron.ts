import type { Client } from "pg";
import { metVerbinding } from "@/lib/kanalen/bron";
import type { SocialMaat } from "@/lib/kpi2027social/definities";
import type { SocialStand } from "@/lib/kpi2027social/rekenen";

/**
 * Lezen en schrijven van `kpi_2027_social_standen` (migratie 0039): één rij per account per
 * jaar. Lezen via de leesverbinding (de view), schrijven alleen vanuit de wekelijkse
 * ophaalactie — dezelfde scheiding als bij `lib/kpi2027/bron.ts`.
 */

function reeks(waarde: unknown): Record<string, number> {
  const uit: Record<string, number> = {};
  if (typeof waarde !== "object" || waarde === null) return uit;
  for (const [d, n] of Object.entries(waarde as Record<string, unknown>)) uit[d] = Number(n) || 0;
  return uit;
}

function dagen(waarde: unknown): SocialStand["dagen"] {
  const ruw = (typeof waarde === "object" && waarde !== null ? waarde : {}) as Record<string, unknown>;
  const uit: SocialStand["dagen"] = {};
  for (const maat of ["vertoningen", "nieuwe-volgers", "volgers"] as SocialMaat[]) if (ruw[maat]) uit[maat] = reeks(ruw[maat]);
  return uit;
}

function rijNaarStand(r: Record<string, unknown>): SocialStand {
  return {
    sleutel: String(r.account),
    jaar: Number(r.jaar),
    peildatum: String(r.peildatum),
    berekendOp: new Date(r.berekend_op as string).toISOString(),
    definitief: Boolean(r.definitief),
    dagen: dagen(r.dagen),
  };
}

export async function leesSocialStanden(): Promise<SocialStand[]> {
  return metVerbinding(async (client) => {
    const res = await client.query(
      `select account, jaar, peildatum::text as peildatum, berekend_op, definitief, dagen
         from dataloket.v_kpi_2027_social_standen`,
    );
    return res.rows.map(rijNaarStand);
  });
}

/** De fout van de laatste ophaalactie (bv. Facebook niet gekoppeld), of null als hij lukte. */
export async function leesLaatsteFout(): Promise<string | null> {
  return metVerbinding(async (client) => {
    const res = await client.query(
      `select gelukt, fout from dataloket.sync_runs
        where bron = 'kpi-2027-social' and geeindigd_op is not null
        order by gestart_op desc limit 1`,
    );
    const rij = res.rows[0];
    return rij && !rij.gelukt ? (String(rij.fout ?? "") || null) : null;
  });
}

/** De stand van één account en jaar, met de schrijvende verbinding (voor het samenvoegen). */
export async function leesStand(client: Client, account: string, jaar: number): Promise<SocialStand | null> {
  const res = await client.query(
    `select account, jaar, peildatum::text as peildatum, berekend_op, definitief, dagen
       from dataloket.kpi_2027_social_standen where account = $1 and jaar = $2`,
    [account, jaar],
  );
  return res.rows[0] ? rijNaarStand(res.rows[0]) : null;
}

/**
 * De nachtelijke Instagram-momentopnames uit `windsor_account_dag` (bron 'instagram'): de
 * enige plek waar de volgersstand van eerdere dagen bewaard is.
 */
export async function leesInstagramMomentopnames(
  client: Client,
  accountId: string,
  jaar: number,
): Promise<Record<string, number>> {
  const res = await client.query(
    `select datum::text as datum, volgers from dataloket.windsor_account_dag
      where bron = 'instagram' and account_id = $1 and volgers is not null
        and datum between $2::date and $3::date`,
    [accountId, `${jaar}-01-01`, `${jaar}-12-31`],
  );
  const uit: Record<string, number> = {};
  for (const r of res.rows) if (Number(r.volgers) > 0) uit[String(r.datum)] = Number(r.volgers);
  return uit;
}

/**
 * De nieuwe Instagram-volgers per dag uit `windsor_account_dag` (`volgers_erbij`, uit
 * `follower_count_1d`). Meta levert dat cijfer maar dertig dagen terug; de nachtelijke sync
 * bewaart het sinds 16 augustus 2026. Vandaag telt niet mee: die rij is nog onvolledig (de
 * momentopname van vandaag krijgt 0 tot de volgende nacht de echte waarde schrijft).
 */
export async function leesInstagramNieuweVolgers(
  client: Client,
  accountId: string,
  jaar: number,
  vandaag: string,
): Promise<Record<string, number>> {
  const res = await client.query(
    `select datum::text as datum, volgers_erbij from dataloket.windsor_account_dag
      where bron = 'instagram' and account_id = $1 and volgers_erbij is not null
        and datum between $2::date and $3::date and datum < $4::date`,
    [accountId, `${jaar}-01-01`, `${jaar}-12-31`, vandaag],
  );
  const uit: Record<string, number> = {};
  for (const r of res.rows) uit[String(r.datum)] = Math.max(0, Number(r.volgers_erbij) || 0);
  return uit;
}

export async function schrijfSocialStand(client: Client, stand: Omit<SocialStand, "berekendOp">): Promise<void> {
  await client.query(
    `insert into dataloket.kpi_2027_social_standen (account, jaar, peildatum, berekend_op, definitief, dagen)
     values ($1, $2, $3, now(), $4, $5::jsonb)
     on conflict (account, jaar) do update
       set peildatum   = excluded.peildatum,
           berekend_op = excluded.berekend_op,
           definitief  = excluded.definitief,
           dagen       = excluded.dagen`,
    [stand.sleutel, stand.jaar, stand.peildatum, stand.definitief, JSON.stringify(stand.dagen)],
  );
}
