'use client'

import * as React from 'react'

import { Button, Field, Input, Modal, Select } from '@/components/bruiloft/ui'
import { PROVINCIES } from '@/lib/bruiloft/geo'

// Re-export zodat bestaande imports van hier blijven werken.
export { PROVINCIES }

export type OntdekSort = 'match' | 'naam' | 'prijs'

// Alle zoek-/filterstate van de Ontdekken-pagina in één object, zodat het
// paneel in één keer kan toepassen (geen refetch per veld).
export interface OntdekFilters {
  q: string
  categorie: string // 'all' of VendorType
  provincie: string // 'all' of provincienaam
  plaats: string
  prijsMin: string // leeg = geen ondergrens
  prijsMax: string
  buitenTrouwen: boolean
  overnachting: boolean
  sort: OntdekSort
}

export const STANDAARD_FILTERS: OntdekFilters = {
  q: '',
  categorie: 'all',
  provincie: 'all',
  plaats: '',
  prijsMin: '',
  prijsMax: '',
  buitenTrouwen: false,
  overnachting: false,
  sort: 'match',
}

// Telt de filters die in dit paneel leven (voor het badge-getal op de knop).
export function aantalSheetFilters(f: OntdekFilters): number {
  let n = 0
  if (f.provincie !== 'all') n++
  if (f.plaats.trim()) n++
  if (f.prijsMin || f.prijsMax) n++
  if (f.buitenTrouwen) n++
  if (f.overnachting) n++
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
      prijsMin: '',
      prijsMax: '',
      buitenTrouwen: false,
      overnachting: false,
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

        <div className="grid grid-cols-2 gap-3">
          <Field label="Prijs vanaf (min. €)" htmlFor="f-prijsmin">
            <Input
              id="f-prijsmin"
              type="number"
              min={0}
              inputMode="numeric"
              value={lokaal.prijsMin}
              onChange={(e) => set('prijsMin', e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="Prijs vanaf (max. €)" htmlFor="f-prijsmax">
            <Input
              id="f-prijsmax"
              type="number"
              min={0}
              inputMode="numeric"
              value={lokaal.prijsMax}
              onChange={(e) => set('prijsMax', e.target.value)}
              placeholder="10000"
            />
          </Field>
        </div>

        <div className="space-y-2">
          <label className="flex min-h-[2.75rem] cursor-pointer items-center gap-3 rounded-md border border-border px-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={lokaal.buitenTrouwen}
              onChange={(e) => set('buitenTrouwen', e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Buiten trouwen mogelijk
          </label>
          <label className="flex min-h-[2.75rem] cursor-pointer items-center gap-3 rounded-md border border-border px-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={lokaal.overnachting}
              onChange={(e) => set('overnachting', e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Overnachting mogelijk
          </label>
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
              <option value="prijs">Laagste prijs</option>
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
