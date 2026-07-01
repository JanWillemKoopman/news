'use client'

import * as React from 'react'
import { CalendarClock } from 'lucide-react'

import { EmptyState, Select } from '@/components/bruiloft/ui'
import { ScheduleItemCard } from '@/components/bruiloft/draaiboek/ScheduleItemCard'
import { vergelijkTijd } from '@/lib/bruiloft/draaiboek'
import { DRAAIBOEK_ROLLEN } from '@/lib/bruiloft/options'
import type { ScheduleItem } from '@/lib/bruiloft/types'

export type RolFilter = (typeof DRAAIBOEK_ROLLEN)[number] | 'all'

export function filterItems(items: ScheduleItem[], rol: RolFilter, zoek: string): ScheduleItem[] {
  const z = zoek.trim().toLowerCase()
  return items
    .filter((s) => {
      if (rol !== 'all' && !s.betrokkenen.includes(rol)) return false
      if (z) {
        return (
          s.titel.toLowerCase().includes(z) ||
          s.omschrijving?.toLowerCase().includes(z) ||
          s.locatie?.toLowerCase().includes(z)
        )
      }
      return true
    })
    .slice()
    .sort((a, b) => vergelijkTijd(a.tijd, b.tijd))
}

interface DraaiboekColumnsProps {
  items: ScheduleItem[]
  kolommen: number
  kolomFilters: RolFilter[]
  zoek: string
  kanBewerken: boolean
  onEdit: (s: ScheduleItem) => void
  onDelete: (s: ScheduleItem) => void
  onFilterChange: (index: number, rol: RolFilter) => void
}

/**
 * Meerkoloms vergelijkweergave (alleen desktop, lg+). Per kolom een eigen
 * categorie-filter bovenaan; alle kolommen delen één tijd-rail links zodat
 * onderdelen met dezelfde starttijd exact op één horizontale lijn staan.
 */
export function DraaiboekColumns({
  items,
  kolommen,
  kolomFilters,
  zoek,
  kanBewerken,
  onEdit,
  onDelete,
  onFilterChange,
}: DraaiboekColumnsProps) {
  const kolomItems = React.useMemo(
    () =>
      Array.from({ length: kolommen }, (_, i) =>
        filterItems(items, kolomFilters[i] ?? 'all', zoek)
      ),
    [items, kolommen, kolomFilters, zoek]
  )

  // Unie van alle starttijden over de zichtbare kolommen, gesorteerd.
  const tijden = React.useMemo(() => {
    const set = new Set<string>()
    for (const lijst of kolomItems) for (const s of lijst) set.add(s.tijd)
    return Array.from(set).sort(vergelijkTijd)
  }, [kolomItems])

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `4.5rem repeat(${kolommen}, minmax(0, 1fr))`,
  }

  const allesLeeg = kolomItems.every((lijst) => lijst.length === 0)

  return (
    <div className="grid gap-x-4 gap-y-3" style={gridStyle}>
      {/* Header-rij: filter-Select boven elke kolom */}
      <div className="sticky top-24 z-10 self-end bg-background pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Tijd
      </div>
      {Array.from({ length: kolommen }, (_, i) => (
        <div key={`head-${i}`} className="sticky top-24 z-10 bg-background pb-1">
          <Select
            value={kolomFilters[i] ?? 'all'}
            onChange={(e) => onFilterChange(i, e.target.value as RolFilter)}
            className="w-full"
            aria-label={`Filter kolom ${i + 1}`}
          >
            <option value="all">Hele draaiboek</option>
            {DRAAIBOEK_ROLLEN.map((r) => (
              <option key={r} value={r}>
                Alleen {r}
              </option>
            ))}
          </Select>
        </div>
      ))}

      {allesLeeg ? (
        <div className="col-span-full">
          <EmptyState
            icon={CalendarClock}
            titel="Niets voor deze filters"
            beschrijving="Geen onderdelen komen overeen met de gekozen kolomfilters of zoekopdracht."
          />
        </div>
      ) : (
        tijden.map((tijd) => (
          <React.Fragment key={tijd}>
            <div className="pt-1 text-right text-sm font-semibold tabular-nums text-primary">
              {tijd}
            </div>
            {kolomItems.map((lijst, i) => {
              const opTijd = lijst.filter((s) => s.tijd === tijd)
              return (
                <div key={`${tijd}-${i}`} className="space-y-2">
                  {opTijd.map((s) => (
                    <ScheduleItemCard
                      key={s.id}
                      item={s}
                      kanBewerken={kanBewerken}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      showTime={false}
                    />
                  ))}
                </div>
              )
            })}
          </React.Fragment>
        ))
      )}
    </div>
  )
}
