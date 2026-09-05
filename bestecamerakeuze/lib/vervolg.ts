import Anthropic from "@anthropic-ai/sdk";
import { beschikbareViews } from "@/lib/dictionary";

/**
 * Titel en vervolgvragen na een antwoord.
 *
 * Draait op Haiku in plaats van op het hoofdmodel: dit is opsmuk rond het antwoord,
 * geen analyse, en het scheelt een factor vijf in kosten. Mislukt de aanroep, dan
 * valt alles terug op iets bruikbaars — een gesprek zonder mooie titel is niet erg,
 * een gesprek dat vastloopt op een titelgenerator wel.
 */

export const KLEIN_MODEL = "claude-haiku-4-5";

export interface Nabewerking {
  titel: string | null;
  vervolgvragen: string[];
  /** null als de aanroep mislukte — dan is er niets om te loggen. */
  usage: Anthropic.Usage | null;
}

/** Terugvaltitel: de vraag zelf, ingekort op een woordgrens. */
export function titelUitVraag(vraag: string): string {
  const schoon = vraag.trim().replace(/\s+/g, " ");
  if (schoon.length <= 60) return schoon;
  const afgekapt = schoon.slice(0, 60);
  const spatie = afgekapt.lastIndexOf(" ");
  return `${spatie > 30 ? afgekapt.slice(0, spatie) : afgekapt}…`;
}

export async function maakNabewerking(
  client: Anthropic,
  vraag: string,
  antwoord: string,
  titelNodig: boolean,
): Promise<Nabewerking> {
  const terugval: Nabewerking = {
    titel: titelNodig ? titelUitVraag(vraag) : null,
    vervolgvragen: [],
    usage: null,
  };

  try {
    const response = await client.messages.create({
      model: KLEIN_MODEL,
      max_tokens: 400,
      system:
        "Je helpt bij een datachat over verkoop- en marketingdata van een " +
        "bedrijfswagendealer. Antwoord uitsluitend in het onderstaande formaat, " +
        "zonder inleiding.\n\n" +
        (titelNodig ? "TITEL: <drie tot vijf woorden, geen aanhalingstekens>\n" : "") +
        "VRAAG: <logische vervolgvraag>\n" +
        "VRAAG: <logische vervolgvraag>\n" +
        "VRAAG: <logische vervolgvraag>\n\n" +
        "De vervolgvragen moeten beantwoordbaar zijn met deze gegevens: " +
        `${beschikbareViews().join(", ")}. Houd ze kort en concreet, in het Nederlands.`,
      messages: [
        {
          role: "user",
          content: `Vraag van de collega:\n${vraag}\n\nHet gegeven antwoord:\n${antwoord.slice(0, 2000)}`,
        },
      ],
    });

    const tekst = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const titelRegel = tekst
      .split("\n")
      .find((r) => r.trim().toUpperCase().startsWith("TITEL:"));
    const vragen = tekst
      .split("\n")
      .filter((r) => r.trim().toUpperCase().startsWith("VRAAG:"))
      .map((r) => r.replace(/^\s*vraag:\s*/i, "").trim())
      .filter((v) => v.length > 5 && v.length < 160)
      .slice(0, 3);

    return {
      titel: titelNodig
        ? (titelRegel?.replace(/^\s*titel:\s*/i, "").replace(/^["']|["']$/g, "").trim() ||
            terugval.titel)
        : null,
      vervolgvragen: vragen,
      usage: response.usage,
    };
  } catch {
    return terugval;
  }
}
