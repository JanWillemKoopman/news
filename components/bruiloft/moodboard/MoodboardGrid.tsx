'use client'

import * as React from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'

import { MoodboardCard } from './MoodboardCard'
import type { MoodBoardItem } from '@/lib/bruiloft/types'

interface MoodboardGridProps {
  items: MoodBoardItem[]
  // Herordenen staat bewust alleen aan in de ongefilterde weergave: anders
  // moet een sleep binnen een categorie-subset ook de positie t.o.v.
  // onzichtbare items uit andere categorieën bepalen — een randgeval dat
  // sneller verrassend dan behulpzaam is. Bij een actief filter toont het
  // bord dezelfde tegels, gewoon zonder greepje.
  kanHerordenen: boolean
  onOpen: (item: MoodBoardItem) => void
  onReorder: (orderedIds: string[]) => void
}

export function MoodboardGrid({ items, kanHerordenen, onOpen, onReorder }: MoodboardGridProps) {
  const [actiefId, setActiefId] = React.useState<string | null>(null)
  // Lokale weergave-volgorde tijdens het slepen — pas bij loslaten committen
  // we naar de store (die op zijn beurt persisteert), zodat elke muisbeweging
  // niet meteen een netwerkcall triggert.
  const [lokaleVolgorde, setLokaleVolgorde] = React.useState<MoodBoardItem[]>(items)
  React.useEffect(() => {
    if (!actiefId) setLokaleVolgorde(items)
  }, [items, actiefId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const ids = lokaleVolgorde.map((i) => i.id)
  const actiefItem = actiefId ? lokaleVolgorde.find((i) => i.id === actiefId) ?? null : null

  const onDragStart = (e: DragStartEvent) => setActiefId(String(e.active.id))

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setLokaleVolgorde((huidig) => {
      const van = huidig.findIndex((i) => i.id === active.id)
      const naar = huidig.findIndex((i) => i.id === over.id)
      if (van === -1 || naar === -1) return huidig
      return arrayMove(huidig, van, naar)
    })
  }

  const onDragEnd = (e: DragEndEvent) => {
    setActiefId(null)
    if (!e.over) return
    onReorder(lokaleVolgorde.map((i) => i.id))
  }

  if (!kanHerordenen) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => (
          <MoodboardCard key={item.id} item={item} kanBewerken={false} onOpen={onOpen} />
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiefId(null)}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {lokaleVolgorde.map((item) => (
            <MoodboardCard key={item.id} item={item} kanBewerken onOpen={onOpen} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {actiefItem ? (
          <div className="aspect-[3/4] scale-105 overflow-hidden rounded-xl border border-border shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={actiefItem.url} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
