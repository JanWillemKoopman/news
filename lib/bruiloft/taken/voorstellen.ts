// Kaart-voor-kaart samenstellen van de takenlijst: welke sjabloonvoorstellen
// zijn er nog te beoordelen, en wat is er al beslist? De beslissingen leven in
// localStorage per bruiloft; toegevoegde taken staan gewoon in de database.

import { generateTemplateTasks } from '../templateTasks'
import type { Task, TaskInput, Wedding } from '../types'

export interface TakencheckState {
  // Per taaktitel: toegevoegd of overgeslagen.
  beslist: Record<string, 'toegevoegd' | 'overgeslagen'>
  // Expliciet afgerond ("sla rest over" / "alles toevoegen" / niet meer tonen).
  afgerond: boolean
}

const KEY_PREFIX = 'otp:takencheck:'

export function leesTakencheck(weddingId: string): TakencheckState {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + weddingId)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TakencheckState>
      return { beslist: parsed.beslist ?? {}, afgerond: parsed.afgerond ?? false }
    }
  } catch {
    // localStorage niet beschikbaar of corrupt; start vers.
  }
  return { beslist: {}, afgerond: false }
}

export function schrijfTakencheck(weddingId: string, state: TakencheckState) {
  try {
    localStorage.setItem(KEY_PREFIX + weddingId, JSON.stringify(state))
  } catch {
    // localStorage niet beschikbaar; negeren.
  }
}

// Alle open sjabloonvoorstellen die nog niet als taak bestaan (dedupe op
// titel, zodat ook een meeplannende partner geen dubbelen veroorzaakt).
export function alleVoorstellen(wedding: Wedding, tasks: Task[]): TaskInput[] {
  const bestaand = new Set(tasks.map((t) => t.titel))
  return generateTemplateTasks(wedding).filter(
    (t) => t.status === 'open' && !bestaand.has(t.titel)
  )
}

// Voorstellen waarover nog geen beslissing is genomen.
export function openVoorstellen(
  wedding: Wedding,
  tasks: Task[],
  state: TakencheckState
): TaskInput[] {
  return alleVoorstellen(wedding, tasks).filter((t) => !state.beslist[t.titel])
}
