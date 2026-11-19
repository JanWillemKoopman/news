import { Client } from "pg";
import { isWindsorGeconfigureerd } from "@/lib/windsor/api";
import { eisVerbindingssnaar } from "@/lib/verbindingssnaar";
import { isStandDefinitief, schrijfStand } from "@/lib/kpi2027/bron";
import { KPI_DOELJAAR, KPI_JAAR, KPI_WEBSITES, type KpiWebsite } from "@/lib/kpi2027/definities";
import { haalWebsiteStand } from "@/lib/kpi2027/ophalen";
import { isDefinitief, laatsteZaterdag } from "@/lib/kpi2027/rekenen";

/**
 * De wekelijkse bijwerking van het tabblad KPI's 2027, voor alle websites, los van wie hem
 * start.
 *
 * Twee aanroepers: de cron op zondag (`/api/kpi-2027/bijwerken`, met `CRON_SECRET`) en de
 * knop "Nu bijwerken" op het tabblad (`POST /api/kpi-2027`, alleen voor beheerders). Beide
 * rekenen tot en met dezelfde zaterdag (`laatsteZaterdag`), dus de knop levert midden in de
 * week geen ander target op dan de zondag ervoor.
 *
 * ## Welk jaar wanneer
 *
 *  - **In 2026** wordt de stand van 2026 bijgewerkt: de basis voor het target.
 *  - **Vanaf de eerste zondag van 2027** (3 januari) wordt 2026 één laatste keer opgehaald
 *    t/m 31 december en als definitief weggeschreven; daarna verandert de basis niet meer
 *    (alleen de knop kan hem nog forceren). Tegelijk begint de stand van 2027: de
 *    realisatie die tegen het target wordt afgezet, elke week t/m zaterdag, tot 2027 voorbij is.
 *  - **Het vergelijkingsjaar** van een website (`vergelijkingsjaar` in `definities.ts`,
 *    udenhout.nl: 2025) wordt één keer opgehaald en is meteen definitief.
 *
 * Een website die faalt, laat de andere niet staan: elke website wordt los opgehaald en
 * weggeschreven, en de fouten komen samen terug en in `sync_runs` (bron `kpi-2027`). De
 * versheidsregel op de Kanalen-pagina's leest alleen `windsor%`, dus deze runs verschuiven
 * daar niets.
 */

export interface WebsiteUitkomst {
  website: string;
  jaar: number;
  peildatum: string;
  status: "bijgewerkt" | "al-definitief" | "mislukt";
  rijen: number;
  fout?: string;
}

export interface BijwerkUitkomst {
  ok: boolean;
  resultaten: WebsiteUitkomst[];
  duurMs: number;
}

interface Opdracht {
  jaar: number;
  peildatum: string;
}

/** Welke standen er op dit moment bij te werken zijn. */
export function opdrachtenVoor(nu: Date): Opdracht[] {
  const zaterdag = laatsteZaterdag(nu);
  if (zaterdag < `${KPI_JAAR}-01-01`) return [];
  if (zaterdag <= `${KPI_JAAR}-12-31`) return [{ jaar: KPI_JAAR, peildatum: zaterdag }];
  const doeljaarEind = `${KPI_DOELJAAR}-12-31`;
  return [
    { jaar: KPI_JAAR, peildatum: `${KPI_JAAR}-12-31` },
    { jaar: KPI_DOELJAAR, peildatum: zaterdag < doeljaarEind ? zaterdag : doeljaarEind },
  ];
}

/**
 * Het vergelijkingsjaar van een website (udenhout.nl: 2025), als opdracht t/m 31 december.
 * Dat jaar is voorbij, dus de stand is meteen definitief: de eerste run haalt hem op, elke
 * volgende slaat hem over (`isStandDefinitief`). Ook de knop "Nu bijwerken" haalt hem niet
 * opnieuw op — die forceert alleen het basisjaar.
 */
export function vergelijkingsOpdracht(website: KpiWebsite): Opdracht | null {
  const v = website.vergelijkingsjaar;
  return v ? { jaar: v.jaar, peildatum: `${v.jaar}-12-31` } : null;
}

async function werkWebsiteBij(
  client: Client,
  website: KpiWebsite,
  opdracht: Opdracht,
  forceer: boolean,
): Promise<WebsiteUitkomst> {
  const basis = { website: website.sleutel, jaar: opdracht.jaar, peildatum: opdracht.peildatum };
  try {
    if (!forceer && (await isStandDefinitief(client, website.sleutel, opdracht.jaar))) {
      return { ...basis, status: "al-definitief", rijen: 0 };
    }
    const opgehaald = await haalWebsiteStand(website, opdracht.peildatum, opdracht.jaar);
    await schrijfStand(client, {
      website: website.sleutel,
      jaar: opdracht.jaar,
      peildatum: opdracht.peildatum,
      definitief: isDefinitief(opdracht.peildatum, opdracht.jaar),
      dagen: opgehaald.dagen,
      gebruikers: opgehaald.gebruikers,
    });
    return { ...basis, status: "bijgewerkt", rijen: opgehaald.rijen };
  } catch (err) {
    return { ...basis, status: "mislukt", rijen: 0, fout: err instanceof Error ? err.message : String(err) };
  }
}

export async function werkKpiStandenBij(
  opties: { nu?: Date; forceer?: boolean } = {},
): Promise<BijwerkUitkomst> {
  const start = Date.now();
  if (!isWindsorGeconfigureerd()) throw new Error("WINDSOR_API_KEY ontbreekt.");
  const connectionString = process.env.SYNC_DATABASE_URL;
  if (!connectionString) throw new Error("SYNC_DATABASE_URL ontbreekt.");
  eisVerbindingssnaar(connectionString, "SYNC_DATABASE_URL");

  const opdrachten = opdrachtenVoor(opties.nu ?? new Date());
  if (opdrachten.length === 0) {
    throw new Error("Er is in 2026 nog geen volledige week voorbij; er valt nog niets te rekenen.");
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const run = await client.query<{ id: string }>(
      `insert into dataloket.sync_runs (bron) values ('kpi-2027') returning id`,
    );
    const runId = run.rows[0].id;

    // Na elkaar en niet tegelijk: per website lopen er al vier opvragingen tegelijk, en zes
    // websites ineens zou Windsor met vierentwintig verzoeken tegelijk belasten.
    const resultaten: WebsiteUitkomst[] = [];
    for (const opdracht of opdrachten) {
      // De basis (2026) wordt na de jaarwisseling alleen met de knop opnieuw opgehaald.
      const forceer = Boolean(opties.forceer) && opdracht.jaar === KPI_JAAR;
      for (const website of KPI_WEBSITES) {
        resultaten.push(await werkWebsiteBij(client, website, opdracht, forceer));
      }
    }
    for (const website of KPI_WEBSITES) {
      const opdracht = vergelijkingsOpdracht(website);
      if (opdracht) resultaten.push(await werkWebsiteBij(client, website, opdracht, false));
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
        fouten.length === 0 ? null : fouten.map((f) => `${f.website} ${f.jaar}: ${f.fout}`).join(" | "),
      ],
    );
    return { ok: fouten.length === 0, resultaten, duurMs: Date.now() - start };
  } finally {
    await client.end().catch(() => {});
  }
}
