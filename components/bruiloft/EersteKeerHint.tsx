'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { Lightbulb, X } from 'lucide-react'

import { useBruiloftStore } from '@/store/bruiloftStore'

// Just-in-time onboarding: een korte, eenmalige "eerste keer hier"-hint per
// module. Verschijnt de eerste keer dat iemand een modulepagina opent en is
// wegklikbaar; daarna verborgen (localStorage per bruiloft + route). Bewust
// géén vooraf-tour: uitleg op het moment dat het telt, zonder iets te blokkeren.
// Eén plek ingehaakt (PageHeader); kiest zelf de juiste tekst op basis van de
// route. Routes zonder hint renderen niets.
const HINTS: Record<string, string> = {
  '/bruiloft/taken':
    'Jullie takenlijst staat op tijdlijn. Vink af wat klaar is, filter op tijdvak en voeg gerust eigen taken toe.',
  '/bruiloft/budget':
    'Houd per onderdeel bij wat je begroot, wat is geoffreerd en wat al betaald is — inclusief aanbetalingen.',
  '/bruiloft/gasten':
    'Voeg gasten toe en houd RSVP’s en dieetwensen bij. Per gast kies je daggast of avondgast.',
  '/bruiloft/tafels':
    'Sleep gasten naar tafels op de plattegrond. Tafels kun je verplaatsen, draaien en van vorm wisselen.',
  '/bruiloft/leveranciers':
    'Verzamel hier jullie leveranciers en hun status, van ‘te bezoeken’ tot ‘geboekt’.',
  '/bruiloft/ontdekken':
    'Ontdek leveranciers die passen bij jullie budget, regio en gezelschap — gerangschikt op jullie profiel.',
  '/bruiloft/draaiboek':
    'Bouw het tijdschema van jullie dag. Later eenvoudig te delen met leveranciers, getuigen en familie.',
  '/bruiloft/website':
    'Maak jullie eigen trouwpagina. Gasten RSVP’en er direct — zonder dat ze een account nodig hebben.',
  '/bruiloft/beheer/leden':
    'Nodig je partner, ceremoniemeester of getuigen uit om mee te plannen, elk met eigen rechten.',
}

export function EersteKeerHint() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const pathname = usePathname()
  const tekst = pathname ? HINTS[pathname] : undefined

  const opslagSleutel =
    wedding && pathname ? `otp:hint-gezien:${wedding.id}:${pathname}` : null

  const [zichtbaar, setZichtbaar] = React.useState(false)

  React.useEffect(() => {
    if (!opslagSleutel || !tekst) {
      setZichtbaar(false)
      return
    }
    try {
      setZichtbaar(localStorage.getItem(opslagSleutel) !== '1')
    } catch {
      setZichtbaar(false)
    }
  }, [opslagSleutel, tekst])

  if (!tekst || !zichtbaar) return null

  const sluit = () => {
    try {
      if (opslagSleutel) localStorage.setItem(opslagSleutel, '1')
    } catch {
      // localStorage niet beschikbaar; hint blijft alleen deze sessie weg.
    }
    setZichtbaar(false)
  }

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p className="flex-1 leading-relaxed text-foreground">{tekst}</p>
      <button
        type="button"
        onClick={sluit}
        aria-label="Tip sluiten"
        className="-m-1 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
