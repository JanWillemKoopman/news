import Anthropic from "@anthropic-ai/sdk";
import { ARCHITECT_ANALYST_MODEL } from "@/lib/anthropic/fitContext";
import type { FitSummary } from "@/lib/types";

// Step 3 — deep-dive analysis: a distinct, explicitly-triggered action (not the chat
// architect's inline discussion of results) that reads the already-computed FitSummary
// and produces a written interpretation PLUS charts, using Claude's hosted, sandboxed
// code_execution tool (Anthropic-run container, no network access — it never sees
// anything beyond the small FitSummary JSON handed to it here). This is the "brains"
// step of the hybrid architecture: Stap 1 (data prep) stays on the declarative,
// deterministic core for reproducibility; this step is where free-form Python earns its
// keep, because there is no reproducibility contract to protect — a chart is a read, not
// a mutation of the modelling input.
//
// Requires the beta `client.beta.messages.create` surface: the installed SDK only
// exposes code_execution tool types under `client.beta.*` (there is no non-beta
// `code_execution` tool type in this SDK version). Beta header per the 20260521 tool
// version's requirement.
const CODE_EXECUTION_BETA = "code-execution-2025-08-25";

const SYSTEM_INSTRUCTIONS = `Je bent een senior marketing-analist die een Media Mix Model (MMM)-uitkomst interpreteert voor een bouwer (een technische collega, geen eindklant). Je krijgt de volledige FitSummary als JSON. Gebruik de "code_execution"-tool om er met Python (pandas/matplotlib) inzichtelijke grafieken van te maken, en schrijf daarnaast een doorlopende, diepgaande analyse in het Nederlands.

Wat te doen:
1. Maak met matplotlib een aandeel-per-kanaal-grafiek (contribution_share) MET de onzekerheidsmarge (p3–p97) zichtbaar — niet alleen de mediaan.
2. Als "response_curves" aanwezig is: plot per kanaal de curve (weekly_spend op de x-as, contribution op de y-as) met een duidelijke marker op "current_weekly_spend" — dit laat zien waar een kanaal verzadigt.
3. Als "efficiency_frontier" aanwezig is: plot 'm (totaal weekbudget vs. voorspelde contributie) zodat zichtbaar is waar het rendement afvlakt.
4. Kies zelf 1–2 aanvullende grafieken die specifiek iets vertellen over DEZE uitkomst (bijvoorbeeld een ROAS-vergelijking tussen kanalen, of een diagnostiek-overzicht als de kwaliteitspoort niet op "pass" staat) — verzin nooit een grafiek van cijfers die niet in de JSON staan.
5. Sla elke grafiek op als los PNG-bestand (plt.savefig, met een duidelijke bestandsnaam) — dit is de enige manier waarop de grafieken bij de bouwer terechtkomen.
6. Schrijf naast de grafieken een lopende analyse (GEEN opsomming van cijfers die al in de tabel staan): wat werkt, wat niet, waarom (op basis van adstock/verzadiging/aandeel), hoe betrouwbaar de uitkomst is, en een concreet vervolgadvies. Baseer je uitsluitend op de gegeven JSON — verzin geen zakelijke context.

Regels:
- Gebruik uitsluitend de cijfers uit de gegeven FitSummary-JSON; verzin nooit een getal.
- Nederlandse aslabels en titels; getallen in de eenheid van de KPI.
- Compacte, professionele stijl (geen felle kleuren, geen 3D, geen overbodige legenda's).
- Sluit af met tekst, niet met een grafiek — de bouwer leest de analyse na de grafieken.`;

export function buildDeepAnalysisRequest(summary: FitSummary): Anthropic.Beta.Messages.MessageCreateParamsNonStreaming {
  return {
    model: ARCHITECT_ANALYST_MODEL,
    max_tokens: 8192,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    betas: [CODE_EXECUTION_BETA],
    tools: [{ type: "code_execution_20260521", name: "code_execution" }],
    system: SYSTEM_INSTRUCTIONS,
    messages: [
      {
        role: "user",
        content: `Hier is de FitSummary van de laatste fit:\n\n${JSON.stringify(summary, null, 2)}`,
      },
    ],
  };
}
