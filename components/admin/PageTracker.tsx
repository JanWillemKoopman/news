'use client'

import { usePathname } from 'next/navigation'
import * as React from 'react'
import { trackEvent } from '@/lib/analytics'

// Registreert een page_view event bij elke navigatie.
export function PageTracker() {
  const pathname = usePathname()

  React.useEffect(() => {
    void trackEvent('page_view', { path: pathname })
  }, [pathname])

  return null
}
