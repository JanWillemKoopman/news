import Anthropic from "@anthropic-ai/sdk";
import type {
  AdstockType,
  ChannelType,
  ColumnRole,
  LikelihoodType,
  SaturationType,
  SourceFile,
  TrendType,
} from "@/lib/types";

// The "architect": reviews uploaded data and proposes a job config for the wizard's
// existing /api/jobs endpoint. It never runs the statistical fit itself — mmm-core on
// Modal does that (see mmm/worker). This module only decides *what to configure*.
//
// Model choice: Sonnet 5, not Opus. This is a bounded, structured task (map known
// columns to known roles, using a fixed schema) rather than open-ended agentic work —
// exactly the profile where Sonnet is the right cost/quality tradeoff, per the pricing
// discussion with the user. `effort: "medium"` (the default) balances reasoning depth
// against cost; adaptive thinking stays on so the model can weigh ambiguous column
// names before committing to a role.
export const ARCHITECT_MODEL = "claude-sonnet-5";

// Kept small and stable so it caches well: this text is byte-identical on every
// request, from every builder, for every project — the ideal prompt-cache candidate.
const SYSTEM_INSTRUCTIONS = `Je bent de technische architect binnen een Media Mix Model (MMM) wizard. Een bouwer (een technische collega) heeft ruwe marketingdata geüpload — wekelijkse KPI-cijfers (omzet/leads) en uitgaven per kanaal. Jouw taak: die data beoordelen en een concrete modelconfiguratie voorstellen voor de bevroren, geteste statistische kern (mmm-core). Jij verzint nooit de statistische wiskunde zelf — je kiest alleen instellingen (welke kolom is de KPI, welke zijn kanalen, welk kanaaltype, welke datumkolom) die de kern gebruikt.

Regels:
- Baseer elke keuze op wat je daadwerkelijk in de kolomnamen en voorbeeldrijen ziet. Verzin geen zakelijke context die er niet is.
- Kanaaltype ("channel_type"): "intent" voor kanalen die al bestaande koopintentie vangen (zoekwoorden op eigen merknaam, marktplaatsen, iemand die al actief zoekt), "brand" voor kanalen die vooral nieuwe aandacht/vraag opbouwen (social ads, prospecting, display), "generic" als je het niet zeker weet.
- Na-ijlvorm ("adstock"): "geometric" (standaard) voor digitale kanalen, waarbij het effect direct piekt en daarna afneemt. Kies "delayed" alleen voor offline/merkkanalen die pas na een paar weken hun piek bereiken (tv, radio, out-of-home, soms video) — het effect bouwt op en dooft daarna uit.
- Verzadigingsvorm ("saturation"): "hill" (standaard) is flexibel en kan een S-curve aan. Kies "logistic" als er weinig of ruisige data is; die vorm heeft één parameter minder en is dan robuuster.
- Ruismodel ("likelihood") op modelniveau: "normal" (standaard). Kies "student_t" als de KPI duidelijke uitschieters/pieken heeft (bijv. losse actieweken, anomalieën) die je niet allemaal als event-dummy wilt afvangen — die zware-staart-verdeling laat het model niet door enkele extreme weken meesleuren.
- Trendvorm ("trend_type") op modelniveau: "linear" (standaard, één rechte trend). Kies "piecewise" als de basislijn duidelijk van richting verandert in de periode (een structurele knik/versnelling/vertraging, bijv. na een herpositionering of marktverandering) — dan mag de trend op een paar punten buigen.
- Rol ("role") per kolom: "kpi" voor de doelvariabele (waar het model omzet/leads probeert te verklaren), "spend" voor marketinguitgaven of -volume per kanaal (ook niet-monetair, zoals e-mailverzendingen — die worden net zo behandeld: opgeteld per week, nul als er die week niks was), "control" voor overige verklarende variabelen (bijvoorbeeld prijs) die je NIET als marketingkanaal wilt laten meewegen met een eigen na-ijl/verzadigingseffect.
- Wees expliciet over onzekerheid. Als een kolomnaam meerdere interpretaties toelaat (bijvoorbeeld "google_sales" kan een campagnenaam zijn, geen garantie), zeg dat in "reasoning" — dit gaat naar een mens die het kan corrigeren voordat er iets draait.
- Gebruik voor "storage_path" ALTIJD exact het pad dat je in de contextsectie hieronder per bestand hebt gekregen — verzin nooit een eigen pad.
- Zie je in de voorbeeldrijen een duidelijke uitschieter in één specifieke week (een storing, eenmalige actie, evenement) die geen structureel onderdeel van het patroon is? Stel dan een "event_dummies"-item voor (naam + ISO-jaar/weeknummer) in plaats van de ruwe data te laten liggen — dat geeft het model een controlekolom voor precies die week, zonder dat de bouwer het brondbestand hoeft te bewerken. Doe dit alleen als je de week echt in de data ziet, nooit uit voorzorg.
- Gebruik de tool "propose_model_config" pas zodra je een concreet, verdedigbaar voorstel hebt. Heb je eerst meer info nodig (bijvoorbeeld: geen enkel bestand is geüpload) — antwoord dan gewoon met tekst en stel een vraag, roep de tool niet aan.
- Antwoord in het Nederlands, kort en zonder onnodig jargon — de bouwer leest dit, geen eindklant.`;

interface ProjectDataContext {
  sources: { file: SourceFile; preview: string | null }[];
}

function buildDataContextBlock(ctx: ProjectDataContext): string {
  if (ctx.sources.length === 0) {
    return "Er zijn nog geen bestanden geüpload voor dit project. Vraag de bouwer om eerst data te uploaden.";
  }
  const parts = ctx.sources.map(({ file, preview }) => {
    const header = `Bestand "${file.name}" — storage_path: "${file.storage_path}"`;
    if (preview === null) {
      return `${header}\n(binair bestand — geen tekstpreview beschikbaar; vraag de bouwer om de kolomnamen te noemen als je ze nodig hebt)`;
    }
    return `${header}\nEerste regels van het bestand:\n${preview}`;
  });
  return `Geüploade bronbestanden voor dit project:\n\n${parts.join("\n\n")}`;
}

// The full JobConfig shape (mirrors mmm/worker/mmm_worker/jobspec.py + lib/types.ts),
// minus `sample` — the wizard applies its own default draws/tune/chains rather than
// letting the model pick compute cost.
const PROPOSE_CONFIG_TOOL: Anthropic.Tool = {
  name: "propose_model_config",
  description:
    "Stel een concrete modelconfiguratie voor op basis van de geziene brondata. Roep dit pas aan als je zeker genoeg bent om een compleet voorstel te doen.",
  input_schema: {
    type: "object",
    properties: {
      reasoning: {
        type: "string",
        description:
          "Korte, voor de bouwer leesbare uitleg van de keuzes — inclusief expliciete onzekerheden/aannames die gecontroleerd moeten worden.",
      },
      sources: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Korte naam voor deze bron, bv. 'weekly_data'." },
            storage_path: { type: "string" },
            date_column: { type: ["string", "null"] },
            columns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  role: { type: "string", enum: ["kpi", "spend", "control"] satisfies ColumnRole[] },
                  output_name: { type: ["string", "null"] },
                },
                required: ["name", "role", "output_name"],
                additionalProperties: false,
              },
            },
          },
          required: ["name", "storage_path", "date_column", "columns"],
          additionalProperties: false,
        },
      },
      model: {
        type: "object",
        properties: {
          kpi: { type: "string", description: "De output_name (of name) van de KPI-kolom." },
          channels: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                channel_type: { type: "string", enum: ["intent", "brand", "generic"] satisfies ChannelType[] },
                adstock: {
                  type: "string",
                  enum: ["geometric", "delayed"] satisfies AdstockType[],
                  description: "'geometric' (standaard, digitaal) of 'delayed' (offline/merk, piek na enkele weken).",
                },
                saturation: {
                  type: "string",
                  enum: ["hill", "logistic"] satisfies SaturationType[],
                  description: "'hill' (standaard) of 'logistic' (robuuster bij weinig/ruisige data).",
                },
              },
              required: ["name", "channel_type", "adstock", "saturation"],
              additionalProperties: false,
            },
          },
          control_columns: { type: "array", items: { type: "string" } },
          add_trend: { type: "boolean" },
          trend_type: {
            type: "string",
            enum: ["linear", "piecewise"] satisfies TrendType[],
            description: "'linear' (standaard) of 'piecewise' bij een duidelijke structurele knik in de basislijn.",
          },
          seasonality_periods: { type: ["number", "null"] },
          n_fourier_modes: { type: "integer" },
          likelihood: {
            type: "string",
            enum: ["normal", "student_t"] satisfies LikelihoodType[],
            description: "'normal' (standaard) of 'student_t' bij een KPI met duidelijke uitschieters.",
          },
        },
        required: ["kpi", "channels", "control_columns", "add_trend", "trend_type", "seasonality_periods", "n_fourier_modes", "likelihood"],
        additionalProperties: false,
      },
      event_dummies: {
        type: "array",
        description:
          "0/1-controlekolommen voor specifieke ISO-weken met een duidelijke, in de data zichtbare uitschieter (storing, eenmalige actie). Leeg laten als er geen zijn.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Kolomnaam, bv. 'dummy_2025w45'." },
            weeks: {
              type: "array",
              description:
                "Lijst van [iso_jaar, iso_weeknummer]-paren waarop deze dummy 1 is (elk paar exact 2 gehele getallen).",
              items: { type: "array", items: { type: "integer" } },
            },
          },
          required: ["name", "weeks"],
          additionalProperties: false,
        },
      },
    },
    required: ["reasoning", "sources", "model", "event_dummies"],
    additionalProperties: false,
  },
  strict: true,
};

export function buildRequest(
  ctx: ProjectDataContext,
  history: Anthropic.MessageParam[],
): Anthropic.MessageCreateParamsNonStreaming {
  const dataContext = buildDataContextBlock(ctx);

  return {
    model: ARCHITECT_MODEL,
    max_tokens: 4096,
    // Adaptive thinking stays on (Sonnet 5 default) so the model can weigh ambiguous
    // column-role assignments before answering — a real business decision, worth the
    // small extra cost. `effort: "medium"` keeps this bounded rather than defaulting
    // to `high`, since this is a structured single-purpose task, not agentic coding.
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    tools: [PROPOSE_CONFIG_TOOL],
    // Two cache breakpoints: the fixed instructions (identical across every builder,
    // every project, forever) and the per-project data context (identical across every
    // turn of one editing session, until new data is uploaded). Both are placed before
    // the conversation history, matching the mandatory tools -> system -> messages
    // render order so nothing downstream invalidates them.
    system: [
      { type: "text", text: SYSTEM_INSTRUCTIONS, cache_control: { type: "ephemeral" } },
      { type: "text", text: dataContext, cache_control: { type: "ephemeral" } },
    ],
    messages: history,
  };
}
