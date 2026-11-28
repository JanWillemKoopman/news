/**
 * Korte bevestigingen na een handeling ("Planning: maandelijks", "Voorstel genegeerd").
 *
 * Elk paneel kan `toonMelding(…)` aanroepen zonder een provider of prop door te geven: de
 * melding gaat als window-event naar `MeldingLaag` (één keer gemount in `AppShell`), die
 * hem rechtsonder in beeld zet. Zo hoeft een zijbalk die net dichtgaat niets te weten van
 * waar de melding verschijnt.
 */

export interface KorteMelding {
  /** De hoofdregel, bijvoorbeeld "Planning: maandelijks". */
  titel: string;
  /** Eén regel context eronder; optioneel. */
  regel?: string;
  /** "fout" kleurt het icoon rood; standaard een vinkje. */
  soort?: "ok" | "fout";
  /** Een knop in de melding, bijvoorbeeld "Ongedaan maken". */
  actie?: { label: string; onClick: () => void };
}

export const MELDING_EVENT = "dashboard-melding";

export function toonMelding(melding: KorteMelding) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<KorteMelding>(MELDING_EVENT, { detail: melding }));
}
