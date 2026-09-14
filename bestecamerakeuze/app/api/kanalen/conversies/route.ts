import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { haalConversieActies, isKanalenGeconfigureerd } from "@/lib/kanalen/bron";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * De conversie-acties uit de advertentieplatforms, en de keuze wat ze betekenen.
 *
 * Twee onafhankelijke vinkjes per actie: telt hij als lead, en telt hij als conversie.
 * De tweede bestaat omdat Meta geen conversietotaal levert — zie `ActieKeuze` in
 * `lib/kanalen/bron.ts` voor waarom die lijst bij het optellen op Meta wordt gefilterd.
 *
 * Lezen gaat via de read-only Postgres-verbinding (daar staat de data), schrijven via de
 * Supabase-client met de sessie van de collega — dezelfde tweedeling als bij de
 * koppeltabel, en om dezelfde reden: de tabel heeft RLS, dus de schrijfactie hoort door
 * die policies heen te gaan.
 *
 * Bewust `update` en geen `upsert`: de rijen komen uit de veldcatalogus van Windsor en
 * worden door de sync aangemaakt. Een veld dat daar niet in staat, bestaat niet — dan
 * hoort een schrijfactie te falen en niet stilletjes een rij te verzinnen die de volgende
 * sync toch niet kent.
 */

export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });

  if (!isKanalenGeconfigureerd()) {
    return NextResponse.json(
      { fout: "DATAQUERY_DATABASE_URL ontbreekt — de kanaaldata is niet aangesloten." },
      { status: 503 },
    );
  }

  try {
    return NextResponse.json({ acties: await haalConversieActies() });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const veld = typeof body.veld === "string" ? body.veld.trim() : "";
  if (!veld) return NextResponse.json({ fout: "Veldnaam ontbreekt." }, { status: 400 });

  const label =
    typeof body.label === "string" && body.label.trim() ? body.label.trim().slice(0, 120) : null;

  // Een eigen naam zet `gewijzigd` aan, zodat de nachtelijke sync hem niet terugdraait
  // naar het uit de veldnaam afgeleide label. Hem leegmaken laat de sync het weer
  // overnemen; het huidige label blijft staan tot dat gebeurt.
  const wijziging: Record<string, unknown> = {
    telt_als_lead: Boolean(body.teltAlsLead),
    telt_als_conversie: Boolean(body.teltAlsConversie),
    gewijzigd: label !== null,
    bijgewerkt_door: gebruiker.id,
    bijgewerkt_op: new Date().toISOString(),
  };
  if (label !== null) wijziging.label = label;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .schema("dataloket")
      .from("windsor_conversie_acties")
      .update(wijziging)
      .eq("veld", veld)
      .select("veld");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return NextResponse.json(
        { fout: "Deze conversie-actie staat niet in de catalogus. Draai eerst 'Data ophalen'." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Opslaan mislukt." },
      { status: 500 },
    );
  }
}
