/**
 * Het lezen van de kanaaldata uit Postgres, en het omzetten naar de kubus die de pagina
 * in het geheugen filtert.
 *
 * ## Waarom twee kubussen per pagina
 *
 * De grafiek heeft de tijdas nodig, de tabel heeft de advertentie nodig. Allebei tegelijk
 * — dag × advertentie × plaatsing — is gemeten 212 rijen per dag voor Meta en 315 voor
 * Google; over een kwartaal loopt dat op tot bijna 50.000 rijen en dat is te zwaar om
 * naar de browser te sturen. Daarom vat de server elk apart samen:
 *
 *   reeks   dag × account × platform × campagne      ≈ 5.500 rijen per kwartaal
 *   detail  advertentie, opgeteld over de periode    ≈ 200 – 450 rijen
 *
 * Ze delen hun filterdimensies, dus één filterselectie werkt meteen op allebei zonder
 * dat er iets opnieuw opgehaald hoeft te worden. Dat is de hele truc achter "filteren
 * kost geen netwerkverkeer".
 *
 * ## Waarom boven de 120 dagen per week
 *
 * Een jaar op dagkorrel is gemeten 891 KB gzip; per week is dat een zevende. Niemand
 * leest een jaargrafiek per dag, dus daar gaat niets verloren — behalve inzoomen binnen
 * dat jaar, en daarvoor kies je een kortere periode.
 */

import { Client } from "pg";
import type { Kubus } from "@/lib/kanalen/kubus";
import type { CampagneBudget } from "@/lib/kanalen/budget";
import { labelVoorConversie } from "@/lib/windsor/velden";
import { eisVerbindingssnaar } from "@/lib/verbindingssnaar";

/** Boven deze periodelengte vat de server samen tot weken. */
export const DAG_KORREL_MAX_DAGEN = 120;

const STATEMENT_TIMEOUT_MS = 15_000;

/** Hoeveel detailregels een pagina maximaal meekrijgt; zie `Kubus.afgekapt`. */
export const DETAIL_LIMIET = 2000;

export function isKanalenGeconfigureerd(): boolean {
  return Boolean(process.env.DATAQUERY_DATABASE_URL);
}

async function metVerbinding<T>(werk: (client: Client) => Promise<T>): Promise<T> {
  const connectionString = process.env.DATAQUERY_DATABASE_URL;
  if (!connectionString) throw new Error("DATAQUERY_DATABASE_URL ontbreekt.");
  eisVerbindingssnaar(connectionString, "DATAQUERY_DATABASE_URL");

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    statement_timeout: STATEMENT_TIMEOUT_MS,
  });
  await client.connect();
  try {
    return await werk(client);
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * Bouwt een kubus uit databaserijen.
 *
 * De dimensiewaarden worden hier tot een lijst met indexen samengevouwen — dat is waar
 * de payload klein van wordt: een campagnenaam van vijftig tekens staat één keer in
 * `labels` in plaats van in elk van de duizend rijen waar hij in voorkomt.
 */
function bouwKubus(
  rijen: Record<string, unknown>[],
  dimensies: string[],
  kolommen: string[],
  korrel: "dag" | "week",
  periode: { van: string; tot: string },
  metaVelden: { sleutel: string; velden: string[] } | null = null,
): Kubus {
  const labels: Record<string, string[]> = {};
  const index: Record<string, Map<string, number>> = {};
  for (const dim of dimensies) {
    labels[dim] = [];
    index[dim] = new Map();
  }

  const meta: Record<string, Record<string, string | null>> = {};
  const uit: number[][] = [];

  for (const rij of rijen) {
    const waarden: number[] = [];
    for (const dim of dimensies) {
      const rauw = rij[dim];
      const tekst = rauw === null || rauw === undefined || rauw === "" ? "—" : String(rauw);
      let i = index[dim].get(tekst);
      if (i === undefined) {
        i = labels[dim].length;
        labels[dim].push(tekst);
        index[dim].set(tekst, i);
      }
      waarden.push(i);
    }
    for (const kolom of kolommen) {
      const rauw = rij[kolom];
      // Postgres levert numeric als string terug; Number() daarop is exact genoeg voor
      // bedragen in euro's en aantallen.
      const getal = typeof rauw === "number" ? rauw : Number(rauw ?? 0);
      waarden.push(Number.isFinite(getal) ? getal : 0);
    }
    uit.push(waarden);

    if (metaVelden) {
      const sleutel = String(rij[metaVelden.sleutel] ?? "");
      if (sleutel && !meta[sleutel]) {
        const blok: Record<string, string | null> = {};
        for (const veld of metaVelden.velden) {
          const waarde = rij[veld];
          blok[veld] = waarde === null || waarde === undefined ? null : String(waarde);
        }
        meta[sleutel] = blok;
      }
    }
  }

  const kubus: Kubus = { dimensies, labels, kolommen, rijen: uit, korrel, periode };
  if (metaVelden) kubus.meta = meta;
  return kubus;
}

function dagenTussen(van: string, tot: string): number {
  const a = new Date(`${van}T00:00:00Z`).getTime();
  const b = new Date(`${tot}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

/** Of de reeks per dag of per week wordt samengevat, en de bijbehorende SQL-uitdrukking. */
function korrelVoor(van: string, tot: string): { korrel: "dag" | "week"; sql: string } {
  if (dagenTussen(van, tot) <= DAG_KORREL_MAX_DAGEN) {
    return { korrel: "dag", sql: "datum" };
  }
  // date_trunc geeft de maandag van de ISO-week; dat is dezelfde weekindeling die
  // lib/kanalen/kubus.ts hanteert, zodat server en browser niet uiteenlopen.
  return { korrel: "week", sql: "date_trunc('week', datum)::date" };
}

// ---------------------------------------------------------------------------
// Advertenties
// ---------------------------------------------------------------------------

/**
 * Bereik staat hier bewust niet bij, en hoort er ook niet bij te komen.
 *
 * De kolom bestaat nog in `windsor_advertenties` en de sync blijft hem vullen, maar het
 * platform ontdubbelt bereik per opgevraagde dag: `sum(bereik)` over een periode telt
 * iedereen die op meer dan één dag keek meer dan één keer, en komt dus per definitie
 * hoger uit dan Ads Manager. Zie de toelichting in `lib/windsor/velden.ts`.
 */
const ADVERTENTIE_METINGEN = [
  "uitgaven",
  "vertoningen",
  "klikken",
  "link_klikken",
  "interacties",
  "videoweergaven",
  "leads",
  "conversies",
  "conversiewaarde",
];

/**
 * Welke conversie-acties het team heeft aangewezen, per doel.
 *
 * Twee onafhankelijke keuzes op dezelfde catalogus (`windsor_conversie_acties`, zie de
 * pagina Koppeltabel). De reden dat ze er zijn is per platform anders, en dat verklaart
 * ook waarom `conversies` alleen Meta-acties bevat.
 */
export interface ActieKeuze {
  /** Acties die meetellen als lead. Google heeft geen leadveld, dus daar zijn ze het hele cijfer. */
  leads: string[];
  /**
   * Acties die samen "conversies" zijn — uitsluitend Meta.
   *
   * Google en LinkedIn leveren zélf een conversietotaal, en bij Google zitten deze acties
   * daar al in. Een Google-actie hier bovenop optellen zou hem dus dubbel tellen. Meta
   * heeft dat totaal niet, en daar is deze lijst het conversiecijfer.
   */
  conversies: string[];
}

/** De namen van de lateral joins die de aangewezen acties per rij optellen. */
const LEAD_JOIN = "l";
const CONVERSIE_JOIN = "c";

/**
 * De sommen per meting, met de aangewezen acties erbij opgeteld waar dat hoort.
 *
 * Optellen bij `leads` en niet vervangen: bij Meta zit `actions_lead` al in die kolom en
 * staan de maatwerkacties los daarvan in de jsonb. Bij `conversies` werkt het andersom —
 * daar is de kolom voor Meta nul en zijn de aangewezen acties het hele cijfer, terwijl
 * Google en LinkedIn juist wél een eigen totaal in de kolom hebben staan. Eén optelling
 * dekt allebei die gevallen.
 */
export function metingenSom(keuze: ActieKeuze): string {
  return ADVERTENTIE_METINGEN.map((m) => {
    if (m === "leads" && keuze.leads.length > 0) {
      return `coalesce(sum(a.leads), 0) + coalesce(sum(${LEAD_JOIN}.extra), 0) as leads`;
    }
    if (m === "conversies" && keuze.conversies.length > 0) {
      return `coalesce(sum(a.conversies), 0) + coalesce(sum(${CONVERSIE_JOIN}.extra), 0) as conversies`;
    }
    return `coalesce(sum(a.${m}), 0) as ${m}`;
  }).join(", ");
}

/** Eén lateral join die per rij de aangewezen acties uit de jsonb-kolom optelt. */
function actieJoin(alias: string, plaatshouder: string): string {
  return `left join lateral (
           select coalesce(sum((e.value)::text::numeric), 0) as extra
             from jsonb_each(coalesce(a.conversie_acties, '{}'::jsonb)) as e(key, value)
            where e.key = any(${plaatshouder})
         ) ${alias} on true`;
}

/**
 * De query-argumenten plus de joins die erbij horen.
 *
 * De plaatshouders worden geteld en niet hardgecodeerd: een lege keuze levert géén
 * parameter op, want Postgres weigert een query met een `$n` die nergens wordt gebruikt
 * ("could not determine data type of parameter").
 */
export function bouwActieSql(
  keuze: ActieKeuze,
  argumenten: unknown[],
): { joins: string; sommen: string } {
  const joins: string[] = [];
  if (keuze.leads.length > 0) {
    argumenten.push(keuze.leads);
    joins.push(actieJoin(LEAD_JOIN, `$${argumenten.length}`));
  }
  if (keuze.conversies.length > 0) {
    argumenten.push(keuze.conversies);
    joins.push(actieJoin(CONVERSIE_JOIN, `$${argumenten.length}`));
  }
  return { joins: joins.join("\n         "), sommen: metingenSom(keuze) };
}

export type AdvertentieBron = "social" | "google" | "betaald";

/**
 * Social ads is Meta plus LinkedIn; Google Ads staat op een eigen pagina.
 *
 * `betaald` is alle drie tegelijk. Ze delen één tabel, dus dat kost niets extra's — en
 * het is de enige plek waar de vraag "waar gaat het budget heen" te beantwoorden valt,
 * want twee losse pagina's laten zich niet optellen.
 */
function bronFilter(bron: AdvertentieBron): string[] {
  if (bron === "google") return ["google"];
  if (bron === "betaald") return ["meta", "linkedin", "google"];
  return ["meta", "linkedin"];
}

/** In de gecombineerde weergave komt het kanaal erbij als dimensie. */
const KANAAL_SQL = `case bron
        when 'meta' then 'Meta Ads'
        when 'google' then 'Google Ads'
        when 'linkedin' then 'LinkedIn Ads'
        else bron end as kanaal`;

export interface AdvertentieData {
  reeks: Kubus;
  detail: Kubus;
  /**
   * Telt de leadkolom conversie-acties mee?
   *
   * Bepaalt of de Google Ads-pagina de kolommen Leads en Kosten per lead laat zien. Zonder
   * aangewezen acties zijn die daar per definitie leeg, en dan horen ze er niet te staan.
   */
  leadsUitConversies: boolean;
  /**
   * Zijn er acties aangewezen die samen de Meta-conversies vormen?
   *
   * Meta levert geen conversietotaal. Staat dit op `false`, dan tellen de Meta-rijen voor
   * nul mee in de conversiekolom — niet omdat er niets gebeurde, maar omdat nog niemand
   * heeft vastgelegd wát hier een conversie is. De pagina zegt dat er dan bij.
   */
  conversiesUitActies: boolean;
}

export async function haalAdvertenties(
  bron: AdvertentieBron,
  van: string,
  tot: string,
): Promise<AdvertentieData> {
  const { korrel, sql: datumSql } = korrelVoor(van, tot);
  const bronnen = bronFilter(bron);
  const samen = bron === "betaald";
  const kanaalKolom = samen ? `${KANAAL_SQL},\n              ` : "";
  const kanaalDim = samen ? ["kanaal"] : [];
  // Eén extra kolom in de group by schuift alle volgnummers op; makkelijker om ze te
  // tellen dan om twee bijna gelijke queries naast elkaar te onderhouden.
  const groep = (aantal: number) =>
    Array.from({ length: aantal + (samen ? 1 : 0) }, (_, i) => i + 1).join(", ");

  return metVerbinding(async (client) => {
    const keuze = await gekozenActieVelden(client);
    const argumenten: unknown[] = [van, tot, bronnen];
    const { joins: join, sommen } = bouwActieSql(keuze, argumenten);

    // Merk en categorie komen uit de koppeltabel en hangen aan de campagne, dus ze
    // splitsen de rijen niet verder op — maar ze maken wel het filter mogelijk dat de
    // koppeltabel al belooft ("werkt daarna als filter op Social ads en Google Ads").
    const reeksRes = await client.query(
      `select ${datumSql.replace("datum", "a.datum")}::text as datum,
              ${kanaalKolom.replace("bron", "a.bron")}a.account, a.platform, a.campagne, a.campagne_doel, a.campagne_status, a.campagnemanager,
              coalesce(a.merk, '—') as merk,
              coalesce(a.categorie, '—') as categorie,
              ${sommen}
         from dataloket.v_advertenties a
         ${join}
        where a.datum between $1 and $2 and a.bron = any($3)
        group by ${groep(9)}
        order by 1`,
      argumenten,
    );

    // Groeperen op `advertentie_id` en niet op de naam: advertentienamen als
    // "Carrousel 1" komen in meerdere campagnes voor, en op naam groeperen telde die tot
    // één regel op — met de creative van willekeurig de eerste erbij. De leesbare naam
    // komt daarom uit de meta.
    const detailRes = await client.query(
      `select ${kanaalKolom.replace("bron", "a.bron")}a.account, a.platform,
              coalesce(nullif(a.plaatsing, ''), '—') as plaatsing,
              a.campagne, a.campagne_doel, a.campagne_status, a.campagnemanager,
              coalesce(a.merk, '—') as merk,
              coalesce(a.categorie, '—') as categorie,
              coalesce(nullif(a.adgroep, ''), '—') as adgroep,
              coalesce(nullif(a.advertentie_id, ''), coalesce(nullif(a.advertentie, ''), '(zonder naam)')) as advertentie_id,
              min(coalesce(nullif(a.advertentie, ''), '(zonder naam)')) as advertentie,
              min(a.advertentie_status) as advertentie_status,
              min(a.thumbnail_url) as thumbnail_url,
              min(a.preview_url) as preview_url,
              ${sommen}
         from dataloket.v_advertenties a
         ${join}
        where a.datum between $1 and $2 and a.bron = any($3)
        group by ${groep(11)}
        order by sum(a.uitgaven) desc nulls last
        limit ${DETAIL_LIMIET}`,
      argumenten,
    );

    const detail = bouwKubus(
      detailRes.rows,
      [...kanaalDim, "account", "platform", "plaatsing", "campagne", "campagne_doel", "campagne_status", "campagnemanager", "merk", "categorie", "adgroep", "advertentie_id"],
      ADVERTENTIE_METINGEN,
      korrel,
      { van, tot },
      { sleutel: "advertentie_id", velden: ["advertentie", "thumbnail_url", "preview_url", "advertentie_status"] },
    );
    detail.afgekapt = detailRes.rows.length >= DETAIL_LIMIET;

    return {
      reeks: bouwKubus(
        reeksRes.rows,
        ["datum", ...kanaalDim, "account", "platform", "campagne", "campagne_doel", "campagne_status", "campagnemanager", "merk", "categorie"],
        ADVERTENTIE_METINGEN,
        korrel,
        { van, tot },
      ),
      detail,
      leadsUitConversies: keuze.leads.length > 0,
      conversiesUitActies: keuze.conversies.length > 0,
    };
  });
}

/**
 * Welke conversie-acties heeft het team aangewezen, en waarvoor?
 *
 * De conversielijst wordt hier op Meta gefilterd en niet in de UI alleen: Google levert
 * zelf al een conversietotaal waar deze acties in zitten, dus een Google-actie erbij
 * optellen zou hem dubbel tellen. Die grens hoort in de query te staan, want dit is de
 * plek waar het optellen gebeurt — een vinkje dat per ongeluk toch gezet wordt, mag geen
 * verkeerd cijfer opleveren.
 */
async function gekozenActieVelden(client: Client): Promise<ActieKeuze> {
  const res = await client.query(
    `select veld, bron, telt_als_lead, telt_als_conversie
       from dataloket.windsor_conversie_acties
      where telt_als_lead = true or telt_als_conversie = true`,
  );
  return {
    leads: res.rows.filter((r) => r.telt_als_lead).map((r) => String(r.veld)),
    conversies: res.rows
      .filter((r) => r.telt_als_conversie && String(r.bron) === "meta")
      .map((r) => String(r.veld)),
  };
}

export interface ConversieActie {
  veld: string;
  /** Het afgeleide of zelf ingestelde label. */
  label: string;
  bron: string;
  account: string | null;
  /** Hoe vaak deze actie de laatste 90 dagen voorkwam. */
  aantal: number;
  laatstGezien: string | null;
  teltAlsLead: boolean;
  /** Telt deze actie mee in de conversiekolom? Alleen van belang bij Meta — zie `ActieKeuze`. */
  teltAlsConversie: boolean;
  /**
   * Is het label met de hand bijgesteld?
   *
   * De sync overschrijft een label alleen als dit `false` is — zo blijft "Offerte" staan
   * als iemand die naam beter vindt dan het automatisch afgeleide "Generate lead offerte".
   */
  gewijzigd: boolean;
}

/**
 * De conversie-acties die er zijn, met hun volume en de keuze die erop staat.
 *
 * De lijst komt uit `v_conversie_acties`: de catalogus die de sync bijhoudt, met het
 * volume van de laatste negentig dagen erbij en zonder de tientallen velden die hier
 * nooit vuren. Een actie die niemand ziet, wijst niemand aan — en dan blijft de leadkolom
 * op Google Ads leeg zonder dat iemand weet waarom.
 */
export async function haalConversieActies(): Promise<ConversieActie[]> {
  return metVerbinding(async (client) => {
    const res = await client.query(
      `select veld, bron, label, telt_als_lead, telt_als_conversie, gewijzigd, aantal, account, laatst_gezien
         from dataloket.v_conversie_acties
        order by aantal desc nulls last, label`,
    );
    return res.rows.map((r) => ({
      veld: String(r.veld),
      label: r.label ? String(r.label) : labelVoorConversie(String(r.veld)),
      bron: String(r.bron ?? ""),
      account: r.account ? String(r.account) : null,
      aantal: Number(r.aantal ?? 0),
      laatstGezien: r.laatst_gezien
        ? new Date(r.laatst_gezien as string).toISOString().slice(0, 10)
        : null,
      teltAlsLead: Boolean(r.telt_als_lead),
      teltAlsConversie: Boolean(r.telt_als_conversie),
      gewijzigd: Boolean(r.gewijzigd),
    }));
  });
}

// ---------------------------------------------------------------------------
// Organische posts
// ---------------------------------------------------------------------------

// Ook hier geen bereik: een post levert weliswaar één lifetime-cijfer op, maar zodra je
// posts bij elkaar optelt tel je dezelfde volger opnieuw. Zie ADVERTENTIE_METINGEN.
const POST_METINGEN = [
  "vertoningen",
  "vertoningen_organisch",
  "vertoningen_betaald",
  "interacties",
  "likes",
  "reacties",
  "opgeslagen",
  "gedeeld",
  "klikken",
  "nieuwe_volgers",
  "videoweergaven",
  "kijktijd_ms",
  "advertentie_uitgaven",
];

export interface PostData {
  reeks: Kubus;
  detail: Kubus;
}

/**
 * Posts zijn er maar een paar honderd per kwartaal, dus hier is geen opsplitsing nodig:
 * dezelfde rijen dragen zowel de tijdreeks als de tabel. `detail` houdt de posttekst en
 * de permalink erbij; `reeks` laat die weg omdat een tijdreeks er niets aan heeft.
 */
export async function haalPosts(van: string, tot: string): Promise<PostData> {
  const { korrel, sql: datumSql } = korrelVoor(van, tot);

  return metVerbinding(async (client) => {
    const reeksRes = await client.query(
      `select ${datumSql}::text as datum, bron, account, post_type,
              case when opgehoogd then 'Opgehoogd' else 'Alleen organisch' end as inzet,
              ${POST_METINGEN.map((m) => `coalesce(sum(${m}), 0) as ${m}`).join(", ")}
         from dataloket.v_posts
        where datum between $1 and $2
        group by 1, 2, 3, 4, 5
        order by 1`,
      [van, tot],
    );

    const detailRes = await client.query(
      `select post_id, datum::text as datum, bron, account, post_type,
              case when opgehoogd then 'Opgehoogd' else 'Alleen organisch' end as inzet,
              coalesce(nullif(left(tekst, 160), ''), '(zonder tekst)') as tekst,
              permalink, afbeelding_url,
              ${POST_METINGEN.map((m) => `coalesce(${m}, 0) as ${m}`).join(", ")}
         from dataloket.v_posts
        where datum between $1 and $2
        order by vertoningen_organisch desc nulls last
        limit ${DETAIL_LIMIET}`,
      [van, tot],
    );

    // Op `post_id` en niet op de tekst: twee posts met dezelfde caption — een
    // terugkerende actie, of dezelfde tekst onder een reel en een feedpost — vielen
    // anders samen tot één regel, en dan klopt de telling eronder ook niet meer.
    const detail = bouwKubus(
      detailRes.rows,
      ["datum", "bron", "account", "post_type", "inzet", "post_id"],
      POST_METINGEN,
      "dag",
      { van, tot },
      { sleutel: "post_id", velden: ["tekst", "permalink", "afbeelding_url"] },
    );
    detail.afgekapt = detailRes.rows.length >= DETAIL_LIMIET;

    return {
      reeks: bouwKubus(
        reeksRes.rows,
        ["datum", "bron", "account", "post_type", "inzet"],
        POST_METINGEN,
        korrel,
        { van, tot },
      ),
      detail,
    };
  });
}

// ---------------------------------------------------------------------------
// Accountontwikkeling
// ---------------------------------------------------------------------------

const ACCOUNT_SOMMEN = [
  "volgers_erbij",
  "volgers_eraf",
  "volgers_netto",
  "vertoningen",
  "vertoningen_organisch",
  // Geen bereik — zie ADVERTENTIE_METINGEN.
  "interacties",
  "paginaweergaven",
  "aantal_posts",
];

/**
 * De volgersstand is een stand, geen som.
 *
 * Alle andere cijfers hier zijn dagwaarden die je mag optellen; het aantal volgers is de
 * stand op dat moment. Vier accounts met 10.000 volgers hebben er samen 40.000, maar
 * dezelfde vier op vier dagen hebben er nog steeds 40.000 en niet 160.000. De reeks
 * levert daarom `volgers` als de laatste stand per dag per account, en de pagina telt
 * hem alleen over accounts op — nooit over de tijd.
 */
export async function haalAccounts(van: string, tot: string): Promise<{ reeks: Kubus }> {
  const { korrel, sql: datumSql } = korrelVoor(van, tot);

  return metVerbinding(async (client) => {
    const res = await client.query(
      `select ${datumSql}::text as datum, bron, account,
              case when bool_or(volgers_geschat) then 'Eigen meting' else 'Platformhistorie' end as herkomst,
              -- Bij een weekkorrel is de stand aan het eind van de week de juiste, niet
              -- de som van zeven standen.
              coalesce((array_agg(volgers order by datum desc) filter (where volgers is not null))[1], 0) as volgers,
              ${ACCOUNT_SOMMEN.map((m) => `coalesce(sum(${m}), 0) as ${m}`).join(", ")}
         from dataloket.v_account_ontwikkeling
        where datum between $1 and $2
        group by 1, 2, 3
        order by 1`,
      [van, tot],
    );

    const reeks = bouwKubus(
      res.rows,
      ["datum", "bron", "account", "herkomst"],
      ["volgers", ...ACCOUNT_SOMMEN],
      korrel,
      { van, tot },
    );
    // `volgers` is de enige kolom in het hele dashboard die een stand meet en geen
    // stroom. Zonder deze markering telt de pagina dertig dagstanden bij elkaar op en
    // staat er 2,3 miljoen volgers waar er tachtigduizend horen te staan.
    reeks.standKolommen = ["volgers"];
    reeks.standPer = "account";
    return { reeks };
  });
}

// ---------------------------------------------------------------------------
// Koppeltabel
// ---------------------------------------------------------------------------

export interface Koppeling {
  campagne: string;
  bron: string | null;
  eigenaarNaam: string | null;
  merk: string | null;
  categorie: string | null;
  sheetCampagne: string | null;
  notitie: string | null;
  /** Uitgaven over de laatste 90 dagen — zegt hoe urgent een ontbrekende koppeling is. */
  uitgaven: number;
  gekoppeld: boolean;
}

/**
 * Alle campagnes die in de data voorkomen, met hun koppeling als die er is.
 *
 * Een left join vanuit de advertentiedata en niet vanuit de koppeltabel: de pagina moet
 * juist laten zien wat er nog níet gekoppeld is. Een koppeling die je niet kunt zien
 * ontbreken, gaat niemand onderhouden.
 */
export async function haalKoppelingen(): Promise<Koppeling[]> {
  return metVerbinding(async (client) => {
    const res = await client.query(
      `select c.campagne,
              c.bron,
              k.eigenaar_naam,
              k.merk,
              k.categorie,
              k.sheet_campagne,
              k.notitie,
              c.uitgaven,
              -- "Gekoppeld" is: er staat een campagne uit de sheet gekozen. Dit stond eerst
              -- op "er is een campagnemanager ingevuld", maar die kolom is uit de
              -- koppeltabel verwijderd — de sheet-koppeling is het enige wat deze pagina
              -- nu nog vastlegt.
              (coalesce(nullif(btrim(k.sheet_campagne), ''), null) is not null) as gekoppeld
         from (
           select campagne, min(bron) as bron, coalesce(sum(uitgaven), 0) as uitgaven
             from dataloket.v_advertenties
            where datum >= current_date - interval '90 days'
            group by campagne
         ) c
         left join dataloket.windsor_campagne_eigenaar k on k.campagne = c.campagne
        order by c.uitgaven desc nulls last`,
    );

    return res.rows.map((r) => ({
      campagne: String(r.campagne),
      bron: r.bron ? String(r.bron) : null,
      eigenaarNaam: r.eigenaar_naam ? String(r.eigenaar_naam) : null,
      merk: r.merk ? String(r.merk) : null,
      categorie: r.categorie ? String(r.categorie) : null,
      sheetCampagne: r.sheet_campagne ? String(r.sheet_campagne) : null,
      notitie: r.notitie ? String(r.notitie) : null,
      uitgaven: Number(r.uitgaven ?? 0),
      gekoppeld: Boolean(r.gekoppeld),
    }));
  });
}

// ---------------------------------------------------------------------------
// Budget en pacing
// ---------------------------------------------------------------------------

export interface BudgetVraag {
  /** De campagnenaam zoals hij in de advertentiedata staat. */
  campagne: string;
  /** De gekoppelde campagne uit de sheet, met zijn budget en doelen. */
  sheetCampagne: string;
  budget: number | null;
  doelLeads: number | null;
  startdatum: string;
  einddatum: string;
}

// `CampagneBudget` staat in `lib/kanalen/budget.ts`, samen met het pacing-rekenwerk dat
// de browser ermee doet — één definitie voor beide kanten van de lijn.
export type { CampagneBudget } from "@/lib/kanalen/budget";

/**
 * Wat is er van het budget op, over de looptijd van de campagne zelf?
 *
 * Bewust niet over de gekozen periode: een budget hoort bij een campagne van 1 september
 * tot 31 oktober, en "wat is er de afgelopen dertig dagen uitgegeven" is daar geen
 * antwoord op. Dat betekent dat elke campagne zijn eigen datumrange heeft — vandaar de
 * `unnest`, die de paren als tabel meestuurt in plaats van er één query per campagne van
 * te maken.
 */
export async function haalBudgetten(vragen: BudgetVraag[]): Promise<CampagneBudget[]> {
  if (vragen.length === 0) return [];

  return metVerbinding(async (client) => {
    const res = await client.query(
      `select p.campagne,
              coalesce(sum(a.uitgaven), 0) as uitgaven,
              coalesce(sum(a.leads), 0) as leads
         from unnest($1::text[], $2::date[], $3::date[]) as p(campagne, van, tot)
         left join dataloket.v_advertenties a
           on a.campagne = p.campagne and a.datum between p.van and p.tot
        group by p.campagne`,
      [
        vragen.map((v) => v.campagne),
        vragen.map((v) => v.startdatum),
        vragen.map((v) => v.einddatum),
      ],
    );

    const perCampagne = new Map(res.rows.map((r) => [String(r.campagne), r]));
    return vragen.map((vraag) => {
      const rij = perCampagne.get(vraag.campagne);
      return {
        ...vraag,
        uitgaven: Number(rij?.uitgaven ?? 0),
        leads: Number(rij?.leads ?? 0),
      };
    });
  });
}

/** De koppelingen die een sheet-campagne hebben; zonder die link valt er niets te peilen. */
export async function haalSheetKoppelingen(): Promise<{ campagne: string; sheetCampagne: string }[]> {
  return metVerbinding(async (client) => {
    const res = await client.query(
      `select campagne, sheet_campagne
         from dataloket.windsor_campagne_eigenaar
        where nullif(btrim(sheet_campagne), '') is not null`,
    );
    return res.rows.map((r) => ({
      campagne: String(r.campagne),
      sheetCampagne: String(r.sheet_campagne),
    }));
  });
}

export interface SyncStand {
  /** Wanneer de laatste geslaagde Windsor-sync eindigde. Staat in de filterbalk. */
  laatsteSync: string | null;
  /**
   * Loopt er op dit moment een sync?
   *
   * Een run zonder eindtijd die net begonnen is. "Data ophalen" duurt minuten en staat
   * voor iedereen open, dus zonder dit kunnen twee collega's hem tegelijk starten — en
   * dan wachten ze allebei op dezelfde upserts. Een halfuur is ruim: langer dan dat is
   * geen lopende run maar een afgebroken run die nooit is afgesloten.
   */
  loopt: boolean;
}

/** De laatste sync-run van één onderdeel, of null als er nog nooit een is geweest. */
export interface RunStand {
  gestartOp: string;
  geeindigdOp: string | null;
  geschreven: number | null;
  gelukt: boolean;
  fout: string | null;
}

/**
 * De stand van de nieuwste run van één onderdeel.
 *
 * Bestaat omdat een sync langer duurt dan een browser een verbinding openhoudt. De
 * ophaalactie draait op de server gewoon door nadat de browser het opgeeft — gemeten:
 * een organische ronde die als "Load failed" in beeld kwam en ondertussen 196 posts
 * wegschreef. Zonder deze query zou de gebruiker dan denken dat er niets gebeurd is en
 * nog eens klikken, waarmee hij een tweede ronde bovenop de eerste zet.
 */
export async function haalRunStand(bron: string): Promise<RunStand | null> {
  return metVerbinding(async (client) => {
    const res = await client.query(
      `select gestart_op, geeindigd_op, rijen_geplaatst, gelukt, fout
         from dataloket.sync_runs
        where bron = $1
        order by gestart_op desc
        limit 1`,
      [bron],
    );
    const rij = res.rows[0];
    if (!rij) return null;
    return {
      gestartOp: new Date(rij.gestart_op as string).toISOString(),
      geeindigdOp: rij.geeindigd_op ? new Date(rij.geeindigd_op as string).toISOString() : null,
      geschreven: rij.rijen_geplaatst === null ? null : Number(rij.rijen_geplaatst),
      gelukt: Boolean(rij.gelukt),
      fout: (rij.fout as string) || null,
    };
  });
}

export async function haalSyncStand(): Promise<SyncStand> {
  return metVerbinding(async (client) => {
    const res = await client.query(
      `select max(geeindigd_op) filter (where gelukt = true) as moment,
              count(*) filter (
                where geeindigd_op is null and gestart_op > now() - interval '30 minutes'
              ) as lopend
         from dataloket.sync_runs
        where bron like 'windsor%'`,
    );
    const moment = res.rows[0]?.moment;
    return {
      laatsteSync: moment ? new Date(moment as string).toISOString() : null,
      loopt: Number(res.rows[0]?.lopend ?? 0) > 0,
    };
  });
}
