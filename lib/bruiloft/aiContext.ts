import { dagenTot } from './format'
import { STANDAARD_VERDELING, aankomendeTermijnen, budgetTotalen, gastTellingen } from './derived'
import type { BudgetItem, Guest, ScheduleItem, StandaardBudgetCategorie, Task, Vendor, Wedding, WebsiteContent } from './types'
import { ONDERWERP_BENCHMARKS, landUitProvincie } from './ai/onderwerpBenchmarks'
import { berekenOnderwerpUrgentie, type OnderwerpUrgentie } from './ai/urgentie'

export interface AIWeddingContext {
  gebruiker?: {
    profielLeeftijdDagen: number
    actiesLaatste30Dagen: number
    ervaringsniveau: 'nieuw' | 'gemiddeld' | 'ervaren'
  }
  bruidspaar: {
    partner1: string
    partner2: string
    trouwdatum: string
    locatie: string
    woonplaats: string
    provincie: string
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
    nogNietUitgenodigd: number
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
  // Server-side verrijkt: samenvatting van het beschikbare leveranciersaanbod
  // uit de directory, zodat het advies naar concrete opties kan verwijzen (#2).
  leveranciersAanbod?: import('./ai/leveranciersAanbod').LeveranciersAanbod
  // Vooraf berekende urgentie per onderwerp (deterministisch; zie ai/urgentie.ts).
  onderwerpUrgentie?: OnderwerpUrgentie[]
}

// Bouwt een leveranciers-matchprofiel uit de AI-context, zodat het
// aanbod server-side op hetzelfde profiel gerangschikt kan worden (#2).
export function matchProfielUitContext(ctx: AIWeddingContext): import('./suppliers/match').MatchProfiel {
  const woonplaats = ctx.bruidspaar.woonplaats.startsWith('(') ? '' : ctx.bruidspaar.woonplaats
  const provincie = ctx.bruidspaar.provincie.startsWith('(') ? undefined : ctx.bruidspaar.provincie
  const geboekt = (Object.entries(ctx.leveranciers.status) as Array<[string, string]>)
    .filter(([, status]) => status === 'geboekt')
    .map(([categorie]) => categorie)
  const richtbudget: Record<string, number> = {}
  for (const c of ctx.budget.perCategorie) {
    if (c.geschat > 0) richtbudget[c.categorie] = c.geschat
  }
  return {
    totaalBudget: ctx.budget.totaal,
    woonplaats,
    provincie,
    aantalGasten: Math.max(ctx.gasten.daggasten, ctx.gasten.avondgasten),
    geboekteCategorieen: new Set(geboekt as import('./types').VendorType[]),
    dagenTotBruiloft: ctx.bruidspaar.dagenTotBruiloft,
    richtbudgetPerBudgetCategorie: Object.keys(richtbudget).length > 0 ? richtbudget : undefined,
  }
}

export function deriveErvaringsniveau(
  profielLeeftijdDagen: number,
  actiesLaatste30Dagen: number
): 'nieuw' | 'gemiddeld' | 'ervaren' {
  if (profielLeeftijdDagen <= 30 || actiesLaatste30Dagen <= 10) return 'nieuw'
  if (profielLeeftijdDagen > 90 && actiesLaatste30Dagen > 30) return 'ervaren'
  return 'gemiddeld'
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

// Tijd-bucket: laat de cache-verversing meeschalen met de urgentie. Ver weg
// verandert advies traag (≈maandelijks vers), 1–6 mnd wekelijks, in de laatste
// maand dagelijks; ná de bruiloft alleen nog op data-wijziging. Zo blijft het
// advies tijd-bewust actueel zonder dat ver-weg-paren onnodig regenereren.
function tijdBucket(dagenTotBruiloft: number): string {
  const d = dagenTotBruiloft
  if (d < 0) return 'na'
  if (d <= 30) return `d${d}`
  if (d <= 180) return `w${Math.floor(d / 7)}`
  return `m${Math.floor(d / 30)}`
}

export function buildAIFingerprint(ctx: AIWeddingContext): string {
  const geboekt = Object.values(ctx.leveranciers.status).filter((s) => s === 'geboekt').length
  const voortgangHash = Object.entries(ctx.bruidspaar.geregeldeZaken)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join(',')
  // Ververs het advies zodra een onderwerp van urgentiefase wisselt.
  const urgentieHash = (ctx.onderwerpUrgentie ?? [])
    .map((u) => `${u.onderwerp}=${u.fase}`)
    .join('|')
  return [
    'v5',
    ctx.bruidspaar.trouwdatum,
    tijdBucket(ctx.bruidspaar.dagenTotBruiloft),
    ctx.bruidspaar.locatie,
    ctx.bruidspaar.ceremonietype ?? '',
    ctx.taken.open,
    ctx.taken.klaar,
    ctx.taken.achterstallig,
    Math.round(ctx.budget.betaald),
    Math.round(ctx.budget.resterend),
    ctx.gasten.totaal,
    ctx.gasten.bevestigd,
    geboekt,
    ctx.draaiboek.aantalItems,
    voortgangHash,
    urgentieHash,
  ].join(':')
}

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
  const gasten = gastTellingen(guests, wedding.gasttypeCategorieen)

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
  const ontbrekendeCategorieën = (Object.keys(STANDAARD_VERDELING) as StandaardBudgetCategorie[]).filter(
    (c) => !aanwezigeCategorieen.has(c)
  )

  const perCategorie = budget.perCategorie.map((c) => ({
    ...c,
    richtbedrag: Math.round(
      wedding.totaalBudget * (STANDAARD_VERDELING[c.categorie as StandaardBudgetCategorie] ?? 0)
    ),
  }))

  const termijnen = aankomendeTermijnen(budgetItems, 10)
  const betalingen = termijnen.map(({ term, item, dagen }) => ({
    omschrijving: item.omschrijving || item.categorie,
    bedrag: term.bedrag,
    vervaldatum: term.vervaldatum,
    dagenTot: dagen,
  }))

  // --- Deterministische urgentie per onderwerp ---
  // Bepaal per onderwerp of het al geregeld is (geboekte leverancier, afgevinkte
  // taak of wizard-checklist), plus de afhankelijkheidssignalen; de engine zet
  // dat om in een fase die we als feit aan de AI meegeven.
  const geregeldeZaken = (wedding.geregeldeZaken ?? {}) as Record<string, string>
  const VOORTGANG_NAAR_KEY: Record<string, string[]> = {
    locatie: ['locatie'],
    fotograaf: ['fotograaf'],
    videograaf: ['videograaf'],
    catering: ['catering'],
    dj_of_band: ['dj'],
    trouwambtenaar: ['trouwambtenaar', 'melding'],
    trouwkleding: ['trouwjurk'],
    bloemist: ['bloemist'],
  }
  const geregeld: Record<string, boolean> = {}
  for (const b of ONDERWERP_BENCHMARKS) {
    const vendorType = b.vendorType
    const taakBevat = b.taakBevat
    const viaVendor = vendorType
      ? vendors.some((v) => v.type === vendorType && v.status === 'geboekt')
      : false
    const viaTaak = taakBevat
      ? tasks.some(
          (t) => t.status === 'klaar' && t.titel.toLowerCase().includes(taakBevat.toLowerCase())
        )
      : false
    geregeld[b.key] = viaVendor || viaTaak
  }
  for (const [cat, status] of Object.entries(geregeldeZaken)) {
    if (status === 'geboekt') {
      for (const key of VOORTGANG_NAAR_KEY[cat] ?? []) geregeld[key] = true
    }
  }
  const budgetGeregeld =
    wedding.totaalBudget > 0 && wedding.aantalDaggasten + wedding.aantalAvondgasten > 0
  if (budgetGeregeld) {
    geregeld.budget = true
    geregeld.gastenlijst = true
  }
  // Trouwwebsite (incl. cadeaulijst): 'klaar' zodra er een gepubliceerde site,
  // een eigen slug of welkomsttekst is. Eén signaal voor het hele online-luik;
  // werkt ook voor bestaande bruiloften omdat websiteContent app-breed laadt.
  geregeld.trouwwebsite = Boolean(
    websiteContent &&
      (websiteContent.websiteGepubliceerd ||
        websiteContent.slug ||
        websiteContent.welkomsttekst.trim())
  )
  const locatieInBehandeling =
    Boolean(wedding.locatie && wedding.locatie.trim()) ||
    vendors.some((v) => v.type === 'locatie') ||
    geregeldeZaken.locatie != null
  const stdVerstuurd = tasks.some(
    (t) => t.status === 'klaar' && t.titel.toLowerCase().includes('save-the-dates versturen')
  )
  const onderwerpUrgentie = berekenOnderwerpUrgentie({
    dagenTotBruiloft: dagenTot(wedding.trouwdatum),
    trouwdatum: wedding.trouwdatum,
    geregeld,
    budgetGeregeld,
    locatieInBehandeling,
    stdVerstuurd,
    land: landUitProvincie(wedding.provincie),
  })

  return {
    bruidspaar: {
      partner1: wedding.partner1Naam,
      partner2: wedding.partner2Naam,
      trouwdatum: wedding.trouwdatum,
      locatie: wedding.locatie || '(nog niet ingesteld)',
      woonplaats: wedding.woonplaats || '(nog niet ingesteld)',
      provincie: wedding.provincie || '(nog niet ingesteld)',
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
      nogNietUitgenodigd: gasten.nogNietUitgenodigd,
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
    onderwerpUrgentie,
  }
}
