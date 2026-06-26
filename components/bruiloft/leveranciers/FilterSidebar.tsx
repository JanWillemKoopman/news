'use client'

import * as React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { Field, Input, Select } from '@/components/bruiloft/ui'
import { PROVINCIES } from '@/lib/bruiloft/geo'
import type { OntdekFilters } from './FilterSheet'

interface FilterSidebarProps {
  filters: OntdekFilters
  onChange: <K extends keyof OntdekFilters>(key: K, value: OntdekFilters[K]) => void
  onReset: () => void
  aantalActief: number
}

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="border-b border-border pb-4 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-2 text-sm font-semibold text-foreground"
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  )
}

export function FilterSidebar({ filters, onChange, onReset, aantalActief }: FilterSidebarProps) {
  return (
    <aside className="w-56 shrink-0">
      <div className="sticky top-[57px] space-y-0 rounded-lg border border-border bg-background p-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Filters</span>
          {aantalActief > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-primary underline-offset-2 hover:underline"
            >
              Wis alles ({aantalActief})
            </button>
          )}
        </div>

        <div className="space-y-4">
          <FilterSection title="Locatie">
            <Field label="Provincie" htmlFor="fs-provincie">
              <Select
                id="fs-provincie"
                value={filters.provincie}
                onChange={(e) => onChange('provincie', e.target.value)}
              >
                <option value="all">Alle provincies</option>
                {PROVINCIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <Field label="Plaats" htmlFor="fs-plaats">
              <Input
                id="fs-plaats"
                value={filters.plaats}
                onChange={(e) => onChange('plaats', e.target.value)}
                placeholder="Bijv. Utrecht"
              />
            </Field>
          </FilterSection>

          <FilterSection title="Prijs">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Vanaf (€)" htmlFor="fs-prijsmin">
                <Input
                  id="fs-prijsmin"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={filters.prijsMin}
                  onChange={(e) => onChange('prijsMin', e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="Tot (€)" htmlFor="fs-prijsmax">
                <Input
                  id="fs-prijsmax"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={filters.prijsMax}
                  onChange={(e) => onChange('prijsMax', e.target.value)}
                  placeholder="∞"
                />
              </Field>
            </div>
          </FilterSection>

          <FilterSection title="Kenmerken" defaultOpen={false}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={filters.overnachting}
                onChange={(e) => onChange('overnachting', e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Overnachting mogelijk
            </label>
          </FilterSection>
        </div>
      </div>
    </aside>
  )
}
