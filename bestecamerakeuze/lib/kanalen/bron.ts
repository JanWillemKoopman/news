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
 *   detail  advertentie, opgeteld over de periode    ≈ 7.900 rijen over een jaar
 *
 * Die 7.900 stond hier eerst als "≈ 200 – 450 rijen", en dat was er ruim naast: de
 * detailkubus splitst ook op plaatsing en advertentiegroep, en dat vermenigvuldigt. Het
 * is de moeite waard te weten wat er werkelijk staat, want op die aanname was ooit de
 * limiet hieronder gebaseerd.
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
import type { DagRegel } from "@/lib/kanalen/budgetBeheer";
import { labelVoorConversie } from "@/lib/windsor/velden";
import { eisVerbindingssnaar } from "@/lib/verbindingssnaar";
import { haalOpdrachten, type Opdracht } from "@/lib/windsor/opdrachten";

/** Boven deze periodelengte vat de server samen tot weken. */
export const DAG_KORREL_MAX_DAGEN = 120;

const STATEMENT_TIMEOUT_MS = 15_000;

/**
 * Hoeveel werkgeheugen één query mag gebruiken voor sorteren en groeperen.
 *
 * De standaard van de database is een paar megabyte, en daar past een jaar advertenties
 * niet in: de groepering viel dan terug op een sortering op schijf (gemeten 58 MB temp
 * voor twaalf maanden social) en dat kostte meer tijd dan het lezen van de data zelf —
 * 7,0 s tegen 1,9 s met dit getal. Het geldt per transactie, en dit bestand opent er één
 * per verzoek en sluit hem daarna; dit dashboard heeft geen honderden gelijktijdige
 * lezers, dus de optelsom blijft ruim binnen het geheugen van de instance.
 */
const WORK_MEM = "64MB";

/**
 * Er staat géén limiet meer op het aantal detailregels. Dat is een bewuste keuze en het
 * is de moeite waard te weten waarom, want de limiet stond er ook niet voor niets.
 *
 * Wat hij aanrichtte. De detailkubus splitst op advertentie × plaatsing ×
 * advertentiegroep, en over twaalf maanden Social ads zijn dat 7.885 regels. Afkappen op
 * de 2.000 duurste liet er dus 5.885 vallen — samen € 9.729 van € 159.386 (6%) en 589
 * van 6.867 leads (9%). Erger dan het totaal is de verspreiding: het verlies zit in
 * kleine advertenties over álle campagnes, dus élke regel in de tabel klopt een beetje
 * niet. Eén campagne van € 299 en 95 leads stond er als € 277 en 86 leads, met 21 van
 * zijn 32 advertentieregels buiten beeld. De pagina meldde dat eerlijk, maar een
 * waarschuwing is geen vervanging voor het juiste getal.
 *
 * Waarom hij weg kan. Hij bestond omdat de query traag was en de payload groot leek. Het
 * eerste is opgelost (migratie 0023: 17,8 s → ~1,5 s), het tweede viel mee: 7.885 regels
 * zijn ongeveer 0,9 MB aan kubusrijen plus 945 unieke advertenties aan meta, en de
 * tabellen groeperen die regels alsnog tot hooguit een paar honderd zichtbare rijen.
 *
 * Waar je op moet letten als dit ooit gaat knellen: de grens ligt niet bij het aantal
 * regels maar bij het geheugen van de browser, en die grens loopt op met de periode én
 * met het aantal advertenties. Terugzetten is één `limit` in elk van de twee
 * detailquery's plus `detail.afgekapt` weer op de vergelijking zetten; de melding in
 * `StatistiekTabel.tsx` staat er nog en gaat dan vanzelf weer aan.
 */

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
    // Alles in één expliciete transactie, en `work_mem` met `set local` daarbinnen.
    // DATAQUERY_DATABASE_URL wijst naar de transaction pooler (poort 6543, zie
    // README-dataloket.md): een kale `set` zou daar terechtkomen op een serververbinding
    // die zo weer aan een volgend verzoek wordt uitgeleend — en dan geldt hij hier niet
    // en daar wel. `set local` is gebonden aan de transactie en valt weg bij de commit.
    // `read only` omdat dit bestand uitsluitend leest; het maakt van een schrijffout een
    // duidelijke melding in plaats van een wijziging.
    await client.query("begin read only");
    await client.query(`set local work_mem = '${WORK_MEM}'`);
    const uitkomst = await werk(client);
    await client.query("commit");
    return uitkomst;
  } catch (fout) {
    await client.query("rollback").catch(() => {});
    throw fout;
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

export type AdvertentieBron = "social" | "google";

/**
 * Social ads is Meta plus LinkedIn; Google Ads staat op een eigen pagina.
 *
 * Elke pagina toont precies zijn eigen kanalen, en niets anders. Er was een derde
 * variant (`betaald`) die alle drie tegelijk ophaalde met het kanaal erbij als dimensie;
 * die zette op de pagina Google Ads regels van Meta en LinkedIn onder een filter
 * "Kanaal", terwijl de kop Google Ads bleef. Weggehaald op 14 september 2026: een pagina
 * hoort te tonen wat hij belooft. Wil iemand budget over kanalen heen vergelijken, dan is
 * de chat daar de plek voor — die leest dezelfde tabel.
 */
function bronFilter(bron: AdvertentieBron): string[] {
  if (bron === "google") return ["google"];
  return ["meta", "linkedin"];
}

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
  const groep = (aantal: number) => Array.from({ length: aantal }, (_, i) => i + 1).join(", ");

  return metVerbinding(async (client) => {
    const keuze = await gekozenActieVelden(client);
    const argumenten: unknown[] = [van, tot, bronnen];
    const { joins: join, sommen } = bouwActieSql(keuze, argumenten);

    // Merk en categorie komen uit de koppeltabel en hangen aan de campagne, dus ze
    // splitsen de rijen niet verder op — maar ze maken wel het filter mogelijk dat de
    // koppeltabel al belooft ("werkt daarna als filter op Social ads en Google Ads").
    const reeksRes = await client.query(
      `select ${datumSql.replace("datum", "a.datum")}::text as datum,
              a.account, a.platform, a.campagne, a.campagne_doel, a.campagne_status, a.campagnemanager,
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
    //
    // De thumbnail hangt er los onder en hoort niet in de groepering hierboven. Sinds
    // migratie 0023 staat hij in een eigen tabel met één rij per advertentie (935 rijen
    // tegenover de 248.000 van de feitentabel), en die join kost dus niets — maar hem
    // door de optelling slepen zou nog steeds betekenen dat elke dagregel een URL van
    // gemiddeld 537 bytes meedraagt. Daar liep "canceling statement due to statement
    // timeout" op vast.
    const detailRes = await client.query(
      `with regels as (
         select a.account, a.platform,
                coalesce(nullif(a.plaatsing, ''), '—') as plaatsing,
                a.campagne, a.campagne_doel, a.campagne_status, a.campagnemanager,
                coalesce(a.merk, '—') as merk,
                coalesce(a.categorie, '—') as categorie,
                coalesce(nullif(a.adgroep, ''), '—') as adgroep,
                coalesce(nullif(a.advertentie_id, ''), coalesce(nullif(a.advertentie, ''), '(zonder naam)')) as advertentie_id,
                min(coalesce(nullif(a.advertentie, ''), '(zonder naam)')) as advertentie,
                min(a.advertentie_status) as advertentie_status,
                min(a.preview_url) as preview_url,
                ${sommen}
           from dataloket.v_advertenties a
           ${join}
          where a.datum between $1 and $2 and a.bron = any($3)
          group by ${groep(11)}
          order by sum(a.uitgaven) desc nulls last
       )
       select r.*, c.thumbnail_url
         from regels r
         left join (
           -- distinct on, en niet de tabel rechtstreeks: de creatives staan per
           -- (bron, advertentie_id) en de regels hierboven dragen de bron niet mee. Twee
           -- platforms die dezelfde advertentie-id hanteren zouden een regel anders
           -- verdubbelen — en een verdubbelde regel telt in de totaalregel dubbel mee.
           select distinct on (advertentie_id) advertentie_id, thumbnail_url
             from dataloket.v_advertentie_creatives
            where bron = any($3)
            order by advertentie_id
         ) c on c.advertentie_id = r.advertentie_id
        order by r.uitgaven desc nulls last`,
      argumenten,
    );

    const detail = bouwKubus(
      detailRes.rows,
      ["account", "platform", "plaatsing", "campagne", "campagne_doel", "campagne_status", "campagnemanager", "merk", "categorie", "adgroep", "advertentie_id"],
      ADVERTENTIE_METINGEN,
      korrel,
      { van, tot },
      { sleutel: "advertentie_id", velden: ["advertentie", "thumbnail_url", "preview_url", "advertentie_status"] },
    );
    // Niets afgekapt: er staat geen limiet meer op deze query. Zie de toelichting boven.
    detail.afgekapt = false;

    return {
      reeks: bouwKubus(
        reeksRes.rows,
        ["datum", "account", "platform", "campagne", "campagne_doel", "campagne_status", "campagnemanager", "merk", "categorie"],
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
// Waar komen leads en conversies vandaan?
// ---------------------------------------------------------------------------

/** Over hoeveel dagen het herkomstoverzicht rekent — gelijk aan de volumes in de catalogus. */
const HERKOMST_DAGEN = 90;

/**
 * Waaruit Meta's leadveld is opgebouwd.
 *
 * Meta's `lead` is zelf al een optelsom: leadformulieren op het platform plus de leads die
 * de pixel op de site meet. Die twee onderdelen levert Windsor apart mee, dus we kunnen
 * het getal uit elkaar trekken — gemeten klopt dat tot op de eenheid (1.128 + 228 = 1.356).
 *
 * Het staat hier als lijst en niet als regel, want het is een aanname over wat Meta doet.
 * Daarom controleert `haalHerkomst` of de onderdelen ook echt optellen tot het getal van
 * het platform: klopt dat niet, dan zegt de pagina dat eerlijk in plaats van een
 * uitsplitsing te tonen die niet klopt.
 */
const META_LEAD_ONDERDELEN = [
  "actions_onsite_conversion_lead_grouped",
  "actions_offsite_conversion_fb_pixel_lead",
];

export interface HerkomstOnderdeel {
  label: string;
  veld: string;
  aantal: number;
  /** Komt dit onderdeel uit het platform zelf, of uit een keuze op de Koppeltabel? */
  herkomst: "platform" | "koppeltabel";
}

export interface HerkomstRegel {
  bron: string;
  /** Het getal dat het platform zelf levert. */
  vanPlatform: number;
  /** Wat de aangewezen acties daar bovenop leggen. */
  viaKoppeltabel: number;
  /** Wat het dashboard toont — geen nieuw cijfer, maar de som van de twee hierboven. */
  totaal: number;
  onderdelen: HerkomstOnderdeel[];
  /**
   * Tellen de getoonde onderdelen op tot `vanPlatform`?
   *
   * `null` als we het niet kunnen weten (dan staat er ook geen uitsplitsing). Staat hier
   * een getal, dan is dat het verschil — en dat verschil is vaak het interessantste deel
   * van het beeld: bij Google is het precies wat daar buiten "Opnemen in conversies" valt.
   */
  onverklaard: number | null;
}

export interface Herkomst {
  dagen: number;
  leads: HerkomstRegel[];
  conversies: HerkomstRegel[];
}

/**
 * Het herkomstoverzicht achter de Koppeltabel.
 *
 * **Waarom dit er is.** Twee van de belangrijkste cijfers op het dashboard komen uit twee
 * verschillende werelden: een deel levert het platform zelf, een deel stelt het team hier
 * samen. Zolang je dat niet naast elkaar ziet, is "leads" een getal dat je maar moet
 * geloven. Dit blok laat zien waar het vandaan komt en of de onderdelen kloppen met het
 * totaal — daarmee is de Koppeltabel niet alleen een instelpagina maar ook een
 * controlepagina.
 *
 * **Wat het bewust niet doet.** Er komt hier geen nieuw totaal bij. `totaal` is exact wat
 * de kanaalpagina's al tonen; dit is een uitsplitsing, geen tweede waarheid.
 */
export async function haalHerkomst(): Promise<Herkomst> {
  return metVerbinding(async (client) => {
    // Lezen gaat over `v_advertenties` en niet over de tabel eronder: de rol achter
    // DATAQUERY_DATABASE_URL (dataloket_lezer) heeft alleen rechten op de views. Een
    // query op `windsor_advertenties` geeft hier dus "permission denied" — en omdat dit
    // endpoint ook de keuzelijst levert, valt dan de hele Koppeltabel om. Alle andere
    // queries in dit bestand lezen om dezelfde reden de view.

    const vanaf = `current_date - interval '${HERKOMST_DAGEN} days'`;

    const platformRes = await client.query(
      `select bron,
              coalesce(sum(leads), 0)      as leads,
              coalesce(sum(conversies), 0) as conversies
         from dataloket.v_advertenties
        where datum >= ${vanaf}
        group by bron`,
    );

    // Het volume per actie in hetzelfde venster, met de keuze die erop staat. Eén scan
    // over de jsonb voor alle regels samen; per bron apart vragen zou dezelfde rijen drie
    // keer lezen.
    const actieRes = await client.query(
      `select w.bron,
              e.key                                as veld,
              coalesce(a.label, e.key)             as label,
              coalesce(a.telt_als_lead, false)     as telt_als_lead,
              coalesce(a.telt_als_conversie, false) as telt_als_conversie,
              sum((e.value)::text::numeric)        as aantal
         from dataloket.v_advertenties w
         cross join lateral jsonb_each(coalesce(w.conversie_acties, '{}'::jsonb)) as e(key, value)
         left join dataloket.windsor_conversie_acties a on a.veld = e.key
        where w.datum >= ${vanaf}
        group by 1, 2, 3, 4, 5`,
    );

    const acties: HerkomstActie[] = actieRes.rows.map((r) => ({
      bron: String(r.bron),
      veld: String(r.veld),
      label: String(r.label),
      teltAlsLead: Boolean(r.telt_als_lead),
      teltAlsConversie: Boolean(r.telt_als_conversie),
      aantal: Number(r.aantal ?? 0),
    }));

    const bronnen = [...new Set([...platformRes.rows.map((r) => String(r.bron)), ...acties.map((a) => a.bron)])].sort();

    const vanPlatformVoor = (bron: string, kolom: "leads" | "conversies") =>
      Number(platformRes.rows.find((r) => String(r.bron) === bron)?.[kolom] ?? 0);

    return {
      dagen: HERKOMST_DAGEN,
      leads: bronnen.map((bron) => bouwRegel(bron, vanPlatformVoor(bron, "leads"), acties, "leads")),
      conversies: bronnen.map((bron) =>
        bouwRegel(bron, vanPlatformVoor(bron, "conversies"), acties, "conversies"),
      ),
    };
  });
}

/** Eén regel in het herkomstoverzicht: platform, koppeltabel en de onderdelen erbij. */
export interface HerkomstActie {
  bron: string;
  veld: string;
  label: string;
  teltAlsLead: boolean;
  teltAlsConversie: boolean;
  aantal: number;
}

export function bouwRegel(
  bron: string,
  vanPlatform: number,
  acties: HerkomstActie[],
  soort: "leads" | "conversies",
): HerkomstRegel {
  const eigen = acties.filter((a) => a.bron === bron);
  const gekozen = eigen.filter((a) =>
    soort === "leads" ? a.teltAlsLead : a.teltAlsConversie && bron === "meta",
  );

  const onderdelen: HerkomstOnderdeel[] = gekozen.map((a) => ({
    label: a.label,
    veld: a.veld,
    aantal: a.aantal,
    herkomst: "koppeltabel" as const,
  }));

  // De uitsplitsing van het platformgetal zelf. Alleen waar we weten hoe het is
  // opgebouwd: Meta's leadveld (zie META_LEAD_ONDERDELEN) en Google's conversietotaal,
  // dat uit de conversie-acties komt die daar zijn ingesteld.
  let vanPlatformOnderdelen: HerkomstOnderdeel[] = [];
  if (bron === "meta" && soort === "leads") {
    vanPlatformOnderdelen = META_LEAD_ONDERDELEN.map((veld) => {
      const actie = eigen.find((a) => a.veld === veld);
      return {
        label: actie?.label ?? veld,
        veld,
        aantal: actie?.aantal ?? 0,
        herkomst: "platform" as const,
      };
    });
  } else if (bron === "google" && soort === "conversies") {
    vanPlatformOnderdelen = eigen
      .filter((a) => a.aantal > 0)
      .sort((a, b) => b.aantal - a.aantal)
      .map((a) => ({
        label: a.label,
        veld: a.veld,
        aantal: a.aantal,
        herkomst: "platform" as const,
      }));
  }

  const somOnderdelen = vanPlatformOnderdelen.reduce((t, o) => t + o.aantal, 0);
  const viaKoppeltabel = gekozen.reduce((t, a) => t + a.aantal, 0);

  return {
    bron,
    vanPlatform,
    viaKoppeltabel,
    totaal: vanPlatform + viaKoppeltabel,
    onderdelen: [...vanPlatformOnderdelen, ...onderdelen],
    // Afronden op één decimaal: Google levert conversies als kommagetal en dan blijft er
    // anders altijd een verschil van 0,0000001 over dat als "onverklaard" in beeld komt.
    onverklaard:
      vanPlatformOnderdelen.length === 0
        ? null
        : Math.round((vanPlatform - somOnderdelen) * 10) / 10,
  };
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
        order by vertoningen_organisch desc nulls last`,
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
    // Niets afgekapt: er staat geen limiet meer op deze query. Zie de toelichting boven.
    detail.afgekapt = false;

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
// Website — Google Analytics 4
// ---------------------------------------------------------------------------

/**
 * Vier kubussen in één antwoord, en waarom dat hier anders ligt dan bij de advertenties.
 *
 * Op de advertentiepagina's zijn `reeks` en `detail` twee samenvattingen van dezelfde
 * rijen: dezelfde cijfers, een andere korrel. Hier zijn het vier verschillende tabellen
 * met vier verschillende korrels, en dat is geen keuze van ons maar van GA4 — een sessie
 * raakt tien pagina's, en een pagina vuurt vijf events. Optellen over pagina's levert dus
 * een ander soort getal op dan optellen over sessies, en dat mag nooit per ongeluk in
 * dezelfde kolom belanden.
 *
 * Wat ze delen: `website` en `kanaalgroep` zitten in alle vier. Daardoor werkt een filter
 * op "Paid Search" of op één site meteen op het hele scherm, en niet op de helft ervan.
 * `campagne` zit in verkeer en landingspagina's, `bron_medium` en `apparaat` alleen in
 * verkeer; de pagina zegt er per tabel bij wanneer een actief filter er niet op kan
 * werken (`zonderDimensies` in `WebsitePaneel.tsx`).
 */
const GA4_VERKEER_METINGEN = [
  "sessies",
  "gebruikers",
  "nieuwe_gebruikers",
  "betrokken_sessies",
  "weergaven",
  "conversies",
  "betrokkenheidstijd",
];

const GA4_LANDINGS_METINGEN = [
  "sessies",
  "gebruikers",
  "nieuwe_gebruikers",
  "betrokken_sessies",
  "conversies",
];

const GA4_PAGINA_METINGEN = [
  "weergaven",
  "gebruikers",
  "sessies",
  "events",
  "conversies",
  "betrokkenheidstijd",
];

const GA4_EVENT_METINGEN = ["events", "gebruikers", "conversies"];

export interface WebsiteData {
  /** Dag × website × kanaalgroep × bron/medium × campagne × apparaat — draagt de tijdas. */
  reeks: Kubus;
  /** De drie andere korrels, opgeteld over de periode. */
  extra: Record<string, Kubus>;
}

/**
 * Hoeveel regels een detailtabel hoogstens meekrijgt.
 *
 * Anders dan bij de advertenties staat hier wél een limiet, en de reden is het verschil
 * in schaal: een dealergroep heeft een paar duizend advertenties per jaar maar een
 * webshop heeft tienduizenden verschillende paden per maand (elke voorraadauto is er
 * één). Zonder grens gaat een kwartaal aan pagina's met honderdduizenden regels naar de
 * browser, en dat is precies waar het in-geheugen filteren op stukloopt.
 *
 * De grens valt op de **minst bekeken** pagina's, want er wordt op volume gesorteerd.
 * Dat is een echt verlies en het wordt daarom gemeld: `kubus.afgekapt` zet de melding in
 * `StatistiekTabel.tsx` aan, zodat de tabel niet stilletjes lager uitkomt dan de
 * kerncijfers erboven. Wie een specifieke pagina zoekt die eronder valt, filtert op
 * kanaal of kiest een kortere periode.
 */
const GA4_DETAIL_LIMIET = 3000;

export async function haalWebsite(van: string, tot: string): Promise<WebsiteData> {
  const { korrel, sql: datumSql } = korrelVoor(van, tot);

  return metVerbinding(async (client) => {
    const som = (metingen: string[]) =>
      metingen.map((m) => `coalesce(sum(${m}), 0) as ${m}`).join(", ");

    // Het verkeer houdt zijn tijdas: dit is de enige kubus waar de grafiek en de
    // kerncijferstrip op rekenen. De vier herkomstdimensies blijven erin staan (en gaan
    // dus niet naar een aparte detailkubus) omdat de filterbalk ze alle vier moet kunnen
    // aanbieden — een filter dat de grafiek niet kent, filtert de grafiek niet.
    const verkeerRes = await client.query(
      `select ${datumSql}::text as datum,
              coalesce(nullif(website, ''), account_id) as website,
              coalesce(nullif(kanaalgroep, ''), 'Onbekend') as kanaalgroep,
              coalesce(nullif(bron_medium, ''), 'Onbekend') as bron_medium,
              coalesce(nullif(campagne, ''), 'Geen campagne') as campagne,
              coalesce(nullif(apparaat, ''), 'Onbekend') as apparaat,
              ${som(GA4_VERKEER_METINGEN)}
         from dataloket.v_ga4_verkeer
        where datum between $1 and $2
        group by 1, 2, 3, 4, 5, 6
        order by 1`,
      [van, tot],
    );

    // De landingspagina's, opgeteld over de periode. Geen datum in de groepering: deze
    // kubus voedt alleen tabellen, en per dag zou hij bij een kwartaal tien keer zo groot
    // worden zonder dat er één vraag mee te beantwoorden valt die de verkeergrafiek niet
    // al beantwoordt.
    const landingRes = await client.query(
      `select coalesce(nullif(website, ''), account_id) as website,
              coalesce(nullif(landingspagina, ''), '(onbekend)') as landingspagina,
              coalesce(nullif(kanaalgroep, ''), 'Onbekend') as kanaalgroep,
              coalesce(nullif(campagne, ''), 'Geen campagne') as campagne,
              ${som(GA4_LANDINGS_METINGEN)}
         from dataloket.v_ga4_landingspaginas
        where datum between $1 and $2
        group by 1, 2, 3, 4
        order by sum(sessies) desc nulls last
        limit ${GA4_DETAIL_LIMIET}`,
      [van, tot],
    );

    const paginaRes = await client.query(
      `select coalesce(nullif(website, ''), account_id) as website,
              coalesce(nullif(pagina, ''), '(onbekend)') as pagina,
              coalesce(nullif(kanaalgroep, ''), 'Onbekend') as kanaalgroep,
              ${som(GA4_PAGINA_METINGEN)}
         from dataloket.v_ga4_paginas
        where datum between $1 and $2
        group by 1, 2, 3
        order by sum(weergaven) desc nulls last
        limit ${GA4_DETAIL_LIMIET}`,
      [van, tot],
    );

    // Events zijn er een paar tientallen per site, dus hier hoeft niets afgekapt te
    // worden — en dat is maar goed ook, want juist de zeldzame conversie is degene die je
    // wilt zien.
    const eventRes = await client.query(
      `select coalesce(nullif(website, ''), account_id) as website,
              coalesce(nullif(event_naam, ''), '(onbekend)') as event_naam,
              coalesce(nullif(kanaalgroep, ''), 'Onbekend') as kanaalgroep,
              ${som(GA4_EVENT_METINGEN)}
         from dataloket.v_ga4_events
        where datum between $1 and $2
        group by 1, 2, 3
        order by sum(events) desc nulls last`,
      [van, tot],
    );

    const landingspaginas = bouwKubus(
      landingRes.rows,
      ["website", "landingspagina", "kanaalgroep", "campagne"],
      GA4_LANDINGS_METINGEN,
      korrel,
      { van, tot },
    );
    landingspaginas.afgekapt = landingRes.rows.length >= GA4_DETAIL_LIMIET;

    const paginas = bouwKubus(
      paginaRes.rows,
      ["website", "pagina", "kanaalgroep"],
      GA4_PAGINA_METINGEN,
      korrel,
      { van, tot },
    );
    paginas.afgekapt = paginaRes.rows.length >= GA4_DETAIL_LIMIET;

    const events = bouwKubus(
      eventRes.rows,
      ["website", "event_naam", "kanaalgroep"],
      GA4_EVENT_METINGEN,
      korrel,
      { van, tot },
    );
    events.afgekapt = false;

    // Dezelfde rijen, maar alleen de events die GA4 als key event telt. Twee kubussen uit
    // één query in plaats van twee queries: het scheelt een scan, en het houdt de
    // definitie van "conversie" op één plek — boven nul in de conversiekolom, en nergens
    // een eigen lijstje met welke events dat zouden moeten zijn.
    const conversieRijen = eventRes.rows.filter((r) => Number(r.conversies ?? 0) > 0);
    const conversies = bouwKubus(
      conversieRijen,
      ["website", "event_naam", "kanaalgroep"],
      GA4_EVENT_METINGEN,
      korrel,
      { van, tot },
    );
    conversies.afgekapt = false;

    return {
      reeks: bouwKubus(
        verkeerRes.rows,
        ["datum", "website", "kanaalgroep", "bron_medium", "campagne", "apparaat"],
        GA4_VERKEER_METINGEN,
        korrel,
        { van, tot },
      ),
      extra: { landingspaginas, paginas, events, conversies },
    };
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

// ---------------------------------------------------------------------------
// Budget beheer (sidebargroep "Monitoren")
// ---------------------------------------------------------------------------

export interface BudgetBeheerData {
  /**
   * Uitgaven en klikken per maand × account × platform, binnen de gevraagde periode.
   * Opgeteld per maand (`datum` is de eerste van de maand): de pagina rekent alleen met
   * maandtotalen.
   */
  dagen: DagRegel[];
  /**
   * Alle account × platform-paren die er de afgelopen maanden liepen.
   *
   * Voedt de invultabel en de filters: je wilt ook een budget kunnen zetten voor een
   * account dat deze maand nog niets uitgaf.
   */
  paren: { account: string; platform: string }[];
  /** De laatste dag waarvan er data is — zegt tot waar de "uitgaven" lopen. */
  laatsteDatum: string | null;
}

/** Uitgaven en klikken per maand × account × platform. Gedeeld door beide ophaalacties hieronder. */
async function maandRegels(client: Client, van: string, tot: string, bronnen: string[]) {
  const res = await client.query(
    `select date_trunc('month', datum)::date::text as datum,
            coalesce(account, '—') as account,
            platform,
            coalesce(sum(uitgaven), 0) as uitgaven,
            coalesce(sum(klikken), 0) as klikken,
            max(datum)::text as laatste
       from dataloket.v_advertenties
      where datum between $1 and $2 and bron = any($3)
      group by 1, 2, 3
      order by 1`,
    [van, tot, bronnen],
  );
  const dagen: DagRegel[] = res.rows.map((r) => ({
    datum: String(r.datum),
    account: String(r.account),
    platform: String(r.platform),
    uitgaven: Number(r.uitgaven ?? 0),
    klikken: Number(r.klikken ?? 0),
  }));
  const laatsteDatum = res.rows.reduce<string | null>(
    (max, r) => (r.laatste && (!max || String(r.laatste) > max) ? String(r.laatste) : max),
    null,
  );
  return { dagen, laatsteDatum };
}

/**
 * De bron van Budget beheer is dezelfde als die van Social ads: Meta plus LinkedIn uit
 * `v_advertenties`, met álle klikken (Ads Managers "Klikken (alle)"), zodat de cijfers
 * hier overeenkomen met wat die pagina over dezelfde maand toont.
 *
 * Dit is de lopende maand plus de paren; de maanden daarvoor (voor de jaargrafiek) haalt
 * `haalBudgetMaanden` los op. Samen in één verzoek liepen ze tegen de statement timeout
 * aan: een jaar aan dagregels scannen kost op deze database 2 à 7 seconden per query.
 */
export async function haalBudgetBeheer(van: string, tot: string, parenVanaf: string): Promise<BudgetBeheerData> {
  const bronnen = bronFilter("social");
  return metVerbinding(async (client) => {
    const { dagen, laatsteDatum } = await maandRegels(client, van, tot, bronnen);

    const paarRes = await client.query(
      `select coalesce(account, '—') as account, platform, max(datum)::text as laatste
         from dataloket.v_advertenties
        where datum between $1 and $2 and bron = any($3)
        group by 1, 2
        -- Meta levert af en toe regels met platform 'unknown' en nul uitgaven; die horen
        -- niet als lege regel in de invultabel.
        having sum(uitgaven) > 0
        order by 1, 2`,
      [parenVanaf, tot, bronnen],
    );

    return {
      dagen,
      paren: paarRes.rows.map((r) => ({ account: String(r.account), platform: String(r.platform) })),
      laatsteDatum,
    };
  });
}

/** De eerdere maanden van het jaar, voor de grafiek van Budget beheer. */
export async function haalBudgetMaanden(van: string, tot: string): Promise<DagRegel[]> {
  return metVerbinding(async (client) => (await maandRegels(client, van, tot, bronFilter("social"))).dagen);
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

/**
 * De stand van de inhaalopdrachten, voor de knop "Data ophalen".
 *
 * Leest wat `lib/windsor/keten.ts` wegschrijft, maar dan met de leesrol. Dit is wat de
 * browser vroeger zelf bijhield en bij het wegklikken kwijtraakte: hoe ver de historie
 * inmiddels terugloopt en of er nog iets te doen is. Staat het op de server, dan kan de
 * pagina het ook tonen aan wie de import niet zelf gestart heeft.
 */
export async function haalOpdrachtStanden(volgorde: readonly string[]): Promise<Opdracht[]> {
  return metVerbinding((client) => haalOpdrachten(client, volgorde));
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
