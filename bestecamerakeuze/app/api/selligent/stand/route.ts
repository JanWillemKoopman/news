import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { haalTabel } from "@/lib/selligent/bron";
import { standVan, type Filter, type MinstensEenOptin } from "@/lib/selligent/stand";
import { isSelligentGeconfigureerd } from "@/lib/selligent/verbinding";

export const dynamic = "force-dynamic";

/** Alleen de eerste aanroep bouwt de tabel op; daarna is dit een kwestie van milliseconden. */
export const maxDuration = 60;

/**
 * De metric en de maandgrafiek voor één filterselectie.
 *
 * **Een POST voor een leesactie**, en dat is een afweging. Er zit een filter op elke
 * kolom, en een selectie van een paar honderd aangevinkte modellen past niet
 * betrouwbaar in een querystring (servers en proxies kappen URL's af rond de acht
 * kilobyte). De filters gaan daarom in de body. Deze route schrijft niets — hij leest
 * dezelfde tabel die `/api/selligent` ook gebruikt.
 */
export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });

  if (!isSelligentGeconfigureerd()) {
    return NextResponse.json(
      { fout: "Selligent is niet aangesloten — zie README-selligent.md." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    filters?: unknown;
    minstensEenOptin?: unknown;
  };
  const filters = schoneFilters(body.filters);
  const minstensEenOptin: MinstensEenOptin =
    body.minstensEenOptin === "waar" || body.minstensEenOptin === "onwaar"
      ? body.minstensEenOptin
      : null;

  try {
    const tabel = await haalTabel();
    return NextResponse.json({
      stand: standVan(tabel, filters, minstensEenOptin),
      gewijzigdOp: tabel.gewijzigdOp,
    });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

/**
 * De filters uit de body overnemen, en alleen wat er hoort te staan.
 *
 * De body komt van een browser, dus hij wordt hier gecontroleerd en niet vertrouwd. Er
 * zit geen SQL of bestandspad achter — een onbekende kolomnaam wordt door `selectie()`
 * stilzwijgend overgeslagen — maar een `waarden` met honderdduizend regels zou wel
 * geheugen kosten voor niets. Vandaar de grenzen.
 */
function schoneFilters(ruw: unknown): Filter[] {
  if (!Array.isArray(ruw)) return [];
  const filters: Filter[] = [];
  for (const item of ruw.slice(0, 200)) {
    if (!item || typeof item !== "object") continue;
    const f = item as Record<string, unknown>;
    if (typeof f.kolom !== "string" || !f.kolom) continue;
    const filter: Filter = { kolom: f.kolom.slice(0, 200) };
    if (Array.isArray(f.waarden)) {
      filter.waarden = f.waarden
        .filter((w): w is string => typeof w === "string")
        .slice(0, 5000);
    }
    if (typeof f.bevat === "string" && f.bevat.trim()) filter.bevat = f.bevat.slice(0, 200);
    if (typeof f.van === "string") filter.van = f.van.slice(0, 10);
    if (typeof f.tot === "string") filter.tot = f.tot.slice(0, 10);
    filters.push(filter);
  }
  return filters;
}
