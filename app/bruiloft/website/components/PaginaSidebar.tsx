'use client'

import { Eye, EyeOff, GripVertical } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'
import type { SectieConfig } from '@/lib/bruiloft/types'

export type SectieSleutel =
  | 'home'
  | 'programma'
  | 'dresscode'
  | 'cadeaulijst'
  | 'hotels'
  | 'routebeschrijving'
  | 'contact'
  | 'faq'
  | 'fotos'

export const SECTIES_VOLGORDE: SectieSleutel[] = [
  'home',
  'programma',
  'dresscode',
  'cadeaulijst',
  'hotels',
  'routebeschrijving',
  'contact',
  'faq',
  'fotos',
]

interface Props {
  sectiesConfig: Record<string, SectieConfig>
  actief: SectieSleutel
  onSelecteer: (s: SectieSleutel) => void
  onToggle: (s: SectieSleutel, zichtbaar: boolean) => void
  onHerorden?: (nieuweVolgorde: SectieSleutel[]) => void
}

export function PaginaSidebar({ sectiesConfig, actief, onSelecteer, onToggle, onHerorden }: Props) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const activeButtonRef = React.useRef<HTMLButtonElement>(null)
  const [draggingKey, setDraggingKey] = React.useState<SectieSleutel | null>(null)
  const [dragOverKey, setDragOverKey] = React.useState<SectieSleutel | null>(null)

  // Sort sections by volgorde stored in sectiesConfig; home is always first
  const geordend = React.useMemo(() => {
    const nonHome = SECTIES_VOLGORDE.filter((s) => s !== 'home')
    const sorted = [...nonHome].sort((a, b) => {
      const va = sectiesConfig[a]?.volgorde ?? SECTIES_VOLGORDE.indexOf(a)
      const vb = sectiesConfig[b]?.volgorde ?? SECTIES_VOLGORDE.indexOf(b)
      return va - vb
    })
    return ['home' as SectieSleutel, ...sorted]
  }, [sectiesConfig])

  const zichtbaar = geordend.filter((s) => {
    if (s === 'home') return true
    return sectiesConfig[s]?.zichtbaar !== false
  })
  const verborgen = geordend.filter((s) => {
    if (s === 'home') return false
    return sectiesConfig[s]?.zichtbaar === false
  })

  const naamVan = (s: SectieSleutel) =>
    s === 'home' ? 'Home' : (sectiesConfig[s]?.naam ?? s)

  const isVerborgen = (s: SectieSleutel) =>
    s !== 'home' && sectiesConfig[s]?.zichtbaar === false

  React.useEffect(() => {
    if (activeButtonRef.current && scrollContainerRef.current) {
      activeButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [actief])

  function handleDrop(targetKey: SectieSleutel) {
    if (!draggingKey || draggingKey === targetKey || draggingKey === 'home' || targetKey === 'home') return
    const fromIdx = geordend.indexOf(draggingKey)
    const toIdx = geordend.indexOf(targetKey)
    if (fromIdx === -1 || toIdx === -1) return
    const newOrder = [...geordend]
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, draggingKey)
    onHerorden?.(newOrder)
    setDraggingKey(null)
    setDragOverKey(null)
  }

  return (
    <>
      {/* Mobile: horizontal scrollable pill strip */}
      <div className="w-full overflow-hidden lg:hidden">
        <div ref={scrollContainerRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {geordend.map((s) => {
            const verborgenItem = isVerborgen(s)
            const isActief = actief === s
            return (
              <button
                key={s}
                ref={isActief ? activeButtonRef : undefined}
                type="button"
                onClick={() => onSelecteer(s)}
                className={cn(
                  'flex min-h-[44px] flex-none items-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors',
                  isActief
                    ? 'bg-primary text-primary-foreground'
                    : verborgenItem
                      ? 'bg-muted text-muted-foreground/40'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {naamVan(s)}
                {verborgenItem && <EyeOff className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-60" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Desktop: vertical sidebar with drag-and-drop */}
      <nav className="hidden w-52 shrink-0 flex-col gap-4 border-r border-border pr-4 lg:flex">
        <div>
          <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Actief
          </p>
          <ul className="space-y-0.5">
            {zichtbaar.map((s) => (
              <SidebarRij
                key={s}
                s={s}
                actief={actief}
                naam={naamVan(s)}
                sectiesConfig={sectiesConfig}
                onSelecteer={onSelecteer}
                onToggle={onToggle}
                draggable={s !== 'home'}
                isDragging={draggingKey === s}
                isDragOver={dragOverKey === s && draggingKey !== s && draggingKey !== 'home'}
                onDragStart={() => { setDraggingKey(s); }}
                onDragOver={(e) => { e.preventDefault(); if (s !== draggingKey && s !== 'home') setDragOverKey(s) }}
                onDrop={() => handleDrop(s)}
                onDragEnd={() => { setDraggingKey(null); setDragOverKey(null) }}
              />
            ))}
          </ul>
        </div>
        {verborgen.length > 0 && (
          <div>
            <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Verborgen
            </p>
            <ul className="space-y-0.5">
              {verborgen.map((s) => (
                <SidebarRij
                  key={s}
                  s={s}
                  actief={actief}
                  naam={naamVan(s)}
                  sectiesConfig={sectiesConfig}
                  onSelecteer={onSelecteer}
                  onToggle={onToggle}
                  draggable
                  isDragging={draggingKey === s}
                  isDragOver={dragOverKey === s && draggingKey !== s}
                  onDragStart={() => { setDraggingKey(s) }}
                  onDragOver={(e) => { e.preventDefault(); if (s !== draggingKey) setDragOverKey(s) }}
                  onDrop={() => handleDrop(s)}
                  onDragEnd={() => { setDraggingKey(null); setDragOverKey(null) }}
                />
              ))}
            </ul>
          </div>
        )}
        {onHerorden && (
          <p className="px-3 text-xs text-muted-foreground/60">
            Versleep secties om de volgorde te wijzigen
          </p>
        )}
      </nav>
    </>
  )
}

function SidebarRij({
  s,
  actief,
  naam,
  sectiesConfig,
  onSelecteer,
  onToggle,
  draggable: isDraggable,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  s: SectieSleutel
  actief: SectieSleutel
  naam: string
  sectiesConfig: Record<string, SectieConfig>
  onSelecteer: (s: SectieSleutel) => void
  onToggle: (s: SectieSleutel, zichtbaar: boolean) => void
  draggable?: boolean
  isDragging?: boolean
  isDragOver?: boolean
  onDragStart?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: () => void
  onDragEnd?: () => void
}) {
  return (
    <li
      draggable={isDraggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', s)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.()
      }}
      onDragOver={onDragOver}
      onDrop={(e) => { e.preventDefault(); onDrop?.() }}
      onDragEnd={onDragEnd}
      className={cn(
        'rounded-lg transition-all',
        isDragging ? 'opacity-40' : '',
        isDragOver ? 'bg-primary/8 ring-1 ring-primary/40' : ''
      )}
    >
      <button
        type="button"
        onClick={() => onSelecteer(s)}
        className={cn(
          'group flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors',
          actief === s
            ? 'bg-primary/10 font-medium text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {isDraggable && (
            <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab opacity-30 group-hover:opacity-60" />
          )}
          <span className="truncate">{naam}</span>
        </div>
        {s !== 'home' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(s, !(sectiesConfig[s]?.zichtbaar ?? true))
            }}
            className="ml-2 shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent"
            title={sectiesConfig[s]?.zichtbaar !== false ? 'Verbergen' : 'Tonen'}
          >
            {sectiesConfig[s]?.zichtbaar !== false ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        )}
      </button>
    </li>
  )
}
