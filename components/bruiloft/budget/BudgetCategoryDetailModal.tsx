'use client'

import * as React from 'react'
import { Check, Pencil, Store, Trash2 } from 'lucide-react'

import { effectiefGeoffreerd, geboekteLeverancierVoor, restBedrag } from '@/lib/bruiloft/derived'
import type { BudgetWaarschuwing } from '@/lib/bruiloft/derived'
import { formatDatumKort } from '@/lib/bruiloft/format'
import { capFirst, cn } from '@/lib/utils'
import { Button, Modal, Money } from '@/components/bruiloft/ui'
import { VendorAvatar } from './VendorAvatar'
import type { BudgetItem, Vendor } from '@/lib/bruiloft/types'

// Detail-dashboard per categorie — geen simpele tabel maar tabs, geopend via
// de bestaande Modal-primitive (die zichzelf al automatisch als bottom-sheet
// op mobiel gedraagt). Betaalplanning is de standaardtab: dat is waar de
// bestaande item/betaaltermijn-controls wonen.

type Tab = 'betaalplanning' | 'leveranciers' | 'inzichten'

interface BudgetCategoryDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categorie: string | null
  items: BudgetItem[]
  vendors: Vendor[]
  waarschuwingen: BudgetWaarschuwing[]
  onEdit?: (item: BudgetItem) => void
  onDelete?: (item: BudgetItem) => void
  onToggleTerm?: (item: BudgetItem, termId: string, betaald: boolean) => void
}

export function BudgetCategoryDetailModal({
  open,
  onOpenChange,
  categorie,
  items,
  vendors,
  waarschuwingen,
  onEdit,
  onDelete,
  onToggleTerm,
}: BudgetCategoryDetailModalProps) {
  const [tab, setTab] = React.useState<Tab>('betaalplanning')

  React.useEffect(() => {
    if (open) setTab('betaalplanning')
  }, [open])

  if (!categorie) return null

  const catItems = items.filter((i) => i.categorie === categorie)
  const geboekteVendors = Array.from(
    new Map(
      catItems
        .map((item) => geboekteLeverancierVoor(item, vendors))
        .filter((v): v is Vendor => v !== null)
        .map((v) => [v.id, v] as const)
    ).values()
  )
  const catWaarschuwingen = waarschuwingen.filter((w) => w.categorie === categorie)

  const TABS: { key: Tab; label: string }[] = [
    { key: 'betaalplanning', label: 'Betaalplanning' },
    { key: 'leveranciers', label: 'Leveranciers' },
    { key: 'inzichten', label: 'Inzichten' },
  ]

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={capFirst(categorie)}>
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'betaalplanning' ? (
        <div className="space-y-3">
          {catItems.map((item) => (
            <ItemDetail
              key={item.id}
              item={item}
              vendors={vendors}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleTerm={onToggleTerm}
            />
          ))}
        </div>
      ) : tab === 'leveranciers' ? (
        <div className="space-y-2">
          {geboekteVendors.length > 0 ? (
            geboekteVendors.map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <VendorAvatar vendor={v} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{v.naam}</p>
                  <p className="text-xs text-muted-foreground">{capFirst(v.status)}</p>
                </div>
                <Money bedrag={v.geoffreerdBedrag} className="shrink-0 text-sm font-semibold text-foreground" />
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Store className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Nog geen geboekte leverancier gekoppeld aan deze categorie.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {catWaarschuwingen.length > 0 ? (
            catWaarschuwingen.map((w) => (
              <div key={w.id} className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
                {w.bericht}
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Geen bijzonderheden voor deze categorie.
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}

function ItemDetail({
  item,
  vendors,
  onEdit,
  onDelete,
  onToggleTerm,
}: {
  item: BudgetItem
  vendors: Vendor[]
  onEdit?: (item: BudgetItem) => void
  onDelete?: (item: BudgetItem) => void
  onToggleTerm?: (item: BudgetItem, termId: string, betaald: boolean) => void
}) {
  const geboekteVendor = geboekteLeverancierVoor(item, vendors)
  const geoffreerd = effectiefGeoffreerd(item, vendors)
  const rest = restBedrag(item, vendors)

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{item.omschrijving || capFirst(item.categorie)}</p>
          {geboekteVendor ? <p className="text-xs text-primary">via {geboekteVendor.naam}</p> : null}
        </div>
        {(onEdit || onDelete) ? (
          <div className="flex shrink-0 gap-1">
            {onEdit && (
              <Button variant="ghost" size="icon" aria-label="Bewerken" onClick={() => onEdit(item)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" aria-label="Verwijderen" onClick={() => onDelete(item)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        <Bedrag label="Geschat" bedrag={item.geschatBedrag} />
        <Bedrag label="Offerteprijs" bedrag={geoffreerd} />
        <Bedrag label="Betaald" bedrag={item.betaaldBedrag} />
        <Bedrag label="Resterend" bedrag={rest} accent={rest > 0} />
      </div>

      {item.betaaltermijnen.length > 0 ? (
        <div className="mt-3 border-t border-border pt-2">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Betaaltermijnen</p>
          <ul className="space-y-1">
            {item.betaaltermijnen.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-xs text-muted-foreground">
                  {t.vervaldatum ? formatDatumKort(t.vervaldatum) : 'Geen datum'}
                </span>
                <div className="flex items-center gap-2">
                  <Money bedrag={t.bedrag} className="text-xs font-medium text-foreground" />
                  <button
                    type="button"
                    onClick={() => onToggleTerm?.(item, t.id, !t.betaald)}
                    disabled={!onToggleTerm}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors',
                      t.betaald
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : onToggleTerm
                          ? 'bg-stone-200 text-stone-600 hover:bg-stone-300 dark:bg-stone-700/60 dark:text-stone-300'
                          : 'bg-stone-100 text-stone-400 dark:bg-stone-800/40 dark:text-stone-500'
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
    </div>
  )
}

function Bedrag({ label, bedrag, accent }: { label: string; bedrag: number; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <Money bedrag={bedrag} className={cn('text-sm font-semibold', accent ? 'text-primary' : 'text-foreground')} />
    </div>
  )
}
