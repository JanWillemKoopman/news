// Statistieken voor de taken-tab. Pure functies, geen state.

import { dagenTot } from '../format'
import type { Task } from '../types'

export interface TaakStats {
  totaal: number
  open: number
  bezig: number
  klaar: number
  achterstallig: number
  dezeWeek: number
  pctKlaar: number
}

export function berekenTaakStats(tasks: Task[]): TaakStats {
  let open = 0
  let bezig = 0
  let klaar = 0
  let achterstallig = 0
  let dezeWeek = 0
  for (const t of tasks) {
    if (t.status === 'klaar') klaar++
    else if (t.status === 'bezig') bezig++
    else open++

    if (t.status !== 'klaar') {
      const d = dagenTot(t.deadline)
      if (d < 0) achterstallig++
      else if (d <= 7) dezeWeek++
    }
  }
  const totaal = tasks.length
  const pctKlaar = totaal > 0 ? Math.round((klaar / totaal) * 100) : 0
  return { totaal, open, bezig, klaar, achterstallig, dezeWeek, pctKlaar }
}

// Taken die binnen 7 dagen vervallen en nog niet klaar zijn — cross-tijdsblok.
export function dezeWeekTaken(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => {
      if (t.status === 'klaar') return false
      const d = dagenTot(t.deadline)
      return d >= 0 && d <= 7
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
}

// Achterstallige taken (deadline voorbij, niet klaar).
export function achterstalligeTaken(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status !== 'klaar' && dagenTot(t.deadline) < 0)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
}
