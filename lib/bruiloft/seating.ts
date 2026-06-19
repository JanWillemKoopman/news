// Pure logica voor de tafelschikking: gasten op vaste stoelen plaatsen en die
// plekken onderling ruilen. Geen React, geen store — los testbaar.

import type { Guest, ID } from './types'

// Eén wijziging aan de zitplaats van een gast. `tafelId`/`stoelIndex` mogen
// `null` zijn om te wissen; `undefined` laat het veld ongemoeid.
export interface SeatUpdate {
  id: ID
  tafelId?: ID | null
  stoelIndex?: number | null
}

// Verdeel de gasten van één tafel over genummerde stoelen. De array is minstens
// zo lang als de capaciteit; langer wanneer er meer gasten dan stoelen zijn
// (overboeking). Gasten met een geldige, vrije `stoelIndex` krijgen die stoel;
// de rest schuift in volgorde aan op de eerstvolgende vrije stoel.
export function seatsForTable(capaciteit: number, guests: Guest[]): (Guest | null)[] {
  const length = Math.max(Math.max(0, Math.floor(capaciteit)), guests.length)
  const seats: (Guest | null)[] = new Array(length).fill(null)
  const rest: Guest[] = []
  for (const g of guests) {
    const i = g.stoelIndex
    if (i != null && Number.isInteger(i) && i >= 0 && i < length && seats[i] == null) {
      seats[i] = g
    } else {
      rest.push(g)
    }
  }
  let k = 0
  for (const g of rest) {
    while (k < length && seats[k] != null) k++
    if (k < length) {
      seats[k] = g
      k++
    }
  }
  return seats
}

// Verplaats de gast op stoel `index` één plek omhoog (-1) of omlaag (+1) door
// hem met de buurstoel te ruilen. Lege buurstoelen mogen: de gast schuift dan
// gewoon op. Geeft de minimale set wijzigingen terug.
export function reorderSeatUpdates(
  seats: (Guest | null)[],
  index: number,
  dir: -1 | 1
): SeatUpdate[] {
  const to = index + dir
  if (to < 0 || to >= seats.length) return []
  const a = seats[index]
  const b = seats[to]
  const ups: SeatUpdate[] = []
  if (a) ups.push({ id: a.id, stoelIndex: to })
  if (b) ups.push({ id: b.id, stoelIndex: index })
  return ups
}

// Zet `guest` op stoel `seatIndex` van tafel `tableId`. Zat daar al iemand, dan
// ruilt die naar de oude stoel van de gast (zelfde tafel) of schuift hij naar
// een vrije plek (gast kwam van een andere tafel of uit de onverdeelde lijst).
export function placeOnSeatUpdates(
  seats: (Guest | null)[],
  guest: Guest,
  tableId: ID,
  seatIndex: number
): SeatUpdate[] {
  const fromIndex = seats.findIndex((s) => s?.id === guest.id)
  if (fromIndex === seatIndex && guest.tafelId === tableId) return []
  const occupant = seats[seatIndex] ?? null
  const ups: SeatUpdate[] = [{ id: guest.id, tafelId: tableId, stoelIndex: seatIndex }]
  if (occupant && occupant.id !== guest.id) {
    if (fromIndex >= 0) ups.push({ id: occupant.id, stoelIndex: fromIndex })
    else ups.push({ id: occupant.id, stoelIndex: null })
  }
  return ups
}
