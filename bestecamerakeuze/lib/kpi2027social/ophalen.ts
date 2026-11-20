import { getal, haalOp, tekst, type Connector, type WindsorRij } from "@/lib/windsor/api";
import type { SocialKanaal } from "@/lib/kpi2027social/definities";

/**
 * De wekelijkse ophaalactie van KPI's 2027 social media: per account rechtstreeks bij
 * Windsor, net als KPI's 2027 GA. Niet uit `windsor_account_dag`: die tabel begint op
 * 1 augustus 2026 (de nachtelijke sync haalt dertig dagen), en een jaarverwachting op vier
 * maanden mist januari t/m juli. Alleen de Instagram-volgers komen óók uit die tabel, want
 * daar bestaat bij het platform geen historie van (zie `definities.ts`).
 *
 * Per kanaal wat er gevraagd wordt — elk met een paar velden op accountniveau, dus kleine
 * antwoorden:
 *
 *  - **Instagram**: `views` per dag over het jaar, `follower_count_1d` (nieuwe volgers, alleen de
 *    laatste dertig dagen) en `followers_count` (alleen vandaag).
 *  - **LinkedIn**: `account_analytics_impression_count` en de netto volgersaanwas
 *    (`followers_gain_organic` + `followers_gain_paid`) per dag, tot en met vandaag, plus
 *    `organization_follower_count` van vandaag. De stand op een dag = de stand van vandaag
 *    min de aanwas van alle dagen erna. In stukken van 180 dagen: één opvraging mag bij
 *    LinkedIn niet meer dan 14 maanden beslaan.
 *  - **Facebook**: `page_daily_follows` (nieuwe volgers per dag — per dag, want Windsors eigen
 *    maandoptelling van dit veld geeft voor sommige maanden 0, zie `definities.ts`), `page_follows` (de stand, per
 *    dag; `page_fans` als terugval voor pagina's
 *    die nooit naar volgers zijn omgezet) en `page_impressions` per dag, in stukken van
 *    90 dagen: de Facebook-connector is traag (131 s voor een kwartaal posts gemeten).
 */

export interface OpgehaaldAccount {
  vertoningen: Record<string, number>;
  /** Nieuwe volgers per dag; elke gemeten dag staat erin, ook met 0. */
  nieuweVolgers: Record<string, number>;
  volgers: Record<string, number>;
  rijen: number;
}

const DAG_MS = 86_400_000;

function alsDatum(t: string): number {
  return Date.parse(`${t}T00:00:00Z`);
}

function tekstVan(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** `2026-03-04` of `20260304` → `2026-03-04`. */
export function datumVan(waarde: unknown): string | null {
  const t = tekst(waarde)?.replace(/\D/g, "");
  if (!t || t.length < 8) return null;
  return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
}

/** Een periode in stukken van hooguit `dagen` dagen. */
export function inStukken(van: string, tot: string, dagen: number): { van: string; tot: string }[] {
  const stukken: { van: string; tot: string }[] = [];
  for (let t = alsDatum(van); t <= alsDatum(tot); t += dagen * DAG_MS) {
    const eind = Math.min(t + (dagen - 1) * DAG_MS, alsDatum(tot));
    stukken.push({ van: tekstVan(t), tot: tekstVan(eind) });
  }
  return stukken;
}

async function inDelen(
  connector: Connector,
  velden: string[],
  van: string,
  tot: string,
  dagen: number,
  account: string,
): Promise<WindsorRij[]> {
  const rijen: WindsorRij[] = [];
  for (const stuk of inStukken(van, tot, dagen)) {
    rijen.push(...(await haalOp(connector, velden, stuk.van, stuk.tot, undefined, [account])));
  }
  return rijen;
}

/** Telt een veld per dag op, alleen voor dagen van `van` t/m `tot`. */
export function somPerDag(rijen: readonly WindsorRij[], veld: string | string[], van: string, tot: string): Record<string, number> {
  const velden = Array.isArray(veld) ? veld : [veld];
  const uit: Record<string, number> = {};
  for (const r of rijen) {
    const d = datumVan(r.date);
    if (!d || d < van || d > tot) continue;
    uit[d] = (uit[d] ?? 0) + velden.reduce((t, v) => t + getal(r[v]), 0);
  }
  return uit;
}

/**
 * De volgersstand op elke dag van `van` t/m `tot`, teruggerekend uit de stand van vandaag
 * en de netto aanwas per dag (LinkedIn). De stand aan het eind van dag d = de stand nu min
 * de aanwas van alle dagen ná d. Getest in `rekenen.test.ts`.
 */
export function standenUitAanwas(
  nu: number,
  aanwas: Readonly<Record<string, number>>,
  van: string,
  tot: string,
): Record<string, number> {
  const uit: Record<string, number> = {};
  if (!(nu > 0)) return uit;
  const naTot = Object.entries(aanwas)
    .filter(([d]) => d > tot)
    .reduce((t, [, n]) => t + n, 0);
  let stand = nu - naTot;
  for (let t = alsDatum(tot); t >= alsDatum(van); t -= DAG_MS) {
    const d = tekstVan(t);
    uit[d] = stand;
    stand -= aanwas[d] ?? 0;
  }
  return uit;
}

/** Eén getal uit de momentopname van vandaag (Instagram en LinkedIn kennen geen historie hiervan). */
function eersteGetal(rijen: readonly WindsorRij[], veld: string): number {
  for (const r of rijen) {
    const n = getal(r[veld]);
    if (n > 0) return n;
  }
  return 0;
}

/**
 * Haalt één account op over één jaar: vertoningen t/m de peildatum, volgers zo ver als het
 * kanaal ze kent. `vandaag` is de datum van de momentopname (Nederlandse kalender).
 */
export async function haalAccount(
  kanaal: SocialKanaal,
  accountId: string,
  jaar: number,
  peildatum: string,
  vandaag: string,
): Promise<OpgehaaldAccount> {
  const van = `${jaar}-01-01`;
  switch (kanaal) {
    case "instagram": {
      // Nieuwe volgers levert Meta alleen over de laatste dertig dagen, zonder vandaag; de
      // oudere dagen komen uit windsor_account_dag (zie bijwerken.ts).
      const vroegst = tekstVan(alsDatum(vandaag) - 29 * DAG_MS);
      const gisteren = tekstVan(alsDatum(vandaag) - DAG_MS);
      const nvVan = vroegst > van ? vroegst : van;
      const nvTot = gisteren < peildatum ? gisteren : peildatum;
      const [dagen, nu, nieuw] = await Promise.all([
        haalOp("instagram", ["date", "account_id", "views"], van, peildatum, undefined, [accountId]),
        haalOp("instagram", ["account_id", "followers_count"], vandaag, vandaag, undefined, [accountId]),
        nvVan <= nvTot
          ? haalOp("instagram", ["date", "account_id", "follower_count_1d"], nvVan, nvTot, undefined, [accountId])
          : Promise.resolve([]),
      ]);
      const stand = eersteGetal(nu, "followers_count");
      const volgers: Record<string, number> = {};
      if (stand > 0 && vandaag.startsWith(`${jaar}-`)) volgers[vandaag] = stand;
      return {
        vertoningen: somPerDag(dagen, "views", van, peildatum),
        nieuweVolgers: somPerDag(nieuw, "follower_count_1d", van, peildatum),
        volgers,
        rijen: dagen.length + nu.length + nieuw.length,
      };
    }
    case "linkedin": {
      // De aanwas tot en met vandaag: de stand van vandaag wordt erop teruggerekend.
      const [dagen, nu] = await Promise.all([
        inDelen(
          "linkedin_organic",
          ["date", "account_id", "followers_gain_organic", "followers_gain_paid", "account_analytics_impression_count"],
          van,
          vandaag,
          180,
          accountId,
        ),
        haalOp("linkedin_organic", ["account_id", "organization_follower_count"], vandaag, vandaag, undefined, [accountId]),
      ]);
      const aanwas = somPerDag(dagen, ["followers_gain_organic", "followers_gain_paid"], van, vandaag);
      const stand = eersteGetal(nu, "organization_follower_count");
      return {
        vertoningen: somPerDag(dagen, "account_analytics_impression_count", van, peildatum),
        nieuweVolgers: {},
        volgers: standenUitAanwas(stand, aanwas, van, peildatum),
        rijen: dagen.length + nu.length,
      };
    }
    case "facebook": {
      const dagen = await inDelen(
        "facebook_organic",
        ["date", "account_id", "page_follows", "page_fans", "page_daily_follows", "page_impressions"],
        van,
        peildatum,
        90,
        accountId,
      );
      const volgers: Record<string, number> = {};
      for (const r of dagen) {
        const d = datumVan(r.date);
        const n = getal(r.page_follows) || getal(r.page_fans);
        if (d && d >= van && d <= peildatum && n > 0) volgers[d] = n;
      }
      return {
        vertoningen: somPerDag(dagen, "page_impressions", van, peildatum),
        nieuweVolgers: somPerDag(dagen, "page_daily_follows", van, peildatum),
        volgers,
        rijen: dagen.length,
      };
    }
    default:
      throw new Error(`${kanaal} is niet gekoppeld.`);
  }
}
