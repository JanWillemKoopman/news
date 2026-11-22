import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { magBeperkteTabbladenZien } from "@/lib/beperkteTabbladen";
import { isKanalenGeconfigureerd } from "@/lib/kanalen/bron";
import { haalKostenverdeling } from "@/lib/leads/bron";
import { KOSTEN_JAREN, leesBedrag } from "@/lib/leads/kanaalkosten";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * De tabel achter de knop Kostenverdeling op het tabblad Leads.
 *
 * GET `?jaar=2026` (2025, 2026 of 2027): elke sessiebron/medium van udenhout.nl op sessies, met de ingevulde
 * maandbedragen van dat jaar. POST: één cel opslaan (bron/medium, maand, bedrag; leeg
 * bedrag = weghalen).
 *
 * Alleen voor de eigenaar, net als het tabblad zelf. Lezen gaat via de read-only verbinding
 * (`haalKostenverdeling`), schrijven via de Supabase-client met de sessie van de gebruiker,
 * zodat de RLS-policies gelden en `bijgewerkt_door` klopt — dezelfde tweedeling als Budget
 * beheer. `no-store`: na opslaan en herladen moet het nieuwe bedrag er staan.
 */

async function eigenaar() {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return { fout: NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 }) };
  if (!magBeperkteTabbladenZien(gebruiker.email)) {
    return { fout: NextResponse.json({ fout: "Geen toegang tot dit tabblad." }, { status: 403 }) };
  }
  return { gebruiker };
}

export async function GET(request: Request) {
  const { fout } = await eigenaar();
  if (fout) return fout;

  if (!isKanalenGeconfigureerd()) {
    return NextResponse.json(
      { fout: "DATAQUERY_DATABASE_URL ontbreekt — de leaddata is niet aangesloten." },
      { status: 503 },
    );
  }

  const gevraagd = Number(new URL(request.url).searchParams.get("jaar"));
  const jaar = (KOSTEN_JAREN as readonly number[]).includes(gevraagd) ? gevraagd : 2026;

  try {
    const data = await haalKostenverdeling(jaar);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { gebruiker, fout } = await eigenaar();
  if (fout) return fout;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  // Een lege bron/medium bestaat in GA4 ("" = niet bekend) en mag dus een bedrag krijgen.
  const bronMedium = typeof body.bronMedium === "string" ? body.bronMedium.trim().slice(0, 300) : null;
  const maand =
    typeof body.maand === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(body.maand) &&
    (KOSTEN_JAREN as readonly number[]).includes(Number(body.maand.slice(0, 4)))
      ? body.maand
      : null;
  const bedrag = leesBedrag(body.bedrag);

  if (bronMedium === null || !maand) {
    return NextResponse.json({ fout: "Bron/medium of maand ontbreekt." }, { status: 400 });
  }
  if (bedrag === "ongeldig") {
    return NextResponse.json({ fout: "Vul een bedrag van nul of hoger in." }, { status: 400 });
  }

  try {
    const tabel = (await createClient()).schema("dataloket").from("lead_kanaalkosten");
    const sleutel = { bron_medium: bronMedium, maand: `${maand}-01` };

    if (bedrag === null) {
      const { error } = await tabel.delete().match(sleutel);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, bedrag: null });
    }

    // Eerst bijwerken, pas invoegen als er nog niets stond — zodat `aangemaakt_door` niet bij
    // elke wijziging overschreven wordt (net als Budget beheer).
    const { data: bijgewerkt, error: updateFout } = await tabel
      .update({ bedrag, bijgewerkt_door: gebruiker.id })
      .match(sleutel)
      .select("bron_medium");
    if (updateFout) throw new Error(updateFout.message);
    if (!bijgewerkt || bijgewerkt.length === 0) {
      const { error } = await tabel.insert({
        ...sleutel,
        bedrag,
        aangemaakt_door: gebruiker.id,
        bijgewerkt_door: gebruiker.id,
      });
      if (error) throw new Error(error.message);
    }
    return NextResponse.json({ ok: true, bedrag });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
