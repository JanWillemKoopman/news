import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isChatGPTGeconfigureerd } from "@/lib/config";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import {
  RAPPORT_SCHEMA,
  bewaarAnalyse,
  haalAnalyse,
  lijstAnalyses,
  normaliseerUrl,
  verwijderAnalyse,
  type Rapport,
} from "@/lib/landingspagina";
import { AUDIT_PROMPT } from "@/lib/landingspaginaPrompt";
import { MAX_STUKKEN } from "@/lib/screenshotDelen";
import { haalProfielen } from "@/lib/profielen";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
// Een volledig auditrapport (tien criteria met onderbouwing) duurt al snel een paar minuten.
export const maxDuration = 300;

/**
 * Landingspagina-audit (Monitoren → Landingspagina).
 *
 * GET              → alle bewaarde analyses (url, datum, eindcijfer, door wie)
 * GET ?id=…        → één analyse met het volledige rapport
 * POST { url }     → pagina ophalen, laten beoordelen, bewaren (upsert op url)
 * DELETE ?id=…     → analyse verwijderen (alleen beheerders)
 *
 * De beoordeling draait op OpenAI (ChatGPT, model GPT-6 Sol) via de Responses API, met
 * structured output volgens RAPPORT_SCHEMA en de screenshot als afbeeldingen. De sleutel
 * staat in CHATGPT_KEY. De rest van het dashboard (chat, kennisbank) draait nog op Claude.
 *
 * De pagina halen we zelf op met browserheaders. Weigert de site dat (bv. een 403 van de
 * botbescherming) en is er een screenshot, dan gaat de analyse door op de screenshot
 * alleen; zonder screenshot is er dan niets om te beoordelen.
 *
 * Lezen mag iedereen die ingelogd is (het team moet oude analyses kunnen inzien); een
 * nieuwe analyse starten voorlopig alleen de beheerders, net als het tabblad zelf.
 */
const MODEL = process.env.LANDINGSPAGINA_MODEL || "gpt-6-sol";

/** Genoeg voor een lange landingspagina, zonder de prompt onnodig op te blazen. */
const MAX_TEKST = 60_000;

type Namen = Record<string, { naam: string | null }>;

/**
 * Alleen het deel van de pagina dat de content marketeer in het CMS beheert: de
 * paginainhoud, zonder header, (mega)menu en footer van de website. Die vallen buiten
 * de beoordeling (zie de prompt); weghalen voorkomt dat het model er toch iets over zegt.
 * Titel en meta-description komen uit de <head> en blijven erbij, die beheert de
 * marketeer wél.
 */
function alleenPaginaInhoud(html: string): string {
  const head = html.match(/<head[\s\S]*?<\/head>/i)?.[0] ?? "";
  const main = html.match(/<main\b[\s\S]*<\/main>/i)?.[0];
  // Binnen <main> kan een <header> de hero van de pagina zelf zijn, dus daar alleen
  // menu's weghalen; zonder <main> ook de site-header en -footer.
  const inhoud = main
    ? main.replace(/<nav\b[\s\S]*?<\/nav>/gi, " ")
    : html
        .replace(/<head[\s\S]*?<\/head>/i, " ")
        .replace(/<(header|nav|footer)\b[\s\S]*?<\/\1>/gi, " ");
  // Levert het wegknippen (bijna) niets op, dan klopt de opbouw niet met wat we
  // verwachten; dan liever de hele pagina dan een lege.
  const zichtbaar = inhoud.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return head + (zichtbaar.length < 300 ? html : inhoud);
}

/** Titel, meta-description, koppen, knoppen, links, afbeeldingen en lopende tekst uit de HTML. */
function naarTekst(html: string): string {
  return alleenPaginaInhoud(html.replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " "))
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/gi, "\n[META DESCRIPTION] $1\n")
    .replace(/<title[^>]*>([\s\S]*?)<\/title>/gi, "\n[TITEL] $1\n")
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, "\n[H$1] $2\n")
    .replace(/<button[^>]*>([\s\S]*?)<\/button>/gi, " [KNOP: $1] ")
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, " [LINK: $1] ")
    .replace(/<img[^>]*alt=["']([^"']+)["'][^>]*>/gi, " [AFBEELDING: $1] ")
    .replace(/<form\b/gi, "\n[FORMULIER]\n<form")
    .replace(/<(input|textarea|select)[^>]*(?:placeholder|aria-label|name)=["']([^"']*)["'][^>]*>/gi, " [VELD: $2] ")
    .replace(/<(br|p|div|li|section|tr|header|footer|nav|article)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&euro;/g, "€")
    .replace(/\[(KNOP|LINK):\s*\]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, MAX_TEKST);
}

export async function GET(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });

  try {
    const supabase = await createClient();
    const id = new URL(request.url).searchParams.get("id");

    if (id) {
      const analyse = await haalAnalyse(supabase, id);
      if (!analyse) return NextResponse.json({ fout: "Analyse niet gevonden." }, { status: 404 });
      const namen: Namen = await haalProfielen(supabase, [analyse.geanalyseerdDoor]).catch(() => ({}));
      return NextResponse.json({
        analyse: { ...analyse, geanalyseerdDoorNaam: namen[analyse.geanalyseerdDoor]?.naam ?? null },
      });
    }

    const rijen = await lijstAnalyses(supabase);
    const namen: Namen = await haalProfielen(
      supabase,
      rijen.map((r) => r.geanalyseerdDoor),
    ).catch(() => ({}));
    return NextResponse.json({
      analyses: rijen.map((r) => ({ ...r, geanalyseerdDoorNaam: namen[r.geanalyseerdDoor]?.naam ?? null })),
    });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  if (!isBeheerder(gebruiker.email)) {
    return NextResponse.json({ fout: "Alleen beheerders mogen analyses verwijderen." }, { status: 403 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ fout: "Geen analyse opgegeven." }, { status: 400 });

  try {
    const weg = await verwijderAnalyse(await createClient(), id);
    if (!weg) return NextResponse.json({ fout: "Analyse niet gevonden of niet toegestaan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  if (!isBeheerder(gebruiker.email)) {
    return NextResponse.json({ fout: "Geen toegang tot dit tabblad." }, { status: 403 });
  }

  if (!isChatGPTGeconfigureerd()) {
    return NextResponse.json({ fout: "CHATGPT_KEY ontbreekt — de OpenAI-sleutel voor deze analyse." }, { status: 503 });
  }

  const {
    url,
    campagnecontext: ruweContext,
    screenshot: ruweScreenshot,
  } = (await request.json().catch(() => ({}))) as {
    url?: string;
    campagnecontext?: string;
    screenshot?: unknown;
  };
  // Optioneel: campagnebelofte, advertentietekst of briefing voor de message match.
  const campagnecontext = String(ruweContext ?? "").trim().slice(0, 4000) || null;
  // Optioneel: de screenshot van de volledige pagina, in de browser al in stukken
  // geknipt (lib/screenshotDelen.ts): base64-JPEG's van boven naar beneden.
  const screenshot = Array.isArray(ruweScreenshot)
    ? ruweScreenshot.filter((d): d is string => typeof d === "string" && /^[A-Za-z0-9+/=]+$/.test(d))
    : [];
  if (screenshot.length > MAX_STUKKEN) {
    return NextResponse.json({ fout: "De screenshot is te lang." }, { status: 400 });
  }
  let adres: URL;
  try {
    adres = new URL(String(url ?? "").trim());
    if (adres.protocol !== "http:" && adres.protocol !== "https:") throw new Error();
  } catch {
    return NextResponse.json({ fout: "Vul een geldige URL in (https://…)." }, { status: 400 });
  }
  const genormaliseerd = normaliseerUrl(adres);

  // Ruim boven maxDuration hoeft niet: Vercel kapt de functie daar toch af.
  const client = new OpenAI({ apiKey: process.env.CHATGPT_KEY!, timeout: 290_000, maxRetries: 1 });

  try {
    const eigen = await haalZelfOp(adres);
    if (!("tekst" in eigen) && screenshot.length === 0) {
      throw new Error(
        `Pagina ophalen mislukt: ${eigen.fout}. De site blokkeert waarschijnlijk geautomatiseerde ` +
          "verzoeken. Upload een screenshot van de pagina, dan wordt die beoordeeld.",
      );
    }
    const tekst = "tekst" in eigen ? eigen.tekst : null;

    const rapport = await beoordeel(client, genormaliseerd, tekst, campagnecontext, screenshot);

    const supabase = await createClient();
    const item = await bewaarAnalyse(supabase, {
      url: genormaliseerd,
      rapport,
      model: MODEL,
      gebruikerId: gebruiker.id,
    });
    return NextResponse.json({ analyse: { ...item, geanalyseerdDoorNaam: null, rapport } });
  } catch (err) {
    return NextResponse.json(
      { fout: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

/**
 * Haalt de pagina op met de headers van een gewone browser. Veel sites (ook achter
 * Cloudflare/Akamai) weigeren een verzoek met een bot-achtige User-Agent of zonder
 * Accept-headers direct met een 403.
 */
async function haalZelfOp(adres: URL): Promise<{ tekst: string } | { fout: string }> {
  try {
    const res = await fetch(adres, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { fout: `de pagina gaf status ${res.status}` };
    const tekst = naarTekst(await res.text());
    // Een paar honderd tekens is meestal een challenge-pagina of een lege JS-app.
    if (tekst.length < 300) return { fout: "de pagina bevatte (bijna) geen tekst" };
    return { tekst };
  } catch (err) {
    return { fout: err instanceof Error ? err.message : String(err) };
  }
}

/** De eigenlijke audit: prompt van marketing, uitvoer als JSON volgens RAPPORT_SCHEMA. */
async function beoordeel(
  client: OpenAI,
  url: string,
  tekst: string | null,
  campagnecontext: string | null,
  screenshot: string[],
): Promise<Rapport> {
  const context = campagnecontext
    ? `Campagnecontext (aangeleverd door de marketeer):\n<campagne>\n${campagnecontext}\n</campagne>`
    : "Campagnecontext: niet aangeleverd. De advertentie en campagnebelofte zijn dus onbekend.";
  const screenshotUitleg = screenshot.length
    ? `Screenshot: de ${screenshot.length} afbeelding(en) hierboven zijn samen één volledige screenshot van de pagina, van boven naar beneden in volgorde. De bovenkant van de eerste afbeelding is het begin van de pagina.`
    : "Screenshot: niet aangeleverd. Je hebt alleen de uitgelezen tekst.";
  const inhoud = tekst
    ? `Inhoud van de pagina (uitgelezen HTML):\n<pagina>\n${tekst}\n</pagina>`
    : "Inhoud van de pagina: niet beschikbaar — de website weigerde het ophalen. Beoordeel de pagina volledig op de screenshot en zeg dat details als alt-teksten en de meta-description daardoor niet te controleren waren.";

  const response = await client.responses.create({
    model: MODEL,
    instructions: AUDIT_PROMPT,
    reasoning: { effort: "medium" },
    max_output_tokens: 32_000,
    text: { format: { type: "json_schema", name: "landingspagina_rapport", schema: RAPPORT_SCHEMA, strict: true } },
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
          { type: "input_text", text: `Te beoordelen URL: ${url}\n\n${context}\n\n${screenshotUitleg}\n\n${inhoud}` },
        ],
      },
    ],
  });

  if (response.status === "incomplete") {
    throw new Error(
      response.incomplete_details?.reason === "content_filter"
        ? "ChatGPT weigerde deze pagina te beoordelen."
        : "Het rapport werd te lang en is afgebroken. Probeer het opnieuw.",
    );
  }
  const weigering = response.output
    .flatMap((item) => (item.type === "message" ? item.content : []))
    .find((c) => c.type === "refusal");
  if (weigering) throw new Error("ChatGPT weigerde deze pagina te beoordelen.");

  let rapport: Rapport;
  try {
    rapport = JSON.parse(response.output_text) as Rapport;
  } catch {
    throw new Error("Het rapport kwam niet in het verwachte formaat terug. Probeer het opnieuw.");
  }

  // Het schema kan geen bereik afdwingen; hier de cijfers binnen 0-10 houden.
  const binnen = (n: number) => Math.min(10, Math.max(0, Number.isFinite(n) ? n : 0));
  rapport.url = url;
  rapport.campagnecontext = campagnecontext;
  rapport.met_screenshot = screenshot.length > 0;
  rapport.eindcijfer = Math.round(binnen(rapport.eindcijfer) * 10) / 10;
  rapport.criteria = rapport.criteria.map((c) => ({ ...c, score: Math.round(binnen(c.score)) }));
  return rapport;
}
