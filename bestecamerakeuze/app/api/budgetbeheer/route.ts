import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { haalBudgetBeheer, isKanalenGeconfigureerd } from "@/lib/kanalen/bron";
import {
  huidigeMaand,
  isMaand,
  maandGrenzen,
  verschuifMaand,
  type BudgetDoel,
} from "@/lib/kanalen/budgetBeheer";

export const dynamic = "force-dynamic";

/**
 * De data achter Budget beheer: de uitgaven en klikken van het lopende jaar per maand,
 * plus het budget en het klikdoel dat het team per account, platform en maand heeft
 * vastgelegd. De kaartjes gebruiken de lopende maand, de grafiek het hele jaar.
 *
 * Lezen van de advertentiedata gaat via de read-only verbinding van de kanaalpagina's;
 * de doelen via de Supabase-client met de sessie van de collega — dezelfde tweedeling
 * als bij de koppeltabel. Schrijven (POST) gaat ook via die client, zodat de RLS-policies
 * gelden en `bijgewerkt_door` klopt.
 */

/** Hoeveel maanden terug de invultabel accounts en platforms verzamelt. */
const PAREN_MAANDEN_TERUG = 3;

function doelenTabel(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase.schema("dataloket").from("budget_doelen");
}

export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });

  if (!isKanalenGeconfigureerd()) {
    return NextResponse.json(
      { fout: "DATAQUERY_DATABASE_URL ontbreekt — de kanaaldata is niet aangesloten." },
      { status: 503 },
    );
  }

  const maand = huidigeMaand();
  const jaar = maand.slice(0, 4);
  const van = `${jaar}-01-01`;
  // Niet verder dan gisteren. De sync schrijft overdag al een deel van vandaag weg, maar
  // de forecast deelt door de dagen t/m gisteren (`maandVoortgang`); telde vandaag hier
  // wél mee, dan kwam elke forecast te hoog uit.
  const gisteren = new Date();
  gisteren.setUTCDate(gisteren.getUTCDate() - 1);
  const tot = [`${jaar}-12-31`, gisteren.toISOString().slice(0, 10)].sort()[0];
  // In januari reikt "drie maanden terug" tot in vorig jaar; daarom de vroegste van de twee.
  const parenVanaf = [van, maandGrenzen(verschuifMaand(maand, -PAREN_MAANDEN_TERUG)).van].sort()[0];

  try {
    const supabase = await createClient();
    const [data, doelenRes] = await Promise.all([
      haalBudgetBeheer(van, tot, parenVanaf),
      doelenTabel(supabase)
        .select("account, platform, maand, budget, doel_klikken")
        .gte("maand", van)
        .lte("maand", `${jaar}-12-01`),
    ]);

    // Zonder de tabel (migratie 0027 nog niet gedraaid) tonen we de cijfers wél, met een
    // melding erbij — de uitgaven van deze maand hangen niet af van de doelen.
    const doelenFout = doelenRes.error ? doelenRes.error.message : null;
    const doelen: BudgetDoel[] = (doelenRes.data ?? []).map((r) => ({
      account: String(r.account),
      platform: String(r.platform),
      maand: String(r.maand).slice(0, 7),
      budget: r.budget === null ? null : Number(r.budget),
      doelKlikken: r.doel_klikken === null ? null : Number(r.doel_klikken),
    }));

    return NextResponse.json({ maand, ...data, doelen, doelenFout });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

function tekst(waarde: unknown, max = 200): string | null {
  if (typeof waarde !== "string") return null;
  const kaal = waarde.trim();
  return kaal ? kaal.slice(0, max) : null;
}

/** Een leeg veld is "geen doel", geen nul. Negatief of geen getal: weigeren. */
function getal(waarde: unknown): number | null | "ongeldig" {
  if (waarde === null || waarde === undefined || waarde === "") return null;
  const n = typeof waarde === "number" ? waarde : Number(waarde);
  if (!Number.isFinite(n) || n < 0) return "ongeldig";
  return n;
}

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const account = tekst(body.account);
  const platform = tekst(body.platform, 60);
  const maand = typeof body.maand === "string" && isMaand(body.maand) ? body.maand : null;
  const budget = getal(body.budget);
  const doelKlikken = getal(body.doelKlikken);

  if (!account || !platform || !maand) {
    return NextResponse.json({ fout: "Account, platform of maand ontbreekt." }, { status: 400 });
  }
  if (budget === "ongeldig" || doelKlikken === "ongeldig") {
    return NextResponse.json({ fout: "Vul een getal van nul of hoger in." }, { status: 400 });
  }

  const sleutel = { account, platform, maand: `${maand}-01` };
  const regel = {
    budget: budget === null ? null : Math.round(budget * 100) / 100,
    doel_klikken: doelKlikken === null ? null : Math.round(doelKlikken),
    bijgewerkt_door: gebruiker.id,
  };

  try {
    const tabel = doelenTabel(await createClient());

    // Eerst bijwerken, pas invoegen als er nog niets stond — net als de koppeltabel, zodat
    // `aangemaakt_door` niet bij elke wijziging overschreven wordt.
    const { data: bijgewerkt, error: updateFout } = await tabel
      .update(regel)
      .match(sleutel)
      .select("account");
    if (updateFout) throw new Error(updateFout.message);

    if (!bijgewerkt || bijgewerkt.length === 0) {
      const { error: insertFout } = await tabel.insert({
        ...sleutel,
        ...regel,
        aangemaakt_door: gebruiker.id,
      });
      if (insertFout) throw new Error(insertFout.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Opslaan mislukt." },
      { status: 500 },
    );
  }
}
