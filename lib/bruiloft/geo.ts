// Geografische hulpconstantes/-functies, gedeeld tussen formulieren,
// leveranciersfilters en de matching. Eén bron van waarheid zodat de
// provincienamen overal exact gelijk zijn (de match vergelijkt op tekst).

export const PROVINCIES = [
  'Drenthe',
  'Flevoland',
  'Friesland',
  'Gelderland',
  'Groningen',
  'Limburg',
  'Noord-Brabant',
  'Noord-Holland',
  'Overijssel',
  'Utrecht',
  'Zeeland',
  'Zuid-Holland',
] as const

export type Provincie = (typeof PROVINCIES)[number]

// Lichte afleiding van provincie uit een bekende (grotere) woonplaats.
// Bewust een korte, onderhoudbare lijst: dekt de meeste gebruikers en
// houdt het invulveld frictieloos (we kunnen de provincie voorinvullen).
// Onbekende plaatsen geven null terug — dan kiest de gebruiker zelf.
const PLAATS_PROVINCIE: Record<string, Provincie> = {
  amsterdam: 'Noord-Holland',
  haarlem: 'Noord-Holland',
  alkmaar: 'Noord-Holland',
  hilversum: 'Noord-Holland',
  zaandam: 'Noord-Holland',
  rotterdam: 'Zuid-Holland',
  'den haag': 'Zuid-Holland',
  "'s-gravenhage": 'Zuid-Holland',
  leiden: 'Zuid-Holland',
  delft: 'Zuid-Holland',
  dordrecht: 'Zuid-Holland',
  gouda: 'Zuid-Holland',
  zoetermeer: 'Zuid-Holland',
  utrecht: 'Utrecht',
  amersfoort: 'Utrecht',
  veenendaal: 'Utrecht',
  nieuwegein: 'Utrecht',
  eindhoven: 'Noord-Brabant',
  'den bosch': 'Noord-Brabant',
  "'s-hertogenbosch": 'Noord-Brabant',
  tilburg: 'Noord-Brabant',
  breda: 'Noord-Brabant',
  helmond: 'Noord-Brabant',
  maastricht: 'Limburg',
  venlo: 'Limburg',
  heerlen: 'Limburg',
  roermond: 'Limburg',
  arnhem: 'Gelderland',
  nijmegen: 'Gelderland',
  apeldoorn: 'Gelderland',
  ede: 'Gelderland',
  zwolle: 'Overijssel',
  enschede: 'Overijssel',
  deventer: 'Overijssel',
  hengelo: 'Overijssel',
  groningen: 'Groningen',
  leeuwarden: 'Friesland',
  drachten: 'Friesland',
  sneek: 'Friesland',
  assen: 'Drenthe',
  emmen: 'Drenthe',
  hoogeveen: 'Drenthe',
  lelystad: 'Flevoland',
  almere: 'Flevoland',
  middelburg: 'Zeeland',
  vlissingen: 'Zeeland',
  goes: 'Zeeland',
}

export function afleidProvincie(woonplaats: string): Provincie | null {
  const sleutel = woonplaats.trim().toLowerCase()
  if (!sleutel) return null
  return PLAATS_PROVINCIE[sleutel] ?? null
}
