// Diff-logica: vind templatetaken die nog niet in de huidige lijst staan.

import type { Task } from '@/lib/bruiloft/types'

function normalize(s: string): string {
  // Geen unicode-property-escapes om compatibel te blijven met ES5-target.
  return s
    .toLowerCase()
    .replace(/[^a-z0-9àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿœ\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface TemplateMatch {
  titel: string
  omschrijving: string
}

export function vindOntbrekendeTemplates<T extends TemplateMatch>(
  bestaand: Task[],
  templates: T[]
): T[] {
  const bestaandeTitels = new Set(bestaand.map((t) => normalize(t.titel)))
  return templates.filter((tt) => !bestaandeTitels.has(normalize(tt.titel)))
}
