import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getGebruiker } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { chatGereedheid } from "@/lib/config";
import { woordenboekVoorPrompt, beschikbareViews } from "@/lib/dictionary";
import { resultaatVoorModel, voerQueryUit } from "@/lib/dataQuery";
import { logQuery } from "@/lib/queryLog";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Hoeveel queries het model maximaal mag draaien voor één vraag. */
const MAX_RONDES = 6;

const MODEL = "claude-opus-5";

const QUERY_TOOL: Anthropic.Tool = {
  name: "query_data",
  description:
    "Voer een read-only SQL-query uit op de marketing- en verkoopdata. Gebruik " +
    "uitsluitend de views uit het datawoordenboek. Eén SELECT per aanroep. Je mag " +
    "meerdere keren queryen: eerst verkennen (welke waarden bestaan er?) en daarna " +
    "pas het echte antwoord ophalen. Krijg je een foutmelding terug, lees hem en " +
    "probeer een gecorrigeerde query.",
  input_schema: {
    type: "object",
    properties: {
      sql: {
        type: "string",
        description: "Precies één SELECT-statement, zonder afsluitende puntkomma.",
      },
      toelichting: {
        type: "string",
        description:
          "Eén zin: wat wil je met deze query te weten komen? Wordt aan de gebruiker getoond.",
      },
    },
    required: ["sql", "toelichting"],
    additionalProperties: false,
  },
  strict: true,
};

function systeemInstructie(): string {
  return [
    "Je bent de data-assistent van Udenhout. Collega's van marketing en verkoop stellen",
    "je vragen over hun eigen data; jij beantwoordt die door SQL te schrijven en uit te",
    "voeren met het gereedschap query_data.",
    "",
    "Werkwijze:",
    "- Beantwoord elke vraag met echte cijfers uit een query. Reken nooit zelf en schat nooit.",
    "- Twijfel je over een waarde (spelling van een merk, welke statussen voorkomen)? Draai",
    "  eerst een kleine verkennende query en daarna pas de echte.",
    "- Volg altijd de bedrijfsregels uit het woordenboek hieronder. Die gaan vóór je eigen aannames.",
    "- Krijg je een foutmelding, herstel de query dan zelf en probeer het opnieuw.",
    "",
    "Antwoorden:",
    "- Geef het antwoord in het Nederlands, in gewone taal, met het getal voorop.",
    "- Noem expliciet welke aannames je hebt toegepast, bijvoorbeeld welke statussen zijn",
    "  meegeteld en welk datumbereik je hebt gebruikt.",
    "- Kun je een vraag niet beantwoorden met de beschikbare tabellen, zeg dat dan en leg uit",
    "  welke gegevens ervoor nodig zouden zijn. Verzin nooit een antwoord.",
    "- Bij meerdere rijen: geef een korte conclusie in tekst, de tabel wordt apart getoond.",
    "",
    `Beschikbare views: ${beschikbareViews().join(", ")}. Andere tabellen bestaan niet voor jou.`,
  ].join("\n");
}

interface InkomendBericht {
  rol: "gebruiker" | "assistent";
  tekst: string;
}

/** Wat er per uitgevoerde query naar de UI gaat, voor de verantwoording onder het antwoord. */
interface QueryVerslag {
  sql: string;
  toelichting: string;
  aantalRijen: number | null;
  duurMs: number | null;
  fout: string | null;
  kolommen: string[];
  rijen: Record<string, unknown>[];
}

export async function POST(request: Request) {
  const gereed = chatGereedheid();
  if (!gereed.gereed) {
    return NextResponse.json(
      { fout: `Nog niet geconfigureerd: ${gereed.ontbreekt.join("; ")}` },
      { status: 503 },
    );
  }

  const gebruiker = await getGebruiker();
  if (!gebruiker) {
    return NextResponse.json({ fout: "Log eerst in." }, { status: 401 });
  }

  let body: { vraag?: unknown; geschiedenis?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldig verzoek." }, { status: 400 });
  }

  const vraag = typeof body.vraag === "string" ? body.vraag.trim() : "";
  if (!vraag) {
    return NextResponse.json({ fout: "Geen vraag meegestuurd." }, { status: 400 });
  }
  if (vraag.length > 4000) {
    return NextResponse.json({ fout: "Vraag is te lang." }, { status: 400 });
  }

  const eerdere: InkomendBericht[] = Array.isArray(body.geschiedenis)
    ? (body.geschiedenis as unknown[])
        .filter(
          (b): b is InkomendBericht =>
            typeof b === "object" &&
            b !== null &&
            typeof (b as InkomendBericht).tekst === "string" &&
            ((b as InkomendBericht).rol === "gebruiker" ||
              (b as InkomendBericht).rol === "assistent"),
        )
        .slice(-20)
    : [];

  const messages: Anthropic.MessageParam[] = eerdere.map((b) => ({
    role: b.rol === "gebruiker" ? ("user" as const) : ("assistant" as const),
    content: b.tekst,
  }));
  messages.push({ role: "user", content: vraag });

  // Vóór de stream aanmaken: hierna is `cookies()` niet meer aan te roepen (zie queryLog.ts).
  const supabase = await createClient();

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const encoder = new TextEncoder();
  let afgebroken = false;

  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      afgebroken = true;
    },
    async start(controller) {
      const send = (obj: unknown) => {
        if (afgebroken) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
        } catch {
          afgebroken = true;
        }
      };

      const verslagen: QueryVerslag[] = [];
      let antwoord = "";

      try {
        for (let ronde = 0; ronde < MAX_RONDES; ronde++) {
          const runner = client.messages.stream({
            model: MODEL,
            max_tokens: 8000,
            // Het woordenboek is een grote, stabiele prefix. Het cachebreekpunt staat er
            // achteraan, zodat elke vervolgvraag in hetzelfde gesprek de instructie plus
            // het woordenboek uit de cache leest in plaats van opnieuw te betalen.
            system: [
              { type: "text", text: systeemInstructie() },
              {
                type: "text",
                text: woordenboekVoorPrompt(),
                cache_control: { type: "ephemeral" },
              },
            ],
            tools: [QUERY_TOOL],
            messages,
          });

          runner.on("streamEvent", (event) => {
            if (event.type !== "content_block_start") return;
            const blok = event.content_block;
            if (blok.type === "thinking") send({ type: "fase", fase: "denken" });
            else if (blok.type === "text") send({ type: "fase", fase: "schrijven" });
            else if (blok.type === "tool_use") send({ type: "fase", fase: "query" });
          });
          runner.on("text", (delta) => send({ type: "tekst", tekst: delta }));

          const response = await runner.finalMessage();

          // Het volledige content-blok teruggeven, inclusief eventuele thinking-blokken:
          // die horen ongewijzigd terug bij hetzelfde model.
          messages.push({ role: "assistant", content: response.content });

          const tekstBlokken = response.content.filter(
            (b): b is Anthropic.TextBlock => b.type === "text",
          );
          if (tekstBlokken.length > 0) {
            antwoord = tekstBlokken.map((b) => b.text).join("\n\n").trim();
          }

          const toolAanroepen = response.content.filter(
            (b): b is Anthropic.ToolUseBlock =>
              b.type === "tool_use" && b.name === "query_data",
          );

          if (response.stop_reason !== "tool_use" || toolAanroepen.length === 0) {
            break;
          }

          // Alle tool_results horen in één user-bericht terug — apart versturen leert het
          // model af om nog parallelle aanroepen te doen.
          const resultaten: Anthropic.ToolResultBlockParam[] = [];

          for (const aanroep of toolAanroepen) {
            const invoer = aanroep.input as { sql?: unknown; toelichting?: unknown };
            const sql = typeof invoer.sql === "string" ? invoer.sql : "";
            const toelichting =
              typeof invoer.toelichting === "string" ? invoer.toelichting : "";

            const uitkomst = await voerQueryUit(sql);

            if (uitkomst.ok) {
              const verslag: QueryVerslag = {
                sql,
                toelichting,
                aantalRijen: uitkomst.resultaat.aantalRijen,
                duurMs: uitkomst.resultaat.duurMs,
                fout: null,
                kolommen: uitkomst.resultaat.kolommen,
                rijen: uitkomst.resultaat.rijen.slice(0, 100),
              };
              verslagen.push(verslag);
              send({ type: "query", ...verslag });
              resultaten.push({
                type: "tool_result",
                tool_use_id: aanroep.id,
                content: resultaatVoorModel(uitkomst.resultaat),
              });
            } else {
              const verslag: QueryVerslag = {
                sql,
                toelichting,
                aantalRijen: null,
                duurMs: null,
                fout: uitkomst.fout,
                kolommen: [],
                rijen: [],
              };
              verslagen.push(verslag);
              send({ type: "query", ...verslag });
              resultaten.push({
                type: "tool_result",
                tool_use_id: aanroep.id,
                content: `Fout: ${uitkomst.fout}`,
                is_error: true,
              });
            }

            // Vastleggen wat er gevraagd en gedraaid is. Dit log is later je beste bron
            // voor verbeteringen aan het woordenboek: vragen die misgingen staan erin.
            await logQuery(supabase, {
              gebruikerId: gebruiker.id,
              vraag,
              sql,
              toelichting,
              gelukt: uitkomst.ok,
              fout: uitkomst.ok ? null : uitkomst.fout,
              aantalRijen: uitkomst.ok ? uitkomst.resultaat.aantalRijen : null,
              duurMs: uitkomst.ok ? uitkomst.resultaat.duurMs : null,
            });
          }

          messages.push({ role: "user", content: resultaten });

          if (ronde === MAX_RONDES - 1) {
            antwoord =
              antwoord ||
              "Ik kwam er met het toegestane aantal queries niet uit. Stel de vraag " +
                "iets specifieker, dan lukt het meestal wel.";
          }
        }

        send({
          type: "klaar",
          antwoord:
            antwoord ||
            "Ik heb hier geen antwoord op kunnen formuleren. Probeer de vraag anders te stellen.",
          queries: verslagen,
        });
      } catch (err) {
        const bericht = err instanceof Error ? err.message : String(err);
        send({ type: "fout", fout: bericht });
      } finally {
        try {
          controller.close();
        } catch {
          // Al gesloten of afgebroken.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
