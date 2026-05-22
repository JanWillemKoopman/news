// Afleiding van het tijdsblok-label op basis van de trouwdatum, plus
// datumrekenhulpjes voor het genereren van sjabloontaken.

import type { ISODate, Tijdsblok } from './types'

// Volgorde van ver-voor-de-bruiloft naar na de bruiloft. Gebruikt om
// takengroepen te ordenen (aftellend naar de trouwdag).
export const TIJDSBLOK_VOLGORDE: Tijdsblok[] = [
  '12 maanden voor',
  '9 maanden voor',
  '6 maanden voor',
  '3 maanden voor',
  '1 maand voor',
  'laatste week',
  'trouwweek',
  'na de bruiloft',
]

function diffInDagen(van: Date, tot: Date): number {
  const a = Date.UTC(van.getFullYear(), van.getMonth(), van.getDate())
  const b = Date.UTC(tot.getFullYear(), tot.getMonth(), tot.getDate())
  return Math.round((b - a) / 86_400_000)
}

// Hoeveel dagen ligt de deadline vóór de trouwdatum (negatief = erna).
export function deriveTijdsblok(deadline: ISODate, trouwdatum: ISODate): Tijdsblok {
  const d = new Date(deadline)
  const w = new Date(trouwdatum)
  if (Number.isNaN(d.getTime()) || Number.isNaN(w.getTime())) return '12 maanden voor'

  const dagenVoor = diffInDagen(d, w)

  if (dagenVoor < 0) return 'na de bruiloft'
  if (dagenVoor <= 3) return 'trouwweek'
  if (dagenVoor <= 10) return 'laatste week'
  if (dagenVoor <= 45) return '1 maand voor'
  if (dagenVoor <= 135) return '3 maanden voor'
  if (dagenVoor <= 225) return '6 maanden voor'
  if (dagenVoor <= 315) return '9 maanden voor'
  return '12 maanden voor'
}

// --- Datumrekenhulpjes -----------------------------------------------------

export function toISODate(date: Date): ISODate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(date: Date | string, dagen: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + dagen)
  return d
}

export function addMonths(date: Date | string, maanden: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + maanden)
  return d
}
