import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { haalNotitie, verwijderNotitie, wijzigNotitie } from "@/lib/campagneNotities";
import { magBerichtVerwijderen } from "@/lib/gebruikersbeheer";

export const dynamic = "force-dynamic";

/** In Next 15 zijn routeparameters async. */
type Ctx = { params: Promise<{ id: string }> };

const MAX_TEKST_LENGTE = 1000;

export async function PATCH(request: Request, { params }: Ctx) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const tekst = typeof body.tekst === "string" ? body.tekst.trim() : undefined;
  const afgerond = typeof body.afgerond === "boolean" ? body.afgerond : undefined;

  if (tekst === undefined && afgerond === undefined) {
    return NextResponse.json({ fout: "Niets om te wijzigen." }, { status: 400 });
  }
  if (tekst !== undefined && !tekst) {
    return NextResponse.json({ fout: "Tekst mag niet leeg zijn." }, { status: 400 });
  }
  if (tekst !== undefined && tekst.length > MAX_TEKST_LENGTE) {
    return NextResponse.json({ fout: "Aantekening is te lang." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    await wijzigNotitie(supabase, gebruiker.id, id, { tekst, afgerond });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon aantekening niet wijzigen." },
      { status: 500 },
    );
  }
}

/**
 * Verwijderen mag door de schrijver zelf en door de twee beheeraccounts — die laatsten
 * mogen berichten van iedereen weghalen (zie lib/gebruikersbeheer.ts).
 *
 * De eigenaar wordt hier opgehaald in plaats van uit de client aangenomen: wie het
 * bericht schreef staat in de rij, niet in het verzoek. De RLS-policy op de tabel houdt
 * dezelfde regel aan, zodat een verzoek dat deze route omzeilt ook niets kan.
 */
export async function DELETE(_request: Request, { params }: Ctx) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  const { id } = await params;
  try {
    const supabase = await createClient();
    const notitie = await haalNotitie(supabase, id);
    if (!notitie) return NextResponse.json({ fout: "Niet gevonden." }, { status: 404 });
    if (!magBerichtVerwijderen(gebruiker, notitie.aangemaaktDoor)) {
      return NextResponse.json(
        { fout: "Alleen je eigen berichten, of die van iedereen als beheerder." },
        { status: 403 },
      );
    }

    await verwijderNotitie(supabase, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon aantekening niet verwijderen." },
      { status: 500 },
    );
  }
}
