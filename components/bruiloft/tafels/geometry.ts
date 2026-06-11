// Pure geometrie voor de plattegrond: tafelmaten en stoelposities in
// wereldeenheden (ongeveer centimeters). Geen React, geen store — testbaar.

import type { Table } from '@/lib/bruiloft/types'

export const STOEL_R = 14 // straal van een stoel
export const STOEL_AFSTAND = 24 // afstand stoelmiddelpunt tot tafelrand
export const GRID = 20 // rasterstap voor snappen

export interface Punt {
  x: number
  y: number
}

export function snap(v: number, stap = GRID): number {
  return Math.round(v / stap) * stap
}

// Buitenmaat van het tafelblad (ongeroteerd), schaalt mee met de capaciteit
// zodat alle stoelen comfortabel passen.
export function tafelMaat(t: Table): { w: number; h: number } {
  const cap = Math.max(1, t.capaciteit)
  if (t.vorm === 'rond') {
    const r = Math.max(45, (cap * 38) / (2 * Math.PI))
    return { w: r * 2, h: r * 2 }
  }
  if (t.vorm === 'vierkant') {
    const perZijde = Math.ceil(cap / 4)
    const s = Math.max(80, perZijde * 40 + 24)
    return { w: s, h: s }
  }
  // langwerpig: stoelen op de twee lange zijden
  const boven = Math.ceil(cap / 2)
  return { w: Math.max(120, boven * 40 + 24), h: 80 }
}

// Halve diagonaal inclusief stoelring — voor hit-tests en passend zoomen.
export function tafelStraal(t: Table): number {
  const { w, h } = tafelMaat(t)
  return Math.hypot(w, h) / 2 + STOEL_AFSTAND + STOEL_R
}

// Gelijkmatige offsets langs een zijde met lengte `l`.
function zijdeOffsets(aantal: number, l: number): number[] {
  return Array.from({ length: aantal }, (_, i) => ((i + 1) / (aantal + 1)) * l - l / 2)
}

// Stoelposities t.o.v. het tafelmiddelpunt (ongeroteerd, in tekenvolgorde).
export function stoelPosities(t: Table): Punt[] {
  const cap = Math.max(0, t.capaciteit)
  if (cap === 0) return []
  const { w, h } = tafelMaat(t)

  if (t.vorm === 'rond') {
    const ring = w / 2 + STOEL_AFSTAND
    return Array.from({ length: cap }, (_, i) => {
      const hoek = (i / cap) * Math.PI * 2 - Math.PI / 2
      return { x: Math.cos(hoek) * ring, y: Math.sin(hoek) * ring }
    })
  }

  const punten: Punt[] = []
  if (t.vorm === 'vierkant') {
    const basis = Math.floor(cap / 4)
    const rest = cap % 4
    // Extra stoelen eerst tegenover elkaar (boven/onder), dan rechts/links.
    const aantallen = {
      boven: basis + (rest > 0 ? 1 : 0),
      onder: basis + (rest > 1 ? 1 : 0),
      rechts: basis + (rest > 2 ? 1 : 0),
      links: basis,
    }
    for (const x of zijdeOffsets(aantallen.boven, w)) punten.push({ x, y: -h / 2 - STOEL_AFSTAND })
    for (const y of zijdeOffsets(aantallen.rechts, h)) punten.push({ x: w / 2 + STOEL_AFSTAND, y })
    for (const x of zijdeOffsets(aantallen.onder, w)) punten.push({ x, y: h / 2 + STOEL_AFSTAND })
    for (const y of zijdeOffsets(aantallen.links, h)) punten.push({ x: -w / 2 - STOEL_AFSTAND, y })
    return punten
  }

  // langwerpig
  const boven = Math.ceil(cap / 2)
  const onder = cap - boven
  for (const x of zijdeOffsets(boven, w)) punten.push({ x, y: -h / 2 - STOEL_AFSTAND })
  for (const x of zijdeOffsets(onder, w)) punten.push({ x, y: h / 2 + STOEL_AFSTAND })
  return punten
}

// Roteer een punt rond de oorsprong (graden).
export function roteer(p: Punt, graden: number): Punt {
  const rad = (graden * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos }
}

// Automatische plek voor tafels die nog geen positie hebben: nette rijen
// onder/naast de al geplaatste tafels.
export function autoPosities(tables: Table[]): Map<string, Punt> {
  const posities = new Map<string, Punt>()
  const geplaatst = tables.filter((t) => t.posX != null && t.posY != null)
  const ongeplaatst = tables.filter((t) => t.posX == null || t.posY == null)

  let startY = 160
  if (geplaatst.length > 0) {
    startY = Math.max(...geplaatst.map((t) => (t.posY as number) + tafelStraal(t))) + 160
  }

  const PER_RIJ = 4
  let x = 160
  let y = startY
  let rijHoogte = 0
  ongeplaatst.forEach((t, i) => {
    const r = tafelStraal(t)
    if (i > 0 && i % PER_RIJ === 0) {
      x = 160
      y += rijHoogte * 2 + 60
      rijHoogte = 0
    }
    posities.set(t.id, { x: snap(x + r), y: snap(y) })
    x += r * 2 + 80
    rijHoogte = Math.max(rijHoogte, r)
  })
  return posities
}
