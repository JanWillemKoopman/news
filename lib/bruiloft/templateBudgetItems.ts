import type {
  BudgetCategorie,
  BudgetItemInput,
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
  const items: BudgetItemInput[] = []
  const geregeldeZaken = wedding.geregeldeZaken ?? {}

  for (const [cat, status] of Object.entries(geregeldeZaken) as [VoortgangCategorie, VoortgangStatus][]) {
    if (status === 'geboekt') continue
    const mapping = VOORTGANG_BUDGET_ITEMS[cat]
    if (!mapping) continue
    items.push({
      weddingId: wedding.id,
      categorie: mapping.categorie,
      omschrijving: mapping.omschrijving,
      geschatBedrag: 0,
      geoffreerdBedrag: 0,
      betaaldBedrag: 0,
      betaaltermijnen: [],
    })
  }

  for (const { categorie, omschrijving } of UNIVERSELE_BUDGET_ITEMS) {
    items.push({
      weddingId: wedding.id,
      categorie,
      omschrijving,
      geschatBedrag: 0,
      geoffreerdBedrag: 0,
      betaaldBedrag: 0,
      betaaltermijnen: [],
    })
  }

  return items
}
