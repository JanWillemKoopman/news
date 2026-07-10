// Filterstate + toepassing voor de taken-tab.

import { effectievePrioriteit } from './stats'
import type { Prioriteit, Task, TaskStatus, ToegewezenAan } from '../types'

// 'all' = geen filter; member-id = die specifieke persoon; 'unassigned' = niemand.
export type AssigneeFilter = 'all' | 'unassigned' | string

export interface TaakFilters {
  // Meerdere statussen tegelijk aan/uit te vinken. Standaard alleen 'open' en
  // 'bezig' aangevinkt: het overzicht toont wat nog moet gebeuren, afgeronde
  // taken verberg je expliciet aan- of uitvinkend via het filter.
  status: TaskStatus[]
  prioriteit: 'all' | Prioriteit
  // Combineert assignees (multi) en legacy toegewezenAan.
  toegewezen: AssigneeFilter | ToegewezenAan
  zoek: string
}

export const DEFAULT_FILTERS: TaakFilters = {
  status: ['open', 'bezig'],
  prioriteit: 'all',
  toegewezen: 'all',
  zoek: '',
}

// Vergelijkt twee statusselecties ongeacht volgorde — gebruikt om te bepalen
// of het statusfilter nog op de standaardselectie staat (voor de
// "actief"-badge en de "Wis filters"-knop).
export function isDefaultStatusSelectie(status: TaskStatus[]): boolean {
  if (status.length !== DEFAULT_FILTERS.status.length) return false
  return DEFAULT_FILTERS.status.every((s) => status.includes(s))
}

const LEGACY_LABELS: ToegewezenAan[] = ['partner 1', 'partner 2', 'samen', 'getuige', 'overig']

function matchToegewezen(task: Task, value: TaakFilters['toegewezen']): boolean {
  if (value === 'all') return true
  if (value === 'unassigned') {
    return task.assignees.length === 0
  }
  // Legacy enum-waarde?
  if ((LEGACY_LABELS as string[]).includes(value)) {
    // Legacy chip-fallback: alleen tonen als nog geen moderne assignees zijn.
    return task.assignees.length === 0 && task.toegewezenAan === value
  }
  // Anders: member-id.
  return task.assignees.includes(value)
}

export function applyFilters(tasks: Task[], filters: TaakFilters): Task[] {
  const zoek = filters.zoek.trim().toLowerCase()
  return tasks.filter((t) => {
    if (!filters.status.includes(t.status)) return false
    if (filters.prioriteit !== 'all' && effectievePrioriteit(t) !== filters.prioriteit) return false
    if (!matchToegewezen(t, filters.toegewezen)) return false
    if (zoek) {
      const hay = `${t.titel}\n${t.omschrijving}`.toLowerCase()
      if (!hay.includes(zoek)) return false
    }
    return true
  })
}
