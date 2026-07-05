// Groepeert taken op de kalendermaand van hun deadline, i.p.v. de vaste
// "X maanden voor de bruiloft"-fases. Alleen maanden met taken worden getoond,
// chronologisch aflopend van verleden/nu naar de bruiloft en erna.

import type { ISODate, Task } from '../types'

const MAAND_NAMEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

export interface DeadlineMaandGroep {
  key: string // 'YYYY-MM'
  label: string // 'Uiterlijk in maart 2027'
  tasks: Task[]
}

export function groepeerOpDeadlineMaand(tasks: Task[]): DeadlineMaandGroep[] {
  const map = new Map<string, Task[]>()
  for (const t of tasks) {
    const key = t.deadline.slice(0, 7)
    const lijst = map.get(key)
    if (lijst) lijst.push(t)
    else map.set(key, [t])
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, groepTaken]) => {
      const maandIndex = Number(key.slice(5, 7)) - 1
      const jaar = key.slice(0, 4)
      return {
        key,
        label: `Uiterlijk in ${MAAND_NAMEN[maandIndex]} ${jaar}`,
        tasks: groepTaken,
      }
    })
}

// Middelste dag van de maand als redelijke default-deadline voor een nieuwe
// taak die vanuit deze maandgroep wordt toegevoegd.
export function defaultDeadlineVoorMaand(key: string): ISODate {
  return `${key}-15`
}
