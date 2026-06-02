import { dagenTot } from './format'
import { STANDAARD_VERDELING, aankomendeTermijnen, budgetTotalen, gastTellingen } from './derived'
import type { BudgetCategorie, BudgetItem, Guest, ScheduleItem, Task, Vendor, Wedding, WebsiteContent } from './types'

export interface AIWeddingContext {
  bruidspaar: {
    partner1: string
    partner2: string
    trouwdatum: string
    locatie: string
    dagenTotBruiloft: number
  }
  budget: {
    totaal: number
    geschat: number
    geoffreerd: number
    betaald: number
    resterend: number
    perCategorie: Array<{
      categorie: string
      geschat: number
      geoffreerd: number
      betaald: number
      richtbedrag: number
    }>
    ontbrekendeCategorieën: string[]
  }
  taken: {
    totaal: number
    open: number
    bezig: number
    klaar: number
    achterstallig: number
    urgenteTaken: Array<{
      titel: string
      deadline: string
      dagenTot: number
      prioriteit: string
    }>
  }
  leveranciers: {
    status: Record<string, 'geboekt' | 'niet-geboekt'>
  }
  gasten: {
    totaal: number
    bevestigd: number
    uitgenodigd: number
    afgemeld: number
    geenReactie: number
    daggasten: number
    avondgasten: number
  }
  draaiboek: {
    aantalItems: number
  }
  website: {
    gepubliceerd: boolean
    heeftSlug: boolean
    heeftHeaderFoto: boolean
    aantalZichtbareSectionten: number
    thema: string
  }
  betalingen: {
    aankomend: Array<{
      omschrijving: string
      bedrag: number
      vervaldatum: string
      dagenTot: number
    }>
  }
}

const VENDOR_TYPES: Vendor['type'][] = [
  'locatie',
  'catering',
  'fotograaf',
  'videograaf',
  'dj of band',
  'bloemist',
  'kleding',
  'vervoer',
  'taart',
]

export function buildAIContext(
  wedding: Wedding,
  tasks: Task[],
  vendors: Vendor[],
  budgetItems: BudgetItem[],
  guests: Guest[],
  scheduleItems: ScheduleItem[],
  websiteContent: WebsiteContent | null = null
): AIWeddingContext {
  const budget = budgetTotalen(budgetItems, vendors, wedding)
  const gasten = gastTellingen(guests)

  const leveranciersStatus: Record<string, 'geboekt' | 'niet-geboekt'> = {}
  for (const type of VENDOR_TYPES) {
    leveranciersStatus[type] = vendors.some((v) => v.type === type && v.status === 'geboekt')
      ? 'geboekt'
      : 'niet-geboekt'
  }

  const openTaken = tasks.filter((t) => t.status !== 'klaar')
  const achterstallig = openTaken.filter((t) => t.deadline && dagenTot(t.deadline) < 0).length

  const PRIO: Record<string, number> = { hoog: 0, midden: 1, laag: 2 }
  const urgenteTaken = openTaken
    .filter((t) => !!t.deadline)
    .sort((a, b) => {
      const dA = dagenTot(a.deadline)
      const dB = dagenTot(b.deadline)
      // Achterstallige taken eerst
      if (dA < 0 !== dB < 0) return dA < 0 ? -1 : 1
      // Dan op prioriteit
      const pDiff = (PRIO[a.prioriteit] ?? 1) - (PRIO[b.prioriteit] ?? 1)
      if (pDiff !== 0) return pDiff
      // Dan op datum
      return a.deadline.localeCompare(b.deadline)
    })
    .slice(0, 7)
    .map((t) => ({
      titel: t.titel,
      deadline: t.deadline,
      dagenTot: dagenTot(t.deadline),
      prioriteit: t.prioriteit,
    }))

  const aanwezigeCategorieen = new Set(budgetItems.map((i) => i.categorie))
  const ontbrekendeCategorieën = (Object.keys(STANDAARD_VERDELING) as BudgetCategorie[]).filter(
    (c) => !aanwezigeCategorieen.has(c)
  )

  const perCategorie = budget.perCategorie.map((c) => ({
    ...c,
    richtbedrag: Math.round(
      wedding.totaalBudget * (STANDAARD_VERDELING[c.categorie as BudgetCategorie] ?? 0)
    ),
  }))

  const termijnen = aankomendeTermijnen(budgetItems, 10)
  const betalingen = termijnen.map(({ term, item, dagen }) => ({
    omschrijving: item.omschrijving || item.categorie,
    bedrag: term.bedrag,
    vervaldatum: term.vervaldatum,
    dagenTot: dagen,
  }))

  return {
    bruidspaar: {
      partner1: wedding.partner1Naam,
      partner2: wedding.partner2Naam,
      trouwdatum: wedding.trouwdatum,
      locatie: wedding.locatie || '(nog niet ingesteld)',
      dagenTotBruiloft: dagenTot(wedding.trouwdatum),
    },
    budget: {
      totaal: wedding.totaalBudget,
      geschat: budget.totaalGeschat,
      geoffreerd: budget.totaalGeoffreerd,
      betaald: budget.totaalBetaald,
      resterend: budget.resterendBudget,
      perCategorie,
      ontbrekendeCategorieën,
    },
    taken: {
      totaal: tasks.length,
      open: tasks.filter((t) => t.status === 'open').length,
      bezig: tasks.filter((t) => t.status === 'bezig').length,
      klaar: tasks.filter((t) => t.status === 'klaar').length,
      achterstallig,
      urgenteTaken,
    },
    leveranciers: {
      status: leveranciersStatus,
    },
    gasten: {
      totaal: guests.length,
      bevestigd: gasten.bevestigd,
      uitgenodigd: gasten.uitgenodigd,
      afgemeld: gasten.afgemeld,
      geenReactie: gasten.geenReactie,
      daggasten: gasten.daggasten,
      avondgasten: gasten.avondgasten,
    },
    draaiboek: {
      aantalItems: scheduleItems.length,
    },
    website: {
      gepubliceerd: websiteContent?.websiteGepubliceerd ?? false,
      heeftSlug: !!(websiteContent?.slug),
      heeftHeaderFoto: !!(websiteContent?.headerFotoUrl),
      aantalZichtbareSectionten: websiteContent
        ? Object.values(websiteContent.sectiesConfig).filter((s) => s.zichtbaar).length
        : 0,
      thema: websiteContent?.thema ?? 'niet ingesteld',
    },
    betalingen: {
      aankomend: betalingen,
    },
  }
}
