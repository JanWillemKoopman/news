'use client'

import * as React from 'react'
import { Download, PieChart, Plus, Wallet } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { budgetInfo } from '@/components/bruiloft/faqContent'
import { BudgetAffordabilityCheck } from '@/components/bruiloft/budget/BudgetAffordabilityCheck'
import { BudgetAICoachPanel } from '@/components/bruiloft/budget/BudgetAICoachPanel'
import { useBudgetAIAdvies } from '@/components/bruiloft/budget/useBudgetAIAdvies'
import { BudgetBriefing } from '@/components/bruiloft/budget/BudgetBriefing'
import { BudgetCashflowTimeline } from '@/components/bruiloft/budget/BudgetCashflowTimeline'
import { BudgetCategoryDetailModal } from '@/components/bruiloft/budget/BudgetCategoryDetailModal'
import { BudgetCategoryGrid } from '@/components/bruiloft/budget/BudgetCategoryGrid'
import { BudgetDistributeModal } from '@/components/bruiloft/budget/BudgetDistributeModal'
import { BudgetItemForm } from '@/components/bruiloft/budget/BudgetItemForm'
import { Button, ConfirmDialog, EmptyState, useToast } from '@/components/bruiloft/ui'
import { downloadCsv } from '@/lib/bruiloft/csv'
import {
  budgetAfwijkingen,
  budgetBriefingRegels,
  budgetForecast,
  budgetHealthScore,
  budgetTotalen,
  budgetVolgendeActies,
  budgetWaarschuwingen,
  effectiefGeoffreerd,
  gastTellingen,
  restBedrag,
} from '@/lib/bruiloft/derived'
import { canEdit } from '@/lib/bruiloft/permissions'
import { useScrollRestore } from '@/lib/bruiloft/useScrollRestore'
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
  const updateWedding = useBruiloftStore((s) => s.updateWedding)
  const permissions = useBruiloftStore((s) => s.permissions)
  const { toast } = useToast()

  const kanBewerken = canEdit(permissions, 'budget')

  const [formOpen, setFormOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<BudgetItem | null>(null)
  const { save: saveScroll, restore: restoreScroll } = useScrollRestore()
  const savedScroll = React.useRef(0)
  const [deleteItem, setDeleteItem] = React.useState<BudgetItem | null>(null)
  const [distributeOpen, setDistributeOpen] = React.useState(false)
  const [openCategorie, setOpenCategorie] = React.useState<string | null>(null)

  const aiAdvies = useBudgetAIAdvies()

  // Elke afgeleide waarde precies één keer berekend, daarna als props
  // doorgegeven — voorkomt dat 5 componenten hetzelfde opnieuw uitrekenen.
  const bevestigdeDaggasten = wedding ? gastTellingen(guests).bevestigdeDaggasten : 0
  const totalen = React.useMemo(
    () => (wedding ? budgetTotalen(budgetItems, vendors, wedding) : null),
    [budgetItems, vendors, wedding]
  )
  const healthScore = React.useMemo(
    () => (wedding ? budgetHealthScore(budgetItems, vendors, wedding) : null),
    [budgetItems, vendors, wedding]
  )
  const forecast = React.useMemo(
    () => (wedding ? budgetForecast(budgetItems, vendors, wedding) : null),
    [budgetItems, vendors, wedding]
  )
  const volgendeActies = React.useMemo(
    () => (wedding ? budgetVolgendeActies(budgetItems, vendors, wedding) : []),
    [budgetItems, vendors, wedding]
  )
  const waarschuwingen = React.useMemo(
    () => (wedding ? budgetWaarschuwingen(budgetItems, vendors, wedding) : []),
    [budgetItems, vendors, wedding]
  )
  const briefingRegels = React.useMemo(
    () => (wedding && healthScore ? budgetBriefingRegels(budgetItems, wedding, healthScore) : null),
    [budgetItems, wedding, healthScore]
  )
  const afwijkingen = React.useMemo(
    () => (wedding ? budgetAfwijkingen(budgetItems, vendors, wedding) : null),
    [budgetItems, vendors, wedding]
  )

  const openNieuw = React.useCallback(() => {
    savedScroll.current = saveScroll()
    setEditItem(null)
    setFormOpen(true)
  }, [saveScroll])

  const openBewerk = React.useCallback(
    (item: BudgetItem) => {
      savedScroll.current = saveScroll()
      setEditItem(item)
      setFormOpen(true)
    },
    [saveScroll]
  )

  // Lichte paginalokale sneltoetsen i.p.v. een command-menu (zie planning):
  // 'n' nieuw item, '/' focus zoekveld. Geen effect terwijl er getypt wordt.
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isTyping =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (isTyping) return
      if (e.key === '/') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('[data-budget-search]')?.focus()
      } else if (e.key === 'n' && kanBewerken) {
        e.preventDefault()
        openNieuw()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [kanBewerken, openNieuw])

  if (!wedding || !totalen || !healthScore || !forecast || !briefingRegels || !afwijkingen) return null

  const exporteer = () => {
    try {
      const headers = ['Categorie', 'Omschrijving', 'Geschat', 'Offerteprijs', 'Betaald', 'Resterend']
      const rows = budgetItems.map((i) => [
        i.categorie,
        i.omschrijving,
        i.geschatBedrag,
        effectiefGeoffreerd(i, vendors),
        i.betaaldBedrag,
        restBedrag(i, vendors),
      ])
      downloadCsv('budget.csv', headers, rows)
      toast({ title: 'Budget geëxporteerd', description: 'budget.csv is gedownload.', variant: 'success' })
    } catch {
      toast({ title: 'Export mislukt', variant: 'error' })
    }
  }

  const toggleTerm = async (item: BudgetItem, termId: string, betaald: boolean) => {
    try {
      await updateBudgetItem(item.id, {
        betaaltermijnen: item.betaaltermijnen.map((t) =>
          t.id === termId ? { ...t, betaald, betaaldOp: betaald ? new Date().toISOString() : null } : t
        ),
      })
    } catch {
      toast({ title: 'Bijwerken mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  const onEditReserve = async (bedrag: number) => {
    try {
      await updateWedding({ reserveBedrag: bedrag })
      toast({ title: 'Reserve bijgewerkt', variant: 'success' })
    } catch {
      toast({ title: 'Opslaan mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-24 min-h-screen">
      <PageHeader
        titel="Budget"
        actie={
          <>
            {kanBewerken && (
              <Button onClick={openNieuw}>
                <Plus className="h-4 w-4" /> Budgetitem toevoegen
              </Button>
            )}
            {kanBewerken && (
              <Button variant="outline" onClick={() => setDistributeOpen(true)}>
                <PieChart className="h-4 w-4" /> Verdeel budget
              </Button>
            )}
            <Button variant="outline" onClick={exporteer} disabled={budgetItems.length === 0}>
              <Download className="h-4 w-4" /> Exporteren
            </Button>
          </>
        }
        info={<PageInfoButton {...budgetInfo} />}
        fab={kanBewerken ? { label: 'Budgetitem toevoegen', onClick: openNieuw } : undefined}
      />

      <BudgetBriefing
        healthScore={healthScore}
        forecast={forecast}
        regels={briefingRegels}
        volgendeActies={volgendeActies}
        reserveBedrag={wedding.reserveBedrag}
        aiSamenvatting={aiAdvies.advies?.samenvatting}
        kanBewerken={kanBewerken}
        onEditReserve={onEditReserve}
      />

      <BudgetAffordabilityCheck totalen={totalen} reserveBedrag={wedding.reserveBedrag} />

      <BudgetAICoachPanel
        advies={aiAdvies.advies}
        loading={aiAdvies.loading}
        error={aiAdvies.error}
        onRefresh={aiAdvies.refresh}
        waarschuwingenFallback={waarschuwingen}
      />

      <BudgetCashflowTimeline items={budgetItems} variant="compact" />

      {budgetItems.length === 0 ? (
        <EmptyState
          icon={Wallet}
          titel="Nog geen budgetitems"
          beschrijving={
            kanBewerken
              ? 'Laat jullie totaalbudget automatisch verdelen over de gebruikelijke categorieën, of voeg zelf een item toe.'
              : 'Er zijn nog geen budgetitems.'
          }
          actie={
            kanBewerken ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setDistributeOpen(true)}>
                  <PieChart className="h-4 w-4" /> Vul een richtverdeling in
                </Button>
                <Button variant="outline" onClick={openNieuw}>
                  <Plus className="h-4 w-4" /> Zelf toevoegen
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <BudgetCategoryGrid
          items={budgetItems}
          vendors={vendors}
          wedding={wedding}
          bevestigdeDaggasten={bevestigdeDaggasten}
          afwijkendeItemIds={afwijkingen.itemIds}
          onOpenCategorie={setOpenCategorie}
        />
      )}

      <BudgetCategoryDetailModal
        open={openCategorie !== null}
        onOpenChange={(o) => !o && setOpenCategorie(null)}
        categorie={openCategorie}
        items={budgetItems}
        vendors={vendors}
        waarschuwingen={waarschuwingen}
        onEdit={kanBewerken ? openBewerk : undefined}
        onDelete={kanBewerken ? setDeleteItem : undefined}
        onToggleTerm={kanBewerken ? toggleTerm : undefined}
      />

      <BudgetItemForm
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o)
          if (!o) restoreScroll(savedScroll.current)
        }}
        initial={editItem}
        vendors={vendors}
        onSubmit={async (data) => {
          try {
            if (editItem) {
              await updateBudgetItem(editItem.id, data)
              toast({ title: 'Budgetitem bijgewerkt', variant: 'success' })
            } else {
              await addBudgetItem(data)
              toast({ title: 'Budgetitem toegevoegd', variant: 'success' })
            }
          } catch (e) {
            toast({ title: 'Opslaan mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
            throw e
          }
        }}
      />

      <BudgetDistributeModal
        open={distributeOpen}
        onOpenChange={setDistributeOpen}
        totaalBudget={wedding.totaalBudget}
        items={budgetItems}
        onApply={async (regels) => {
          try {
            for (const r of regels) {
              await addBudgetItem({
                categorie: r.categorie,
                omschrijving: 'Richtbedrag (automatisch)',
                geschatBedrag: r.bedrag,
                geoffreerdBedrag: 0,
                betaaldBedrag: 0,
                betaaltermijnen: [],
              })
            }
            if (regels.length > 0) {
              toast({
                title: 'Budget verdeeld',
                description: `${regels.length} categorie${regels.length === 1 ? '' : 'ën'} toegevoegd.`,
                variant: 'success',
              })
            }
          } catch {
            toast({ title: 'Verdelen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
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
        onConfirm={async () => {
          if (!deleteItem) return
          try {
            await deleteBudgetItem(deleteItem.id)
            toast({ title: 'Budgetitem verwijderd', variant: 'success' })
          } catch {
            toast({ title: 'Verwijderen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
          }
        }}
      />
    </div>
  )
}
