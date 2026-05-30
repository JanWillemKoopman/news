// Pure logica voor herinnerings-mijlpalen. Geen IO/DB, zodat dit los te testen
// is en gedeeld kan worden met de cron-route (app/api/cron/reminders).
//
// We kiezen telkens de STRAKSTE nog niet-verzonden drempel op basis van het
// aantal dagen tot de datum. Doordat elke (item × mijlpaal × ontvanger) maar
// één keer in reminder_log mag staan, is dit robuust tegen gemiste cron-dagen:
// een herinnering die op de exacte dag gemist wordt, gaat de dag erna alsnog uit.

export type TaakMijlpaal = '7d' | '1d' | 'te-laat'
export type BetalingMijlpaal = '14d' | '3d' | 'te-laat'

// 'dagen' = aantal dagen tot de deadline (negatief = in het verleden).
export function taakMijlpaal(dagen: number): TaakMijlpaal | null {
  if (dagen < 0) return 'te-laat'
  if (dagen <= 1) return '1d'
  if (dagen <= 7) return '7d'
  return null
}

// 'dagen' = aantal dagen tot de vervaldatum (negatief = in het verleden).
export function betalingMijlpaal(dagen: number): BetalingMijlpaal | null {
  if (dagen < 0) return 'te-laat'
  if (dagen <= 3) return '3d'
  if (dagen <= 14) return '14d'
  return null
}
