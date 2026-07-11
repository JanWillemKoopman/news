'use client'

// Gedeelde logica voor het bewerken van het website-adres (slug): lokale
// staat, debounced beschikbaarheidscheck en auto-generatie uit de
// partnernamen zolang er nog geen slug gekozen is. Gebruikt door
// WebsiteStatusCard (de enige plek waar gebruikers de URL aanpassen).
import * as React from 'react'

import type { WebsiteContent } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

export type SlugStatus = 'idle' | 'checking' | 'beschikbaar' | 'bezet' | 'ongeldig' | 'leeg'

function maakBaseSlug(naam1: string, naam2: string): string {
  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/[ýÿ]/g, 'y')
      .replace(/[ñ]/g, 'n').replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]/g, '')
  return (normalize(naam1) + normalize(naam2)).slice(0, 45)
}

function valideerSlugFormaat(s: string) {
  return /^[a-z0-9-]{3,50}$/.test(s)
}

export function useSlugBewerker(content: WebsiteContent) {
  const saveWebsiteContent = useBruiloftStore((s) => s.saveWebsiteContent)
  const checkSlugAvailable = useBruiloftStore((s) => s.checkSlugAvailable)
  const wedding = useBruiloftStore((s) => s.wedding)

  const [slug, setSlug] = React.useState(content.slug ?? '')
  const [slugStatus, setSlugStatus] = React.useState<SlugStatus>('idle')
  const slugTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-genereer een slug van de partnernamen als er nog geen is.
  React.useEffect(() => {
    if (content.slug || !wedding) return
    const base = maakBaseSlug(wedding.partner1Naam, wedding.partner2Naam)
    if (base.length < 3) return

    let cancelled = false
    async function vindBeschikbareSlug() {
      const kandidaten = [base, ...Array.from({ length: 9 }, (_, i) => `${base}${i + 1}`)]
      for (const kandidaat of kandidaten) {
        if (cancelled || kandidaat.length > 50) continue
        try {
          const beschikbaar = await checkSlugAvailable(kandidaat)
          if (beschikbaar && !cancelled) {
            setSlug(kandidaat)
            setSlugStatus('beschikbaar')
            await saveWebsiteContent({ slug: kandidaat })
            return
          }
        } catch {
          return
        }
      }
    }
    void vindBeschikbareSlug()
    return () => { cancelled = true }
  }, [content.slug, wedding, checkSlugAvailable, saveWebsiteContent])

  function onSlugWijziging(e: React.ChangeEvent<HTMLInputElement>) {
    const waarde = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    setSlug(waarde)
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current)
    if (waarde.length === 0) {
      setSlugStatus('leeg')
      return
    }
    setSlugStatus('idle')
    if (!valideerSlugFormaat(waarde)) {
      setSlugStatus('ongeldig')
      return
    }
    setSlugStatus('checking')
    slugTimerRef.current = setTimeout(async () => {
      try {
        const beschikbaar = await checkSlugAvailable(waarde)
        if (waarde === content.slug) {
          setSlugStatus('beschikbaar')
        } else {
          setSlugStatus(beschikbaar ? 'beschikbaar' : 'bezet')
        }
        if (beschikbaar || waarde === content.slug) {
          await saveWebsiteContent({ slug: waarde })
        }
      } catch {
        setSlugStatus('idle')
      }
    }, 600)
  }

  const herkomst = typeof window !== 'undefined' ? window.location.origin : ''
  const slugFeedback =
    slugStatus === 'leeg'
      ? 'Vul een website-adres in'
      : slugStatus === 'checking'
        ? 'Beschikbaarheid controleren…'
        : slugStatus === 'bezet'
          ? 'Deze URL is al in gebruik'
          : slugStatus === 'ongeldig'
            ? 'Gebruik kleine letters, cijfers en koppeltekens (min. 3 tekens)'
            : ''

  return { slug, slugStatus, onSlugWijziging, slugFeedback, herkomst }
}
