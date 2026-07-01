'use client'

import * as React from 'react'

import { Button, Field, Input, Modal, useToast } from '@/components/bruiloft/ui'
import { useBruiloftStore } from '@/store/bruiloftStore'

interface TotaalBudgetEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  huidigBudget: number
}

export function TotaalBudgetEditModal({ open, onOpenChange, huidigBudget }: TotaalBudgetEditModalProps) {
  const updateWedding = useBruiloftStore((s) => s.updateWedding)
  const { toast } = useToast()
  const [waarde, setWaarde] = React.useState('')

  React.useEffect(() => {
    if (open) setWaarde(String(huidigBudget || ''))
  }, [open, huidigBudget])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    onOpenChange(false)
    try {
      await updateWedding({ totaalBudget: Number(waarde) || 0 })
      toast({ title: 'Totaalbudget bijgewerkt', variant: 'success' })
    } catch {
      toast({ title: 'Opslaan mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Totaalbudget bewerken">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Totaalbudget (€)" htmlFor="tb-budget">
          <Input
            id="tb-budget"
            type="number"
            min={0}
            step="0.01"
            value={waarde}
            onChange={(e) => setWaarde(e.target.value)}
            required
            autoFocus
          />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button type="submit">Opslaan</Button>
        </div>
      </form>
    </Modal>
  )
}
