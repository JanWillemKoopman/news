// Statistieken voor de taken-tab. Pure functies, geen state.

import { dagenTot } from '../format'
import type { Task } from '../types'

export interface TaakStats {
  totaal: number
  open: number
  bezig: number
  klaar: number
  achterstallig: number
  dezeMaand: number
  pctKlaar: number
}

// Taak valt binnen de huidige kalendermaand (jaar+maand gelijk aan vandaag).
function isDezeMaand(deadline: string): boolean {
  const d = new Date(deadline)
  if (Number.isNaN(d.getTime())) return false
  const today = new Date()
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
}

export function berekenTaakStats(tasks: Task[]): TaakStats {
  let open = 0
  let bezig = 0
  let klaar = 0
  let achterstallig = 0
  let dezeMaand = 0
  for (const t of tasks) {
    if (t.status === 'klaar') klaar++
    else if (t.status === 'bezig') bezig++
    else open++

    if (t.status !== 'klaar') {
      const d = dagenTot(t.deadline)
      if (d < 0) achterstallig++
      else if (isDezeMaand(t.deadline)) dezeMaand++
    }
  }
  const totaal = tasks.length
  const pctKlaar = totaal > 0 ? Math.round((klaar / totaal) * 100) : 0
  return { totaal, open, bezig, klaar, achterstallig, dezeMaand, pctKlaar }
}

// Taken in de huidige kalendermaand die nog niet klaar zijn — cross-tijdsblok.
export function dezeMaandTaken(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status !== 'klaar' && dagenTot(t.deadline) >= 0 && isDezeMaand(t.deadline))
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
}

// Achterstallige taken (deadline voorbij, niet klaar).
export function achterstalligeTaken(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status !== 'klaar' && dagenTot(t.deadline) < 0)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
}
