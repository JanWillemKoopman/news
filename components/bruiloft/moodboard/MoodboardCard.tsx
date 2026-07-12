'use client'

import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Link2 } from 'lucide-react'

import { SafeImage } from '@/components/bruiloft/leveranciers/SafeImage'
import { cn } from '@/lib/utils'
import type { MoodBoardItem } from '@/lib/bruiloft/types'

interface MoodboardCardProps {
  item: MoodBoardItem
  kanBewerken: boolean
  onOpen: (item: MoodBoardItem) => void
}

// Eén tegel in het bord. Losse verantwoordelijkheden, geen ambiguïteit
// tussen tikken/slepen: het hele vlak opent de lightbox (tikken/klikken),
// alleen het greep-icoon linksboven is versleepbaar (dnd-kit-listeners
// zitten uitsluitend daarop). Het greepje blijft altijd zichtbaar — op
// mobiel bestaat er geen hover om het te onthullen, dus moet het
// vindbaar zijn zonder aanwijzing. Verwijderen/bewerken gebeurt in de
// lightbox (altijd bereikbaar), niet vanaf de tegel zelf — dat houdt de
// tegel rustig op elk schermformaat, conform de designfilosofie.
export function MoodboardCard({ item, kanBewerken, onOpen }: MoodboardCardProps) {
  const [fotoMislukt, setFotoMislukt] = React.useState(false)
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !kanBewerken })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-muted shadow-sm',
        isDragging && 'z-10 shadow-lg'
      )}
    >
      {/* Onzichtbare, gestretchte knop: zo kan het greepje er los bovenop
          staan zonder een knop-in-een-knop te nestelen (zelfde patroon als
          OntdekCard). z-10 nodig omdat de later-in-de-DOM afbeelding anders
          de klik zou winnen ondanks gelijke stacking-laag. */}
      <button
        type="button"
        onClick={() => onOpen(item)}
        aria-label={item.titel || 'Bekijk inspiratiebeeld'}
        className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />

      {!fotoMislukt ? (
        <SafeImage
          src={item.url}
          alt={item.titel || 'Inspiratiebeeld'}
          fill
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
          onError={() => setFotoMislukt(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
          Kon niet laden
        </div>
      )}

      {/* Onderin: titel (indien gezet) + bron-indicatie — verschijnt over een
          verloop zodat het op elke onderliggende foto leesbaar blijft. */}
      {item.titel || item.bron === 'link' ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6">
          <p className="flex items-center gap-1 truncate text-xs font-medium text-white">
            {item.bron === 'link' ? <Link2 className="h-3 w-3 shrink-0 opacity-80" aria-hidden /> : null}
            <span className="truncate">{item.titel}</span>
          </p>
        </div>
      ) : null}

      {kanBewerken ? (
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          type="button"
          aria-label={`Versleep "${item.titel || 'inspiratiebeeld'}" om te herordenen`}
          className="absolute left-1.5 top-1.5 z-20 flex h-7 w-7 touch-none items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
