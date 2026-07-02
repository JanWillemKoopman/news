'use client'

import * as React from 'react'

import { Button, Field, Input, Modal, Select } from '@/components/bruiloft/ui'
import { PROVINCIES } from '@/lib/bruiloft/geo'

// Re-export zodat bestaande imports van hier blijven werken.
export { PROVINCIES }

export type OntdekSort = 'match' | 'naam'

// Alle zoek-/filterstate van de Ontdekken-pagina in één object, zodat het
// paneel in één keer kan toepassen (geen refetch per veld).
export interface OntdekFilters {
  q: string
  categorie: string // 'all' of VendorType
  provincie: string // 'all' of provincienaam
  plaats: string
  sort: OntdekSort
}

export const STANDAARD_FILTERS: OntdekFilters = {
  q: '',
  categorie: 'all',
  provincie: 'all',
  plaats: '',
  sort: 'match',
}

// Telt de filters die in dit paneel leven (voor het badge-getal op de knop).
export function aantalSheetFilters(f: OntdekFilters): number {
  let n = 0
  if (f.provincie !== 'all') n++
  if (f.plaats.trim()) n++
  return n
}

interface FilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: OntdekFilters
  onApply: (filters: OntdekFilters) => void
}

// "Meer filters" — dialog op desktop, bottom sheet op mobiel. Wijzigingen
// worden pas toegepast bij "Toon resultaten".
export function FilterSheet({ open, onOpenChange, filters, onApply }: FilterSheetProps) {
  const [lokaal, setLokaal] = React.useState<OntdekFilters>(filters)

  React.useEffect(() => {
    if (open) setLokaal(filters)
  }, [open, filters])

  const set = <K extends keyof OntdekFilters>(key: K, value: OntdekFilters[K]) =>
    setLokaal((f) => ({ ...f, [key]: value }))

  const pasToe = () => {
    onApply(lokaal)
    onOpenChange(false)
  }

  const wis = () => {
    // Alleen de paneel-filters wissen; zoekterm en categorie blijven staan.
    onApply({
      ...lokaal,
      provincie: 'all',
      plaats: '',
    })
    onOpenChange(false)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Filters">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          pasToe()
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Provincie" htmlFor="f-provincie">
            <Select
              id="f-provincie"
              value={lokaal.provincie}
              onChange={(e) => set('provincie', e.target.value)}
            >
              <option value="all">Alle provincies</option>
              {PROVINCIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Plaats" htmlFor="f-plaats">
            <Input
              id="f-plaats"
              value={lokaal.plaats}
              onChange={(e) => set('plaats', e.target.value)}
              placeholder="Bijv. Utrecht"
            />
          </Field>
        </div>

        <div className="sm:hidden">
          <Field label="Sorteren op" htmlFor="f-sort">
            <Select
              id="f-sort"
              value={lokaal.sort}
              onChange={(e) => set('sort', e.target.value as OntdekSort)}
            >
              <option value="match">Beste match voor jullie</option>
              <option value="naam">Naam A-Z</option>
            </Select>
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={wis}>
            Wis filters
          </Button>
          <Button type="submit">Toon resultaten</Button>
        </div>
      </form>
    </Modal>
  )
}
