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
import {
  formatFitContextBlock,
  pickArchitectModel,
  type ArchitectFitContext,
} from "@/lib/anthropic/fitContext";

// The "architect": an MMM expert that (1) reviews uploaded data and proposes a job config
// for the wizard's existing /api/jobs endpoint, and (2) once a fit has run, reads the
// results back, interprets them in plain language, and proposes an *improved* config or
// diagnoses a failure. It never runs the statistical fit itself — mmm-core on Modal does
// that (see mmm/worker) — and it never runs anything on its own: it proposes, the builder
// clicks. This module only decides *what to configure* and *how to read the outcome*.
//
// Two models, picked by context (see pickArchitectModel): cheap Sonnet 5 for the bounded
// "map columns to a config" task; Opus for the deeper reasoning of interpreting results
// and diagnosing failures. Adaptive thinking stays on; effort is medium to bound cost.

// Kept small and stable so it caches well: this text is byte-identical on every
// request, from every builder, for every project — the ideal prompt-cache candidate.
const SYSTEM_INSTRUCTIONS = `Je bent de technische architect binnen een Media Mix Model (MMM) wizard. Een bouwer (een technische collega) heeft ruwe marketingdata geüpload — wekelijkse KPI-cijfers (omzet/leads) en uitgaven per kanaal. Jouw taak: die data beoordelen en een concrete modelconfiguratie voorstellen voor de bevroren, geteste statistische kern (mmm-core). Jij verzint nooit de statistische wiskunde zelf — je kiest alleen instellingen (welke kolom is de KPI, welke zijn kanalen, welk kanaaltype, welke datumkolom) die de kern gebruikt.

Regels:
- Baseer elke keuze op wat je daadwerkelijk in de kolomnamen en voorbeeldrijen ziet. Verzin geen zakelijke context die er niet is.
- Kanaaltype ("channel_type"): "intent" voor kanalen die al bestaande koopintentie vangen (zoekwoorden op eigen merknaam, marktplaatsen, iemand die al actief zoekt), "brand" voor kanalen die vooral nieuwe aandacht/vraag opbouwen (social ads, prospecting, display), "generic" als je het niet zeker weet.
- Na-ijlvorm ("adstock"): "geometric" (standaard) voor digitale kanalen, waarbij het effect direct piekt en daarna afneemt. Kies "delayed" alleen voor offline/merkkanalen die pas na een paar weken hun piek bereiken (tv, radio, out-of-home, soms video) — het effect bouwt op en dooft daarna uit.
- Verzadigingsvorm ("saturation"): "hill" (standaard) is flexibel en kan een S-curve aan. Kies "logistic" als er weinig of ruisige data is; die vorm heeft één parameter minder en is dan robuuster.
- Ruismodel ("likelihood") op modelniveau: "normal" (standaard) voor een continue KPI (omzet). Kies "student_t" als die KPI duidelijke uitschieters/pieken heeft. Kies "poisson" of "negative_binomial" als de KPI een telling is met láge aantallen per week (bijv. 5–50 leads) — dan modelleren we op tellingen i.p.v. een normale verdeling. Gebruik "negative_binomial" i.p.v. "poisson" als de tellingen sterker schommelen dan een Poisson toelaat (overdispersie). Tellingsmodellen alleen bij hele getallen ≥ 0.
- Trendvorm ("trend_type") op modelniveau: "linear" (standaard, één rechte trend). Kies "piecewise" als de basislijn duidelijk van richting verandert in de periode (een structurele knik/versnelling/vertraging, bijv. na een herpositionering of marktverandering) — dan mag de trend op een paar punten buigen.
- Rol ("role") per kolom: "kpi" voor de doelvariabele (waar het model omzet/leads probeert te verklaren), "spend" voor marketinguitgaven of -volume per kanaal (ook niet-monetair, zoals e-mailverzendingen — die worden net zo behandeld: opgeteld per week, nul als er die week niks was), "control" voor overige verklarende variabelen (bijvoorbeeld prijs) die je NIET als marketingkanaal wilt laten meewegen met een eigen na-ijl/verzadigingseffect.
- Wees expliciet over onzekerheid. Als een kolomnaam meerdere interpretaties toelaat (bijvoorbeeld "google_sales" kan een campagnenaam zijn, geen garantie), zeg dat in "reasoning" — dit gaat naar een mens die het kan corrigeren voordat er iets draait.
- Gebruik voor "storage_path" ALTIJD exact het pad dat je in de contextsectie hieronder per bestand hebt gekregen — verzin nooit een eigen pad.
- Zie je in de voorbeeldrijen een duidelijke uitschieter in één specifieke week (een storing, eenmalige actie, evenement) die geen structureel onderdeel van het patroon is? Stel dan een "event_dummies"-item voor (naam + ISO-jaar/weeknummer) in plaats van de ruwe data te laten liggen — dat geeft het model een controlekolom voor precies die week, zonder dat de bouwer het brondbestand hoeft te bewerken. Doe dit alleen als je de week echt in de data ziet, nooit uit voorzorg.
- Gebruik de tool "propose_model_config" pas zodra je een concreet, verdedigbaar voorstel hebt. Heb je eerst meer info nodig (bijvoorbeeld: geen enkel bestand is geüpload) — antwoord dan gewoon met tekst en stel een vraag, roep de tool niet aan.
- Antwoord in het Nederlands, kort en zonder onnodig jargon — de bouwer leest dit, geen eindklant.

Resultaten lezen en verbeteren:
Zodra er een fit is gedraaid, krijg je in de context een sectie "Laatste fit / resultaten". Dan is je taak niet alleen voorstellen, maar ook uitleggen en verbeteren. Vat in gewone taal samen wat de uitkomst zegt (welke kanalen werken, wat de baseline is, of het model betrouwbaar is), noem eerlijk de onzekerheid, en als er iets mis of te verbeteren is: leg de vermoedelijke oorzaak uit én roep de tool aan met een concrete, aangepaste configuratie die de bouwer met één klik kan overnemen.

Diagnose-vuistregels (oorzaak → voorstel):
- Kwaliteitspoort "fail/warn" door slechte convergentie (max R-hat > 1.1, veel divergenties): het model is te complex voor deze data. Vereenvoudig — minder Fourier-modes (n_fourier_modes omlaag), zet trend uit of hou 'm linear i.p.v. piecewise, of laat een zwak kanaal weg. Meer 'tune'/hogere target_accept kan ook helpen; adviseer dat in tekst (compute-instelling, niet in de tool).
- Fit MISLUKT vóór het samplen (data-kwaliteitsfout): lees de foutmelding letterlijk. "Geen overlappende periode" → controleer welke bron de periode inkort; "ontbrekende kolom" of "control bevat NaN" → corrigeer de kolomrol, laat de control weg of geef 'm een fill-strategie. Stel de gecorrigeerde config voor.
- Een kanaal krijgt een onwaarschijnlijk hoog aandeel of ROAS: mogelijk confounding of een ontbrekende verklarende variabele. Stel voor een control toe te voegen, of — als de bouwer een lift/geo-experiment heeft — adviseer experiment-kalibratie (RoasCalibration) in tekst.
- Lage voorspellende dekking of losse uitschieterweken die het model meesleuren: overweeg "student_t", of een event-dummy voor die specifieke week.
- Slechte generalisatie als er cross-validatie is gedraaid (out-of-sample veel slechter dan in-sample): vereenvoudig het model.
- Herhaal nooit klakkeloos dezelfde config die net faalde of "warn" gaf — verander gericht wat de diagnose aanwijst, en zeg wat je veranderde en waarom.`;

interface ProjectDataContext {
  sources: { file: SourceFile; preview: string | null }[];
  fit: ArchitectFitContext;
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
            enum: ["normal", "student_t", "poisson", "negative_binomial"] satisfies LikelihoodType[],
            description:
              "'normal' (standaard, continue KPI), 'student_t' (uitschieters), 'poisson'/'negative_binomial' (lage-aantallen tellingen zoals leads).",
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
  const resultsContext = formatFitContextBlock(ctx.fit);
  const { model, effort } = pickArchitectModel(ctx.fit);

  // Model routing: Sonnet for proposing a config from data; Opus once there is a fit
  // result (or failure) to reason about. Adaptive thinking + medium effort in both cases.
  return {
    model,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: { effort },
    tools: [PROPOSE_CONFIG_TOOL],
    // Cache breakpoints on the two stable blocks: the fixed instructions (byte-identical
    // for everyone, forever) and the per-project uploaded-data context (stable across a
    // session until new data is uploaded). The fit-results block is placed AFTER them,
    // uncached — it changes whenever a new fit finishes, and keeping it past the last
    // breakpoint means a fresh result never invalidates the cached prefix.
    system: [
      { type: "text", text: SYSTEM_INSTRUCTIONS, cache_control: { type: "ephemeral" } },
      { type: "text", text: dataContext, cache_control: { type: "ephemeral" } },
      { type: "text", text: `Laatste fit / resultaten voor dit project:\n\n${resultsContext}` },
    ],
    messages: history,
  };
}
