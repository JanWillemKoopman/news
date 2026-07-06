'use client'

import { Heart } from 'lucide-react'

import { cn } from '@/lib/utils'

interface HartKnopProps {
  toegevoegd: boolean
  // Alleen zichtbaar voor wie mag bewerken (zelfde regel als de vorige
  // "+ Mijn lijst"-knop) — puur bekijkers zien geen hartje.
  zichtbaar: boolean
  onClick: () => void
}

// Hartje rechtsboven op de afbeelding: bewaren in Mijn lijst. Vervangt de
// eerdere aparte knop onderaan de kaart — één herkenbaar bewaar-icoon,
// consistent op kaart én detailpaneel (DESIGN_PHILOSOPHY: geen dubbele
// UI-elementen voor dezelfde actie).
export function HartKnop({ toegevoegd, zichtbaar, onClick }: HartKnopProps) {
  if (!zichtbaar) return null

  return (
    <button
      type="button"
      aria-label={toegevoegd ? 'Staat in Mijn lijst' : 'Toevoegen aan Mijn lijst'}
      aria-pressed={toegevoegd}
      onClick={(e) => {
        e.stopPropagation()
        if (!toegevoegd) onClick()
      }}
      className={cn(
        'absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-colors',
        toegevoegd
          ? 'bg-white/90 text-rose-600'
          : 'bg-black/35 text-white backdrop-blur-sm hover:bg-black/50'
      )}
    >
      <Heart className={cn('h-[18px] w-[18px]', toegevoegd && 'fill-rose-600')} aria-hidden />
    </button>
  )
}
