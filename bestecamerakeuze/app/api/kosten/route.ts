import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { haalKostenOp } from "@/lib/kosten";

export const dynamic = "force-dynamic";

function vandaag(): string {
  return new Date().toISOString().slice(0, 10);
}

function dagenGeleden(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const GELDIGE_DATUM = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });

  const url = new URL(request.url);
  const vanParam = url.searchParams.get("van");
  const totParam = url.searchParams.get("tot");
  let van = vanParam && GELDIGE_DATUM.test(vanParam) ? vanParam : dagenGeleden(29);
  let tot = totParam && GELDIGE_DATUM.test(totParam) ? totParam : vandaag();
  if (van > tot) [van, tot] = [tot, van];

  // Begrens de periode: een grafiek van jaren aan dagstaven is niet meer leesbaar en de
  // query zou onnodig groot worden.
  const vroegste = dagenGeleden(366);
  if (van < vroegste) van = vroegste;
  if (tot > vandaag()) tot = vandaag();

  const modellenParam = url.searchParams.get("modellen");
  const modellen = modellenParam ? modellenParam.split(",").filter(Boolean) : [];

  try {
    const supabase = await createClient();
    const overzicht = await haalKostenOp(supabase, { van, tot, modellen });
    return NextResponse.json({ van, tot, ...overzicht });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : "Kon de kosten niet ophalen." },
      { status: 500 },
    );
  }
}
