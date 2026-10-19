import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { lijstGa4Koppelingen, zetGa4Koppeling } from "@/lib/campagneGa4";
import { controleerRegels, type Regel } from "@/lib/ga4Koppeling";

export const dynamic = "force-dynamic";

/**
 * De GA-koppeling en het GA-doel per campagne (tabel `campagne_ga4_doelen`).
 *
 * Schrijven gaat via de Supabase-client met de sessie van de collega, zodat RLS en
 * `bijgewerkt_door` gelden — zelfde opzet als `/api/campagne-cijfers`. De telling zelf
 * staat apart in `/api/campagne-ga4/tellen`: die leest de GA4-data met de read-only
 * verbinding, en hoort niet te falen als alleen het opslaan dat doet (of andersom).
 */
export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  try {
    const items = await lijstGa4Koppelingen(await createClient());
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon de GA-koppelingen niet ophalen." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const campagne = typeof body.campagne === "string" ? body.campagne.trim() : "";
  if (!campagne) return NextResponse.json({ fout: "Campagnenaam ontbreekt." }, { status: 400 });

  const wijziging: { doelConversies?: number | null; regels?: Regel[] } = {};

  if ("doelConversies" in body) {
    const doel = body.doelConversies;
    if (doel === null) {
      wijziging.doelConversies = null;
    } else if (typeof doel === "number" && Number.isFinite(doel) && doel >= 0) {
      wijziging.doelConversies = doel;
    } else {
      return NextResponse.json({ fout: "Het doel moet een getal van nul of hoger zijn." }, { status: 400 });
    }
  }

  if ("regels" in body) {
    const controle = controleerRegels(body.regels);
    if (!controle.ok) return NextResponse.json({ fout: controle.fout }, { status: 400 });
    wijziging.regels = controle.waarde;
  }

  if (Object.keys(wijziging).length === 0) {
    return NextResponse.json({ fout: "Niets om op te slaan." }, { status: 400 });
  }

  try {
    const item = await zetGa4Koppeling(await createClient(), gebruiker.id, campagne, wijziging);
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon de GA-koppeling niet opslaan." },
      { status: 500 },
    );
  }
}
