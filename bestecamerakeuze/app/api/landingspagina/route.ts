import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isClaudeGeconfigureerd } from "@/lib/config";
import { isBeheerder } from "@/lib/gebruikersbeheer";
import {
  RAPPORT_SCHEMA,
  bewaarAnalyse,
  haalAnalyse,
  lijstAnalyses,
  normaliseerUrl,
  type Rapport,
} from "@/lib/landingspagina";
import { AUDIT_PROMPT } from "@/lib/landingspaginaPrompt";
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
 *
 * Ophalen gaat in twee stappen: eerst zelf (met browserheaders), en weigert de site dat
 * (bv. een 403 van de botbescherming), dan haalt Claude de pagina op via de web_fetch-tool
 * en gebruiken we de tekst die dat oplevert. De beoordeling zelf is in beide gevallen
 * dezelfde aanroep, met structured output volgens RAPPORT_SCHEMA.
 *
 * Lezen mag iedereen die ingelogd is (het team moet oude analyses kunnen inzien); een
 * nieuwe analyse starten voorlopig alleen de beheerders, net als het tabblad zelf.
 */
const MODEL = process.env.LANDINGSPAGINA_MODEL || "claude-sonnet-5";

/** Genoeg voor een lange landingspagina, zonder de prompt onnodig op te blazen. */
const MAX_TEKST = 60_000;

type Namen = Record<string, { naam: string | null }>;

/**
 * Alleen het deel van de pagina dat de content marketeer in het CMS beheert: de
 * paginainhoud, zonder header, (mega)menu en footer van de website. Die vallen buiten
 * de beoordeling (zie de prompt); weghalen voorkomt dat Claude er toch iets over zegt.
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

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });
  if (!isBeheerder(gebruiker.email)) {
    return NextResponse.json({ fout: "Geen toegang tot dit tabblad." }, { status: 403 });
  }

  if (!isClaudeGeconfigureerd()) {
    return NextResponse.json({ fout: "ANTHROPIC_API_KEY ontbreekt." }, { status: 503 });
  }

  const { url } = (await request.json().catch(() => ({}))) as { url?: string };
  let adres: URL;
  try {
    adres = new URL(String(url ?? "").trim());
    if (adres.protocol !== "http:" && adres.protocol !== "https:") throw new Error();
  } catch {
    return NextResponse.json({ fout: "Vul een geldige URL in (https://…)." }, { status: 400 });
  }
  const genormaliseerd = normaliseerUrl(adres);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  try {
    // Eerst zelf ophalen; weigert de site ons (botbescherming), dan haalt Claude hem op.
    const eigen = await haalZelfOp(adres);
    const tekst = "tekst" in eigen ? eigen.tekst : await haalViaWebFetch(client, adres, eigen.fout);

    const rapport = await beoordeel(client, genormaliseerd, tekst);

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

/**
 * Terugval: Claude haalt de pagina op via de web_fetch-tool (vanaf de servers van
 * Anthropic, niet vanaf Vercel), beperkt tot het domein van de opgegeven URL. We
 * gebruiken alleen de opgehaalde tekst uit het toolresultaat; de beoordeling is daarna
 * dezelfde aanroep als wanneer we de pagina zelf hadden kunnen ophalen.
 */
async function haalViaWebFetch(client: Anthropic, adres: URL, eigenFout: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Haal deze pagina op met de web_fetch-tool en antwoord daarna alleen met "OK": ${adres.href}`,
    },
  ];
  const tools: Anthropic.ToolUnion[] = [
    { type: "web_fetch_20260209", name: "web_fetch", max_uses: 1, allowed_domains: [adres.hostname] },
  ];

  let response = await client.messages.create({ model: MODEL, max_tokens: 1000, messages, tools });
  for (let i = 0; i < 3 && response.stop_reason === "pause_turn"; i++) {
    messages.push({ role: "assistant", content: response.content });
    response = await client.messages.create({ model: MODEL, max_tokens: 1000, messages, tools });
  }

  for (const blok of response.content) {
    if (blok.type !== "web_fetch_tool_result") continue;
    if (blok.content.type === "web_fetch_tool_result_error") {
      throw new Error(
        `Pagina ophalen mislukt: ${eigenFout}, en ook via Claude lukte het niet (${blok.content.error_code}). ` +
          "De site blokkeert waarschijnlijk geautomatiseerde verzoeken.",
      );
    }
    const bron = blok.content.content.source;
    if (bron.type === "text" && bron.data.trim()) return bron.data.slice(0, MAX_TEKST);
  }
  throw new Error(
    `Pagina ophalen mislukt: ${eigenFout}, en ook via Claude kwam er geen tekst terug. ` +
      "De site blokkeert waarschijnlijk geautomatiseerde verzoeken.",
  );
}

/** De eigenlijke audit: prompt van marketing, uitvoer als JSON volgens RAPPORT_SCHEMA. */
async function beoordeel(client: Anthropic, url: string, tekst: string): Promise<Rapport> {
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    system: AUDIT_PROMPT,
    output_config: { effort: "medium", format: { type: "json_schema", schema: RAPPORT_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Te beoordelen URL: ${url}\n\nInhoud van de pagina:\n<pagina>\n${tekst}\n</pagina>`,
      },
    ],
  });
  const response = await stream.finalMessage();

  if (response.stop_reason === "refusal") throw new Error("Claude weigerde deze pagina te beoordelen.");
  if (response.stop_reason === "max_tokens") {
    throw new Error("Het rapport werd te lang en is afgebroken. Probeer het opnieuw.");
  }

  const json = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  let rapport: Rapport;
  try {
    rapport = JSON.parse(json) as Rapport;
  } catch {
    throw new Error("Het rapport kwam niet in het verwachte formaat terug. Probeer het opnieuw.");
  }

  // Het schema kan geen bereik afdwingen; hier de cijfers binnen 0-10 houden.
  const binnen = (n: number) => Math.min(10, Math.max(0, Number.isFinite(n) ? n : 0));
  rapport.url = url;
  rapport.eindcijfer = Math.round(binnen(rapport.eindcijfer) * 10) / 10;
  rapport.criteria = rapport.criteria.map((c) => ({ ...c, score: Math.round(binnen(c.score)) }));
  return rapport;
}
