'use client'

import { Check, Link2, Pencil, Trash2 } from 'lucide-react'

import { Button, Card, CardContent, Money } from '@/components/bruiloft/ui'
import {
  effectiefGeoffreerd,
  geboekteLeverancierVoor,
  restBedrag,
  verwachteKost,
} from '@/lib/bruiloft/derived'
import { formatDatumKort } from '@/lib/bruiloft/format'
import { BUDGET_CATEGORIEEN } from '@/lib/bruiloft/options'
import { cn } from '@/lib/utils'
import type { BudgetItem, Vendor } from '@/lib/bruiloft/types'

interface BudgetListProps {
  items: BudgetItem[]
  vendors: Vendor[]
  bevestigdeDaggasten: number
  onEdit: (item: BudgetItem) => void
  onDelete: (item: BudgetItem) => void
  onToggleTerm: (item: BudgetItem, termId: string, betaald: boolean) => void
}

export function BudgetList({
  items,
  vendors,
  bevestigdeDaggasten,
  onEdit,
  onDelete,
  onToggleTerm,
}: BudgetListProps) {
  return (
    <div className="space-y-6">
      {BUDGET_CATEGORIEEN.map((categorie) => {
        const catItems = items.filter((i) => i.categorie === categorie)
        if (catItems.length === 0) return null
        const subtotaal = catItems.reduce((s, i) => s + verwachteKost(i, vendors), 0)
        return (
          <div key={categorie}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h3 className="font-serif text-lg capitalize text-foreground">{categorie}</h3>
              <div className="text-right">
                <Money bedrag={subtotaal} className="text-sm font-semibold text-foreground" />
                {categorie === 'catering' && bevestigdeDaggasten > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    referentie: {bevestigdeDaggasten} bevestigde daggasten
                  </p>
                ) : null}
              </div>
            </div>
            <div className="space-y-3">
              {catItems.map((item) => (
                <BudgetItemRow
                  key={item.id}
                  item={item}
                  vendors={vendors}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleTerm={onToggleTerm}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BudgetItemRow({
  item,
  vendors,
  onEdit,
  onDelete,
  onToggleTerm,
}: {
  item: BudgetItem
  vendors: Vendor[]
  onEdit: (item: BudgetItem) => void
  onDelete: (item: BudgetItem) => void
  onToggleTerm: (item: BudgetItem, termId: string, betaald: boolean) => void
}) {
  const geboekteVendor = geboekteLeverancierVoor(item, vendors)
  const geoffreerd = effectiefGeoffreerd(item, vendors)
  const rest = restBedrag(item, vendors)

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-foreground">
              {item.omschrijving || <span className="capitalize">{item.categorie}</span>}
            </p>
            {geboekteVendor ? (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary">
                <Link2 className="h-3 w-3" /> geoffreerd via {geboekteVendor.naam}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" aria-label="Bewerken" onClick={() => onEdit(item)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Verwijderen"
              onClick={() => onDelete(item)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          <Bedrag label="Geschat" bedrag={item.geschatBedrag} />
          <Bedrag label="Geoffreerd" bedrag={geoffreerd} />
          <Bedrag label="Betaald" bedrag={item.betaaldBedrag} />
          <Bedrag label="Resterend" bedrag={rest} accent={rest > 0} />
        </div>

        {item.betaaltermijnen.length > 0 ? (
          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Betaaltermijnen</p>
            <ul className="space-y-1.5">
              {item.betaaltermijnen.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {t.vervaldatum ? formatDatumKort(t.vervaldatum) : 'Geen datum'}
                  </span>
                  <div className="flex items-center gap-3">
                    <Money bedrag={t.bedrag} className="font-medium text-foreground" />
                    <button
                      type="button"
                      onClick={() => onToggleTerm(item, t.id, !t.betaald)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
                        t.betaald
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-stone-200 text-stone-600 hover:bg-stone-300 dark:bg-stone-700/60 dark:text-stone-300'
                      )}
                    >
                      {t.betaald ? <Check className="h-3 w-3" /> : null}
                      {t.betaald ? 'betaald' : 'markeer betaald'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Bedrag({
  label,
  bedrag,
  accent,
}: {
  label: string
  bedrag: number
  accent?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <Money
        bedrag={bedrag}
        className={cn('text-sm font-semibold', accent ? 'text-primary' : 'text-foreground')}
      />
    </div>
  )
}
