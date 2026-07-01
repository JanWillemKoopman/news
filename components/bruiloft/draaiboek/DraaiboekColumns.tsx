'use client'

import * as React from 'react'
import { CalendarClock, ChevronDown, X } from 'lucide-react'

import { EmptyState } from '@/components/bruiloft/ui'
import { ScheduleItemCard } from '@/components/bruiloft/draaiboek/ScheduleItemCard'
import { vergelijkTijd } from '@/lib/bruiloft/draaiboek'
import { DRAAIBOEK_ROLLEN } from '@/lib/bruiloft/options'
import { capFirst, cn } from '@/lib/utils'
import type { ScheduleItem } from '@/lib/bruiloft/types'

export type Rol = (typeof DRAAIBOEK_ROLLEN)[number]
/** Lege lijst = geen filter (hele draaiboek); anders alle gekozen betrokkenen. */
export type RolFilter = Rol[]

export function filterItems(items: ScheduleItem[], rollen: RolFilter, zoek: string): ScheduleItem[] {
  const z = zoek.trim().toLowerCase()
  return items
    .filter((s) => {
      if (rollen.length > 0 && !rollen.some((r) => s.betrokkenen.includes(r))) return false
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
  onFilterChange: (index: number, rollen: RolFilter) => void
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
        filterItems(items, kolomFilters[i] ?? [], zoek)
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
      {/* Header-rij: filterknop boven elke kolom */}
      <div className="sticky top-24 z-10 self-end bg-muted pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Tijd
      </div>
      {Array.from({ length: kolommen }, (_, i) => (
        <div key={`head-${i}`} className="sticky top-24 z-10 bg-muted pb-1">
          <RolFilterKnop
            waarde={kolomFilters[i] ?? []}
            onChange={(v) => onFilterChange(i, v)}
            ariaLabel={`Filter kolom ${i + 1}`}
          />
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

function rolFilterLabel(waarde: RolFilter): string {
  if (waarde.length === 0) return 'Hele draaiboek'
  if (waarde.length <= 2) return waarde.map(capFirst).join(', ')
  return `${capFirst(waarde[0])} +${waarde.length - 1}`
}

/**
 * Filterknop + dropdown-paneel met checkboxes, in dezelfde opmaak als de
 * filterknoppen op de takenpagina (bv. "Prioriteit"). In tegenstelling tot
 * die knoppen kunnen hier meerdere betrokkenen tegelijk aan- of uitgevinkt
 * worden i.p.v. één enkele keuze.
 */
export function RolFilterKnop({
  waarde,
  onChange,
  ariaLabel,
}: {
  waarde: RolFilter
  onChange: (v: RolFilter) => void
  ariaLabel: string
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const isActief = waarde.length > 0

  React.useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggleRol = (r: Rol) => {
    onChange(waarde.includes(r) ? waarde.filter((x) => x !== r) : [...waarde, r])
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex h-10 w-full max-w-64 items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors',
          open
            ? 'border-primary/60 bg-primary/10 text-primary'
            : isActief
              ? 'border-primary/30 bg-primary/5 text-foreground hover:bg-muted'
              : 'border-input bg-background text-foreground hover:bg-muted'
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">{rolFilterLabel(waarde)}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-80 w-64 overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-semibold text-foreground">Betrokkenen</span>
            {isActief && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700"
              >
                <X className="h-3 w-3" />
                Wis filter
              </button>
            )}
          </div>
          <div className="py-1">
            {DRAAIBOEK_ROLLEN.map((r) => (
              <label
                key={r}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={waarde.includes(r)}
                  onChange={() => toggleRol(r)}
                  className="h-4 w-4 accent-primary"
                />
                {capFirst(r)}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
