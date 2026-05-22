// Afgeleide waarden (kruisverbanden + statistieken). Alles wordt bij het
// LEZEN berekend; er wordt nooit teruggeschreven. Zo zijn de koppelingen
// eenvoudig en kunnen er geen oneindige update-loops ontstaan.

import { dagenTot } from './format'
import type {
  BudgetItem,
  Guest,
  PaymentTerm,
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

// Onbetaalde termijnen, oplopend op vervaldatum.
export function aankomendeTermijnen(
  items: BudgetItem[],
  limiet = 5
): AankomendeTermijn[] {
  const result: AankomendeTermijn[] = []
  for (const item of items) {
    for (const term of item.betaaltermijnen) {
      if (!term.betaald) {
        result.push({ term, item, dagen: dagenTot(term.vervaldatum) })
      }
    }
  }
  return result
    .sort((a, b) => a.term.vervaldatum.localeCompare(b.term.vervaldatum))
    .slice(0, limiet)
}
