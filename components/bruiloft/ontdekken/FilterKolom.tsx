'use client'

import * as React from 'react'
import { SlidersHorizontal } from 'lucide-react'

import { Button, Checkbox, Field, Modal, SearchInput, Select } from '@/components/bruiloft/ui'
import type { OntdekCategorieConfig } from '@/lib/bruiloft/discovery/categorieConfig'

export type OntdekSort = 'afstand' | 'naam'

// Filters náást de resultaten (desktop) of achter één "Filters"-knop
// (mobiel). De geografie (plaats + straal) hoort hier bewust níet bij — die
// staat als belangrijkste filter altijd bovenaan in de zoekbalk.
//
// De inhoud is nu nog voor elke categorie gelijk; zodra per categorie
// filters gedeclareerd worden (categorieConfig.filters), rendert deze kolom
// ze hier onder de vaste velden.

export interface OntdekFilters {
  q: string
  alleenMail: boolean
}

export const LEGE_FILTERS: OntdekFilters = { q: '', alleenMail: false }

export function aantalActieveFilters(f: OntdekFilters): number {
  let n = 0
  if (f.q.trim()) n++
  if (f.alleenMail) n++
  return n
}

interface FilterVeldenProps {
  filters: OntdekFilters
  onChange: (filters: OntdekFilters) => void
  config: OntdekCategorieConfig
  idPrefix: string
}

function FilterVelden({ filters, onChange, config, idPrefix }: FilterVeldenProps) {
  const set = <K extends keyof OntdekFilters>(key: K, value: OntdekFilters[K]) =>
    onChange({ ...filters, [key]: value })

  return (
    <div className="space-y-5">
      <Field label="Zoeken" htmlFor={`${idPrefix}-zoek`}>
        <SearchInput
          id={`${idPrefix}-zoek`}
          value={filters.q}
          onValueChange={(v) => set('q', v)}
          placeholder="Naam of trefwoord…"
          className="bg-background"
        />
      </Field>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
        <Checkbox
          checked={filters.alleenMail}
          onChange={(e) => set('alleenMail', e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Direct offerte aan te vragen
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Alleen leveranciers met een bekend e-mailadres
          </span>
        </span>
      </label>

      {/* Toekomstige categoriefilters (prijs, capaciteit, ...) renderen hier
          zodra ze in categorieConfig.filters gedeclareerd zijn. */}
      {config.filters.length === 0 ? (
        <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
          Meer filters voor {config.categorie.toLowerCase()} — zoals prijsindicatie — volgen
          binnenkort.
        </p>
      ) : null}
    </div>
  )
}

interface FilterKolomProps {
  filters: OntdekFilters
  onChange: (filters: OntdekFilters) => void
  config: OntdekCategorieConfig
}

// Desktop: vaste kolom links van de resultaten.
export function FilterKolom({ filters, onChange, config }: FilterKolomProps) {
  return (
    <aside className="hidden w-60 shrink-0 lg:block" aria-label="Filters">
      {/* top-20 ≈ hoogte van de sticky zoekbalk erboven, zodat de kolom er
          bij het scrollen net onder blijft hangen. */}
      <div className="sticky top-20 rounded-xl border border-border bg-card p-5 shadow-sm">
        <FilterVelden filters={filters} onChange={onChange} config={config} idPrefix="fd" />
      </div>
    </aside>
  )
}

interface MobieleFilterKnopProps extends FilterKolomProps {
  // De sorteerkeuze staat op desktop naast de resultaten; op smalle schermen
  // (waar die select verborgen is) hoort hij in dit paneel thuis.
  sort: OntdekSort
  onSort: (sort: OntdekSort) => void
  afstandMogelijk: boolean
}

// Mobiel: één knop met teller; de velden openen in een dialoog en werken
// daar direct door (zelfde state, geen apart "toepassen"-moment nodig).
export function MobieleFilterKnop({
  filters,
  onChange,
  config,
  sort,
  onSort,
  afstandMogelijk,
}: MobieleFilterKnopProps) {
  const [open, setOpen] = React.useState(false)
  const actief = aantalActieveFilters(filters)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="shrink-0 lg:hidden">
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {actief > 0 ? (
          <span className="rounded-full bg-foreground px-1.5 py-0.5 text-xs font-semibold text-background">
            {actief}
          </span>
        ) : null}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Filters"
        footer={
          <div className="flex justify-end">
            <Button onClick={() => setOpen(false)}>Toon resultaten</Button>
          </div>
        }
      >
        <div className="space-y-5">
          <FilterVelden filters={filters} onChange={onChange} config={config} idPrefix="fm" />
          <div className="border-t border-border pt-4 sm:hidden">
            <Field label="Sorteren op" htmlFor="fm-sort">
              <Select
                id="fm-sort"
                value={sort}
                onChange={(e) => onSort(e.target.value as OntdekSort)}
              >
                <option value="afstand" disabled={!afstandMogelijk}>
                  Dichtstbij eerst
                </option>
                <option value="naam">Naam A–Z</option>
              </Select>
            </Field>
          </div>
        </div>
      </Modal>
    </>
  )
}
