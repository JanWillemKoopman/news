// De deterministische toestandsmachine achter de chat-gestuurde wizard.
//
// Kern-idee: "chat-gestuurd" is niet "LLM-gestuurd". De fase waarin een project zich
// bevindt wordt hier volledig DETERMINISTISCH afgeleid uit de bestaande data (bronnen,
// dataset, fit-jobs, runs) — precies zoals lib/pipelineStatus.ts dat voor de oude stepper
// deed. Er komt geen enkele Claude-call aan te pas om te bepalen welke bubbel/kaart de
// gebruiker nu ziet of welke vervolgstap-chips worden aangeboden. Alleen op de twee
// gemarkeerde beslismomenten (kolomrollen voorstellen, model optimaliseren) én bij vrij
// typen wordt de architect ingeschakeld.

import type { Dataset, Job, ModelRun, SourceFile } from "@/lib/types";

export type WizardPhase =
  | "upload" // nog geen bronbestand
  | "prepare_recipe" // bron aanwezig, nog geen (lopende) dataset — rollen indelen
  | "prepare_running" // prepare-job loopt (samenvoegen + kwaliteitscheck)
  | "prepare_failed" // prepare mislukt — opnieuw
  | "prepare_review" // dataset klaar (prepared) — kwaliteitsrapport beoordelen + goedkeuren
  | "configure" // dataset goedgekeurd, nog geen fit-job — model instellen
  | "fitting" // fit-job loopt
  | "fit_failed" // laatste fit mislukt — opnieuw
  | "review" // run geslaagd, nog niet gepubliceerd — beoordelen + publiceren
  | "published"; // gepubliceerd naar het klantdashboard

export interface WizardData {
  sources: SourceFile[];
  dataset: Dataset | null;
  jobs: Job[];
  runs: ModelRun[];
}

const FIT_TYPES = ["fit", "fit_hierarchical"] as const;

export function derivePhase({ sources, dataset, jobs, runs }: WizardData): WizardPhase {
  if (sources.length === 0) return "upload";

  const fitJobs = jobs.filter((j) => (FIT_TYPES as readonly string[]).includes(j.type));
  const latestFit = fitJobs[0] ?? null; // jobs komen binnen als "newest first"
  const latestRun = runs[0] ?? null;

  // Als er al een geslaagde run is, zijn we voorbij het fit-stadium: beoordelen/publiceren.
  if (latestRun) {
    if (latestRun.is_published) return "published";
    // Loopt er ná de laatste run alweer een nieuwe fit? Dan zit de gebruiker in "fitting".
    if (latestFit && (latestFit.status === "queued" || latestFit.status === "running")) {
      return "fitting";
    }
    return "review";
  }

  // Nog geen run. Beoordeel het fit-stadium op basis van de laatste fit-job.
  if (latestFit) {
    if (latestFit.status === "failed" || latestFit.status === "cancelled") return "fit_failed";
    if (latestFit.status === "queued" || latestFit.status === "running") return "fitting";
    // succeeded zonder run-rij: worker is nog aan het wegschrijven — behandel als fitting.
    return "fitting";
  }

  // Nog geen fit gestart. Waar staat de dataset?
  if (dataset) {
    if (dataset.status === "approved") return "configure";
    if (dataset.status === "prepared") return "prepare_review";
    if (dataset.status === "preparing") return "prepare_running";
    if (dataset.status === "failed") return "prepare_failed";
    // draft: recept nog niet ingediend.
  }
  return "prepare_recipe";
}

// True zolang we op een asynchrone worker (Modal) wachten — de client pollt dan zachtjes
// door zodat de fase vanzelf doorschuift zodra Realtime/DB de nieuwe status toont.
export function isWaitingPhase(phase: WizardPhase): boolean {
  return phase === "prepare_running" || phase === "fitting";
}
