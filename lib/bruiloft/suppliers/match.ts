// Profiel-bewuste matching voor de leveranciersdirectory (Niveau 2 — Medium).
//
// Net als guidance.ts/derived.ts: PURE functies, geen store-afhankelijkheid,
// alles berekend bij het lezen. Zo blijft de ranking voorspelbaar en testbaar.
// Geen AI in deze fase — dat is bewust (snel, gratis, deterministisch).

import { STANDAARD_VERDELING } from '../derived'
import type { BudgetCategorie, VendorType, Wedding } from '../types'
import type { Supplier, SupplierCategorie } from './types'

// Leverancier-categorie -> budgetcategorie, zodat we het richtbudget per soort
// kunnen bepalen via de bestaande STANDAARD_VERDELING (derived.ts).
const CATEGORIE_NAAR_BUDGET: Record<SupplierCategorie, BudgetCategorie> = {
  locatie: 'locatie',
  catering: 'catering',
  fotograaf: 'fotografie en video',
  videograaf: 'fotografie en video',
  'dj of band': 'muziek',
  bloemist: 'bloemen en decoratie',
  kleding: 'kleding',
  vervoer: 'vervoer',
  taart: 'taart',
  overig: 'overig',
}

// Het deel van het totaalbudget dat normaliter naar deze soort leverancier gaat.
export function categorieRichtbudget(
  wedding: Pick<Wedding, 'totaalBudget'>,
  categorie: SupplierCategorie
): number {
  const bc = CATEGORIE_NAAR_BUDGET[categorie]
  return wedding.totaalBudget * (STANDAARD_VERDELING[bc] ?? 0)
}

export type MatchBadge =
  | 'binnen budget'
  | 'net erboven'
  | 'in jullie plaats'
  | 'in jullie regio'
  | 'past bij gezelschap'

export interface SupplierMatch {
  supplier: Supplier
  score: number // 0..100
  badges: MatchBadge[]
  binnenBudget: boolean
}

export interface MatchProfiel {
  totaalBudget: number
  woonplaats: string
  provincie?: string // optioneel; nu nog niet op het bruidspaar opgeslagen
  aantalGasten: number // max(dag, avond) — relevant voor capaciteit
  geboekteCategorieen: Set<SupplierCategorie> // categorieën met al een geboekte vendor
}

function normaliseer(s: string): string {
  return s.trim().toLowerCase()
}

// --- Deelscores (alle 0..1) ------------------------------------------------

function locatieScore(
  supplier: Supplier,
  profiel: MatchProfiel
): { score: number; badge?: MatchBadge } {
  const plaats = normaliseer(supplier.plaats)
  const woon = normaliseer(profiel.woonplaats)
  if (woon && plaats && (plaats === woon || plaats.includes(woon) || woon.includes(plaats))) {
    return { score: 1, badge: 'in jullie plaats' }
  }
  const prov = normaliseer(supplier.provincie)
  if (profiel.provincie && prov && prov === normaliseer(profiel.provincie)) {
    return { score: 0.7, badge: 'in jullie regio' }
  }
  // Onbekend of andere regio: neutrale basis (geen harde uitsluiting).
  return { score: 0.3 }
}

function budgetScore(
  supplier: Supplier,
  profiel: MatchProfiel
): { score: number; badge?: MatchBadge; binnenBudget: boolean } {
  // Geen zinnige prijs of geen budget bekend -> neutraal, geen badge.
  if (supplier.isPrijsOpAanvraag || supplier.prijsVanaf == null || profiel.totaalBudget <= 0) {
    return { score: 0.5, binnenBudget: false }
  }
  const richt = categorieRichtbudget(profiel, supplier.categorie)
  if (richt <= 0) return { score: 0.5, binnenBudget: false }

  if (supplier.prijsVanaf <= richt) {
    return { score: 1, badge: 'binnen budget', binnenBudget: true }
  }
  if (supplier.prijsVanaf <= richt * 1.25) {
    return { score: 0.6, badge: 'net erboven', binnenBudget: false }
  }
  return { score: 0.2, binnenBudget: false }
}

// Capaciteit is alleen betekenisvol voor locaties.
function capaciteitScore(
  supplier: Supplier,
  profiel: MatchProfiel
): { score: number; badge?: MatchBadge } | null {
  if (supplier.categorie !== 'locatie' || supplier.capaciteitMax <= 0 || profiel.aantalGasten <= 0) {
    return null
  }
  const { capaciteitMin, capaciteitMax } = supplier
  const gasten = profiel.aantalGasten
  if (gasten > capaciteitMax) return { score: 0.15 } // te klein voor het gezelschap
  if (gasten >= capaciteitMin) return { score: 1, badge: 'past bij gezelschap' }
  return { score: 0.6 } // ruim, maar past
}

// Categorieën waar nog niets geboekt is krijgen voorrang: toont wat het stel
// nog nodig heeft.
function gatScore(supplier: Supplier, profiel: MatchProfiel): number {
  return profiel.geboekteCategorieen.has(supplier.categorie) ? 0.3 : 1
}

// --- Totaalscore -----------------------------------------------------------

const GEWICHT = { budget: 0.35, locatie: 0.3, gat: 0.2, capaciteit: 0.15 }

export function scoreSupplier(supplier: Supplier, profiel: MatchProfiel): SupplierMatch {
  const badges: MatchBadge[] = []

  const loc = locatieScore(supplier, profiel)
  if (loc.badge) badges.push(loc.badge)

  const bud = budgetScore(supplier, profiel)
  if (bud.badge) badges.push(bud.badge)

  const cap = capaciteitScore(supplier, profiel)
  if (cap?.badge) badges.push(cap.badge)

  const gat = gatScore(supplier, profiel)

  // Gewogen gemiddelde; capaciteit telt alleen mee als die van toepassing is,
  // zodat niet-locaties niet onterecht gestraft worden.
  let gewogen = GEWICHT.budget * bud.score + GEWICHT.locatie * loc.score + GEWICHT.gat * gat
  let totaalGewicht = GEWICHT.budget + GEWICHT.locatie + GEWICHT.gat
  if (cap) {
    gewogen += GEWICHT.capaciteit * cap.score
    totaalGewicht += GEWICHT.capaciteit
  }

  return {
    supplier,
    score: Math.round((gewogen / totaalGewicht) * 100),
    badges,
    binnenBudget: bud.binnenBudget,
  }
}

// Rangschik de hele kandidatenlijst voor dit bruidspaar.
export function rangschik(suppliers: Supplier[], profiel: MatchProfiel): SupplierMatch[] {
  return suppliers
    .map((s) => scoreSupplier(s, profiel))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (a.binnenBudget !== b.binnenBudget) return a.binnenBudget ? -1 : 1
      return a.supplier.naam.localeCompare(b.supplier.naam, 'nl')
    })
}

// Helper voor de aanroepende code: bouwt het matchprofiel uit het bruidspaar +
// hun reeds geboekte leveranciers (zelfde categorie-enum als suppliers).
export function bouwProfiel(
  wedding: Pick<Wedding, 'totaalBudget' | 'woonplaats' | 'aantalDaggasten' | 'aantalAvondgasten'>,
  geboekteCategorieen: VendorType[]
): MatchProfiel {
  return {
    totaalBudget: wedding.totaalBudget,
    woonplaats: wedding.woonplaats,
    aantalGasten: Math.max(wedding.aantalDaggasten, wedding.aantalAvondgasten),
    geboekteCategorieen: new Set(geboekteCategorieen),
  }
}
