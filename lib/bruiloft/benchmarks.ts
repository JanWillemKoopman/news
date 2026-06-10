// Benchmarkgegevens over hoe Nederlandse koppels hun bruiloft plannen.
//
// Deze feiten worden letterlijk aan de Gemini-prompt meegegeven zodat
// benchmark-adviezen ("andere koppels boeken hun fotograaf 9–12 maanden
// vooruit") op gecureerde data berusten in plaats van op cijfers die het
// model zelf verzint. Periodiek handmatig actualiseren; op termijn te
// vervangen door geaggregeerde (geanonimiseerde) data uit de eigen database.
export interface Benchmark {
  onderwerp: string
  feit: string
}

export const BENCHMARKS: Benchmark[] = [
  {
    onderwerp: 'budget',
    feit: 'Een gemiddelde Nederlandse bruiloft kost €15.000 à €20.000 bij zo’n 80–100 gasten; locatie en catering nemen samen doorgaans 40–45% van het budget in.',
  },
  {
    onderwerp: 'budget',
    feit: 'Koppels geven gemiddeld 10–15% meer uit dan vooraf begroot; een reservering van ongeveer 10% voor onvoorziene kosten is gebruikelijk.',
  },
  {
    onderwerp: 'locatie',
    feit: 'Populaire trouwlocaties zitten voor zomerdata vaak 12–14 maanden vooruit vol; de locatie is meestal het eerste dat koppels vastleggen.',
  },
  {
    onderwerp: 'fotograaf',
    feit: 'Fotografen worden gemiddeld 9–12 maanden van tevoren geboekt; gewilde fotografen voor zomerbruiloften nog eerder.',
  },
  {
    onderwerp: 'dj of band',
    feit: 'Een DJ of band wordt meestal 8–10 maanden van tevoren vastgelegd.',
  },
  {
    onderwerp: 'kleding',
    feit: 'Voor een trouwjurk plannen bruiden de eerste passessie 8–10 maanden vooruit; bestellen en vermaken kost daarna nog 4–6 maanden. Een trouwpak vraagt 3–4 maanden.',
  },
  {
    onderwerp: 'uitnodigingen',
    feit: 'Save-the-dates gaan 6–9 maanden vooruit de deur uit, uitnodigingen 3–4 maanden vooruit, met een RSVP-deadline van 4–6 weken voor de trouwdag.',
  },
  {
    onderwerp: 'rsvp',
    feit: 'Zonder herinnering reageert zo’n 30% van de gasten pas na de RSVP-deadline; één reminder ±2 weken voor de deadline verhoogt de respons sterk. Gemiddeld meldt 10–20% van de genodigden zich af.',
  },
  {
    onderwerp: 'gemeente',
    feit: 'De melding voorgenomen huwelijk moet uiterlijk 2 weken voor de trouwdag bij de gemeente binnen zijn; voor een populaire datum, locatie of trouwambtenaar plannen koppels dit vaak 6–12 maanden vooruit.',
  },
  {
    onderwerp: 'draaiboek',
    feit: 'Koppels delen het draaiboek meestal 2–4 weken voor de trouwdag met leveranciers, getuigen en familie.',
  },
]

export function benchmarksVoorPrompt(): string {
  return BENCHMARKS.map((b) => `- [${b.onderwerp}] ${b.feit}`).join('\n')
}
