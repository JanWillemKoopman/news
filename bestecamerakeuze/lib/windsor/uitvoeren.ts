import { Client } from "pg";
import { isWindsorGeconfigureerd } from "@/lib/windsor/api";
import {
  STUK_DAGEN,
  VENSTER_DAGEN,
  koppelPostsAanAdvertenties,
  splitsPeriode,
  standaardVenster,
  syncConversieActies,
  syncFacebookPagina,
  syncFacebookPosts,
  syncGa4Events,
  syncGa4Landingspaginas,
  syncGa4Paginas,
  syncGa4Verkeer,
  syncGoogleAds,
  syncInstagramAccount,
  syncInstagramPosts,
  syncLinkedInAds,
  syncLinkedInPagina,
  syncLinkedInPosts,
  syncMetaAds,
  telPostsPerDag,
  type Periode,
  type SyncResultaat,
} from "@/lib/windsor/sync";
import { eisVerbindingssnaar } from "@/lib/verbindingssnaar";

/**
 * Het uitvoeren van één deel van de Windsor-sync, los van wie hem start.
 *
 * Twee aanroepers delen deze code: de nachtelijke cron (`/api/windsor-sync`, met
 * `CRON_SECRET`) en de knop "Data ophalen" in het dashboard (`/api/kanalen/ophalen`,
 * met de sessie van de ingelogde collega). Dat verschil zit alleen in wie er mag
 * starten; wat er daarna gebeurt hoort identiek te zijn, anders levert de knop stilletjes
 * andere cijfers op dan de nacht.
 */

export const DELEN = ["advertenties", "organisch", "account", "website"] as const;
export type Deel = (typeof DELEN)[number];

export function isDeel(waarde: unknown): waarde is Deel {
  return typeof waarde === "string" && (DELEN as readonly string[]).includes(waarde);
}

export interface SyncUitkomst {
  ok: boolean;
  deel: Deel | "alles";
  /** De gevraagde periode. */
  periode: Periode;
  /** Het stuk daarvan dat deze aanroep werkelijk heeft opgehaald. */
  gedaan: Periode | null;
  /**
   * Wat er van de gevraagde periode nog te doen is.
   *
   * Staat er iets, dan is het tijdbudget op en hoort de aanroeper opnieuw te starten met
   * precies deze periode. `null` betekent klaar. Dit is het verschil tussen "de import is
   * gestopt" en "de import is afgebroken en niemand die het zag".
   */
  restant: Periode | null;
  duurMs: number;
  resultaten: SyncResultaat[];
  fout?: string;
}

/**
 * Hoe lang deze aanroep stukken mag blijven ophalen.
 *
 * Een serverless functie op Vercel wordt na 300 seconden hard afgekapt: geen antwoord,
 * geen foutmelding, een regel in `sync_runs` zonder eindtijd. Dat is precies hoe een
 * jaarimport eerder stukliep — er stonden 3.000 Google-rijen in de database (zes batches
 * van vijfhonderd) en daarna hield het op, zonder dat iets dat meldde. Onder deze grens
 * stoppen we dus zelf, netjes, met `restant` gevuld.
 */
const TIJDBUDGET_MS = 200_000;

/**
 * Laat één onderdeel falen zonder de rest mee te slepen.
 *
 * Ligt Instagram er vannacht uit, dan is dat geen reden om ook de Google-cijfers niet
 * bij te werken. De fout komt wél terug in het antwoord én in `sync_runs`, zodat een
 * stille mislukking niet wekenlang onopgemerkt blijft.
 */
async function probeer(
  taak: () => Promise<SyncResultaat>,
  naam: string,
): Promise<SyncResultaat> {
  try {
    return await taak();
  } catch (err) {
    return {
      onderdeel: naam,
      gelezen: 0,
      geschreven: 0,
      duurMs: 0,
      fout: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Telt de uitkomsten van hetzelfde onderdeel over meerdere stukken bij elkaar op.
 *
 * Eén regel per onderdeel in het antwoord, ook als de periode in twaalf stukken is
 * opgehaald. Foutmeldingen worden ontdubbeld: een connector die in elk stuk dezelfde
 * klacht geeft, hoort dat één keer te zeggen en niet twaalf keer.
 */
function tel(verzameld: Map<string, SyncResultaat>, r: SyncResultaat): void {
  const huidig = verzameld.get(r.onderdeel);
  if (!huidig) {
    verzameld.set(r.onderdeel, { ...r });
    return;
  }
  huidig.gelezen += r.gelezen;
  huidig.geschreven += r.geschreven;
  huidig.duurMs += r.duurMs;
  if (r.fout) {
    const fouten = new Set((huidig.fout ?? "").split(" · ").filter(Boolean));
    fouten.add(r.fout);
    huidig.fout = [...fouten].join(" · ");
  }
}

/**
 * Draait één deel over een periode, stuk voor stuk.
 *
 * De buitenste lus gaat over de stukken van dertig dagen (nieuwste eerst), de binnenste
 * over de connectoren. Die volgorde is het hele punt van deze functie: elk stuk is
 * weggeschreven vóór het volgende begint, dus een ronde die halverwege stopt laat een
 * compleet, aaneengesloten stuk historie achter in plaats van een willekeurige afkapping
 * middenin een batch.
 */
async function draai(
  client: Client,
  deel: Deel | null,
  van: string,
  tot: string,
  gestartOp: number,
): Promise<{ resultaten: SyncResultaat[]; gedaan: Periode | null; restant: Periode | null }> {
  const verzameld = new Map<string, SyncResultaat>();
  const alles = deel === null;
  const advertenties = alles || deel === "advertenties";
  const organisch = alles || deel === "organisch";
  const account = alles || deel === "account";
  const website = alles || deel === "website";

  // De maatwerkconversies eerst, en maar één keer: welke velden er te halen zijn, bepaalt
  // wat de advertentie-opvragingen meenemen, en die catalogus verandert niet per stuk.
  let metaVelden: string[] = [];
  let googleVelden: string[] = [];
  if (advertenties) {
    try {
      const { velden, nieuw } = await syncConversieActies(client);
      metaVelden = velden.facebook;
      googleVelden = velden.google_ads;
      tel(verzameld, {
        onderdeel: "conversie-acties",
        gelezen: metaVelden.length + googleVelden.length,
        geschreven: nieuw,
        duurMs: 0,
      });
    } catch (err) {
      // Zonder catalogus halen we de vaste statistieken op en laten we de
      // maatwerkconversies deze ronde leeg — beter dan helemaal geen advertentiedata.
      tel(verzameld, {
        onderdeel: "conversie-acties",
        gelezen: 0,
        geschreven: 0,
        duurMs: 0,
        fout: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const stukken = splitsPeriode(van, tot, STUK_DAGEN);
  // De stukken komen nieuwste eerst binnen, dus het eerste stuk levert de einddatum van
  // wat er gedaan is en elk volgend stuk schuift alleen de begindatum naar achteren.
  let gedaanVan = "";
  let gedaanTot = "";
  let restant: Periode | null = null;

  for (const [i, stuk] of stukken.entries()) {
    // Altijd minstens één stuk doen, anders schiet een aanroep die te laat begint nooit
    // op en blijft de aanroeper hetzelfde restant terugkrijgen.
    if (i > 0 && Date.now() - gestartOp > TIJDBUDGET_MS) {
      restant = { van, tot: stuk.tot };
      break;
    }

    if (advertenties) {
      tel(
        verzameld,
        await probeer(() => syncMetaAds(client, stuk.van, stuk.tot, metaVelden), "meta-ads"),
      );
      tel(
        verzameld,
        await probeer(() => syncGoogleAds(client, stuk.van, stuk.tot, googleVelden), "google-ads"),
      );
      tel(
        verzameld,
        await probeer(() => syncLinkedInAds(client, stuk.van, stuk.tot), "linkedin-ads"),
      );
    }

    if (organisch) {
      tel(
        verzameld,
        await probeer(() => syncFacebookPosts(client, stuk.van, stuk.tot), "facebook-posts"),
      );
      tel(
        verzameld,
        await probeer(() => syncInstagramPosts(client, stuk.van, stuk.tot), "instagram-posts"),
      );
      tel(
        verzameld,
        await probeer(() => syncLinkedInPosts(client, stuk.van, stuk.tot), "linkedin-posts"),
      );
    }

    if (website) {
      // Vier opvragingen op vier korrels — GA4 heeft geen rij waarin een sessie, een
      // pagina en een event tegelijk passen. Ze staan los van elkaar, dus een property
      // die op één ervan een fout geeft laat de andere drie staan.
      tel(
        verzameld,
        await probeer(() => syncGa4Verkeer(client, stuk.van, stuk.tot), "ga4-verkeer"),
      );
      tel(
        verzameld,
        await probeer(
          () => syncGa4Landingspaginas(client, stuk.van, stuk.tot),
          "ga4-landingspaginas",
        ),
      );
      tel(
        verzameld,
        await probeer(() => syncGa4Paginas(client, stuk.van, stuk.tot), "ga4-paginas"),
      );
      tel(
        verzameld,
        await probeer(() => syncGa4Events(client, stuk.van, stuk.tot), "ga4-events"),
      );
    }

    if (account) {
      tel(
        verzameld,
        await probeer(() => syncFacebookPagina(client, stuk.van, stuk.tot), "facebook-pagina"),
      );
      tel(
        verzameld,
        await probeer(() => syncLinkedInPagina(client, stuk.van, stuk.tot), "linkedin-pagina"),
      );
      // Instagram kent geen historie: de connector geeft altijd de stand van vandaag en
      // hooguit dertig dagen aan dagcijfers. Die opvraging hoort dus bij het nieuwste
      // stuk en nergens anders — elk volgend stuk zou precies dezelfde rijen ophalen.
      if (i === 0) {
        tel(
          verzameld,
          await probeer(() => syncInstagramAccount(client, stuk.van, stuk.tot), "instagram-account"),
        );
      }
    }

    gedaanVan = stuk.van;
    if (!gedaanTot) gedaanTot = stuk.tot;
  }

  // Deze twee kijken over de hele tabel en horen dus ná de stukken, één keer.
  if (organisch) {
    tel(verzameld, await probeer(() => koppelPostsAanAdvertenties(client), "post-advertentie-koppeling"));
  }
  if (account && gedaanVan) {
    tel(verzameld, await probeer(() => telPostsPerDag(client, gedaanVan), "posts-per-dag"));
  }

  return {
    resultaten: [...verzameld.values()],
    gedaan: gedaanVan ? { van: gedaanVan, tot: gedaanTot } : null,
    restant,
  };
}

/**
 * Draait de sync en schrijft er een regel over in `sync_runs`.
 *
 * Gooit alleen als er helemaal niets kon beginnen (geen sleutel, geen verbinding). Gaat
 * er onderweg iets mis, dan komt dat als `fout` bij het betreffende onderdeel terug en
 * blijft de rest gewoon staan.
 */
export async function voerSyncUit(
  deel: Deel | null,
  periodeOfDagen: Periode | number = VENSTER_DAGEN,
): Promise<SyncUitkomst> {
  if (!isWindsorGeconfigureerd()) {
    throw new Error("WINDSOR_API_KEY ontbreekt.");
  }
  const connectionString = process.env.SYNC_DATABASE_URL;
  if (!connectionString) {
    throw new Error("SYNC_DATABASE_URL ontbreekt.");
  }
  eisVerbindingssnaar(connectionString, "SYNC_DATABASE_URL");

  const { van, tot } =
    typeof periodeOfDagen === "number" ? standaardVenster(periodeOfDagen) : periodeOfDagen;
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  const start = Date.now();

  await client.connect();
  try {
    const runRes = await client.query<{ id: string }>(
      `insert into dataloket.sync_runs (bron) values ($1) returning id`,
      [`windsor${deel ? `-${deel}` : ""}`],
    );
    const runId = runRes.rows[0].id;

    const { resultaten, gedaan, restant } = await draai(client, deel, van, tot, start);

    const gelezen = resultaten.reduce((t, r) => t + r.gelezen, 0);
    const geschreven = resultaten.reduce((t, r) => t + r.geschreven, 0);
    const fouten = resultaten.filter((r) => r.fout);

    await client.query(
      `update dataloket.sync_runs
          set geeindigd_op = now(), rijen_gelezen = $2, rijen_geplaatst = $3,
              gelukt = $4, fout = $5
        where id = $1`,
      [
        runId,
        gelezen,
        geschreven,
        fouten.length === 0,
        fouten.length === 0 ? null : fouten.map((f) => `${f.onderdeel}: ${f.fout}`).join(" | "),
      ],
    );

    return {
      ok: fouten.length === 0,
      deel: deel ?? "alles",
      periode: { van, tot },
      gedaan,
      restant,
      duurMs: Date.now() - start,
      resultaten,
    };
  } finally {
    await client.end().catch(() => {});
  }
}
