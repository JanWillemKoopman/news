'use client'

import * as React from 'react'
import { AlertTriangle, Download, PieChart, Plus, Wallet } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { BudgetDistributeModal } from '@/components/bruiloft/budget/BudgetDistributeModal'
import { BudgetItemForm } from '@/components/bruiloft/budget/BudgetItemForm'
import { BudgetList } from '@/components/bruiloft/budget/BudgetList'
import { BudgetSummary } from '@/components/bruiloft/budget/BudgetSummary'
import { Button, ConfirmDialog, EmptyState } from '@/components/bruiloft/ui'
import { downloadCsv } from '@/lib/bruiloft/csv'
import {
  budgetAfwijkingen,
  effectiefGeoffreerd,
  gastTellingen,
  restBedrag,
} from '@/lib/bruiloft/derived'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { BudgetItem } from '@/lib/bruiloft/types'

export default function BudgetPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const vendors = useBruiloftStore((s) => s.vendors)
  const guests = useBruiloftStore((s) => s.guests)
  const addBudgetItem = useBruiloftStore((s) => s.addBudgetItem)
  const updateBudgetItem = useBruiloftStore((s) => s.updateBudgetItem)
  const deleteBudgetItem = useBruiloftStore((s) => s.deleteBudgetItem)

  const [formOpen, setFormOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<BudgetItem | null>(null)
  const [deleteItem, setDeleteItem] = React.useState<BudgetItem | null>(null)
  const [distributeOpen, setDistributeOpen] = React.useState(false)

  if (!wedding) return null

  const bevestigdeDaggasten = gastTellingen(guests).bevestigdeDaggasten
  const afwijkingen = budgetAfwijkingen(budgetItems, vendors, wedding)

  const openNieuw = () => {
    setEditItem(null)
    setFormOpen(true)
  }
  const openBewerk = (item: BudgetItem) => {
    setEditItem(item)
    setFormOpen(true)
  }

  const exporteer = () => {
    const headers = [
      'Categorie',
      'Omschrijving',
      'Geschat',
      'Geoffreerd',
      'Betaald',
      'Resterend',
    ]
    const rows = budgetItems.map((i) => [
      i.categorie,
      i.omschrijving,
      i.geschatBedrag,
      effectiefGeoffreerd(i, vendors),
      i.betaaldBedrag,
      restBedrag(i, vendors),
    ])
    downloadCsv('budget.csv', headers, rows)
  }

  const toggleTerm = (item: BudgetItem, termId: string, betaald: boolean) => {
    void updateBudgetItem(item.id, {
      betaaltermijnen: item.betaaltermijnen.map((t) =>
        t.id === termId ? { ...t, betaald } : t
      ),
    })
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titel="Budget"
        beschrijving="Houd grip op geschatte, geoffreerde en betaalde bedragen."
        actie={
          <>
            <Button variant="outline" onClick={() => setDistributeOpen(true)}>
              <PieChart className="h-4 w-4" /> Verdeel budget
            </Button>
            <Button variant="outline" onClick={exporteer} disabled={budgetItems.length === 0}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button onClick={openNieuw}>
              <Plus className="h-4 w-4" /> Budgetitem
            </Button>
          </>
        }
      />

      {afwijkingen.overBudget ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            De geoffreerde bedragen samen liggen boven het totaalbudget. Bekijk de
            categorieën of pas je budget aan.
          </span>
        </div>
      ) : null}

      <div className="mb-8">
        <BudgetSummary items={budgetItems} vendors={vendors} wedding={wedding} />
      </div>

      {budgetItems.length === 0 ? (
        <EmptyState
          icon={Wallet}
          titel="Nog geen budgetitems"
          beschrijving="Voeg je eerste budgetitem toe om grip te krijgen op de kosten."
          actie={
            <Button onClick={openNieuw}>
              <Plus className="h-4 w-4" /> Budgetitem toevoegen
            </Button>
          }
        />
      ) : (
        <BudgetList
          items={budgetItems}
          vendors={vendors}
          bevestigdeDaggasten={bevestigdeDaggasten}
          afwijkendeItemIds={afwijkingen.itemIds}
          onEdit={openBewerk}
          onDelete={setDeleteItem}
          onToggleTerm={toggleTerm}
        />
      )}

      <BudgetItemForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editItem}
        vendors={vendors}
        onSubmit={(data) => {
          if (editItem) void updateBudgetItem(editItem.id, data)
          else void addBudgetItem(data)
        }}
      />

      <BudgetDistributeModal
        open={distributeOpen}
        onOpenChange={setDistributeOpen}
        totaalBudget={wedding.totaalBudget}
        items={budgetItems}
        onApply={(regels) => {
          for (const r of regels) {
            void addBudgetItem({
              categorie: r.categorie,
              omschrijving: 'Richtbedrag (automatisch)',
              geschatBedrag: r.bedrag,
              geoffreerdBedrag: 0,
              betaaldBedrag: 0,
              betaaltermijnen: [],
            })
          }
        }}
      />

      <ConfirmDialog
        open={deleteItem !== null}
        onOpenChange={(o) => !o && setDeleteItem(null)}
        title="Budgetitem verwijderen?"
        description={
          deleteItem
            ? `Weet je zeker dat je "${deleteItem.omschrijving || deleteItem.categorie}" wilt verwijderen?`
            : undefined
        }
        onConfirm={() => deleteItem && void deleteBudgetItem(deleteItem.id)}
      />
    </div>
  )
}
