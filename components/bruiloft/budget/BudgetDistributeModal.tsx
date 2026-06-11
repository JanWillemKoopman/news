'use client'

import * as React from 'react'

import { Button, Input, Modal, Money } from '@/components/bruiloft/ui'
import { budgetVerdelingVoorstel } from '@/lib/bruiloft/derived'
import { capFirst } from '@/lib/utils'
import type { BudgetCategorie, BudgetItem } from '@/lib/bruiloft/types'

interface BudgetDistributeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  totaalBudget: number
  items: BudgetItem[]
  onApply: (regels: { categorie: BudgetCategorie; bedrag: number }[]) => void
}

export function BudgetDistributeModal({
  open,
  onOpenChange,
  totaalBudget,
  items,
  onApply,
}: BudgetDistributeModalProps) {
  const voorstel = React.useMemo(
    () => budgetVerdelingVoorstel(totaalBudget, items),
    [totaalBudget, items]
  )

  const [bedragen, setBedragen] = React.useState<Record<string, number>>({})
  const [gekozen, setGekozen] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    if (open) {
      setBedragen(Object.fromEntries(voorstel.map((r) => [r.categorie, r.bedrag])))
      // Standaard alleen categorieën aanvinken die nog geen item hebben.
      setGekozen(new Set(voorstel.filter((r) => !r.heeftItem).map((r) => r.categorie)))
    }
  }, [open, voorstel])

  const toggle = (categorie: string) =>
    setGekozen((s) => {
      const next = new Set(s)
      if (next.has(categorie)) next.delete(categorie)
      else next.add(categorie)
      return next
    })

  const totaalGekozen = voorstel
    .filter((r) => gekozen.has(r.categorie))
    .reduce((sum, r) => sum + (bedragen[r.categorie] || 0), 0)

  const apply = () => {
    onApply(
      voorstel
        .filter((r) => gekozen.has(r.categorie))
        .map((r) => ({ categorie: r.categorie, bedrag: bedragen[r.categorie] || 0 }))
    )
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Budget automatisch verdelen"
      description="Op basis van je totaalbudget stellen we een richtbedrag per categorie voor. Voor elke aangevinkte categorie maken we een budgetitem aan."
    >
      <div className="space-y-3">
        <div className="max-h-[45vh] space-y-1.5 overflow-y-auto pr-1">
          {voorstel.map((r) => (
            <label
              key={r.categorie}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
            >
              <input
                type="checkbox"
                checked={gekozen.has(r.categorie)}
                onChange={() => toggle(r.categorie)}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              <span className="flex-1 text-sm text-foreground">
                {capFirst(r.categorie)}
                {r.heeftItem ? (
                  <span className="ml-2 text-xs text-muted-foreground">(heeft al een item)</span>
                ) : null}
              </span>
              <Input
                type="number"
                min={0}
                value={bedragen[r.categorie] ?? 0}
                onChange={(e) =>
                  setBedragen((b) => ({ ...b, [r.categorie]: Number(e.target.value) || 0 }))
                }
                className="w-28"
              />
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm">
          <span className="text-muted-foreground">Totaal geselecteerd</span>
          <Money bedrag={totaalGekozen} className="font-semibold text-foreground" />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={apply} disabled={gekozen.size === 0}>
            {gekozen.size} categorie{gekozen.size === 1 ? '' : 'ën'} toevoegen
          </Button>
        </div>
      </div>
    </Modal>
  )
}
