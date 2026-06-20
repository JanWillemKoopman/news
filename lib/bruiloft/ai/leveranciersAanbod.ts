import 'server-only'

import { rangschik, type MatchProfiel } from '@/lib/bruiloft/suppliers/match'
import { mapSupplierRow, type SupplierRow } from '@/lib/bruiloft/suppliers/types'
import type { VendorType } from '@/lib/bruiloft/types'

// Vat het beschikbare leveranciersaanbod samen voor het AI-advies (#2/#25).
// Doel: het advies kan koppels naar concrete, bestaande opties verwijzen en
// vermijdt loze adviezen ("regel je vervoer") als er niets passends is.

export interface AanbodCategorie {
  categorie: VendorType
  alGeboekt: boolean
  aantalBeschikbaar: number
  aantalBinnenBudget: number
  aantalInRegio: number
  topMatches: Array<{ naam: string; plaats: string; prijsVanaf: number | null; score: number }>
}

export interface LeveranciersAanbod {
  perCategorie: AanbodCategorie[]
}

// Categorieën waarvoor de directory leveranciers bevat (zelfde enum als vendors).
const CATEGORIEEN: VendorType[] = [
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

const FETCH_CAP = 400

// Haalt het aanbod op en rangschikt per categorie op het profiel van het paar.
// Faalt zacht: bij een fout geven we een leeg aanbod terug zodat het advies
// gewoon doorgaat.
export async function bouwLeveranciersAanbod(
  supabase: { from: (t: string) => any },
  profiel: MatchProfiel
): Promise<LeveranciersAanbod> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .in('categorie', CATEGORIEEN)
      .limit(FETCH_CAP)
    if (error || !data) return { perCategorie: [] }

    const suppliers = (data as SupplierRow[]).map(mapSupplierRow)

    const perCategorie: AanbodCategorie[] = CATEGORIEEN.map((categorie) => {
      const inCategorie = suppliers.filter((s) => s.categorie === categorie)
      const gerangschikt = rangschik(inCategorie, profiel)
      return {
        categorie,
        alGeboekt: profiel.geboekteCategorieen.has(categorie),
        aantalBeschikbaar: gerangschikt.length,
        aantalBinnenBudget: gerangschikt.filter((m) => m.binnenBudget).length,
        aantalInRegio: gerangschikt.filter(
          (m) => m.badges.includes('in jullie plaats') || m.badges.includes('in jullie regio')
        ).length,
        topMatches: gerangschikt.slice(0, 3).map((m) => ({
          naam: m.supplier.naam,
          plaats: m.supplier.plaats,
          prijsVanaf: m.supplier.prijsVanaf,
          score: m.score,
        })),
      }
    }).filter((c) => c.aantalBeschikbaar > 0)

    return { perCategorie }
  } catch {
    return { perCategorie: [] }
  }
}
