'use client'

import { Button, Field, Modal, Select } from '@/components/bruiloft/ui'
import { FilterChips } from '@/components/bruiloft/leveranciers/FilterChips'
import { VENDOR_STATUSSEN } from '@/lib/bruiloft/options'
import { capFirst } from '@/lib/utils'

interface MijnLijstFiltersProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: string
  onStatus: (value: string) => void
  type: string
  onType: (value: string) => void
  categorieen: string[]
  statusTellers: Map<string, number>
  totaal: number
}

export function MijnLijstFilters({
  open,
  onOpenChange,
  status,
  onStatus,
  type,
  onType,
  categorieen,
  statusTellers,
  totaal,
}: MijnLijstFiltersProps) {
  const wisFilters = () => {
    onStatus('all')
    onType('all')
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Filters">
      <div className="space-y-5">
        <Field label="Categorie" htmlFor="filter-categorie">
          <Select id="filter-categorie" value={type} onChange={(e) => onType(e.target.value)}>
            <option value="all">Alle categorieën</option>
            {categorieen.map((c) => (
              <option key={c} value={c}>
                {capFirst(c)}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Status</p>
          <FilterChips
            label="Filter op status"
            value={status}
            onChange={onStatus}
            options={[
              { value: 'all', label: 'Alle', count: totaal },
              ...VENDOR_STATUSSEN.map((s) => ({
                value: s,
                label: s,
                count: statusTellers.get(s) ?? 0,
                dimmed: !statusTellers.get(s),
              })),
            ]}
          />
        </div>

        <div className="flex justify-between pt-1">
          <Button variant="ghost" onClick={wisFilters}>
            Wis filters
          </Button>
          <Button onClick={() => onOpenChange(false)}>Sluiten</Button>
        </div>
      </div>
    </Modal>
  )
}
