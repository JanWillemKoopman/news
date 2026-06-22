// Deterministische urgentie-engine. Berekent per onderwerp de fase
// (aan_de_slag / binnenkort / kritiek) op basis van de benchmark-tabel,
// het seizoen en de afhankelijkheden tussen taken. Géén AI: voorspelbaar,
// testbaar en gratis. Het resultaat wordt als feit aan de AI meegegeven, zodat
// die de urgentie niet zelf hoeft te schatten (en niet langer ten onrechte
// "op schema" zegt).

import { ONDERWERP_BENCHMARKS, type Fase } from './onderwerpBenchmarks'

export interface UrgentieInput {
  dagenTotBruiloft: number
  trouwdatum: string
  /** Per onderwerp-key: is het al geregeld/geboekt? */
  geregeld: Record<string, boolean>
  /** Is het budget bepaald (totaalbudget + globale gastenraming)? */
  budgetGeregeld: boolean
  /** Wordt er al een locatie bekeken/ingevuld? (voor de budget-afhankelijkheid) */
  locatieInBehandeling: boolean
  /** Zijn de save-the-dates verstuurd? (voor de uitnodigingen-timing) */
  stdVerstuurd: boolean
  land: 'NL' | 'BE'
}

export type ActieveFase = Exclude<Fase, 'orienteren'>

export interface OnderwerpUrgentie {
  onderwerp: string
  fase: ActieveFase
  reden?: string
}

const MAANDEN_PER_DAG = 1 / 30.44

function maandenTot(dagen: number): number {
  return dagen * MAANDEN_PER_DAG
}

// Hoogseizoen (mei t/m september) of een zaterdag => meer druk op de
// top-leveranciers (locatie, fotograaf, videograaf, BABS).
export function isDrukkeDatum(trouwdatum: string): boolean {
  const d = new Date(trouwdatum)
  if (Number.isNaN(d.getTime())) return false
  const maand = d.getMonth() + 1
  const hoogseizoen = maand >= 5 && maand <= 9
  const zaterdag = d.getDay() === 6
  return hoogseizoen || zaterdag
}

function faseUitDrempels(
  m: number,
  aanDeSlag: number,
  binnenkort: number,
  kritiek: number
): Fase {
  if (m <= kritiek) return 'kritiek'
  if (m <= binnenkort) return 'binnenkort'
  if (m <= aanDeSlag) return 'aan_de_slag'
  return 'orienteren'
}

const FASE_RANG: Record<Fase, number> = {
  orienteren: 0,
  aan_de_slag: 1,
  binnenkort: 2,
  kritiek: 3,
}

function zwaarste(a: Fase, b: Fase): Fase {
  return FASE_RANG[a] >= FASE_RANG[b] ? a : b
}

/** True als de bruiloft binnen ~10 maanden is: sprint-modus voor de AI-toon. */
export function isSprintModus(dagenTotBruiloft: number): boolean {
  const m = maandenTot(dagenTotBruiloft)
  return m > 0 && m <= 10
}

export function berekenOnderwerpUrgentie(input: UrgentieInput): OnderwerpUrgentie[] {
  const m = maandenTot(input.dagenTotBruiloft)
  const druk = isDrukkeDatum(input.trouwdatum)
  const resultaat: OnderwerpUrgentie[] = []

  for (const b of ONDERWERP_BENCHMARKS) {
    if (input.geregeld[b.key]) continue // klaar => geen urgentie

    let aanDeSlag = b.aanDeSlagVanaf
    let binnenkort = b.binnenkortVanaf
    let kritiek = b.kritiekVanaf
    let reden: string | undefined

    // §3 Seizoen-weging: top-leveranciers 2 mnd naar voren bij drukke data.
    if (b.topLeverancier && druk) {
      aanDeSlag += 2
      binnenkort += 2
      reden = 'populaire datum (hoogseizoen of zaterdag)'
    }

    // §1 Save-the-date -> uitnodigingen: STD verstuurd = versoepelen, anders strak.
    if (b.key === 'uitnodigingen') {
      if (input.stdVerstuurd) {
        aanDeSlag = 3
        binnenkort = 2
        kritiek = 1.5
      } else {
        aanDeSlag = 4
        binnenkort = 2.5
        kritiek = 1.5
      }
    }

    // §2 Land-specifieke kritiek-grens voor de gemeente-melding.
    if (b.key === 'melding') {
      kritiek = input.land === 'BE' ? 1 : 1.5 // ~4 wk (BE) / ~6 wk (NL)
    }

    let fase = faseUitDrempels(m, aanDeSlag, binnenkort, kritiek)

    // §1 Budget vóór locatie: locatie wordt al bekeken terwijl budget nog niet
    // vaststaat -> escaleer budget naar minimaal 'binnenkort'.
    if (b.key === 'budget' && !input.budgetGeregeld && input.locatieInBehandeling) {
      fase = zwaarste(fase, 'binnenkort')
      reden = 'er wordt al naar een locatie gekeken zonder dat het budget vaststaat'
    }

    if (fase === 'orienteren') continue // nog niet actiegericht

    resultaat.push({ onderwerp: b.label, fase, reden })
  }

  resultaat.sort((a, b) => FASE_RANG[b.fase] - FASE_RANG[a.fase])
  return resultaat
}
