import { Client } from "pg";
import { isWindsorGeconfigureerd } from "@/lib/windsor/api";
import { eisVerbindingssnaar } from "@/lib/verbindingssnaar";
import { KPI_JAAR } from "@/lib/kpi2027/definities";
import { opdrachtenVoor } from "@/lib/kpi2027/bijwerken";
import { datumInNederland, isDefinitief } from "@/lib/kpi2027/rekenen";
import { KANAAL_NAMEN, alleAccounts, standSleutel, type SocialKanaal } from "@/lib/kpi2027social/definities";
import { leesInstagramMomentopnames, leesStand, schrijfSocialStand } from "@/lib/kpi2027social/bron";
import { haalAccount } from "@/lib/kpi2027social/ophalen";

/**
 * De wekelijkse bijwerking van KPI's 2027 social media, voor alle gekoppelde accounts.
 *
 * Dezelfde jaren en peildatum als KPI's 2027 GA (`opdrachtenVoor`): in 2026 de stand van 2026
 * t/m de laatste zaterdag; vanaf de eerste zondag van 2027 één laatste, definitieve keer 2026
 * en daarna elke week 2027. Een eigen cron (`/api/kpi-2027-social/bijwerken`, zondag een half
 * uur na die van GA), zodat de twee niet samen in de 300 seconden hoeven te passen.
 *
 * Alle accounts tegelijk: per account één tot vier kleine opvragingen. Een account dat faalt
 * (Facebook zolang de koppeling in Windsor uit staat) laat de andere staan en houdt zijn
 * vorige stand; de fout staat in `sync_runs` (bron `kpi-2027-social`) en bovenaan de pagina.
 *
 * Instagram-volgers zijn de uitzondering op "overschrijven": het platform geeft alleen de
 * stand van vandaag. De nieuwe stand wordt daarom samengevoegd met wat er al stond en met de
 * nachtelijke momentopnames uit `windsor_account_dag`.
 */

export interface AccountUitkomst {
  account: string;
  jaar: number;
  peildatum: string;
  status: "bijgewerkt" | "al-definitief" | "mislukt";
  rijen: number;
  fout?: string;
}

export interface SocialBijwerkUitkomst {
  ok: boolean;
  resultaten: AccountUitkomst[];
  duurMs: number;
}

async function werkAccountBij(
  client: Client,
  account: { kanaal: SocialKanaal; accountId: string; naam: string },
  opdracht: { jaar: number; peildatum: string },
  vandaag: string,
  forceer: boolean,
): Promise<AccountUitkomst> {
  const sleutel = standSleutel(account.kanaal, account.accountId);
  const basis = { account: `${KANAAL_NAMEN[account.kanaal]} ${account.naam}`, jaar: opdracht.jaar, peildatum: opdracht.peildatum };
  try {
    const vorige = await leesStand(client, sleutel, opdracht.jaar);
    if (!forceer && vorige?.definitief) return { ...basis, status: "al-definitief", rijen: 0 };
    const opgehaald = await haalAccount(account.kanaal, account.accountId, opdracht.jaar, opdracht.peildatum, vandaag);
    let volgers = opgehaald.volgers;
    if (account.kanaal === "instagram") {
      const nacht = await leesInstagramMomentopnames(client, account.accountId, opdracht.jaar);
      volgers = { ...(vorige?.dagen.volgers ?? {}), ...nacht, ...opgehaald.volgers };
    }
    if (Object.keys(opgehaald.vertoningen).length === 0 && Object.keys(volgers).length === 0) {
      throw new Error("Windsor gaf geen enkele rij terug.");
    }
    await schrijfSocialStand(client, {
      sleutel,
      jaar: opdracht.jaar,
      peildatum: opdracht.peildatum,
      definitief: isDefinitief(opdracht.peildatum, opdracht.jaar),
      dagen: { vertoningen: opgehaald.vertoningen, volgers },
    });
    return { ...basis, status: "bijgewerkt", rijen: opgehaald.rijen };
  } catch (err) {
    return { ...basis, status: "mislukt", rijen: 0, fout: err instanceof Error ? err.message : String(err) };
  }
}

export async function werkSocialStandenBij(
  opties: { nu?: Date; forceer?: boolean } = {},
): Promise<SocialBijwerkUitkomst> {
  const start = Date.now();
  if (!isWindsorGeconfigureerd()) throw new Error("WINDSOR_API_KEY ontbreekt.");
  const connectionString = process.env.SYNC_DATABASE_URL;
  if (!connectionString) throw new Error("SYNC_DATABASE_URL ontbreekt.");
  eisVerbindingssnaar(connectionString, "SYNC_DATABASE_URL");

  const nu = opties.nu ?? new Date();
  const opdrachten = opdrachtenVoor(nu);
  if (opdrachten.length === 0) throw new Error("Er is in 2026 nog geen volledige week voorbij.");
  const vandaag = datumInNederland(nu);

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const run = await client.query<{ id: string }>(
      `insert into dataloket.sync_runs (bron) values ('kpi-2027-social') returning id`,
    );
    const runId = run.rows[0].id;
    const resultaten: AccountUitkomst[] = [];
    for (const opdracht of opdrachten) {
      const forceer = Boolean(opties.forceer) && opdracht.jaar === KPI_JAAR;
      resultaten.push(
        ...(await Promise.all(alleAccounts().map((a) => werkAccountBij(client, a, opdracht, vandaag, forceer)))),
      );
    }
    const fouten = resultaten.filter((r) => r.status === "mislukt");
    await client.query(
      `update dataloket.sync_runs
          set geeindigd_op = now(), rijen_gelezen = $2, rijen_geplaatst = $3, gelukt = $4, fout = $5
        where id = $1`,
      [
        runId,
        resultaten.reduce((t, r) => t + r.rijen, 0),
        resultaten.filter((r) => r.status === "bijgewerkt").length,
        fouten.length === 0,
        fouten.length === 0 ? null : fouten.map((f) => `${f.account} ${f.jaar}: ${f.fout}`).join(" | "),
      ],
    );
    return { ok: fouten.length === 0, resultaten, duurMs: Date.now() - start };
  } finally {
    await client.end().catch(() => {});
  }
}
