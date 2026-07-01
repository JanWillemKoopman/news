// Afgeleide waarden (kruisverbanden + statistieken). Alles wordt bij het
// LEZEN berekend; er wordt nooit teruggeschreven. Zo zijn de koppelingen
// eenvoudig en kunnen er geen oneindige update-loops ontstaan.

import { capFirst } from '../utils'
import { dagenTot, formatEuro } from './format'
import { BUDGET_CATEGORIEEN } from './options'
import type {
  ActivityEntry,
  BudgetCategorie,
  BudgetItem,
  Guest,
  PaymentTerm,
  ScheduleItem,
  Task,
  Vendor,
  Wedding,
} from './types'

// --- Kruisverband 1: geboekte leverancier voedt het budgetitem ------------

// De geboekte leverancier die aan dit budgetitem gekoppeld is (indien aanwezig).
export function geboekteLeverancierVoor(
  item: BudgetItem,
  vendors: Vendor[]
): Vendor | null {
  return (
    vendors.find(
      (v) =>
        v.status === 'geboekt' &&
        (v.budgetItemId === item.id || item.vendorId === v.id)
    ) ?? null
  )
}

// Het geoffreerde bedrag zoals het in het budget getoond wordt: dat van de
// geboekte leverancier als die er is, anders het handmatig ingevulde bedrag.
export function effectiefGeoffreerd(item: BudgetItem, vendors: Vendor[]): number {
  const vendor = geboekteLeverancierVoor(item, vendors)
  return vendor ? vendor.geoffreerdBedrag : item.geoffreerdBedrag
}

// Verwachte kost: geoffreerd als dat ingevuld is, anders de schatting.
export function verwachteKost(item: BudgetItem, vendors: Vendor[]): number {
  const geoffreerd = effectiefGeoffreerd(item, vendors)
  return geoffreerd > 0 ? geoffreerd : item.geschatBedrag
}

export function restBedrag(item: BudgetItem, vendors: Vendor[]): number {
  return verwachteKost(item, vendors) - item.betaaldBedrag
}

// --- Budgettotalen ---------------------------------------------------------

export interface BudgetTotalen {
  totaalGeschat: number
  totaalGeoffreerd: number
  totaalBetaald: number
  totaalBudget: number
  resterendBudget: number
  perCategorie: { categorie: string; geschat: number; geoffreerd: number; betaald: number }[]
}

export function budgetTotalen(
  items: BudgetItem[],
  vendors: Vendor[],
  wedding: Wedding
): BudgetTotalen {
  const perCategorieMap = new Map<
    string,
    { categorie: string; geschat: number; geoffreerd: number; betaald: number }
  >()

  let totaalGeschat = 0
  let totaalGeoffreerd = 0
  let totaalBetaald = 0

  for (const item of items) {
    const geoffreerd = effectiefGeoffreerd(item, vendors)
    totaalGeschat += item.geschatBedrag
    totaalGeoffreerd += geoffreerd
    totaalBetaald += item.betaaldBedrag

    const huidig =
      perCategorieMap.get(item.categorie) ??
      { categorie: item.categorie, geschat: 0, geoffreerd: 0, betaald: 0 }
    huidig.geschat += item.geschatBedrag
    huidig.geoffreerd += geoffreerd
    huidig.betaald += item.betaaldBedrag
    perCategorieMap.set(item.categorie, huidig)
  }

  return {
    totaalGeschat,
    totaalGeoffreerd,
    totaalBetaald,
    totaalBudget: wedding.totaalBudget,
    resterendBudget: wedding.totaalBudget - totaalBetaald,
    perCategorie: Array.from(perCategorieMap.values()),
  }
}

// --- Budget per categorie ---------------------------------------------------
// Verplaatst uit BudgetList.tsx: één bron van waarheid, want zowel de
// categorie-cards, de detailweergave als (straks) de briefing rekenen hiermee.

export type BudgetCategorieStatus = 'betaald' | 'boven schatting' | 'nog te plannen' | 'in uitvoering'

export interface CategorieData {
  naam: string
  items: BudgetItem[]
  geschat: number
  geoffreerd: number
  betaald: number
  verwacht: number
  resterend: number
  status: BudgetCategorieStatus
}

function berekenCategorieData(naam: string, catItems: BudgetItem[], vendors: Vendor[]): CategorieData {
  const geschat = catItems.reduce((s, i) => s + i.geschatBedrag, 0)
  const geoffreerd = catItems.reduce((s, i) => s + effectiefGeoffreerd(i, vendors), 0)
  const betaald = catItems.reduce((s, i) => s + i.betaaldBedrag, 0)
  const verwacht = catItems.reduce((s, i) => s + verwachteKost(i, vendors), 0)
  const resterend = verwacht - betaald

  let status: BudgetCategorieStatus = 'nog te plannen'
  if (verwacht > 0 && betaald >= verwacht) {
    status = 'betaald'
  } else if (geschat > 0 && (geoffreerd > geschat || betaald > geschat)) {
    status = 'boven schatting'
  } else if (betaald > 0 || geoffreerd > 0) {
    status = 'in uitvoering'
  }

  return { naam, items: catItems, geschat, geoffreerd, betaald, verwacht, resterend, status }
}

export function budgetPerCategorie(items: BudgetItem[], vendors: Vendor[]): CategorieData[] {
  return BUDGET_CATEGORIEEN.flatMap((cat) => {
    const catItems = items.filter((i) => i.categorie === cat)
    return catItems.length > 0 ? [berekenCategorieData(cat, catItems, vendors)] : []
  })
}

// --- Gasttellingen ---------------------------------------------------------

export interface GastTellingen {
  totaal: number
  uitgenodigd: number
  bevestigd: number
  afgemeld: number
  geenReactie: number
  daggasten: number // totaal gemarkeerd als daggast
  avondgasten: number // totaal gemarkeerd als avondgast
  bevestigdeDaggasten: number
  bevestigdeAvondgasten: number
}

export function gastTellingen(guests: Guest[]): GastTellingen {
  const t: GastTellingen = {
    totaal: guests.length,
    uitgenodigd: 0,
    bevestigd: 0,
    afgemeld: 0,
    geenReactie: 0,
    daggasten: 0,
    avondgasten: 0,
    bevestigdeDaggasten: 0,
    bevestigdeAvondgasten: 0,
  }
  for (const g of guests) {
    if (g.rsvpStatus === 'uitgenodigd') t.uitgenodigd++
    else if (g.rsvpStatus === 'bevestigd') t.bevestigd++
    else if (g.rsvpStatus === 'afgemeld') t.afgemeld++
    else if (g.rsvpStatus === 'geen reactie') t.geenReactie++

    if (g.gasttype === 'daggast') {
      t.daggasten++
      if (g.rsvpStatus === 'bevestigd') t.bevestigdeDaggasten++
    } else {
      t.avondgasten++
      if (g.rsvpStatus === 'bevestigd') t.bevestigdeAvondgasten++
    }
  }
  return t
}

// --- Taaktellingen ---------------------------------------------------------

export interface TaakTellingen {
  totaal: number
  open: number
  bezig: number
  klaar: number
}

export function taakTellingen(tasks: Task[]): TaakTellingen {
  return {
    totaal: tasks.length,
    open: tasks.filter((t) => t.status === 'open').length,
    bezig: tasks.filter((t) => t.status === 'bezig').length,
    klaar: tasks.filter((t) => t.status === 'klaar').length,
  }
}

// Eerstvolgende, nog niet afgeronde taken (oplopend op deadline).
export function aankomendeTaken(tasks: Task[], limiet = 5): Task[] {
  return tasks
    .filter((t) => t.status !== 'klaar')
    .slice()
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, limiet)
}

// --- Betaaltermijnen -------------------------------------------------------

export interface AankomendeTermijn {
  term: PaymentTerm
  item: BudgetItem
  dagen: number
}

// Onbetaalde termijnen, oplopend op vervaldatum. limiet=undefined geeft alles
// terug (gebruikt voor de volledige cashflow-weergave en voor score-berekening).
export function aankomendeTermijnen(
  items: BudgetItem[],
  limiet?: number
): AankomendeTermijn[] {
  const result: AankomendeTermijn[] = []
  for (const item of items) {
    for (const term of item.betaaltermijnen) {
      if (!term.betaald) {
        result.push({ term, item, dagen: dagenTot(term.vervaldatum) })
      }
    }
  }
  result.sort((a, b) => a.term.vervaldatum.localeCompare(b.term.vervaldatum))
  return limiet !== undefined ? result.slice(0, limiet) : result
}

// --- Slim budget: automatische verdeling + afwijkingen ---------------------

// Richtpercentages per categorie (Nederlandse praktijk, telt op tot 1.0).
export const STANDAARD_VERDELING: Record<BudgetCategorie, number> = {
  locatie: 0.2,
  catering: 0.25,
  'kleding': 0.1,
  'fotografie en video': 0.1,
  muziek: 0.08,
  'bloemen en decoratie': 0.08,
  vervoer: 0.03,
  taart: 0.03,
  'uitnodigingen en drukwerk': 0.04,
  ringen: 0.05,
  overig: 0.04,
}

export interface VerdelingRegel {
  categorie: BudgetCategorie
  bedrag: number
  heeftItem: boolean
}

// Voorstel: richtbedrag per categorie op basis van het totaalbudget.
export function budgetVerdelingVoorstel(
  totaalBudget: number,
  items: BudgetItem[]
): VerdelingRegel[] {
  const aanwezig = new Set(items.map((i) => i.categorie))
  return (Object.keys(STANDAARD_VERDELING) as BudgetCategorie[]).map((categorie) => ({
    categorie,
    bedrag: Math.round(totaalBudget * STANDAARD_VERDELING[categorie]),
    heeftItem: aanwezig.has(categorie),
  }))
}

export interface BudgetAfwijkingen {
  overBudget: boolean // totaal geoffreerd boven totaalbudget
  itemIds: Set<string> // items waar geoffreerd of betaald de schatting overschrijdt
}

// Welke items en/of het totaal lopen uit de pas? Puur berekend bij het lezen.
export function budgetAfwijkingen(
  items: BudgetItem[],
  vendors: Vendor[],
  wedding: Wedding
): BudgetAfwijkingen {
  const itemIds = new Set<string>()
  for (const item of items) {
    if (item.geschatBedrag <= 0) continue
    const geoffreerd = effectiefGeoffreerd(item, vendors)
    if (geoffreerd > item.geschatBedrag || item.betaaldBedrag > item.geschatBedrag) {
      itemIds.add(item.id)
    }
  }
  const totalen = budgetTotalen(items, vendors, wedding)
  return { overBudget: totalen.totaalGeoffreerd > wedding.totaalBudget, itemIds }
}

// --- Budget Briefing: score, waarschuwingen, forecast, volgende acties -----
// Alles hieronder is puur en deterministisch — geen AI. AI mag deze feiten
// later mooier vertellen, maar bepaalt nooit of het budget gezond is.

// Aanbevolen minimale reserve-dekking t.o.v. wat er nog openstaat. Gedeeld
// tussen budgetHealthScore (factor 5) en beoordeelUitgave ("Kan het nog?"),
// zodat beide onderdelen elkaar nooit tegenspreken.
export const RESERVE_DREMPEL = 0.1

interface BudgetSignalen {
  overBudgetPct: number // 0 = niet over budget, anders fractie erboven (0.15 = 15%)
  categorieenBovenSchatting: string[]
  termijnenTeLaat: AankomendeTermijn[]
  termijnenBinnenWeek: AankomendeTermijn[]
  categorieenZonderGeboekteLeverancier: string[]
  reserveDekkingPct: number | null // null = niets meer te betalen
}

// Eén doorloop van de items voor alle score/waarschuwing/actie-functies
// hieronder — voorkomt dubbel werk én tegenstrijdige signalen.
function berekenBudgetSignalen(items: BudgetItem[], vendors: Vendor[], wedding: Wedding): BudgetSignalen {
  const totalen = budgetTotalen(items, vendors, wedding)
  const overBudgetPct =
    wedding.totaalBudget > 0 && totalen.totaalGeoffreerd > wedding.totaalBudget
      ? (totalen.totaalGeoffreerd - wedding.totaalBudget) / wedding.totaalBudget
      : 0

  const categorieMap = new Map<string, BudgetItem[]>()
  for (const item of items) {
    const lijst = categorieMap.get(item.categorie) ?? []
    lijst.push(item)
    categorieMap.set(item.categorie, lijst)
  }

  const categorieenBovenSchatting: string[] = []
  const categorieenZonderGeboekteLeverancier: string[] = []
  Array.from(categorieMap.entries()).forEach(([categorie, catItems]) => {
    const geschat = catItems.reduce((s, i) => s + i.geschatBedrag, 0)
    const geoffreerd = catItems.reduce((s, i) => s + effectiefGeoffreerd(i, vendors), 0)
    const betaald = catItems.reduce((s, i) => s + i.betaaldBedrag, 0)
    if (geschat > 0 && (geoffreerd > geschat || betaald > geschat)) {
      categorieenBovenSchatting.push(categorie)
    }
    const heeftUitgaven = catItems.some((i) => effectiefGeoffreerd(i, vendors) > 0 || i.betaaldBedrag > 0)
    const heeftGeboekteLeverancier = catItems.some((i) => geboekteLeverancierVoor(i, vendors) !== null)
    if (heeftUitgaven && !heeftGeboekteLeverancier) {
      categorieenZonderGeboekteLeverancier.push(categorie)
    }
  })

  const alleTermijnen = aankomendeTermijnen(items)
  const termijnenTeLaat = alleTermijnen.filter((t) => t.dagen < 0)
  const termijnenBinnenWeek = alleTermijnen.filter((t) => t.dagen >= 0 && t.dagen <= 7)

  const resterendTeBetalen = Math.max(0, totalen.totaalGeoffreerd - totalen.totaalBetaald)
  const reserveDekkingPct = resterendTeBetalen > 0 ? wedding.reserveBedrag / resterendTeBetalen : null

  return {
    overBudgetPct,
    categorieenBovenSchatting,
    termijnenTeLaat,
    termijnenBinnenWeek,
    categorieenZonderGeboekteLeverancier,
    reserveDekkingPct,
  }
}

export interface BudgetHealthFactor {
  key: string
  label: string
  aftrek: number
  toelichting: string
}

export interface BudgetHealthScore {
  score: number | null
  status: 'gezond' | 'aandacht' | 'actie_vereist' | 'onvoldoende_data'
  factoren: BudgetHealthFactor[]
}

// Start op 100, trekt af per risicofactor (elk met een eigen plafond zodat
// geen enkele factor de score alleen kan bepalen). Nooit AI — uitlegbaar en
// altijd beschikbaar, ook als de AI-analyse faalt of rate-limited is.
export function budgetHealthScore(items: BudgetItem[], vendors: Vendor[], wedding: Wedding): BudgetHealthScore {
  if (items.length === 0 || wedding.totaalBudget <= 0) {
    return { score: null, status: 'onvoldoende_data', factoren: [] }
  }

  const s = berekenBudgetSignalen(items, vendors, wedding)
  const factoren: BudgetHealthFactor[] = []

  if (s.overBudgetPct > 0) {
    const aftrek =
      s.overBudgetPct <= 0.15
        ? Math.round((s.overBudgetPct / 0.15) * 20)
        : Math.min(30, 20 + Math.floor((s.overBudgetPct - 0.15) / 0.05) * 2)
    factoren.push({
      key: 'over_budget',
      label: 'Boven totaalbudget',
      aftrek,
      toelichting: `Verwachte kosten liggen ${Math.round(s.overBudgetPct * 100)}% boven het totaalbudget.`,
    })
  }

  if (s.categorieenBovenSchatting.length > 0) {
    const n = s.categorieenBovenSchatting.length
    factoren.push({
      key: 'categorieen_boven_schatting',
      label: 'Categorieën boven schatting',
      aftrek: Math.min(20, n * 4),
      toelichting: `${n} categorie${n === 1 ? '' : 'ën'} ${n === 1 ? 'zit' : 'zitten'} boven de eigen schatting.`,
    })
  }

  if (s.termijnenTeLaat.length > 0) {
    const n = s.termijnenTeLaat.length
    factoren.push({
      key: 'te_laat',
      label: 'Betalingen te laat',
      aftrek: Math.min(25, n * 8),
      toelichting: `${n} betaaltermijn${n === 1 ? '' : 'en'} ${n === 1 ? 'is' : 'zijn'} verlopen zonder te zijn afgevinkt.`,
    })
  }

  if (s.termijnenBinnenWeek.length > 0) {
    const n = s.termijnenBinnenWeek.length
    factoren.push({
      key: 'binnen_week',
      label: 'Betalingen binnen 7 dagen',
      aftrek: Math.min(10, n * 2.5),
      toelichting: `${n} betaling${n === 1 ? '' : 'en'} ${n === 1 ? 'vervalt' : 'vervallen'} deze week.`,
    })
  }

  if (s.reserveDekkingPct !== null && s.reserveDekkingPct < RESERVE_DREMPEL) {
    const ratio = Math.max(0, s.reserveDekkingPct / RESERVE_DREMPEL)
    const aftrek = Math.round((1 - ratio) * 10)
    if (aftrek > 0) {
      factoren.push({
        key: 'reserve_laag',
        label: 'Reserve te laag',
        aftrek,
        toelichting: `Reservefonds dekt minder dan ${Math.round(RESERVE_DREMPEL * 100)}% van wat er nog openstaat.`,
      })
    }
  }

  if (s.categorieenZonderGeboekteLeverancier.length > 0) {
    const n = s.categorieenZonderGeboekteLeverancier.length
    factoren.push({
      key: 'geen_leverancier',
      label: 'Nog geen leverancier geboekt',
      aftrek: Math.min(5, n * 2.5),
      toelichting: `${n} categorie${n === 1 ? '' : 'ën'} met uitgaven ${n === 1 ? 'heeft' : 'hebben'} nog geen geboekte leverancier.`,
    })
  }

  const totaalAftrek = factoren.reduce((sum, f) => sum + f.aftrek, 0)
  const score = Math.max(0, Math.round(100 - totaalAftrek))
  const status: BudgetHealthScore['status'] = score >= 80 ? 'gezond' : score >= 55 ? 'aandacht' : 'actie_vereist'

  return { score, status, factoren: factoren.slice().sort((a, b) => b.aftrek - a.aftrek) }
}

export interface BudgetWaarschuwing {
  id: string
  type: 'te_laat' | 'binnen_week' | 'boven_schatting' | 'reserve_laag' | 'geen_leverancier' | 'over_budget'
  bericht: string
  categorie?: string
  urgentie: 'kritiek' | 'binnenkort' | 'normaal'
}

// Individuele, weergeefbare waarschuwingen — dezelfde signalen als de score,
// maar als lijst i.p.v. een geaggregeerd getal. Dient als deterministische
// fallback voor de AI-coach-sectie als de AI-call faalt of rate-limited is.
export function budgetWaarschuwingen(items: BudgetItem[], vendors: Vendor[], wedding: Wedding): BudgetWaarschuwing[] {
  const s = berekenBudgetSignalen(items, vendors, wedding)
  const waarschuwingen: BudgetWaarschuwing[] = []

  for (const t of s.termijnenTeLaat) {
    const dagen = Math.abs(t.dagen)
    waarschuwingen.push({
      id: `te_laat-${t.term.id}`,
      type: 'te_laat',
      bericht: `${t.item.omschrijving || capFirst(t.item.categorie)} is ${dagen} ${dagen === 1 ? 'dag' : 'dagen'} te laat (${formatEuro(t.term.bedrag)}).`,
      categorie: t.item.categorie,
      urgentie: 'kritiek',
    })
  }

  for (const t of s.termijnenBinnenWeek) {
    waarschuwingen.push({
      id: `binnen_week-${t.term.id}`,
      type: 'binnen_week',
      bericht: `${t.item.omschrijving || capFirst(t.item.categorie)} vervalt over ${t.dagen} ${t.dagen === 1 ? 'dag' : 'dagen'} (${formatEuro(t.term.bedrag)}).`,
      categorie: t.item.categorie,
      urgentie: 'binnenkort',
    })
  }

  for (const categorie of s.categorieenBovenSchatting) {
    waarschuwingen.push({
      id: `boven_schatting-${categorie}`,
      type: 'boven_schatting',
      bericht: `${capFirst(categorie)} zit boven de eigen schatting.`,
      categorie,
      urgentie: 'binnenkort',
    })
  }

  if (s.reserveDekkingPct !== null && s.reserveDekkingPct < RESERVE_DREMPEL) {
    waarschuwingen.push({
      id: 'reserve_laag',
      type: 'reserve_laag',
      bericht: `Jullie reserve dekt minder dan ${Math.round(RESERVE_DREMPEL * 100)}% van wat er nog openstaat.`,
      urgentie: 'normaal',
    })
  }

  for (const categorie of s.categorieenZonderGeboekteLeverancier) {
    waarschuwingen.push({
      id: `geen_leverancier-${categorie}`,
      type: 'geen_leverancier',
      bericht: `${capFirst(categorie)} heeft al uitgaven, maar nog geen geboekte leverancier.`,
      categorie,
      urgentie: 'normaal',
    })
  }

  if (s.overBudgetPct > 0) {
    waarschuwingen.push({
      id: 'over_budget',
      type: 'over_budget',
      bericht: `Het totaalbudget wordt naar verwachting met ${Math.round(s.overBudgetPct * 100)}% overschreden.`,
      urgentie: 'kritiek',
    })
  }

  return waarschuwingen
}

export interface BudgetForecast {
  uitgegeven: number
  verwachtTotaal: number
  verschilMetBudget: number // positief = boven budget
}

// Deterministische voorspelling — altijd beschikbaar, ook zonder AI. Som van
// de verwachte kosten van bestaande items + richtbedragen voor categorieën
// die nog helemaal ontbreken (dezelfde STANDAARD_VERDELING-logica als
// aiContext.ts al gebruikt voor 'ontbrekendeCategorieën').
export function budgetForecast(items: BudgetItem[], vendors: Vendor[], wedding: Wedding): BudgetForecast {
  const uitgegeven = items.reduce((s, i) => s + i.betaaldBedrag, 0)
  const verwachtBestaand = items.reduce((s, i) => s + verwachteKost(i, vendors), 0)

  const aanwezig = new Set(items.map((i) => i.categorie))
  const ontbrekendRichtbedrag = (Object.keys(STANDAARD_VERDELING) as BudgetCategorie[])
    .filter((c) => !aanwezig.has(c))
    .reduce((s, c) => s + wedding.totaalBudget * STANDAARD_VERDELING[c], 0)

  const verwachtTotaal = verwachtBestaand + ontbrekendRichtbedrag
  return { uitgegeven, verwachtTotaal, verschilMetBudget: verwachtTotaal - wedding.totaalBudget }
}

export interface VolgendeActie {
  id: string
  label: string
  toelichting: string
  href: string
}

// Max. 3 concrete, imperatief geformuleerde acties, in prioriteitsvolgorde
// (te laat > binnen 7 dagen > boven schatting > lage reserve > geen
// leverancier). Bouwt rechtstreeks op de gedeelde signalen, niet op de
// geformuleerde waarschuwingsteksten — voorkomt fragiele stringmanipulatie.
export function budgetVolgendeActies(items: BudgetItem[], vendors: Vendor[], wedding: Wedding): VolgendeActie[] {
  const s = berekenBudgetSignalen(items, vendors, wedding)
  const acties: VolgendeActie[] = []

  for (const t of s.termijnenTeLaat) {
    acties.push({
      id: `te_laat-${t.term.id}`,
      label: `Betaal ${t.item.omschrijving || capFirst(t.item.categorie)}`,
      toelichting: `${Math.abs(t.dagen)} ${Math.abs(t.dagen) === 1 ? 'dag' : 'dagen'} te laat — ${formatEuro(t.term.bedrag)}`,
      href: '/bruiloft/budget',
    })
  }

  for (const t of s.termijnenBinnenWeek) {
    acties.push({
      id: `binnen_week-${t.term.id}`,
      label: `Betaal ${t.item.omschrijving || capFirst(t.item.categorie)}`,
      toelichting: `vervalt over ${t.dagen} ${t.dagen === 1 ? 'dag' : 'dagen'} — ${formatEuro(t.term.bedrag)}`,
      href: '/bruiloft/budget',
    })
  }

  for (const categorie of s.categorieenBovenSchatting) {
    acties.push({
      id: `boven_schatting-${categorie}`,
      label: `Herbekijk het budget voor ${capFirst(categorie)}`,
      toelichting: 'zit boven de eigen schatting',
      href: '/bruiloft/budget',
    })
  }

  if (s.reserveDekkingPct !== null && s.reserveDekkingPct < RESERVE_DREMPEL) {
    acties.push({
      id: 'reserve_laag',
      label: 'Vul de reserve aan',
      toelichting: `nu ${Math.round(s.reserveDekkingPct * 100)}% dekking, streef naar ${Math.round(RESERVE_DREMPEL * 100)}%`,
      href: '/bruiloft/budget',
    })
  }

  for (const categorie of s.categorieenZonderGeboekteLeverancier) {
    acties.push({
      id: `geen_leverancier-${categorie}`,
      label: `Boek een leverancier voor ${capFirst(categorie)}`,
      toelichting: 'er is al budget voor gereserveerd',
      href: '/bruiloft/leveranciers',
    })
  }

  return acties.slice(0, 3)
}

export interface BeoordeelUitgaveResultaat {
  oordeel: 'past' | 'krap' | 'te_veel'
  toelichting: string
  restNaAftrek: number
}

// "Kan het nog?" — puur rekenwerk op al beschikbare cijfers, geen opslag.
// Hergebruikt dezelfde RESERVE_DREMPEL als budgetHealthScore, zodat de twee
// onderdelen elkaar nooit tegenspreken.
export function beoordeelUitgave(
  bedrag: number,
  totalen: BudgetTotalen,
  reserveBedrag: number
): BeoordeelUitgaveResultaat {
  const vrijBudget = totalen.totaalBudget - totalen.totaalGeoffreerd
  const restNaAftrek = vrijBudget - bedrag

  if (restNaAftrek < 0) {
    return {
      oordeel: 'te_veel',
      toelichting: `Dat gaat er ${formatEuro(Math.abs(restNaAftrek))} overheen. Overweeg een andere categorie te verlagen, of wacht ermee.`,
      restNaAftrek,
    }
  }

  const resterendTeBetalenNa = Math.max(0, totalen.totaalGeoffreerd + bedrag - totalen.totaalBetaald)
  const reserveDrempelBedrag = resterendTeBetalenNa * RESERVE_DREMPEL
  if (resterendTeBetalenNa > 0 && reserveBedrag < reserveDrempelBedrag) {
    return {
      oordeel: 'krap',
      toelichting: `Dat kan, maar jullie reserve dekt dan minder dan de aanbevolen ${Math.round(RESERVE_DREMPEL * 100)}%. Er blijft ${formatEuro(restNaAftrek)} vrij.`,
      restNaAftrek,
    }
  }

  return {
    oordeel: 'past',
    toelichting: `Ja, dat past. Er blijft nog ${formatEuro(restNaAftrek)} vrij.`,
    restNaAftrek,
  }
}

export interface BudgetBriefingRegels {
  groet: string
  countdownRegel: string
  scoreRegel: string
  weekRegel: string
  maandWaarschuwing: string | null
  afsluiter: string
}

const MAAND_NAMEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

function groetVoorTijdstip(uur: number): string {
  if (uur < 12) return 'Goedemorgen'
  if (uur < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

// Deterministische tekstbouwstenen voor de Budget Briefing — direct
// weergeefbaar (geen wachttijd), en tegelijk de feitelijke basis die de
// AI-prompt meekrijgt om er vloeiend proza van te maken. AI vertelt, dit
// rekent en bepaalt.
export function budgetBriefingRegels(
  items: BudgetItem[],
  wedding: Wedding,
  healthScore: BudgetHealthScore
): BudgetBriefingRegels {
  const groet = `${groetVoorTijdstip(new Date().getHours())} ${wedding.partner1Naam} & ${wedding.partner2Naam}`.trim()

  const dagen = dagenTot(wedding.trouwdatum)
  const countdownRegel = !wedding.trouwdatum
    ? ''
    : dagen > 0
      ? `Nog ${dagen} ${dagen === 1 ? 'dag' : 'dagen'} tot jullie bruiloft ❤️`
      : dagen === 0
        ? 'Vandaag is de grote dag! ❤️'
        : 'Gefeliciteerd met jullie bruiloft! 🎉'

  const scoreRegel =
    healthScore.score === null
      ? 'Voeg budgetitems toe om jullie budgetgezondheid te zien.'
      : healthScore.status === 'gezond'
        ? `Jullie budget staat er goed voor — ${healthScore.score}/100.`
        : healthScore.status === 'aandacht'
          ? `Jullie budget vraagt wat aandacht — ${healthScore.score}/100.`
          : `Jullie budget vraagt nu actie — ${healthScore.score}/100.`

  const alleTermijnen = aankomendeTermijnen(items)
  const termijnenDezeWeek = alleTermijnen.filter((t) => t.dagen >= 0 && t.dagen <= 7)
  const weekRegel =
    termijnenDezeWeek.length === 0
      ? 'Deze week hoeven jullie geen betalingen te doen.'
      : `Deze week ${termijnenDezeWeek.length === 1 ? 'staat er 1 betaling gepland' : `staan er ${termijnenDezeWeek.length} betalingen gepland`}, samen ${formatEuro(termijnenDezeWeek.reduce((s, t) => s + t.term.bedrag, 0))}.`

  const perMaand = new Map<string, { bedrag: number; aantal: number; label: string }>()
  for (const t of alleTermijnen) {
    if (!t.term.vervaldatum) continue
    const d = new Date(t.term.vervaldatum)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const huidig = perMaand.get(key) ?? { bedrag: 0, aantal: 0, label: MAAND_NAMEN[d.getMonth()] }
    huidig.bedrag += t.term.bedrag
    huidig.aantal += 1
    perMaand.set(key, huidig)
  }
  const druksteMaand = Array.from(perMaand.values())
    .filter((m) => m.aantal >= 3)
    .sort((a, b) => b.aantal - a.aantal)[0]
  const maandWaarschuwing = druksteMaand
    ? `Let op: in ${druksteMaand.label} vallen ${druksteMaand.aantal} betalingen samen, samen ${formatEuro(druksteMaand.bedrag)}.`
    : null

  const afsluiter =
    healthScore.status === 'onvoldoende_data'
      ? 'Zodra jullie budgetitems toevoegen, houden we dit voor jullie bij.'
      : healthScore.status === 'gezond'
        ? 'Jullie liggen op schema. Goed bezig.'
        : healthScore.status === 'aandacht'
          ? 'Met een paar keuzes deze week staan jullie weer volledig op schema.'
          : 'Niets om wakker van te liggen — hier is wat we nu zouden doen.'

  return { groet, countdownRegel, scoreRegel, weekRegel, maandWaarschuwing, afsluiter }
}

// --- Activiteitenfeed ------------------------------------------------------

// Aantal ongelezen feed-items: nieuwer dan de laatste blik én niet van jezelf.
export function ongelezenActiviteit(
  activity: ActivityEntry[],
  seenAt: string | null,
  currentUserId?: string
): number {
  return activity.filter(
    (a) => a.actorId !== currentUserId && (!seenAt || a.createdAt > seenAt)
  ).length
}

// Recentste feed-items eerst, afgekapt op een limiet.
export function recenteActiviteit(activity: ActivityEntry[], limiet = 15): ActivityEntry[] {
  return activity
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limiet)
}

// --- Draaiboek statistieken -----------------------------------------------

export interface DraaiboekStats {
  totaalItems: number
  geplandMinuten: number  // som van duur van items met beide tijden ingevuld
  aantalGaten: number     // pauzes >= minPauze minuten
  aantalOverlaps: number  // negatieve gaps (eindtijd vorig > starttijd huidig)
}

export function draaiboekStats(items: ScheduleItem[], minPauze = 5): DraaiboekStats {
  const gesorteerd = items.slice().sort((a, b) => a.tijd.localeCompare(b.tijd))
  let geplandMinuten = 0
  let aantalGaten = 0
  let aantalOverlaps = 0

  for (let i = 0; i < gesorteerd.length; i++) {
    const s = gesorteerd[i]
    if (s.tijd && s.eindtijd) {
      const [sh, sm] = s.tijd.split(':').map(Number)
      const [eh, em] = s.eindtijd.split(':').map(Number)
      const dur = eh * 60 + em - (sh * 60 + sm)
      if (dur > 0) geplandMinuten += dur
    }
    if (i > 0) {
      const prev = gesorteerd[i - 1]
      const ref = prev.eindtijd || prev.tijd
      const [rh, rm] = ref.split(':').map(Number)
      const [sh, sm] = s.tijd.split(':').map(Number)
      const gap = sh * 60 + sm - (rh * 60 + rm)
      if (gap < 0) aantalOverlaps++
      else if (gap >= minPauze) aantalGaten++
    }
  }

  return { totaalItems: gesorteerd.length, geplandMinuten, aantalGaten, aantalOverlaps }
}
