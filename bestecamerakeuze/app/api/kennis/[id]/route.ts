import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { verwijderKennis, wijzigKennis, type Soort } from "@/lib/kennisbank";

export const dynamic = "force-dynamic";

/** In Next 15 zijn routeparameters async. */
type Ctx = { params: Promise<{ id: string }> };

const SOORTEN: Soort[] = ["koppeling", "definitie", "context", "let_op"];

export async function PATCH(request: Request, { params }: Ctx) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const invoer: Parameters<typeof wijzigKennis>[3] = {};
  if (typeof body.titel === "string") invoer.titel = body.titel.trim().slice(0, 200);
  if (typeof body.inhoud === "string") invoer.inhoud = body.inhoud.trim().slice(0, 4000);
  if (typeof body.soort === "string" && (SOORTEN as string[]).includes(body.soort)) {
    invoer.soort = body.soort as Soort;
  }
  if (typeof body.actief === "boolean") invoer.actief = body.actief;
  if ("geldigVan" in body) {
    invoer.geldigVan =
      typeof body.geldigVan === "string" && body.geldigVan.trim() ? body.geldigVan : null;
  }
  if ("geldigTot" in body) {
    invoer.geldigTot =
      typeof body.geldigTot === "string" && body.geldigTot.trim() ? body.geldigTot : null;
  }

  try {
    const supabase = await createClient();
    await wijzigKennis(supabase, gebruiker.id, id, invoer);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon kennis niet wijzigen." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  const { id } = await params;
  try {
    const supabase = await createClient();
    await verwijderKennis(supabase, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon kennis niet verwijderen." },
      { status: 500 },
    );
  }
}
