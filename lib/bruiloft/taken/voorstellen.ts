// Kaart-voor-kaart samenstellen van de takenlijst: welke sjabloonvoorstellen
// zijn er nog te beoordelen? De beslissingen leven op de bruiloft zelf
// (weddings.taken_voorstellen), zodat ze tussen partners en apparaten
// synchroniseren; toegevoegde taken staan gewoon als taak in de database.

import { generateTemplateTasks, type TemplateTaskVoorstel } from '../templateTasks'
import type { TakenVoorstellenState, Task, Wedding } from '../types'

// Alle open kern-sjabloonvoorstellen die nog niet als taak bestaan (dedupe op
// titel, zodat ook een meeplannende partner geen dubbelen veroorzaakt).
// Alleen de kernset (±30) wordt voorgesteld: kwaliteit boven kwantiteit.
export function alleVoorstellen(wedding: Wedding, tasks: Task[]): TemplateTaskVoorstel[] {
  const bestaand = new Set(tasks.map((t) => t.titel))
  return generateTemplateTasks(wedding).filter(
    (t) => t.kern && t.status === 'open' && !bestaand.has(t.titel)
  )
}

// Voorstellen waarover nog geen beslissing is genomen.
export function openVoorstellen(
  wedding: Wedding,
  tasks: Task[],
  state: TakenVoorstellenState = wedding.takenVoorstellen
): TemplateTaskVoorstel[] {
  return alleVoorstellen(wedding, tasks).filter((t) => !state.beslist[t.titel])
}
