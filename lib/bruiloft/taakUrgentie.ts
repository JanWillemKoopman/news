// Per-taak urgentie, afgeleid van de eigen deadline. De templatedeadlines
// coderen het juiste moment al t.o.v. de trouwdatum, dus de deadline is hier het
// eerlijke signaal voor de takenlijst — en het is voor beide partners gelijk
// (gedeelde data, geen per-gebruiker-instelling). De onderwerp-brede urgentie
// (seizoen, afhankelijkheden) blijft het werk van de dashboard-engine.
//
// Afgevinkte taken en taken zonder datum krijgen géén urgentie (null).
import { dagenTot } from './format'

export type TaakUrgentie = 'te_laat' | 'binnenkort' | 'op_tijd'

// Binnen deze termijn (dagen) telt een openstaande taak als "binnenkort".
export const BINNENKORT_DAGEN = 14

export function taakUrgentie(deadlineISO: string, klaar: boolean): TaakUrgentie | null {
  if (klaar || !deadlineISO) return null
  const d = dagenTot(deadlineISO)
  if (d < 0) return 'te_laat'
  if (d <= BINNENKORT_DAGEN) return 'binnenkort'
  return 'op_tijd'
}
