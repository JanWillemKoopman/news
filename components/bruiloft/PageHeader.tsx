'use client'

import * as React from 'react'

import { FloatingAddButton } from '@/components/bruiloft/ui'

interface PageHeaderProps {
  titel: string
  beschrijving?: string
  actie?: React.ReactNode
  // Optionele primaire "toevoegen"-actie die ook als zwevende +-knop (FAB)
  // rechtsonder verschijnt zodra de header uit beeld scrolt. Roept dezelfde
  // handler aan als de knop in de header.
  fab?: { label: string; onClick: () => void }
}

// Houdt bij of het element (de header) in beeld is. Start als zichtbaar zodat de
// FAB pas verschijnt nadat er daadwerkelijk voorbij de header is gescrolld. De
// content scrolt binnen een container die het volledige venster vult, dus de
// viewport als observer-root volstaat.
function useElementInView(ref: React.RefObject<HTMLElement>) {
  const [inView, setInView] = React.useState(true)
  React.useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return inView
}

export function PageHeader({ titel, beschrijving, actie, fab }: PageHeaderProps) {
  const headerRef = React.useRef<HTMLDivElement | null>(null)
  const headerInView = useElementInView(headerRef)

  return (
    <>
      <div
        ref={headerRef}
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <h1 className="text-xl font-semibold text-foreground">{titel}</h1>
          {beschrijving ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{beschrijving}</p>
          ) : null}
        </div>
        {actie ? <div className="flex shrink-0 flex-wrap gap-2">{actie}</div> : null}
      </div>
      {fab ? (
        <FloatingAddButton label={fab.label} onClick={fab.onClick} visible={!headerInView} />
      ) : null}
    </>
  )
}
