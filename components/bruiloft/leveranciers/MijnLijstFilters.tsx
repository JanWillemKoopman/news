'use client'

import { Button, Modal } from '@/components/bruiloft/ui'
import { DropdownFilter, type DropdownFilterOption } from '@/components/bruiloft/leveranciers/DropdownFilter'

interface MijnLijstFiltersProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: string
  onStatus: (value: string) => void
  type: string
  onType: (value: string) => void
  categorieOpties: DropdownFilterOption[]
  statusOpties: DropdownFilterOption[]
}

export function MijnLijstFilters({
  open,
  onOpenChange,
  status,
  onStatus,
  type,
  onType,
  categorieOpties,
  statusOpties,
}: MijnLijstFiltersProps) {
  const wisFilters = () => {
    onStatus('all')
    onType('all')
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Filters">
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Categorie</p>
          <DropdownFilter value={type} onChange={onType} options={categorieOpties} ariaLabel="Filter op categorie" />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Status</p>
          <DropdownFilter value={status} onChange={onStatus} options={statusOpties} ariaLabel="Filter op status" />
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
