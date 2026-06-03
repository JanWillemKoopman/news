// Filterstate + toepassing voor de taken-tab.

import type { Prioriteit, Task, TaskStatus, ToegewezenAan } from '../types'

// 'all' = geen filter; member-id = die specifieke persoon; 'unassigned' = niemand.
export type AssigneeFilter = 'all' | 'unassigned' | string

export interface TaakFilters {
  status: 'all' | TaskStatus
  prioriteit: 'all' | Prioriteit
  // Combineert assignees (multi) en legacy toegewezenAan.
  toegewezen: AssigneeFilter | ToegewezenAan
  zoek: string
}

export const DEFAULT_FILTERS: TaakFilters = {
  status: 'open',
  prioriteit: 'all',
  toegewezen: 'all',
  zoek: '',
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
    if (filters.status !== 'all' && t.status !== filters.status) return false
    if (filters.prioriteit !== 'all' && t.prioriteit !== filters.prioriteit) return false
    if (!matchToegewezen(t, filters.toegewezen)) return false
    if (zoek) {
      const hay = `${t.titel}\n${t.omschrijving}`.toLowerCase()
      if (!hay.includes(zoek)) return false
    }
    return true
  })
}
