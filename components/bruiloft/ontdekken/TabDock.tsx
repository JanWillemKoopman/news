'use client'

import { useOntdekTabs } from './OntdekTabsContext'
import { TabDockDesktop } from './TabDockDesktop'
import { TabDockMobile } from './TabDockMobile'

// Kiest tussen de desktop- en mobiele weergave op basis van de daadwerkelijke
// viewport (niet alleen CSS): zo staat er nooit een verborgen mobiele sheet
// met een actieve scroll-lock te draaien terwijl desktop getoond wordt.
export function TabDock() {
  const { tabs, isDesktop } = useOntdekTabs()
  if (tabs.length === 0 || isDesktop === null) return null
  return isDesktop ? <TabDockDesktop /> : <TabDockMobile />
}
