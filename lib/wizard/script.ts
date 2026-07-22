// Vaste, vooraf geschreven gespreksteksten per fase. Dit is het "script" dat de chat
// laat vóélen als een gesprek terwijl het in werkelijkheid een deterministische
// toestandsmachine is: elke bubbel hieronder kost 0 tokens. Alleen wanneer de gebruiker
// vrij typt of expliciet om een AI-voorstel vraagt, komt de architect eraan te pas.

import type { WizardPhase } from "@/lib/wizard/phase";

export interface PhaseScript {
  // De begeleidende assistent-bubbel bovenaan de kaart.
  message: string;
  // Korte statusregel voor het model-dossier rechts ("Nu bezig met…").
  dossierLabel: string;
}

export const PHASE_SCRIPT: Record<WizardPhase, PhaseScript> = {
  upload: {
    message:
      "Welkom! We bouwen samen stap voor stap een marketingmodel. Begin met één databestand: " +
      "een CSV met je wekelijkse KPI (omzet of leads) en de uitgaven per kanaal. " +
      "Je werkt met precies dit ene bestand — samenvoegen van meerdere bestanden hoeft niet.",
    dossierLabel: "Wachten op je databestand",
  },
  prepare_recipe: {
    message:
      "Mooi, je bestand staat klaar. Ik heb de kolommen alvast automatisch ingedeeld. " +
      "Controleer hieronder of dat klopt: welke kolom is je KPI, welke zijn uitgaven (kanalen) " +
      "en welke zijn externe factoren (controls). Klopt het? Dan voeg ik de data samen en controleer ik de kwaliteit.",
    dossierLabel: "Kolommen indelen",
  },
  prepare_running: {
    message:
      "Ik voeg de data samen tot één wekelijkse tabel en draai automatische kwaliteitscontroles. " +
      "Dit duurt meestal minder dan een minuut — je hoeft niets te doen.",
    dossierLabel: "Data samenvoegen & controleren",
  },
  prepare_failed: {
    message:
      "Het samenvoegen is helaas niet gelukt. Bekijk de melding hieronder. Meestal helpt het om de " +
      "kolomindeling aan te passen (bijvoorbeeld de datumkolom) en het opnieuw te proberen.",
    dossierLabel: "Samenvoegen mislukt",
  },
  prepare_review: {
    message:
      "De data is samengevoegd en gecontroleerd. Hieronder zie je het kwaliteitsrapport en een voorbeeld " +
      "van de weektabel. Ziet het er goed uit? Keur de dataset dan goed — daarna stellen we het model in.",
    dossierLabel: "Kwaliteit beoordelen",
  },
  context: {
    message:
      "Voordat we het model instellen: vertel me kort iets over het bedrijf en de markt. " +
      "Branche, gemiddelde marge per verkochte eenheid en bijzonderheden (grote campagnes, " +
      "seizoenspieken, prijswijzigingen) helpen de AI om betere instellingen te kiezen — en " +
      "de marge maakt het klantdashboard rijker. Dit is optioneel; je kunt het overslaan.",
    dossierLabel: "Zakelijke context",
  },
  configure: {
    message:
      "De dataset is goedgekeurd. Ik heb een standaard-modelinstelling klaargezet die voor de meeste " +
      "gevallen prima werkt (geen AI nodig). Wil je hem gebruiken, of eerst door de AI laten optimaliseren " +
      "voor jouw situatie? Daarna start de berekening.",
    dossierLabel: "Model instellen",
  },
  fitting: {
    message:
      "De berekening loopt. Het model schat nu per kanaal het effect, de na-ijl en het afnemend rendement, " +
      "met onzekerheidsmarges. Dit duurt doorgaans 3 à 5 minuten — je kunt gerust wachten.",
    dossierLabel: "Model berekenen",
  },
  fit_failed: {
    message:
      "De berekening is niet gelukt. Bekijk de melding hieronder. Vaak helpt een lichtere instelling of " +
      "het aanpassen van een kanaal. Je kunt het opnieuw proberen.",
    dossierLabel: "Berekening mislukt",
  },
  review: {
    message:
      "Klaar! Hieronder zie je de resultaten: het effect en de ROAS per kanaal, met onzekerheidsmarges, " +
      "plus een kwaliteitsoordeel. Ziet het er goed uit? Dan kun je het publiceren naar het klantdashboard.",
    dossierLabel: "Resultaten beoordelen",
  },
  published: {
    message:
      "Gepubliceerd! De klant ziet nu het afgeschermde dashboard met dit resultaat. Je kunt op elk moment " +
      "een nieuwe, betere berekening draaien en die opnieuw publiceren.",
    dossierLabel: "Gepubliceerd",
  },
};

// Menselijke, genummerde faselabels voor de voortgangsbalk in het model-dossier.
export const PHASE_STEPS: { phases: WizardPhase[]; label: string }[] = [
  { phases: ["upload"], label: "1. Data uploaden" },
  { phases: ["prepare_recipe", "prepare_running", "prepare_failed", "prepare_review"], label: "2. Data voorbereiden" },
  { phases: ["context"], label: "3. Zakelijke context" },
  { phases: ["configure"], label: "4. Model instellen" },
  { phases: ["fitting", "fit_failed"], label: "5. Berekenen" },
  { phases: ["review", "published"], label: "6. Beoordelen & publiceren" },
];

export function stepIndexForPhase(phase: WizardPhase): number {
  return PHASE_STEPS.findIndex((s) => s.phases.includes(phase));
}
