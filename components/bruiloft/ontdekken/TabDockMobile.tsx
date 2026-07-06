'use client'

import * as React from 'react'
import { Minus, X } from 'lucide-react'

import { getCategorieIcoon } from '@/components/bruiloft/leveranciers/categorieIcoon'
import { useOntdekTabs } from './OntdekTabsContext'
import { TabPanelInhoud } from './TabPanelInhoud'

// Mobiel: een uitgeklapte leverancier neemt vrijwel het hele scherm in
// (zelfde bottom-sheet-idioom als de AI-assistent), geminimaliseerde
// leveranciers worden compacte chips in een horizontaal scrollende strip
// vlak boven de onderste navigatiebalk. Bewust maar één tegelijk uitgeklapt
// — meerdere zwevende vensters past niet op een telefoonscherm.
export function TabDockMobile() {
  const { tabs, expandTab, minimizeTab, closeTab } = useOntdekTabs()
  const uitgeklapt = tabs.find((t) => t.status === 'expanded')
  const geminimaliseerd = tabs.filter((t) => t.status !== 'expanded')
  const IcoonUitgeklapt = uitgeklapt ? getCategorieIcoon(uitgeklapt.business.categorie) : null

  // Lichaam vergrendelen zolang de sheet (bijna) het hele scherm dekt —
  // zelfde aanpak als de AI-assistent en de gedeelde Modal.
  React.useEffect(() => {
    if (!uitgeklapt) return
    const vorige = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = vorige
    }
  }, [uitgeklapt])

  // Swipe omlaag minimaliseert (net als de bottom-sheet-modal) i.p.v. sluiten
  // — de leverancier blijft bereikbaar als chip, niets gaat verloren.
  const swipeStartY = React.useRef(0)
  const [swipeY, setSwipeY] = React.useState(0)
  const onHandleTouchStart = (e: React.TouchEvent) => {
    swipeStartY.current = e.touches[0].clientY
  }
  const onHandleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - swipeStartY.current
    if (delta > 0) setSwipeY(delta)
  }
  const onHandleTouchEnd = (id: string) => {
    if (swipeY > 80) minimizeTab(id)
    setSwipeY(0)
  }

  return (
    <>
      {uitgeklapt ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="animate-overlay-in absolute inset-0 bg-rhino-950/30"
            aria-hidden
            onClick={() => minimizeTab(uitgeklapt.business.id)}
          />
          <div
            role="region"
            aria-label={`Details van ${uitgeklapt.business.naam}`}
            style={{
              transform: swipeY > 0 ? `translateY(${swipeY}px)` : undefined,
              transition: swipeY === 0 ? 'transform 200ms ease' : undefined,
            }}
            className="animate-sheet-in absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-2xl bg-card shadow-xl"
          >
            <div
              aria-hidden
              className="-mb-2 flex w-full shrink-0 justify-center py-2.5"
              onTouchStart={onHandleTouchStart}
              onTouchMove={onHandleTouchMove}
              onTouchEnd={() => onHandleTouchEnd(uitgeklapt.business.id)}
            >
              <div className="h-1.5 w-10 rounded-full bg-border" />
            </div>
            <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 pb-3">
              {IcoonUitgeklapt ? (
                <IcoonUitgeklapt className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : null}
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {uitgeklapt.business.naam}
              </span>
              <button
                type="button"
                aria-label="Minimaliseren"
                onClick={() => minimizeTab(uitgeklapt.business.id)}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Minus className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Sluiten"
                onClick={() => closeTab(uitgeklapt.business.id)}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TabPanelInhoud business={uitgeklapt.business} />
            </div>
          </div>
        </div>
      ) : null}

      {geminimaliseerd.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(52px+env(safe-area-inset-bottom))] z-30 lg:hidden">
          <div className="pointer-events-auto flex gap-2 overflow-x-auto px-3 py-2">
            {geminimaliseerd.map((tab) => {
              const Icoon = getCategorieIcoon(tab.business.categorie)
              return (
                <div
                  key={tab.business.id}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card py-1.5 pl-3 pr-1.5 shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => expandTab(tab.business.id)}
                    aria-label={`${tab.business.naam} openen`}
                    className="flex items-center gap-1.5"
                  >
                    <Icoon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    <span className="max-w-[9rem] truncate text-xs font-medium text-foreground">
                      {tab.business.naam}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`${tab.business.naam} sluiten`}
                    onClick={() => closeTab(tab.business.id)}
                    className="rounded-full p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </>
  )
}
