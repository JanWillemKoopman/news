'use client'

import * as React from 'react'

import { ScrollContainerContext } from '@/lib/bruiloft/scroll-context'
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

// Houdt bij of het element (de header) in beeld is via scroll-events op de
// container. IntersectionObserver met custom root werkt niet betrouwbaar in
// alle browsers wanneer de container een div is i.p.v. het venster.
function useElementInView(ref: React.RefObject<HTMLElement>) {
  const scrollContainer = React.useContext(ScrollContainerContext)
  const [inView, setInView] = React.useState(true)

  React.useEffect(() => {
    const container = scrollContainer?.current
    if (!container) return

    let rafId: number | null = null
    const check = () => {
      const el = ref.current
      if (!el) return
      // Header is zichtbaar als de onderkant nog boven de bovenkant van de container uitsteekt
      const elBottom = el.getBoundingClientRect().bottom
      const containerTop = container.getBoundingClientRect().top
      setInView(elBottom > containerTop)
      rafId = null
    }
    const handleScroll = () => { if (rafId === null) rafId = requestAnimationFrame(check) }

    check()
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      container.removeEventListener('scroll', handleScroll)
    }
  }, [ref, scrollContainer])

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
