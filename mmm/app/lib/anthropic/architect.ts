import Anthropic from "@anthropic-ai/sdk";
import type {
  AdstockType,
  BaselinePriors,
  ChannelPriors,
  ChannelType,
  ColumnRole,
  FillStrategy,
  LikelihoodType,
  SaturationType,
  SourceFile,
  TrendType,
} from "@/lib/types";
import {
  ARCHITECT_ANALYST_MODEL,
  ARCHITECT_CONFIG_MODEL,
  formatFitContextBlock,
  hasFitResults,
  type ArchitectFitContext,
} from "@/lib/anthropic/fitContext";
import {
  datasetNeedsAnalysis,
  formatDatasetContextBlock,
  type ArchitectDatasetContext,
} from "@/lib/anthropic/datasetContext";

// The "architect": an MMM expert with three roles, all human-in-the-loop (it proposes,
// the builder clicks — it never runs anything itself):
//   1. Data preparation — reviews raw uploads and proposes a MERGE RECIPE (which file,
//      which column -> role, fills, event dummies) for the mmm-core ingestion step, and
//      once that merge has run, reads the quality report back and proposes fixes.
//   2. Model configuration — once a dataset is approved, proposes a job config for the
//      wizard's /api/jobs endpoint.
//   3. Results — once a fit has run, reads the outcome back, interprets it in plain
//      language, and proposes an improved config or diagnoses a failure.
// It never invents the statistical mathematics itself — mmm-core (frozen, tested Python)
// does that; this module only decides *what to configure* and *how to read the outcome*.
//
// Two models, picked by context (see pickModel below): cheap Sonnet 5 for the bounded
// "map columns to a config/recipe" tasks; Opus for the deeper reasoning of interpreting a
// quality report, fit results, or diagnosing a failure. Adaptive thinking stays on;
// effort is medium to bound cost.

// Kept small and stable so it caches well: this text is byte-identical on every
// request, from every builder, for every project — the ideal prompt-cache candidate.
const SYSTEM_INSTRUCTIONS = `Je bent de technische architect binnen een Media Mix Model (MMM) wizard. Een bouwer (een technische collega) heeft ruwe marketingdata geüpload — wekelijkse KPI-cijfers (omzet/leads) en uitgaven per kanaal, soms in meerdere losse bestanden. Jij begeleidt twee stappen, ná elkaar: (1) die ruwe bestanden controleren en samenvoegen tot één definitieve dataset, en pas daarna (2) een modelconfiguratie voorstellen voor de bevroren, geteste statistische kern (mmm-core). Jij verzint nooit de statistische wiskunde zelf — je kiest alleen instellingen die de kern gebruikt.

Stap 1 — Data voorbereiden (vóórdat er gemodelleerd wordt):
Meerdere ruwe bestanden moeten worden samengevoegd tot één wekelijkse master-tabel voordat er iets gefit kan worden. Jouw taak hier is een concreet SAMENVOEG-RECEPT voorstellen met de tool "propose_prepare_recipe": per bestand de datumkolom en per kolom de rol ("kpi"/"spend"/"control") — dezelfde rollen als in stap 2, maar hier gaat het puur om het samenvoegen, nog niet om het model. Regels voor dit recept:
- Rol ("role") per kolom: "kpi" voor de doelvariabele, "spend" voor marketinguitgaven/-volume per kanaal (ook niet-monetair, zoals e-mailverzendingen), "control" voor overige verklarende variabelen (bijvoorbeeld prijs) die geen eigen kanaal-effect krijgen.
- Voor een "control"-kolom mag je een "fill"-strategie voorstellen ("zero"/"ffill"/"bfill"/"interpolate"/"mean"/"median") als je verwacht dat er gaten in zitten; laat 'm weg als je dat niet weet — dan blijft een gat gewoon zichtbaar in het kwaliteitsrapport in plaats van dat je iets verzint.
- Zie je in de voorbeeldrijen een duidelijke uitschieter in één specifieke week? Stel een "event_dummies"-item voor (naam + ISO-jaar/weeknummer).
- Gebruik voor "storage_path" ALTIJD exact het pad dat je in de contextsectie per bestand hebt gekregen — verzin nooit een eigen pad.
- Zodra het recept is gecontroleerd (de bouwer heeft op "Controleer & voeg samen" geklikt), krijg je een sectie "Data-voorbereiding" met het kwaliteitsrapport en een preview van het resultaat. Bespreek dat in gewone taal: welke periode, welke bijzonderheden (bijna-identieke kanalen, gaten, anomalieën), en stel alleen een NIEUW recept voor als er echt iets moet veranderen — herhaal nooit klakkeloos een recept dat al is goedgekeurd of dat net gefaald is zonder de oorzaak aan te pakken.
- Mislukte samenvoeging (bijv. "geen overlappende periode"): lees de foutmelding letterlijk, achterhaal welke bron de periode inperkt of welke kolom fout staat, en stel een gecorrigeerd recept voor.

Stap 2 — Modelconfiguratie (nadat de dataset is goedgekeurd):
- Baseer elke keuze op wat je daadwerkelijk in de kolomnamen en voorbeeldrijen ziet. Verzin geen zakelijke context die er niet is.
- Kanaaltype ("channel_type"): "intent" voor kanalen die al bestaande koopintentie vangen (zoekwoorden op eigen merknaam, marktplaatsen, iemand die al actief zoekt), "brand" voor kanalen die vooral nieuwe aandacht/vraag opbouwen (social ads, prospecting, display), "generic" als je het niet zeker weet.
- Na-ijlvorm ("adstock"): "geometric" (standaard) voor digitale kanalen, waarbij het effect direct piekt en daarna afneemt. Kies "delayed" alleen voor offline/merkkanalen die pas na een paar weken hun piek bereiken (tv, radio, out-of-home, soms video) — het effect bouwt op en dooft daarna uit.
- Verzadigingsvorm ("saturation"): "hill" (standaard) is flexibel en kan een S-curve aan. Kies "logistic" als er weinig of ruisige data is; die vorm heeft één parameter minder en is dan robuuster.
- Ruismodel ("likelihood") op modelniveau: "normal" (standaard) voor een continue KPI (omzet). Kies "student_t" als die KPI duidelijke uitschieters/pieken heeft. Kies "poisson" of "negative_binomial" als de KPI een telling is met láge aantallen per week (bijv. 5–50 leads) — dan modelleren we op tellingen i.p.v. een normale verdeling. Gebruik "negative_binomial" i.p.v. "poisson" als de tellingen sterker schommelen dan een Poisson toelaat (overdispersie). Tellingsmodellen alleen bij hele getallen ≥ 0.
- Trendvorm ("trend_type") op modelniveau: "linear" (standaard, één rechte trend). Kies "piecewise" als de basislijn duidelijk van richting verandert in de periode (een structurele knik/versnelling/vertraging, bijv. na een herpositionering of marktverandering) — dan mag de trend op een paar punten buigen.
- Wees expliciet over onzekerheid. Als een kolomnaam meerdere interpretaties toelaat (bijvoorbeeld "google_sales" kan een campagnenaam zijn, geen garantie), zeg dat in "reasoning" — dit gaat naar een mens die het kan corrigeren voordat er iets draait.
- Is er een goedgekeurde dataset, gebruik dan bij voorkeur die ene samengevoegde master-tabel als bron in plaats van de losse ruwe bestanden opnieuw te mappen.
- Gebruik de tool "propose_model_config" pas zodra je een concreet, verdedigbaar voorstel hebt.

Stap 2 — parameter-tuning en afgeleide features (fijnafstemming, optioneel):
De config-tool heeft naast bovenstaande basiskeuzes ook fijnafstem-velden. Grondregel: laat elk fijnafstem-veld op null tenzij je een concrete, uitlegbare reden hebt — null betekent "gebruik de geteste standaard". Een eerste voorstel houdt priors en kalibratie vrijwel altijd op null; fijnafstemming komt pas als de data of een fit-resultaat erom vraagt. Leg elke afwijking uit in "reasoning".
- Seizoen als afgeleide feature: "seasonality_periods" (52 = jaarlijks, 26 = halfjaarlijks, null = uit) en "n_fourier_modes" (hoe fijn het patroon mag zijn; standaard 2). Zet seizoen aan als de KPI een duidelijk terugkerend patroon heeft; hou het aantal modes laag bij weinig weken data om overfitting te voorkomen.
- Trend-flexibiliteit: bij trend_type="piecewise" bepaalt "n_changepoints" hoeveel knikken de basislijn mag maken (standaard 6). Meer knikken = flexibeler maar gevoeliger voor ruis/divergenties.
- Na-ijl per kanaal: "l_max" (maximale carry-over in weken, standaard 12) en "expected_half_life" (verwachte halfwaardetijd als je concrete kennis hebt). Verhoog l_max voor merk/offline-kanalen met lange nawerking; laat expected_half_life meestal null en laat het kanaaltype de prior bepalen.
- Robuustheid: "student_t_nu" (lager = zwaardere staarten, moet > 2) alleen instellen bij likelihood="student_t".
- Priors ("priors" op model- én kanaalniveau): schalen die je alleen aanraakt met echte kennis — verklein een sigma om een component dicht bij nul te houden, vergroot 'm om de data meer te laten bewegen. Bij twijfel: null laten.
- Kalibratie ("calibration" per kanaal): alleen invullen als de bouwer een echt lift-/geo-experiment heeft — vul de gemeten "roas" en de onzekerheid "sd" in. Dit trekt de schatting zacht naar het experiment. Zonder experiment: null.

Algemeen:
- Roep pas een tool aan zodra je zeker genoeg bent. Heb je eerst meer info nodig (bijvoorbeeld: geen enkel bestand is geüpload) — antwoord dan gewoon met tekst en stel een vraag.
- Antwoord in het Nederlands, kort en zonder onnodig jargon — de bouwer leest dit, geen eindklant.

Resultaten lezen en verbeteren:
Zodra er een fit is gedraaid, krijg je in de context een sectie "Laatste fit / resultaten". Dan is je taak niet alleen voorstellen, maar ook uitleggen en verbeteren. Vat in gewone taal samen wat de uitkomst zegt (welke kanalen werken, wat de baseline is, of het model betrouwbaar is), noem eerlijk de onzekerheid, en als er iets mis of te verbeteren is: leg de vermoedelijke oorzaak uit én roep de tool aan met een concrete, aangepaste configuratie die de bouwer met één klik kan overnemen.

Diagnose-vuistregels (oorzaak → voorstel):
- Kwaliteitspoort "fail/warn" door slechte convergentie (max R-hat > 1.1, veel divergenties): het model is te complex voor deze data. Vereenvoudig — minder Fourier-modes (n_fourier_modes omlaag), zet trend uit of hou 'm linear i.p.v. piecewise, of laat een zwak kanaal weg. Meer 'tune'/hogere target_accept kan ook helpen; adviseer dat in tekst (compute-instelling, niet in de tool).
- Fit MISLUKT vóór het samplen (data-kwaliteitsfout): lees de foutmelding letterlijk. "Geen overlappende periode" → controleer welke bron de periode inkort; "ontbrekende kolom" of "control bevat NaN" → corrigeer de kolomrol, laat de control weg of geef 'm een fill-strategie. Stel de gecorrigeerde config voor.
- Een kanaal krijgt een onwaarschijnlijk hoog aandeel of ROAS: mogelijk confounding of een ontbrekende verklarende variabele. Stel voor een control toe te voegen, of — als de bouwer een lift/geo-experiment heeft — voeg een "calibration" (roas + sd) toe aan dat kanaal in de config.
- Lage voorspellende dekking of losse uitschieterweken die het model meesleuren: overweeg "student_t", of een event-dummy voor die specifieke week.
- Slechte generalisatie als er cross-validatie is gedraaid (out-of-sample veel slechter dan in-sample): vereenvoudig het model.
- Herhaal nooit klakkeloos dezelfde config die net faalde of "warn" gaf — verander gericht wat de diagnose aanwijst, en zeg wat je veranderde en waarom.`;

interface ProjectDataContext {
  sources: { file: SourceFile; preview: string | null }[];
  dataset: ArchitectDatasetContext;
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

// The PrepareRecipe shape (mirrors mmm_worker.jobspec.parse_prepare_config +
// lib/types.ts's PrepareRecipe): which raw files, mapped to which column roles, merge
// into the one master table. No model settings — that is a separate, later tool.
const PROPOSE_PREPARE_RECIPE_TOOL: Anthropic.Tool = {
  name: "propose_prepare_recipe",
  description:
    "Stel een concreet samenvoeg-recept voor: welke bestanden, met welke datumkolom, en welke rol per kolom, om tot één wekelijkse master-tabel te komen. Roep dit pas aan als je zeker genoeg bent; nog niet klaar om te fitten, alleen om samen te voegen en te controleren.",
  input_schema: {
    type: "object",
    properties: {
      reasoning: {
        type: "string",
        description:
          "Korte, voor de bouwer leesbare uitleg van de mapping-keuzes — inclusief expliciete onzekerheden die gecontroleerd moeten worden.",
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
                  // Nullable enum: strict-mode schema validation rejects an `enum` combined with
                  // a union `type: ["string","null"]` ("Enum value 'zero' does not match declared
                  // type"), so express the nullability with anyOf instead — a string from the
                  // fixed set, or null.
                  fill: {
                    anyOf: [
                      { type: "string", enum: ["zero", "ffill", "bfill", "interpolate", "mean", "median"] satisfies FillStrategy[] },
                      { type: "null" },
                    ],
                    description: "Alleen voor 'control'-kolommen: hoe ontbrekende weken te vullen. null = niet vullen (gat blijft zichtbaar).",
                  },
                },
                required: ["name", "role", "output_name", "fill"],
                additionalProperties: false,
              },
            },
          },
          required: ["name", "storage_path", "date_column", "columns"],
          additionalProperties: false,
        },
      },
      event_dummies: {
        type: "array",
        description:
          "0/1-controlekolommen voor specifieke ISO-weken met een duidelijke, in de data zichtbare uitschieter. Leeg laten als er geen zijn.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Kolomnaam, bv. 'dummy_2025w45'." },
            weeks: {
              type: "array",
              description: "Lijst van [iso_jaar, iso_weeknummer]-paren waarop deze dummy 1 is.",
              items: { type: "array", items: { type: "integer" } },
            },
          },
          required: ["name", "weeks"],
          additionalProperties: false,
        },
      },
    },
    required: ["reasoning", "sources", "event_dummies"],
    additionalProperties: false,
  },
  strict: true,
};

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
                l_max: {
                  type: ["integer", "null"],
                  description:
                    "Maximale na-ijl-duur (weken) van dit kanaal. null = standaard (12). Verhoog voor merk/offline-kanalen met lange carry-over, verlaag voor puur intent.",
                },
                expected_half_life: {
                  type: ["number", "null"],
                  description:
                    "Verwachte halfwaardetijd (weken) van het na-ijl-effect als je daar concrete kennis over hebt; null = laat het kanaaltype de prior bepalen.",
                },
                priors: {
                  anyOf: [
                    {
                      type: "object",
                      description:
                        "Fijnafstemming van de kanaal-priors. Zet alleen een veld als je een reden hebt; laat de rest null (= mmm-core-standaard).",
                      properties: {
                        beta_sigma: { type: ["number", "null"], description: "HalfNormal-schaal op het kanaaleffect; kleiner = sterkere 'dit kanaal doet weinig'-prior." },
                        adstock_concentration: { type: ["number", "null"], description: "Concentratie van de retentie-prior; hoger pint de halfwaardetijd dichter bij de verwachting." },
                        delayed_peak_weeks: { type: ["number", "null"], description: "Prior-centrum voor de piek-lag (delayed adstock)." },
                        delayed_peak_sigma: { type: ["number", "null"], description: "Prior-schaal voor de piek-lag." },
                        hill_slope_a: { type: ["number", "null"], description: "Gamma(a,b)-prior op de Hill-helling — a." },
                        hill_slope_b: { type: ["number", "null"], description: "Gamma(a,b)-prior op de Hill-helling — b." },
                        halfsat_a: { type: ["number", "null"], description: "Beta(a,b)-prior op het Hill-halfverzadigingspunt — a." },
                        halfsat_b: { type: ["number", "null"], description: "Beta(a,b)-prior op het Hill-halfverzadigingspunt — b." },
                        logistic_lam_sigma: { type: ["number", "null"], description: "HalfNormal-schaal op de logistische steilheid." },
                      },
                      required: [
                        "beta_sigma",
                        "adstock_concentration",
                        "delayed_peak_weeks",
                        "delayed_peak_sigma",
                        "hill_slope_a",
                        "hill_slope_b",
                        "halfsat_a",
                        "halfsat_b",
                        "logistic_lam_sigma",
                      ] satisfies (keyof ChannelPriors)[],
                      additionalProperties: false,
                    },
                    { type: "null" },
                  ],
                  description: "Kanaal-prior-overrides, of null om alle standaarden te houden.",
                },
                calibration: {
                  anyOf: [
                    {
                      type: "object",
                      description:
                        "Experimenteel gemeten ROAS (uit een lift-/geo-test) om dit kanaal aan te kalibreren. Alleen invullen als de bouwer een echt experiment heeft.",
                      properties: {
                        roas: { type: "number", description: "Gemeten incrementele ROAS (KPI per eenheid spend), ≥ 0." },
                        sd: { type: "number", description: "Onzekerheid (standaarddeviatie) op die meting, > 0. Kleiner = vertrouw het experiment meer." },
                      },
                      required: ["roas", "sd"],
                      additionalProperties: false,
                    },
                    { type: "null" },
                  ],
                  description: "ROAS-kalibratie uit een experiment, of null als er geen experiment is.",
                },
              },
              required: ["name", "channel_type", "adstock", "saturation", "l_max", "expected_half_life", "priors", "calibration"],
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
          n_changepoints: {
            type: ["integer", "null"],
            description:
              "Aantal knikpunten voor een 'piecewise' trend (genegeerd bij 'linear'). null = standaard (6). Meer = flexibeler, maar hogere kans op overfitting/divergenties.",
          },
          seasonality_periods: {
            type: ["number", "null"],
            description:
              "Lengte van de seizoenscyclus in weken als afgeleide feature (52 = jaarlijks, 26 = halfjaarlijks). null = seizoen uit. Zet aan als de KPI een terugkerend patroon heeft.",
          },
          n_fourier_modes: {
            type: ["integer", "null"],
            description:
              "Aantal Fourier-paren voor de seizoensterm — hoe fijn het seizoenspatroon mag zijn. null = standaard (2). Meer modes = grilliger seizoen (voorzichtig bij weinig data).",
          },
          likelihood: {
            type: "string",
            enum: ["normal", "student_t", "poisson", "negative_binomial"] satisfies LikelihoodType[],
            description:
              "'normal' (standaard, continue KPI), 'student_t' (uitschieters), 'poisson'/'negative_binomial' (lage-aantallen tellingen zoals leads).",
          },
          student_t_nu: {
            type: ["number", "null"],
            description:
              "Vrijheidsgraden voor de student_t-likelihood (lager = zwaardere staarten / robuuster tegen uitschieters, moet > 2). null = standaard (4). Alleen relevant bij likelihood='student_t'.",
          },
          priors: {
            anyOf: [
              {
                type: "object",
                description:
                  "Fijnafstemming van de basislijn-priors (intercept, trend, seizoen, controls, ruis). Zet alleen een veld met een reden; laat de rest null (= standaard).",
                properties: {
                  intercept_sigma: { type: ["number", "null"], description: "Normal-schaal op het intercept." },
                  trend_sigma: { type: ["number", "null"], description: "Normal-schaal op de trendhelling." },
                  season_sigma: { type: ["number", "null"], description: "Normal-schaal op elke Fourier-seizoenscoëfficiënt." },
                  control_sigma: { type: ["number", "null"], description: "Normal-schaal op elke control-coëfficiënt." },
                  noise_sigma: { type: ["number", "null"], description: "HalfNormal-schaal op de observatieruis." },
                  changepoint_scale: { type: ["number", "null"], description: "Laplace-schaal per knikpunt bij piecewise trend; kleiner = stuggere trend." },
                },
                required: [
                  "intercept_sigma",
                  "trend_sigma",
                  "season_sigma",
                  "control_sigma",
                  "noise_sigma",
                  "changepoint_scale",
                ] satisfies (keyof BaselinePriors)[],
                additionalProperties: false,
              },
              { type: "null" },
            ],
            description: "Basislijn-prior-overrides, of null om alle standaarden te houden.",
          },
        },
        required: [
          "kpi",
          "channels",
          "control_columns",
          "add_trend",
          "trend_type",
          "n_changepoints",
          "seasonality_periods",
          "n_fourier_modes",
          "likelihood",
          "student_t_nu",
          "priors",
        ],
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
  const datasetContext = formatDatasetContextBlock(ctx.dataset);
  const resultsContext = formatFitContextBlock(ctx.fit);

  // Model routing: Sonnet for the bounded "propose a recipe/config from data" tasks;
  // Opus once there is something to actually reason about — a quality report, a fit
  // result, or a failure of either. Adaptive thinking + medium effort in both cases.
  const needsAnalysis = datasetNeedsAnalysis(ctx.dataset) || hasFitResults(ctx.fit);
  const model = needsAnalysis ? ARCHITECT_ANALYST_MODEL : ARCHITECT_CONFIG_MODEL;

  return {
    model,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    tools: [PROPOSE_PREPARE_RECIPE_TOOL, PROPOSE_CONFIG_TOOL],
    // Cache breakpoints on the two stable blocks: the fixed instructions (byte-identical
    // for everyone, forever) and the per-project uploaded-data context (stable across a
    // session until new data is uploaded). The dataset and fit-results blocks are placed
    // AFTER them, uncached — both change whenever a prepare/fit finishes, and keeping
    // them past the last breakpoint means a fresh result never invalidates the cached
    // prefix.
    system: [
      { type: "text", text: SYSTEM_INSTRUCTIONS, cache_control: { type: "ephemeral" } },
      { type: "text", text: dataContext, cache_control: { type: "ephemeral" } },
      { type: "text", text: `Data-voorbereiding voor dit project:\n\n${datasetContext}` },
      { type: "text", text: `Laatste fit / resultaten voor dit project:\n\n${resultsContext}` },
    ],
    messages: history,
  };
}
