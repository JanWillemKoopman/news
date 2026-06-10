import { dagenTot } from './format'
import { STANDAARD_VERDELING, aankomendeTermijnen, budgetTotalen, gastTellingen } from './derived'
import type { BudgetCategorie, BudgetItem, Guest, ScheduleItem, Task, Vendor, Wedding, WebsiteContent } from './types'

export interface AIWeddingContext {
  bruidspaar: {
    partner1: string
    partner2: string
    trouwdatum: string
    locatie: string
    woonplaats: string
    dagenTotBruiloft: number
    ceremonietype: string | null
    geregeldeZaken: Record<string, string>
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
  const achterstallig = openTaken.filter((t) => dagenTot(t.deadline) < 0).length
  const urgenteTaken = openTaken
    .slice()
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
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
      woonplaats: wedding.woonplaats || '(nog niet ingesteld)',
      dagenTotBruiloft: dagenTot(wedding.trouwdatum),
      ceremonietype: wedding.ceremonietype ?? null,
      geregeldeZaken: wedding.geregeldeZaken as Record<string, string>,
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
