import type { Wedding } from './types'

// Essentiële profielvelden die we voor een compleet, gepersonaliseerd trouwplan
// willen hebben. Wordt hergebruikt door de profielkaart (overzicht) en de
// nudge rechtsonder, zodat beide exact dezelfde definitie van "compleet" delen.

export interface ProfielVeld {
  key: 'namen' | 'trouwdatum' | 'locatie' | 'woonplaats'
  label: string
}

// Onboarding vult bij lege namen de placeholders 'Partner 1'/'Partner 2' in;
// die behandelen we als "nog niet ingevuld".
const NAAM_PLACEHOLDERS = new Set(['', 'partner 1', 'partner 2'])

function naamOntbreekt(naam: string): boolean {
  return NAAM_PLACEHOLDERS.has(naam.trim().toLowerCase())
}

export function ontbrekendeProfielvelden(w: Wedding): ProfielVeld[] {
  const velden: ProfielVeld[] = []
  if (naamOntbreekt(w.partner1Naam) || naamOntbreekt(w.partner2Naam)) {
    velden.push({ key: 'namen', label: 'Namen van het bruidspaar' })
  }
  if (!w.trouwdatum) {
    velden.push({ key: 'trouwdatum', label: 'Trouwdatum' })
  }
  if (!w.locatie.trim()) {
    velden.push({ key: 'locatie', label: 'Trouwlocatie' })
  }
  if (!w.woonplaats.trim()) {
    velden.push({ key: 'woonplaats', label: 'Woonplaats' })
  }
  return velden
}

export function profielIsCompleet(w: Wedding): boolean {
  return ontbrekendeProfielvelden(w).length === 0
}
