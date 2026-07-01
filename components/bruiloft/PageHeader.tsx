'use client'

import * as React from 'react'

import { ScrollContainerContext } from '@/lib/bruiloft/scroll-context'
import { FloatingAddButton, OverflowMenu } from '@/components/bruiloft/ui'
import type { OverflowMenuItem } from '@/components/bruiloft/ui'

interface PageHeaderProps {
  titel: string
  // De ene primaire actie van de pagina (bv. "Taak toevoegen"). Pakt op
  // mobiel de volle breedte, op desktop de normale knopbreedte. Elke andere
  // actie hoort in `meerActies`, niet hier — zo blijft de header overal
  // precies 3 elementen breed (primair · meer · info) i.p.v. een wisselend
  // aantal knoppen dat op mobiel gaat wrappen.
  primaryActie?: React.ReactNode
  // Secundaire acties: altijd gebundeld achter één "•••"-knop.
  meerActies?: OverflowMenuItem[]
  // Optionele ronde informatieknop die uiterst rechtsboven verschijnt.
  info?: React.ReactNode
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

    const check = () => {
      const el = ref.current
      if (!el) return
      // Header is zichtbaar als de onderkant nog boven de bovenkant van de container uitsteekt
      const elBottom = el.getBoundingClientRect().bottom
      const containerTop = container.getBoundingClientRect().top
      setInView(elBottom > containerTop)
    }

    check()
    container.addEventListener('scroll', check, { passive: true })
    return () => container.removeEventListener('scroll', check)
  }, [ref, scrollContainer])

  return inView
}

export function PageHeader({ titel, primaryActie, meerActies, info, fab }: PageHeaderProps) {
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
        </div>
        {primaryActie || meerActies?.length || info ? (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            {primaryActie ? (
              <div className="flex-1 [&>*]:w-full sm:flex-none sm:[&>*]:w-auto">{primaryActie}</div>
            ) : null}
            {meerActies && meerActies.length > 0 ? <OverflowMenu items={meerActies} /> : null}
            {info ? <div className="ml-auto shrink-0 sm:ml-0">{info}</div> : null}
          </div>
        ) : null}
      </div>
      {fab ? (
        <FloatingAddButton label={fab.label} onClick={fab.onClick} visible={!headerInView} />
      ) : null}
    </>
  )
}
