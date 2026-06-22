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

// Introductie en FAQ voor de informatieknop rechtsboven. De intro legt de
// waarde van de pagina uit; de FAQ volgt de gebruikersreis (van starten naar
// verdiepen) en staat op volgorde van belangrijk naar minder belangrijk.
const budgetInfoIntro = (
  <div className="space-y-3">
    <p>
      De <strong>Budget</strong>-pagina is jullie financiële kompas voor de
      bruiloft. Per onderdeel leg je vast wat je verwacht uit te geven
      (<strong>geschat</strong>), wat een leverancier vraagt
      (<strong>offerte</strong>) en wat je al hebt <strong>betaald</strong>. Zo
      zie je in één oogopslag of je binnen jullie totaalbudget blijft, wat er
      nog op je afkomt en welke categorieën aandacht nodig hebben.
    </p>
    <p>
      Meer dan een lijstje: koppel je een leverancier, dan telt diens offerte
      automatisch mee. Met betaaltermijnen blijven deadlines in beeld. En de
      AI-planner denkt mee — die vergelijkt je budget met dat van vergelijkbare
      bruiloften, signaleert uitschieters en vergeten posten en wijst je op
      betalingen die eraan komen. Je budget telt ook mee in jullie voortgang in
      de AI Wedding Planner.
    </p>
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <p className="font-semibold text-foreground">Zo begin je</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>
          <strong>Stel je totaalbudget in</strong> — via Overzicht →{' '}
          <em>Bewerken</em>.
        </li>
        <li>
          <strong>Vul je categorieën</strong> — laat automatisch verdelen of
          voeg zelf items toe.
        </li>
        <li>
          <strong>Houd het actueel</strong> — vul offertes en betalingen in en
          koppel je leveranciers.
        </li>
      </ol>
    </div>
  </div>
)

const budgetInfoFaq = [
  {
    vraag: 'Hoe begin ik met mijn budget?',
    antwoord: (
      <p>
        Stel eerst jullie <strong>totaalbudget</strong> in op de{' '}
        <strong>Overzicht</strong>-pagina (via <em>Bewerken</em>). Vul daarna je
        categorieën: laat het budget automatisch verdelen met{' '}
        <strong>Verdeel budget</strong> of voeg zelf items toe met{' '}
        <strong>Budgetitem toevoegen</strong>. Werk het vervolgens bij naarmate
        je offertes ontvangt en betalingen doet.
      </p>
    ),
  },
  {
    vraag: 'Wat betekenen geschat, offerte en betaald?',
    antwoord: (
      <>
        <p>Elk budgetitem werkt met drie bedragen:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Geschat</strong> — jouw eigen inschatting van de kosten,
            vaak nog voordat je offertes hebt.
          </li>
          <li>
            <strong>Offerte</strong> — wat een leverancier daadwerkelijk vraagt.
          </li>
          <li>
            <strong>Betaald</strong> — wat je al hebt overgemaakt.
          </li>
        </ul>
        <p className="mt-2">
          Het verschil tussen geschat en betaald is wat je{' '}
          <strong>nog te betalen</strong> hebt. Zo zie je per onderdeel hoe je
          ervoor staat.
        </p>
      </>
    ),
  },
  {
    vraag: 'Hoe voeg ik een budgetitem toe?',
    antwoord: (
      <p>
        Klik rechtsboven op <strong>Budgetitem toevoegen</strong> (of op de
        zwevende +-knop wanneer je naar beneden scrolt). Kies een categorie,
        geef een omschrijving en vul het geschatte bedrag in. Een offerte,
        betaling of leverancier voeg je toe onder <strong>Meer details</strong>.
      </p>
    ),
  },
  {
    vraag: 'Wat betekenen de bedragen in het overzicht bovenaan?',
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
    vraag: 'Hoe verdeel ik mijn budget automatisch over categorieën?',
    antwoord: (
      <p>
        Gebruik <strong>Verdeel budget</strong> (via het{' '}
        <strong>···</strong>-menu, of de knop in het lege overzicht). Je
        totaalbudget wordt dan als richtbedrag verdeeld over de gebruikelijke
        categorieën, op basis van een standaardverdeling. Handig om snel te
        starten — je kunt elk bedrag daarna nog aanpassen.
      </p>
    ),
  },
  {
    vraag: 'Hoe koppel ik een leverancier aan een budgetitem?',
    antwoord: (
      <p>
        Open een budgetitem en vouw <strong>Meer details</strong> uit. Kies daar
        bij <strong>Gekoppelde leverancier</strong> de juiste leverancier. Staat
        die op <em>«geboekt»</em>, dan telt diens offertebedrag automatisch mee
        als geoffreerd bedrag — je hoeft het dus niet dubbel in te vullen.
      </p>
    ),
  },
  {
    vraag: 'Hoe houd ik betalingen en termijnen bij?',
    antwoord: (
      <p>
        Bij een budgetitem kun je <strong>betaaltermijnen</strong> toevoegen
        (bedrag + vervaldatum), bijvoorbeeld een aanbetaling en een restbedrag.
        Vink een termijn af zodra die betaald is; het betaalde bedrag en de
        voortgang worden dan automatisch bijgewerkt.
      </p>
    ),
  },
  {
    vraag: 'Wat doet de AI met mijn budget?',
    antwoord: (
      <p>
        Met <strong>Analyseer mijn budget</strong> en de AI-adviestegel bovenaan
        denkt de AI-planner met je mee. Die vergelijkt je budget met dat van
        vergelijkbare bruiloften, signaleert categorieën die opvallen of die je
        misschien vergeten bent, en wijst je op betalingen die eraan komen. Het
        is advies — jij beslist.
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
        status. Met <strong>Uitklappen</strong> / <strong>Inklappen</strong> open
        of sluit je alle categorieën in één keer.
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
