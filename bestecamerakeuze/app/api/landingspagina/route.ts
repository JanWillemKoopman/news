import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { isClaudeGeconfigureerd } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Landingspagina-analyse: haalt de opgegeven pagina op, maakt er platte tekst van en
 * laat Claude hem als campagne-landingspagina beoordelen met een cijfer per onderdeel.
 *
 * Bewust simpel: geen opslag, geen kostenregistratie — één verzoek, één antwoord.
 */
const MODEL = process.env.LANDINGSPAGINA_MODEL || "claude-sonnet-5";

/** Genoeg voor een lange landingspagina, zonder de prompt onnodig op te blazen. */
const MAX_TEKST = 40_000;

const PROMPT = `Je bent een expert in campagne-landingspagina's (conversie-optimalisatie, copywriting, UX) in de automotive-branche.
Analyseer de landingspagina hieronder en geef per onderdeel een cijfer van 1 tot 10 met een korte toelichting (1–2 zinnen):

1. Eerste indruk en boodschap (is direct duidelijk wat het aanbod is?)
2. Kopteksten en copy
3. Call-to-action (duidelijkheid, zichtbaarheid, aantal)
4. Vertrouwen en bewijs (reviews, keurmerken, merk)
5. Formulier / conversiedrempel
6. Structuur en scanbaarheid
7. Aansluiting op een campagne (focus, geen afleiding)

Sluit af met een eindcijfer en de drie belangrijkste verbeterpunten.
Antwoord in het Nederlands, in Markdown, met een tabel voor de cijfers.
Je ziet alleen de tekst en structuur van de pagina, geen opmaak of afbeeldingen — houd daar rekening mee.`;

/** Titel, meta-description, koppen, knoppen/links en lopende tekst uit de HTML. */
function naarTekst(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/gi, "\n[META DESCRIPTION] $1\n")
    .replace(/<title[^>]*>([\s\S]*?)<\/title>/gi, "\n[TITEL] $1\n")
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, "\n[H$1] $2\n")
    .replace(/<(button)[^>]*>([\s\S]*?)<\/button>/gi, " [KNOP: $2] ")
    .replace(/<form\b/gi, "\n[FORMULIER]\n<form")
    .replace(/<input[^>]*(?:placeholder|name)=["']([^"']*)["'][^>]*>/gi, " [VELD: $1] ")
    .replace(/<(br|p|div|li|section|tr)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, MAX_TEKST);
}

export async function POST(request: Request) {
  const gebruiker = await getGebruiker();
  if (!gebruiker) return NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 });

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

  let tekst: string;
  try {
    const res = await fetch(adres, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Landingspagina-analyse)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`De pagina gaf status ${res.status}.`);
    tekst = naarTekst(await res.text());
  } catch (err) {
    return NextResponse.json(
      { fout: `Pagina ophalen mislukt: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 },
    );
  }
  if (!tekst) {
    return NextResponse.json({ fout: "Op deze pagina is geen tekst gevonden." }, { status: 422 });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `${PROMPT}\n\nURL: ${adres.href}\n\n<pagina>\n${tekst}\n</pagina>`,
        },
      ],
    });
    const analyse = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return NextResponse.json({ analyse });
  } catch (err) {
    return NextResponse.json(
      { fout: `Analyse mislukt: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
