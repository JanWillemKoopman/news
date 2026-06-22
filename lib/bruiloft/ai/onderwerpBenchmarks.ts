// Benchmark-tabel per trouwonderwerp, gecureerd voor de NL/BE-markt en bedoeld
// om te finetunen. Drempels staan in MAANDEN vóór de bruiloft. Voedt de
// deterministische urgentie-engine (urgentie.ts), die per onderwerp de fase
// berekent en als feit aan de AI meegeeft — zodat urgentie betrouwbaar is en de
// AI niet langer "op schema" zegt terwijl iets eigenlijk kritiek is.
//
// 'Geregeld'-detectie: een geboekte leverancier van `vendorType`, en/of een
// afgevinkte taak waarvan de titel `taakBevat` bevat. Onderwerpen zonder
// betrouwbaar 'klaar'-signaal (bijv. trouwwebsite, huwelijksreis) staan bewust
// nog NIET in deze lijst, zodat de engine niet over iets zeurt dat al gedaan is.

export type Fase = 'orienteren' | 'aan_de_slag' | 'binnenkort' | 'kritiek'

export interface OnderwerpBenchmark {
  key: string
  label: string
  // maandenTot >  aanDeSlagVanaf                       -> oriënteren
  // binnenkortVanaf < maandenTot <= aanDeSlagVanaf      -> aan_de_slag
  // kritiekVanaf    < maandenTot <= binnenkortVanaf     -> binnenkort
  // maandenTot <= kritiekVanaf                          -> kritiek
  aanDeSlagVanaf: number
  binnenkortVanaf: number
  kritiekVanaf: number
  // Top-leverancier: schuift in hoogseizoen/op zaterdag ~2 mnd naar voren.
  topLeverancier?: boolean
  vendorType?: string
  taakBevat?: string
}

export const ONDERWERP_BENCHMARKS: OnderwerpBenchmark[] = [
  { key: 'budget', label: 'Budget bepalen & verdelen', aanDeSlagVanaf: 14, binnenkortVanaf: 12, kritiekVanaf: 11, taakBevat: 'Budget en globale gastenlijst' },
  { key: 'locatie', label: 'Trouwlocatie', aanDeSlagVanaf: 15, binnenkortVanaf: 12, kritiekVanaf: 9, topLeverancier: true, vendorType: 'locatie', taakBevat: 'Trouwlocatie' },
  { key: 'gastenlijst', label: 'Gastenlijst (grove telling)', aanDeSlagVanaf: 13, binnenkortVanaf: 10, kritiekVanaf: 8, taakBevat: 'Budget en globale gastenlijst' },
  { key: 'getuigen', label: 'Ceremoniemeester / getuigen', aanDeSlagVanaf: 12, binnenkortVanaf: 9, kritiekVanaf: 6, taakBevat: 'Getuigen vragen' },
  { key: 'trouwambtenaar', label: 'Trouwambtenaar (BABS)', aanDeSlagVanaf: 12, binnenkortVanaf: 9, kritiekVanaf: 4, taakBevat: 'Trouwambtenaar' },
  { key: 'fotograaf', label: 'Fotograaf', aanDeSlagVanaf: 12, binnenkortVanaf: 9, kritiekVanaf: 6, topLeverancier: true, vendorType: 'fotograaf', taakBevat: 'Fotograaf' },
  { key: 'trouwjurk', label: 'Trouwjurk', aanDeSlagVanaf: 12, binnenkortVanaf: 9, kritiekVanaf: 6, taakBevat: 'Trouwkleding partner 1' },
  { key: 'catering', label: 'Catering', aanDeSlagVanaf: 11, binnenkortVanaf: 8, kritiekVanaf: 5, vendorType: 'catering', taakBevat: 'Catering kiezen' },
  { key: 'videograaf', label: 'Videograaf', aanDeSlagVanaf: 11, binnenkortVanaf: 8, kritiekVanaf: 5, topLeverancier: true, vendorType: 'videograaf', taakBevat: 'Videograaf' },
  { key: 'dj', label: 'DJ / band / muziek', aanDeSlagVanaf: 11, binnenkortVanaf: 8, kritiekVanaf: 5, vendorType: 'dj of band', taakBevat: 'Muziek of DJ' },
  { key: 'savethedate', label: 'Save-the-dates', aanDeSlagVanaf: 9, binnenkortVanaf: 6, kritiekVanaf: 4, taakBevat: 'Save-the-dates versturen' },
  { key: 'bloemist', label: 'Bloemist / decoratie', aanDeSlagVanaf: 9, binnenkortVanaf: 6, kritiekVanaf: 3, vendorType: 'bloemist', taakBevat: 'Bloemist' },
  { key: 'ringen', label: 'Trouwringen', aanDeSlagVanaf: 6, binnenkortVanaf: 4, kritiekVanaf: 2, taakBevat: 'Trouwringen' },
  { key: 'vervoer', label: 'Vervoer (trouwauto)', aanDeSlagVanaf: 6, binnenkortVanaf: 4, kritiekVanaf: 2, taakBevat: 'Vervoer voor de trouwdag' },
  { key: 'taart', label: 'Bruidstaart', aanDeSlagVanaf: 6, binnenkortVanaf: 3, kritiekVanaf: 2, taakBevat: 'Bruidstaart bestellen' },
  { key: 'uitnodigingen', label: 'Uitnodigingen versturen', aanDeSlagVanaf: 4, binnenkortVanaf: 2.5, kritiekVanaf: 1.5, taakBevat: 'Uitnodigingen versturen' },
  { key: 'melding', label: 'Melding/aangifte huwelijk (gemeente)', aanDeSlagVanaf: 4, binnenkortVanaf: 2, kritiekVanaf: 1.5, taakBevat: 'Ondertrouw' },
]

// Belgische provincies; al het andere (incl. het ambigue 'Limburg') => NL.
const BE_PROVINCIES = new Set([
  'antwerpen',
  'oost-vlaanderen',
  'west-vlaanderen',
  'vlaams-brabant',
  'henegouwen',
  'luik',
  'luxemburg',
  'namen',
  'waals-brabant',
  'brussel',
])

export function landUitProvincie(provincie: string): 'NL' | 'BE' {
  return BE_PROVINCIES.has(provincie.trim().toLowerCase()) ? 'BE' : 'NL'
}
