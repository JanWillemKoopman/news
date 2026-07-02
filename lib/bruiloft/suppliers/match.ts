// Profiel-bewuste matching voor de leveranciersdirectory (Niveau 2 — Medium).
//
// Net als guidance.ts/derived.ts: PURE functies, geen store-afhankelijkheid,
// alles berekend bij het lezen. Zo blijft de ranking voorspelbaar en testbaar.
// Geen AI in deze fase — dat is bewust (snel, gratis, deterministisch).

import { STANDAARD_VERDELING } from '../derived'
import type { StandaardBudgetCategorie, VendorType, Wedding } from '../types'
import type { Supplier, SupplierCategorie } from './types'

// Leverancier-categorie -> budgetcategorie, zodat we het richtbudget per soort
// kunnen bepalen via de bestaande STANDAARD_VERDELING (derived.ts). Bevat zowel
// de oude (public.suppliers) enum als de DIRECTORY_CATEGORIEEN-namen
// (public.businesses, zie lib/bruiloft/options.ts) — zonder deze laatste zou
// budgetScore() voor elke directory-leverancier stil op een neutrale score
// terugvallen.
const CATEGORIE_NAAR_BUDGET: Record<SupplierCategorie, StandaardBudgetCategorie> = {
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
  // --- DIRECTORY_CATEGORIEEN ---
  Trouwlocaties: 'locatie',
  Weddingplanners: 'overig',
  Trouwambtenaren: 'overig',
  Trouwjurken: 'kleding',
  Trouwpakken: 'kleding',
  Bruidsmakeup: 'kleding',
  Bruidskapsels: 'kleding',
  Trouwringen: 'ringen',
  Trouwfotografen: 'fotografie en video',
  Videografen: 'fotografie en video',
  Photobooths: 'overig',
  Bruidstaart: 'taart',
  Catering: 'catering',
  Decoratie: 'bloemen en decoratie',
  Bloemen: 'bloemen en decoratie',
  Muziek: 'muziek',
  Trouwvervoer: 'vervoer',
  Entertainment: 'overig',
  Trouwkaarten: 'uitnodigingen en drukwerk',
  Bedankjes: 'uitnodigingen en drukwerk',
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
  | 'boek dit binnenkort'

export interface SupplierMatch {
  supplier: Supplier
  score: number // 0..100
  badges: MatchBadge[]
  binnenBudget: boolean
  /** Korte uitleg in mensentaal waaróm dit een (goede) match is (#22). */
  uitleg: string
}

export interface MatchProfiel {
  totaalBudget: number
  woonplaats: string
  provincie?: string // optioneel; nu nog niet op het bruidspaar opgeslagen
  aantalGasten: number // max(dag, avond) — relevant voor capaciteit
  geboekteCategorieen: Set<SupplierCategorie> // categorieën met al een geboekte vendor
  /** Dagen tot de bruiloft; stuurt de boekvolgorde-prioriteit (#3). */
  dagenTotBruiloft?: number
  /**
   * Het door het paar zélf begrote bedrag per budgetcategorie (#23). Aanwezig
   * → gebruikt als richtbudget i.p.v. het standaardpercentage; zo matcht de
   * prijs op hun werkelijke plan, niet op een generieke verdeling.
   * Gesleuteld op budgetcategorie-naam.
   */
  richtbudgetPerBudgetCategorie?: Record<string, number>
}

// Vuistregel: zóveel maanden vóór de bruiloft is deze soort leverancier idealiter
// geboekt (gebaseerd op de Nederlandse boekbenchmarks). Binnen dit venster én
// nog niet geboekt = nu prioriteit.
const BOEKVENSTER_MAANDEN: Record<SupplierCategorie, number> = {
  locatie: 12,
  catering: 10,
  fotograaf: 10,
  videograaf: 9,
  'dj of band': 9,
  kleding: 8,
  bloemist: 6,
  vervoer: 5,
  taart: 4,
  overig: 3,
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
  // Voorkeur voor het zelf-begrote bedrag van het paar; anders het
  // standaardpercentage van het totaalbudget (#23).
  const eigenRicht = profiel.richtbudgetPerBudgetCategorie?.[CATEGORIE_NAAR_BUDGET[supplier.categorie]]
  const richt = eigenRicht && eigenRicht > 0 ? eigenRicht : categorieRichtbudget(profiel, supplier.categorie)
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
// nog nodig heeft. Ligt de bruiloft binnen het ideale boekvenster van deze
// soort, dan weegt de behoefte extra zwaar en tonen we een attentiebadge (#3).
function gatScore(
  supplier: Supplier,
  profiel: MatchProfiel
): { score: number; badge?: MatchBadge; nuBoeken: boolean } {
  if (profiel.geboekteCategorieen.has(supplier.categorie)) {
    return { score: 0.3, nuBoeken: false }
  }
  const dagen = profiel.dagenTotBruiloft
  const venster = BOEKVENSTER_MAANDEN[supplier.categorie] ?? 6
  // Binnen het boekvenster (of al getrouwd/onbekend → behandel als niet urgent).
  if (typeof dagen === 'number' && dagen > 0 && dagen <= venster * 30) {
    return { score: 1, badge: 'boek dit binnenkort', nuBoeken: true }
  }
  return { score: 1, nuBoeken: false }
}

const BADGE_UITLEG_KORT: Record<MatchBadge, string> = {
  'binnen budget': 'past binnen jullie budget',
  'net erboven': 'net boven jullie richtbudget',
  'in jullie plaats': 'in jullie woonplaats',
  'in jullie regio': 'in jullie provincie',
  'past bij gezelschap': 'past bij jullie gastenaantal',
  'boek dit binnenkort': 'goed om binnenkort te boeken',
}

// Bouwt een korte, leesbare uitleg uit de badges (#22). Valt terug op een
// neutrale tekst zonder badges, zodat er altijd context staat.
function bouwUitleg(badges: MatchBadge[]): string {
  if (badges.length === 0) return 'Algemene match op basis van jullie profiel.'
  const delen = badges.map((b) => BADGE_UITLEG_KORT[b])
  const zin = delen.length === 1 ? delen[0] : `${delen.slice(0, -1).join(', ')} en ${delen.at(-1)}`
  return `Deze past bij jullie omdat het ${zin}.`
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
  if (gat.badge) badges.push(gat.badge)

  // Gewogen gemiddelde; capaciteit telt alleen mee als die van toepassing is,
  // zodat niet-locaties niet onterecht gestraft worden.
  let gewogen = GEWICHT.budget * bud.score + GEWICHT.locatie * loc.score + GEWICHT.gat * gat.score
  let totaalGewicht = GEWICHT.budget + GEWICHT.locatie + GEWICHT.gat
  if (cap) {
    gewogen += GEWICHT.capaciteit * cap.score
    totaalGewicht += GEWICHT.capaciteit
  }

  // Kleine voorrang voor leveranciers die nu geboekt zouden moeten worden,
  // zodat ze bovenaan verschijnen zonder de inhoudelijke score te verstoren.
  const score = Math.round((gewogen / totaalGewicht) * 100)
  return {
    supplier,
    score: gat.nuBoeken ? Math.min(100, score + 5) : score,
    badges,
    binnenBudget: bud.binnenBudget,
    uitleg: bouwUitleg(badges),
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

// Bouwt de richtbudget-map (budgetcategorie -> zelf-begroot bedrag) voor #23.
// Alleen categorieën met een ingevuld bedrag; de rest valt terug op het
// standaardpercentage.
export function richtbudgetMap(
  perCategorie: Array<{ categorie: string; geschat: number }>
): Record<string, number> {
  const map: Record<string, number> = {}
  for (const c of perCategorie) {
    if (c.geschat > 0) map[c.categorie] = c.geschat
  }
  return map
}

// Helper voor de aanroepende code: bouwt het matchprofiel uit het bruidspaar +
// hun reeds geboekte leveranciers (zelfde categorie-enum als suppliers).
export function bouwProfiel(
  wedding: Pick<
    Wedding,
    'totaalBudget' | 'woonplaats' | 'aantalDaggasten' | 'aantalAvondgasten'
  > & {
    provincie?: string
    dagenTotBruiloft?: number
    richtbudgetPerBudgetCategorie?: Record<string, number>
  },
  geboekteCategorieen: VendorType[]
): MatchProfiel {
  return {
    totaalBudget: wedding.totaalBudget,
    woonplaats: wedding.woonplaats,
    provincie: wedding.provincie?.trim() || undefined,
    aantalGasten: Math.max(wedding.aantalDaggasten, wedding.aantalAvondgasten),
    geboekteCategorieen: new Set(geboekteCategorieen),
    dagenTotBruiloft: wedding.dagenTotBruiloft,
    richtbudgetPerBudgetCategorie: wedding.richtbudgetPerBudgetCategorie,
  }
}
