// Draaiboek-onderdelen lopen door tot na middernacht (bv. "Einde feest" om
// 00:45). De trouwdag begint daarom pas om 05:00: tijden vóór dat uur horen
// bij het einde van de vorige avond, niet bij het begin van een nieuwe dag.
const DAGSTART_UUR = 5

function minutenSindsMiddernacht(tijd: string): number {
  const [uur, minuut] = tijd.split(':').map(Number)
  if (Number.isNaN(uur) || Number.isNaN(minuut)) return 0
  return uur * 60 + minuut
}

// Minuten sinds het begin van de trouwdag (05:00), voor sortering/duur.
// Tijden vóór 05:00 tellen als "na middernacht" en komen dus na 23:xx.
export function dagVolgordeMinuten(tijd: string): number {
  const min = minutenSindsMiddernacht(tijd)
  return min < DAGSTART_UUR * 60 ? min + 24 * 60 : min
}

export function vergelijkTijd(a: string, b: string): number {
  return dagVolgordeMinuten(a) - dagVolgordeMinuten(b)
}
