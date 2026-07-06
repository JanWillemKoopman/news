'use client'

import * as React from 'react'

import type { OntdekBusiness } from '@/lib/bruiloft/discovery/types'

// Tabbladbeheer voor leverancierdetails op /bruiloft/ontdekken — het
// vervangt de vorige centrale popup. Model, geïnspireerd op Gmail's
// minimaliseerbare compose-vensters en Messenger's chat-heads: elke
// geopende leverancier is een tabblad dat uitgeklapt, geminimaliseerd (naar
// een balkje onderin) of gesloten kan zijn. Meerdere tegelijk openstaan
// hoort bij het gebruiksscenario (leveranciers vergelijken zonder de
// resultatenlijst kwijt te raken).
//
// Bewust ruimte-bewust: op desktop passen twee uitgeklapte panelen naast
// elkaar aan de onderkant, op mobiel maar één (de rest minimaliseert
// automatisch — anders passen ze simpelweg niet op het scherm). Dit wordt
// hieronder afgedwongen bij elke open/expand-actie én opnieuw wanneer het
// scherm de breakpoint kruist (bv. resize of rotatie).

export type OntdekTabStatus = 'expanded' | 'minimized'

export interface OntdekTab {
  business: OntdekBusiness
  status: OntdekTabStatus
}

const BREAKPOINT_QUERY = '(min-width: 1024px)' // Tailwind `lg`
const DESKTOP_MAX_EXPANDED = 2
const MOBILE_MAX_EXPANDED = 1
// Zachte bovengrens op het totaal (incl. geminimaliseerd) — voorkomt dat de
// dock na een lange zoeksessie volloopt met tientallen balkjes.
const MAX_TABS = 6

function afdwingenExpansieLimiet(tabs: OntdekTab[], maxExpanded: number): OntdekTab[] {
  let expandedGezien = 0
  return tabs.map((tab) => {
    if (tab.status !== 'expanded') return tab
    expandedGezien += 1
    return expandedGezien <= maxExpanded ? tab : { ...tab, status: 'minimized' as const }
  })
}

interface OntdekTabsContextValue {
  tabs: OntdekTab[]
  // null zolang de viewport-breedte nog niet bekend is (vlak na mount) —
  // voorkomt dat de dock heel even in de verkeerde vorm opflitst.
  isDesktop: boolean | null
  openTab: (business: OntdekBusiness) => void
  expandTab: (id: string) => void
  minimizeTab: (id: string) => void
  closeTab: (id: string) => void
}

const OntdekTabsContext = React.createContext<OntdekTabsContextValue | null>(null)

export function OntdekTabsProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = React.useState<OntdekTab[]>([])
  const [isDesktop, setIsDesktop] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    const mq = window.matchMedia(BREAKPOINT_QUERY)
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const maxExpanded = isDesktop ? DESKTOP_MAX_EXPANDED : MOBILE_MAX_EXPANDED

  // Bij het kruisen van de breakpoint meteen herafdwingen — anders blijven
  // er op mobiele breedte twee panelen uitgeklapt staan tot de volgende
  // open/expand-actie.
  React.useEffect(() => {
    if (isDesktop === null) return
    setTabs((prev) => afdwingenExpansieLimiet(prev, maxExpanded))
    // maxExpanded is afgeleid van isDesktop; alleen op die wijziging reageren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop])

  const openTab = React.useCallback(
    (business: OntdekBusiness) => {
      setTabs((prev) => {
        const zonderDeze = prev.filter((t) => t.business.id !== business.id)
        const nieuw: OntdekTab[] = [{ business, status: 'expanded' }, ...zonderDeze]
        return afdwingenExpansieLimiet(nieuw, maxExpanded).slice(0, MAX_TABS)
      })
    },
    [maxExpanded]
  )

  const expandTab = React.useCallback(
    (id: string) => {
      setTabs((prev) => {
        const tab = prev.find((t) => t.business.id === id)
        if (!tab) return prev
        const zonder = prev.filter((t) => t.business.id !== id)
        const nieuw: OntdekTab[] = [{ ...tab, status: 'expanded' }, ...zonder]
        return afdwingenExpansieLimiet(nieuw, maxExpanded)
      })
    },
    [maxExpanded]
  )

  const minimizeTab = React.useCallback((id: string) => {
    setTabs((prev) => prev.map((t) => (t.business.id === id ? { ...t, status: 'minimized' } : t)))
  }, [])

  const closeTab = React.useCallback((id: string) => {
    setTabs((prev) => prev.filter((t) => t.business.id !== id))
  }, [])

  const value = React.useMemo(
    () => ({ tabs, isDesktop, openTab, expandTab, minimizeTab, closeTab }),
    [tabs, isDesktop, openTab, expandTab, minimizeTab, closeTab]
  )

  return <OntdekTabsContext.Provider value={value}>{children}</OntdekTabsContext.Provider>
}

export function useOntdekTabs(): OntdekTabsContextValue {
  const ctx = React.useContext(OntdekTabsContext)
  if (!ctx) throw new Error('useOntdekTabs moet binnen OntdekTabsProvider gebruikt worden')
  return ctx
}
