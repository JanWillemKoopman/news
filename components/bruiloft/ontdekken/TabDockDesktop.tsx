'use client'

import { Minus, X } from 'lucide-react'

import { getCategorieIcoon } from '@/components/bruiloft/leveranciers/categorieIcoon'
import { useOntdekTabs } from './OntdekTabsContext'
import { TabPanelInhoud } from './TabPanelInhoud'

// Desktop: geopende leveranciers verschijnen als kleine vensters rechtsonder
// in beeld (zelfde idioom als Gmail's minimaliseerbare compose-vensters) —
// de resultatenlijst erachter blijft zichtbaar en scrollbaar. Geminimaliseerde
// tabbladen worden balkjes die links van de uitgeklapte vensters opstapelen.
export function TabDockDesktop() {
  const { tabs, expandTab, minimizeTab, closeTab } = useOntdekTabs()
  // Oudste eerst renderen zodat de meest recente (en dus vrijwel altijd
  // uitgeklapte) tabbladen aan de rechterkant staan, waar nieuwe bijkomen.
  const geordend = [...tabs].reverse()

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 hidden justify-end gap-3 px-6 lg:flex">
      {geordend.map((tab) => {
        const Icoon = getCategorieIcoon(tab.business.categorie)

        if (tab.status === 'minimized') {
          return (
            <div
              key={tab.business.id}
              className="pointer-events-auto flex h-11 w-56 shrink-0 items-center gap-1.5 rounded-t-lg border border-b-0 border-border bg-card px-2 shadow-md"
            >
              <button
                type="button"
                onClick={() => expandTab(tab.business.id)}
                aria-label={`${tab.business.naam} uitklappen`}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-accent/60"
              >
                <Icoon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {tab.business.naam}
                </span>
              </button>
              <button
                type="button"
                aria-label={`${tab.business.naam} sluiten`}
                onClick={() => closeTab(tab.business.id)}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        }

        return (
          <div
            key={tab.business.id}
            role="region"
            aria-label={`Details van ${tab.business.naam}`}
            className="animate-slide-up pointer-events-auto flex h-[min(34rem,75vh)] w-[380px] shrink-0 flex-col overflow-hidden rounded-t-xl border border-border bg-card shadow-xl"
          >
            <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
              <Icoon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {tab.business.naam}
              </span>
              <button
                type="button"
                aria-label="Minimaliseren"
                onClick={() => minimizeTab(tab.business.id)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Sluiten"
                onClick={() => closeTab(tab.business.id)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TabPanelInhoud business={tab.business} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
