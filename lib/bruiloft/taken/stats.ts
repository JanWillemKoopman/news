// Statistieken voor de taken-tab. Pure functies, geen state.

import { dagenTot } from '../format'
import type { Prioriteit, Task } from '../types'

export interface TaakStats {
  totaal: number
  open: number
  bezig: number
  klaar: number
  achterstallig: number
  aankomend30Dagen: number
  pctKlaar: number
}

// Taak valt binnen de eerstkomende 30 dagen (rollend venster, geen kalendermaand).
function binnenDertigDagen(deadline: string): boolean {
  const d = dagenTot(deadline)
  return d >= 0 && d <= 30
}

export function berekenTaakStats(tasks: Task[]): TaakStats {
  let open = 0
  let bezig = 0
  let klaar = 0
  let achterstallig = 0
  let aankomend30Dagen = 0
  for (const t of tasks) {
    if (t.status === 'klaar') klaar++
    else if (t.status === 'bezig') bezig++
    else open++

    if (t.status !== 'klaar') {
      const d = dagenTot(t.deadline)
      if (d < 0) achterstallig++
      else if (binnenDertigDagen(t.deadline)) aankomend30Dagen++
    }
  }
  const totaal = tasks.length
  const pctKlaar = totaal > 0 ? Math.round((klaar / totaal) * 100) : 0
  return { totaal, open, bezig, klaar, achterstallig, aankomend30Dagen, pctKlaar }
}

// Taken met deadline binnen 30 dagen die nog niet klaar zijn — cross-tijdsblok.
export function aankomendeTaken(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status !== 'klaar' && binnenDertigDagen(t.deadline))
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
}

// Prioriteit zoals die er NU uitziet, op basis van hoe dichtbij de deadline is —
// niet de statisch opgeslagen inschatting. Voorkomt dat een taak die pas over
// maanden speelt (bv. "Genieten van de grote dag!") als hoge prioriteit oogt.
export function effectievePrioriteit(
  task: Pick<Task, 'prioriteit' | 'deadline' | 'status'>
): Prioriteit {
  if (task.status === 'klaar') return task.prioriteit
  const d = dagenTot(task.deadline)
  if (d < 0) return 'hoog'
  if (d <= 30) return task.prioriteit
  if (d <= 90) return task.prioriteit === 'hoog' ? 'midden' : task.prioriteit
  return 'laag'
}
