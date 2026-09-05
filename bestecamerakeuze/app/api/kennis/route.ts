import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  kennisVoorPrompt,
  lijstKennis,
  maakKennis,
  PROMPT_BUDGET,
  type Soort,
} from "@/lib/kennisbank";

export const dynamic = "force-dynamic";

const SOORTEN: Soort[] = ["koppeling", "definitie", "context", "let_op"];

/** Lege string uit een formulierveld betekent "niet ingevuld", niet "leeg opslaan". */
function alsDatum(waarde: unknown): string | null {
  return typeof waarde === "string" && waarde.trim() ? waarde.trim() : null;
}

export async function GET() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  try {
    const supabase = await createClient();
    const items = await lijstKennis(supabase);
    // De UI toont hoeveel ruimte de kennisbank inneemt, zodat het plafond zichtbaar is
    // vóórdat er items stilletjes wegvallen.
    const { gebruikt, weggelaten } = kennisVoorPrompt(items);
    return NextResponse.json({
      items,
      ruimte: { gebruikt, budget: PROMPT_BUDGET, weggelaten },
    });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon kennis niet ophalen." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const titel = typeof body.titel === "string" ? body.titel.trim() : "";
  const inhoud = typeof body.inhoud === "string" ? body.inhoud.trim() : "";
  const soort =
    typeof body.soort === "string" && (SOORTEN as string[]).includes(body.soort)
      ? (body.soort as Soort)
      : "context";

  if (!titel || !inhoud) {
    return NextResponse.json(
      { fout: "Geef in elk geval een titel en de kennis zelf op." },
      { status: 400 },
    );
  }
  if (titel.length > 200 || inhoud.length > 4000) {
    return NextResponse.json({ fout: "Titel of inhoud is te lang." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const item = await maakKennis(supabase, gebruiker.id, {
      soort,
      titel,
      inhoud,
      geldigVan: alsDatum(body.geldigVan),
      geldigTot: alsDatum(body.geldigTot),
      actief: body.actief !== false,
    });
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon kennis niet opslaan." },
      { status: 500 },
    );
  }
}
