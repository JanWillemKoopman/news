import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { haalConversieActies, isKanalenGeconfigureerd } from "@/lib/kanalen/bron";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * De conversie-acties uit de advertentieplatforms, en de keuze welke daarvan een lead is.
 *
 * Lezen gaat via de read-only Postgres-verbinding (daar staat de data), schrijven via de
 * Supabase-client met de sessie van de collega — dezelfde tweedeling als bij de
 * koppeltabel, en om dezelfde reden: de keuzetabel heeft RLS, dus de schrijfactie hoort
 * door die policies heen te gaan.
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

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .schema("dataloket")
      .from("windsor_conversie_keuze")
      .upsert(
        {
          veld,
          telt_als_lead: Boolean(body.teltAlsLead),
          label,
          bijgewerkt_door: gebruiker.id,
          bijgewerkt_op: new Date().toISOString(),
        },
        { onConflict: "veld" },
      );
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Opslaan mislukt." },
      { status: 500 },
    );
  }
}
