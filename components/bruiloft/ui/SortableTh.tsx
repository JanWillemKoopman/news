'use client'

import * as React from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

// Sorteericoon in de kolomtitel: neutraal (beide richtingen) als de kolom niet
// actief is, anders een pijl die de huidige richting toont.
function SortIcon({ actief, richting }: { actief: boolean; richting: 'asc' | 'desc' }) {
  if (!actief) return <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
  return richting === 'asc' ? (
    <ArrowUp className="h-3.5 w-3.5 shrink-0" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 shrink-0" />
  )
}

export function SortableTh<K extends string>({
  kolom,
  actief,
  richting,
  onSort,
  children,
}: {
  kolom: K
  actief: boolean
  richting: 'asc' | 'desc'
  onSort: (kolom: K) => void
  children: React.ReactNode
}) {
  return (
    <th scope="col" className="px-4 py-3 font-medium">
      <button
        type="button"
        onClick={() => onSort(kolom)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {children}
        <SortIcon actief={actief} richting={richting} />
      </button>
    </th>
  )
}
