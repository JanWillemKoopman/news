import OpenAI, { toFile } from "openai";
import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isChatGPTGeconfigureerd } from "@/lib/config";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import {
  ONTWERP_SCHEMA,
  bewaarOntwerp,
  haalAnalyse,
  type Ontwerp,
  type Rapport,
  type Wijziging,
} from "@/lib/landingspagina";
import { BEELD_REGELS, ONTWERP_PROMPT } from "@/lib/landingspaginaOntwerpPrompt";
import { MAX_STUKKEN } from "@/lib/screenshotDelen";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// Een ontwerpbrief plus een hoge afbeelding in hoge kwaliteit duurt samen al snel een paar minuten.
export const maxDuration = 300;

/**
 * Ontwerpvoorstel bij een landingspagina-audit (Monitoren → Landingspagina).
 *
 * POST { id, screenshot } → de pagina opnieuw tekenen met de belangrijkste verbeterpunten
 *                           uit het rapport verwerkt, in het design van de screenshot, en
 *                           bewaren bij de analyse (upsert op analyse).
 *
 * Twee stappen, allebei op OpenAI:
 * 1. GPT-6 Sol krijgt de screenshot en het rapport en schrijft een ontwerpbrief
 *    (ONTWERP_SCHEMA): de wijzigingen voor de marketeer en een beeldopdracht met elke
 *    nieuwe tekst letterlijk erin.
 * 2. Het beeldmodel (gpt-image-2) tekent met die opdracht de nieuwe pagina, met de
 *    screenshot-stukken als voorbeeld, zodat het design gelijk blijft.
 *
 * Zonder screenshot kan dit niet: het beeldmodel heeft het design nodig. De screenshot
 * zelf wordt ook hier niet bewaard, alleen het resultaat. Alleen beheerders, net als de
 * analyse zelf; lezen gaat via GET /api/landingspagina?id=….
 */
const MODEL = process.env.LANDINGSPAGINA_MODEL || "gpt-6-sol";
const BEELDMODEL = process.env.LANDINGSPAGINA_BEELDMODEL || "gpt-image-2";
/** Staand 1:3, de uiterste verhouding: een campagnepagina is lang, en zo blijft tekst leesbaar. */
const FORMAAT = "1024x3072";

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  if (!isBeheerder(gebruiker.email)) {
    return NextResponse.json({ fout: "Geen toegang tot dit tabblad." }, { status: 403 });
  }
  if (!isChatGPTGeconfigureerd()) {
    return NextResponse.json({ fout: "CHATGPT_KEY ontbreekt — de OpenAI-sleutel voor dit ontwerp." }, { status: 503 });
  }

  const { id, screenshot: ruweScreenshot } = (await request.json().catch(() => ({}))) as {
    id?: string;
    screenshot?: unknown;
  };
  const screenshot = Array.isArray(ruweScreenshot)
    ? ruweScreenshot.filter((d): d is string => typeof d === "string" && /^[A-Za-z0-9+/=]+$/.test(d))
    : [];
  if (!id) return NextResponse.json({ fout: "Geen analyse opgegeven." }, { status: 400 });
  if (screenshot.length === 0) {
    return NextResponse.json(
      { fout: "Upload een screenshot van de pagina: het ontwerp blijft in het design van die screenshot." },
      { status: 400 },
    );
  }
  if (screenshot.length > MAX_STUKKEN) {
    return NextResponse.json({ fout: "De screenshot is te lang." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const analyse = await haalAnalyse(supabase, id);
    if (!analyse) return NextResponse.json({ fout: "Analyse niet gevonden." }, { status: 404 });

    // Geen retries: twee pogingen passen samen niet binnen maxDuration.
    const client = new OpenAI({ apiKey: process.env.CHATGPT_KEY!, timeout: 290_000, maxRetries: 0 });
    const brief = await schrijfBrief(client, analyse.rapport, screenshot);
    const afbeelding = await teken(client, brief.beeldopdracht, screenshot);

    const ontwerp: Ontwerp = await bewaarOntwerp(
      supabase,
      analyse.id,
      { afbeelding, samenvatting: brief.samenvatting, wijzigingen: brief.wijzigingen },
      { model: `${MODEL} + ${BEELDMODEL}`, gebruikerId: gebruiker.id },
    );
    return NextResponse.json({ ontwerp });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

/** Het deel van het rapport dat voor het ontwerp telt, met genummerde verbeterpunten. */
function rapportVoorOntwerp(rapport: Rapport) {
  return {
    url: rapport.url,
    campagne: rapport.campagnetype,
    doel_volgens_marketeer: rapport.campagnecontext ?? null,
    verkeersbron: rapport.verkeersbron,
    primaire_actie: rapport.primaire_conversie,
    bezoeker: rapport.bezoeker,
    conclusie: rapport.conclusie,
    verbeterpunten: rapport.top_verbeterpunten.map((p, i) => ({
      nummer: i + 1,
      titel: p.titel,
      toelichting: p.toelichting,
      urgentie: p.urgentie,
      impact: p.impact,
    })),
    verwachte_informatie: rapport.verwachte_informatie,
    blokken: rapport.blokken,
    criteria: rapport.criteria.map((c) => ({ naam: c.naam, cijfer: c.score, beoordeling: c.beoordeling })),
  };
}

async function schrijfBrief(
  client: OpenAI,
  rapport: Rapport,
  screenshot: string[],
): Promise<{ samenvatting: string; wijzigingen: Wijziging[]; beeldopdracht: string }> {
  const response = await client.responses.create({
    model: MODEL,
    instructions: ONTWERP_PROMPT,
    // Het denkwerk zit al in het rapport; hier gaat het om uitwerken, en het beeld moet er nog achteraan.
    reasoning: { effort: "low" },
    max_output_tokens: 16_000,
    text: { format: { type: "json_schema", name: "landingspagina_ontwerp", schema: ONTWERP_SCHEMA, strict: true } },
    input: [
      {
        role: "user",
        content: [
          ...screenshot.map(
            (data): OpenAI.Responses.ResponseInputImage => ({
              type: "input_image",
              image_url: `data:image/jpeg;base64,${data}`,
              detail: "high",
            }),
          ),
          {
            type: "input_text",
            text:
              `Screenshot: de ${screenshot.length} afbeelding(en) hierboven zijn samen één volledige screenshot van de huidige pagina, van boven naar beneden.\n\n` +
              `Auditrapport:\n<rapport>\n${JSON.stringify(rapportVoorOntwerp(rapport), null, 2)}\n</rapport>`,
          },
        ],
      },
    ],
  });

  if (response.status === "incomplete") {
    throw new Error(
      response.incomplete_details?.reason === "content_filter"
        ? "ChatGPT weigerde een ontwerp voor deze pagina te maken."
        : "De ontwerpbrief werd te lang en is afgebroken. Probeer het opnieuw.",
    );
  }
  try {
    const brief = JSON.parse(response.output_text) as {
      samenvatting: string;
      wijzigingen: Wijziging[];
      beeldopdracht: string;
    };
    if (!brief.beeldopdracht?.trim()) throw new Error();
    return brief;
  } catch {
    throw new Error("De ontwerpbrief kwam niet in het verwachte formaat terug. Probeer het opnieuw.");
  }
}

/** Tekent de nieuwe pagina met de screenshot-stukken als voorbeeld; geeft een data-URL terug. */
async function teken(client: OpenAI, opdracht: string, screenshot: string[]): Promise<string> {
  const voorbeelden = await Promise.all(
    screenshot.map((data, i) =>
      toFile(Buffer.from(data, "base64"), `pagina-deel-${i + 1}.jpg`, { type: "image/jpeg" }),
    ),
  );
  const resultaat = await client.images.edit({
    model: BEELDMODEL,
    image: voorbeelden,
    // De API staat 32.000 tekens toe; als er iets af moet, dan van de opdracht en niet van de vaste regels.
    prompt: opdracht.trim().slice(0, 32_000 - BEELD_REGELS.length) + BEELD_REGELS,
    size: FORMAAT,
    quality: "high",
    output_format: "webp",
    output_compression: 85,
  });
  const data = resultaat.data?.[0]?.b64_json;
  if (!data) throw new Error("Het beeldmodel gaf geen afbeelding terug. Probeer het opnieuw.");
  return `data:image/webp;base64,${data}`;
}
