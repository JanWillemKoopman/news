'use client'

import * as React from 'react'
import { Download, PieChart, Plus, Sparkles, Wallet } from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { AIInsightCard } from '@/components/bruiloft/ai/AIInsightCard'
import { AIBudgetAdvies } from '@/components/bruiloft/budget/AIBudgetAdvies'
import { BudgetDistributeModal } from '@/components/bruiloft/budget/BudgetDistributeModal'
import { BudgetItemForm } from '@/components/bruiloft/budget/BudgetItemForm'
import { BudgetList } from '@/components/bruiloft/budget/BudgetList'
import { BudgetSummary } from '@/components/bruiloft/budget/BudgetSummary'
import { Button, ConfirmDialog, EmptyState, OverflowMenu, useToast } from '@/components/bruiloft/ui'
import { downloadCsv } from '@/lib/bruiloft/csv'
import {
  budgetAfwijkingen,
  effectiefGeoffreerd,
  gastTellingen,
  restBedrag,
} from '@/lib/bruiloft/derived'
import { canEdit } from '@/lib/bruiloft/permissions'
import { useMediaQuery } from '@/lib/bruiloft/useMediaQuery'
import { useScrollRestore } from '@/lib/bruiloft/useScrollRestore'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { BudgetItem } from '@/lib/bruiloft/types'

// Introductie en FAQ voor de informatieknop rechtsboven. Inhoud staat op
// volgorde van belangrijk naar minder belangrijk, in de vorm van vragen die
// een gebruiker zich kan stellen.
const budgetInfoIntro = (
  <p>
    Op de <strong>Budget</strong>-pagina houd je grip op alle kosten van jullie
    bruiloft. Je legt per onderdeel vast wat je <em>verwacht</em> uit te geven
    (geschat), wat een leverancier <em>offreert</em> en wat je al hebt{' '}
    <em>betaald</em>. Zo zie je in één oogopslag of je nog binnen jullie
    totaalbudget zit en wat er nog op je afkomt. Hieronder vind je per stap hoe
    alles werkt.
  </p>
)

const budgetInfoFaq = [
  {
    vraag: 'Hoe voeg ik een budgetitem toe?',
    antwoord: (
      <p>
        Klik rechtsboven op <strong>Budgetitem toevoegen</strong> (of op de
        zwevende +-knop wanneer je naar beneden scrolt). Kies een categorie,
        geef een omschrijving en vul het geschatte bedrag in. Heb je al een
        offerte of betaling? Die kun je in hetzelfde scherm meteen invullen.
      </p>
    ),
  },
  {
    vraag: 'Hoe lees ik het overzicht bovenaan?',
    antwoord: (
      <>
        <p>Het blok bovenaan vat jullie hele budget samen:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Voortgang</strong> — het percentage en het bedrag dat je van
            het totaalbudget al hebt betaald.
          </li>
          <li>
            <strong>Geschat</strong> — alles wat je samen verwacht uit te geven.
          </li>
          <li>
            <strong>Nog te betalen</strong> — het geschatte bedrag min wat je al
            betaald hebt.
          </li>
          <li>
            <strong>Resterend budget</strong> — wat er nog over is binnen jullie
            totaalbudget. Kleurt dit oranje (<em>boven budget</em>), dan ligt de
            schatting hoger dan het totaalbudget.
          </li>
        </ul>
      </>
    ),
  },
  {
    vraag: 'Hoe stel ik het totaalbudget in?',
    antwoord: (
      <p>
        Het totaalbudget waar alles tegen wordt afgezet, stel je in op de{' '}
        <strong>Overzicht</strong>-pagina bij de instellingen van jullie
        bruiloft. Pas je het daar aan, dan rekent dit overzicht automatisch
        opnieuw.
      </p>
    ),
  },
  {
    vraag: 'Hoe verdeel ik mijn budget automatisch over categorieën?',
    antwoord: (
      <p>
        Gebruik <strong>Verdeel budget</strong> (via het{' '}
        <strong>···</strong>-menu, of de knop in het lege overzicht). Je
        totaalbudget wordt dan als richtbedrag verdeeld over de gebruikelijke
        categorieën. Handig om snel te starten — je kunt elk bedrag daarna nog
        aanpassen.
      </p>
    ),
  },
  {
    vraag: 'Hoe bekijk of bewerk ik een categorie of item?',
    antwoord: (
      <p>
        Tik op een categorie om hem <strong>uit te klappen</strong> en de losse
        items te zien. Via het potlood- of menu-icoon bij een item kun je het{' '}
        <strong>bewerken</strong> of <strong>verwijderen</strong>. Met de knop{' '}
        <strong>Uitklappen</strong> / <strong>Inklappen</strong> open of sluit je
        alle categorieën in één keer.
      </p>
    ),
  },
  {
    vraag: 'Hoe houd ik deelbetalingen en termijnen bij?',
    antwoord: (
      <p>
        Bij een budgetitem kun je <strong>betaaltermijnen</strong> toevoegen,
        bijvoorbeeld een aanbetaling en een restbedrag. Vink een termijn af
        zodra die betaald is; het betaalde bedrag en de voortgang worden dan
        automatisch bijgewerkt.
      </p>
    ),
  },
  {
    vraag: 'Hoe vind ik snel een bepaalde categorie?',
    antwoord: (
      <p>
        Gebruik het zoekveld <strong>Zoek categorie…</strong> om op naam te
        filteren. Met het filter rechts (<strong>Alle</strong>,{' '}
        <strong>Aandacht</strong>, <strong>Nog te plannen</strong>,{' '}
        <strong>Betaald</strong>) toon je alleen categorieën met een bepaalde
        status — handig om te zien waar nog actie nodig is.
      </p>
    ),
  },
  {
    vraag: 'Wat doet "Analyseer mijn budget"?',
    antwoord: (
      <p>
        Met <strong>Analyseer mijn budget</strong> laat je de AI-assistent
        meekijken. Die signaleert categorieën die opvallen, geeft tips over een
        realistische verdeling en helpt je keuzes maken. Het is advies — jij
        beslist.
      </p>
    ),
  },
  {
    vraag: 'Hoe exporteer ik mijn budget?',
    antwoord: (
      <p>
        Via het <strong>···</strong>-menu kies je{' '}
        <strong>Exporteer budget</strong>. Je downloadt dan een CSV-bestand met
        alle categorieën en bedragen, dat je bijvoorbeeld in Excel of Google
        Sheets kunt openen.
      </p>
    ),
  },
]

export default function BudgetPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const vendors = useBruiloftStore((s) => s.vendors)
  const guests = useBruiloftStore((s) => s.guests)
  const addBudgetItem = useBruiloftStore((s) => s.addBudgetItem)
  const updateBudgetItem = useBruiloftStore((s) => s.updateBudgetItem)
  const deleteBudgetItem = useBruiloftStore((s) => s.deleteBudgetItem)
  const permissions = useBruiloftStore((s) => s.permissions)
  const { toast } = useToast()

  const kanBewerken = canEdit(permissions, 'budget')
  // Op mobiel verhuist "Analyseer mijn budget" naar het overflowmenu om de
  // header op te schonen; op sm+ blijft het een zichtbare knop.
  const isMobile = useMediaQuery('(max-width: 639px)')

  const [formOpen, setFormOpen] = React.useState(false)
  const [editItem, setEditItem] = React.useState<BudgetItem | null>(null)
  const { save: saveScroll, restore: restoreScroll } = useScrollRestore()
  const savedScroll = React.useRef(0)
  const [deleteItem, setDeleteItem] = React.useState<BudgetItem | null>(null)
  const [distributeOpen, setDistributeOpen] = React.useState(false)
  const [adviesOpen, setAdviesOpen] = React.useState(false)

  if (!wedding) return null

  const bevestigdeDaggasten = gastTellingen(guests).bevestigdeDaggasten
  const afwijkingen = budgetAfwijkingen(budgetItems, vendors, wedding)

  const openNieuw = () => {
    savedScroll.current = saveScroll()
    setEditItem(null)
    setFormOpen(true)
  }
  const openBewerk = (item: BudgetItem) => {
    savedScroll.current = saveScroll()
    setEditItem(item)
    setFormOpen(true)
  }

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
          t.id === termId ? { ...t, betaald } : t
        ),
      })
    } catch {
      toast({ title: 'Bijwerken mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-24 min-h-screen">
      <PageHeader
        titel="Budget"
        beschrijving="Houd grip op geschatte, geoffreerde en betaalde bedragen."
        actie={
          <>
            {/* Desktop: "Analyseer mijn budget" als zichtbare outline-knop.
                Op mobiel verborgen en verplaatst naar het overflowmenu. */}
            <Button
              variant="outline"
              onClick={() => setAdviesOpen(true)}
              className="hidden gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 sm:inline-flex"
            >
              <Sparkles className="h-4 w-4" />
              Analyseer mijn budget
            </Button>
            {kanBewerken && (
              <Button onClick={openNieuw}>
                <Plus className="h-4 w-4" /> Budgetitem toevoegen
              </Button>
            )}
            <OverflowMenu
              items={[
                ...(isMobile ? [{ label: 'Analyseer mijn budget', icon: Sparkles, onClick: () => setAdviesOpen(true) }] : []),
                ...(kanBewerken ? [{ label: 'Verdeel budget', icon: PieChart, onClick: () => setDistributeOpen(true) }] : []),
                { label: 'Exporteer budget', icon: Download, onClick: exporteer, disabled: budgetItems.length === 0 },
              ]}
            />
          </>
        }
        info={<PageInfoButton titel="Budget" intro={budgetInfoIntro} faq={budgetInfoFaq} />}
        fab={kanBewerken ? { label: 'Budgetitem toevoegen', onClick: openNieuw } : undefined}
      />

      <AIBudgetAdvies open={adviesOpen} onClose={() => setAdviesOpen(false)} />

      <AIInsightCard sectie="/bruiloft/budget" />

      <div className="mb-6">
        <BudgetSummary items={budgetItems} vendors={vendors} wedding={wedding} />
      </div>

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
        <BudgetList
          items={budgetItems}
          vendors={vendors}
          bevestigdeDaggasten={bevestigdeDaggasten}
          afwijkendeItemIds={afwijkingen.itemIds}
          onEdit={kanBewerken ? openBewerk : undefined}
          onDelete={kanBewerken ? setDeleteItem : undefined}
          onToggleTerm={kanBewerken ? toggleTerm : undefined}
        />
      )}

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
