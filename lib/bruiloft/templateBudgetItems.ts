import { STANDAARD_VERDELING } from './derived'
import type {
  BudgetCategorie,
  BudgetItemInput,
  StandaardBudgetCategorie,
  VoortgangCategorie,
  VoortgangStatus,
  Wedding,
} from './types'

const VOORTGANG_BUDGET_ITEMS: Partial<
  Record<VoortgangCategorie, { categorie: BudgetCategorie; omschrijving: string }>
> = {
  locatie:      { categorie: 'locatie',              omschrijving: 'Trouwlocatie' },
  fotograaf:    { categorie: 'fotografie en video',  omschrijving: 'Fotograaf' },
  videograaf:   { categorie: 'fotografie en video',  omschrijving: 'Videograaf' },
  catering:     { categorie: 'catering',             omschrijving: 'Catering' },
  dj_of_band:   { categorie: 'muziek',               omschrijving: 'DJ / Muziek' },
  trouwkleding: { categorie: 'kleding',              omschrijving: 'Trouwkleding' },
  bloemist:     { categorie: 'bloemen en decoratie', omschrijving: 'Bloemen en decoratie' },
  // trouwambtenaar: geen goede budget-categorie; bewust weggelaten.
}

const UNIVERSELE_BUDGET_ITEMS: { categorie: BudgetCategorie; omschrijving: string }[] = [
  { categorie: 'ringen',                    omschrijving: 'Trouwringen' },
  { categorie: 'taart',                     omschrijving: 'Bruidstaart' },
  { categorie: 'uitnodigingen en drukwerk', omschrijving: 'Uitnodigingen en drukwerk' },
  { categorie: 'vervoer',                   omschrijving: 'Vervoer' },
]

export function generateTemplateBudgetItems(wedding: Wedding): BudgetItemInput[] {
  const kaartjes: { categorie: BudgetCategorie; omschrijving: string }[] = []
  const geregeldeZaken = wedding.geregeldeZaken ?? {}

  for (const [cat, status] of Object.entries(geregeldeZaken) as [VoortgangCategorie, VoortgangStatus][]) {
    // 'Niet van toepassing' = bewust overgeslagen, geen kaartje. 'Geboekt'
    // krijgt er juist wél een: dat is een bestaande uitgave die in het
    // budgetoverzicht thuishoort — anders missen precies de grootste posten.
    if (status === 'niet_van_toepassing') continue
    const mapping = VOORTGANG_BUDGET_ITEMS[cat]
    if (!mapping) continue
    kaartjes.push(mapping)
  }

  kaartjes.push(...UNIVERSELE_BUDGET_ITEMS)

  // Richtbedragen op basis van het totaalbudget en de standaardverdeling,
  // zodat de budgetpagina direct een verdeeld plan toont i.p.v. lege
  // kaartjes. Delen meerdere kaartjes een categorie (fotograaf + videograaf),
  // dan wordt het richtbedrag van die categorie over hen verdeeld.
  const perCategorie = new Map<string, number>()
  for (const k of kaartjes) {
    perCategorie.set(k.categorie, (perCategorie.get(k.categorie) ?? 0) + 1)
  }
  const totaal = wedding.totaalBudget ?? 0
  const richtbedrag = (categorie: BudgetCategorie): number => {
    const pct = STANDAARD_VERDELING[categorie as StandaardBudgetCategorie]
    if (!pct || totaal <= 0) return 0
    return Math.round((totaal * pct) / (perCategorie.get(categorie) ?? 1))
  }

  return kaartjes.map(({ categorie, omschrijving }) => ({
    weddingId: wedding.id,
    categorie,
    omschrijving,
    geschatBedrag: richtbedrag(categorie),
    geoffreerdBedrag: 0,
    betaaldBedrag: 0,
    betaaltermijnen: [],
  }))
}
