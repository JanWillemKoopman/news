'use client'

import * as React from 'react'

import { categorieVoorWeergave } from '@/lib/bruiloft/options'
import type { Vendor } from '@/lib/bruiloft/types'

interface CategorieVoortgangProps {
  vendors: Vendor[]
  categorieen: string[]
}

// Eén zin i.p.v. een voortgangsbalk + chips-rij: hoeveel categorieën hebben
// minstens één geboekte leverancier, uit hoeveel beheerde categorieën in totaal.
export function CategorieVoortgang({ vendors, categorieen }: CategorieVoortgangProps) {
  const geboektAantal = React.useMemo(() => {
    const geboekt = new Set(
      vendors
        .filter((v) => v.status === 'geboekt')
        .map((v) => categorieVoorWeergave(v.type, categorieen))
    )
    return categorieen.filter((c) => geboekt.has(c)).length
  }, [vendors, categorieen])

  return (
    <p className="mb-4 text-sm text-muted-foreground">
      {geboektAantal} van {categorieen.length} categorieën geboekt
    </p>
  )
}
