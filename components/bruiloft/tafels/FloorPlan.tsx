'use client'

import * as React from 'react'
import {
  Armchair,
  GripVertical,
  Maximize2,
  Minus,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Trash2,
  UserPlus,
  X,
  ZoomIn,
} from 'lucide-react'

import { Button, Input, Select } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import type { Guest, Table } from '@/lib/bruiloft/types'
import {
  GRID,
  STOEL_R,
  autoPosities,
  roteer,
  snap,
  stoelPosities,
  tafelMaat,
  tafelStraal,
  type Punt,
} from './geometry'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2.5

interface View {
  x: number
  y: number
  zoom: number
}

type DragMode =
  | { type: 'pan'; startX: number; startY: number; vx: number; vy: number; moved: boolean }
  | { type: 'tafel'; id: string; dx: number; dy: number; moved: boolean }
  | null

export interface TafelPatch {
  posX?: number | null
  posY?: number | null
  rotatie?: number
}

interface FloorPlanProps {
  tables: Table[]
  guests: Guest[] // zitplaatspool (niet afgemeld)
  kanBewerken: boolean
  onAssign: (guestId: string, tableId: string | null) => void
  onPatchTable: (id: string, patch: TafelPatch) => void
  onEditTable: (t: Table) => void
  onDeleteTable: (t: Table) => void
  onAddTable: () => void
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function initialen(g: Guest): string {
  return `${g.voornaam.charAt(0)}${g.achternaam.charAt(0)}`.toUpperCase()
}

// Interactieve zaal-plattegrond (desktop): tafels vrij verslepen op een
// raster, gasten erop slepen, zoomen en pannen zoals in een ontwerp-tool.
export function FloorPlan({
  tables,
  guests,
  kanBewerken,
  onAssign,
  onPatchTable,
  onEditTable,
  onDeleteTable,
  onAddTable,
}: FloorPlanProps) {
  const svgRef = React.useRef<SVGSVGElement>(null)

  const [view, setView] = React.useState<View>({ x: 0, y: 0, zoom: 1 })
  const viewRef = React.useRef(view)
  viewRef.current = view

  const [selectie, setSelectie] = React.useState<string | null>(null)
  const [liveDrag, setLiveDrag] = React.useState<{ id: string } & Punt | null>(null)
  const [overrides, setOverrides] = React.useState<Record<string, Punt>>({})
  const [dragGast, setDragGast] = React.useState<{ gast: Guest; x: number; y: number } | null>(null)
  const [hoverTafel, setHoverTafel] = React.useState<string | null>(null)
  const [zoekGast, setZoekGast] = React.useState('')
  const dragRef = React.useRef<DragMode>(null)

  // Optimistische posities opruimen zodra de store de nieuwe waarde kent.
  React.useEffect(() => {
    setOverrides((prev) => {
      let veranderd = false
      const next = { ...prev }
      for (const t of tables) {
        const o = next[t.id]
        if (o && t.posX === o.x && t.posY === o.y) {
          delete next[t.id]
          veranderd = true
        }
      }
      return veranderd ? next : prev
    })
  }, [tables])

  const auto = React.useMemo(() => autoPosities(tables), [tables])

  const posVan = React.useCallback(
    (t: Table): Punt => {
      if (liveDrag && liveDrag.id === t.id) return liveDrag
      const o = overrides[t.id]
      if (o) return o
      if (t.posX != null && t.posY != null) return { x: t.posX, y: t.posY }
      return auto.get(t.id) ?? { x: 0, y: 0 }
    },
    [liveDrag, overrides, auto]
  )

  // Actuele posities voor hit-tests vanuit pointer-handlers.
  const positiesRef = React.useRef<{ t: Table; p: Punt }[]>([])
  positiesRef.current = tables.map((t) => ({ t, p: posVan(t) }))

  const gastenPerTafel = React.useMemo(() => {
    const m = new Map<string, Guest[]>()
    for (const g of guests) {
      if (!g.tafelId) continue
      const lijst = m.get(g.tafelId)
      if (lijst) lijst.push(g)
      else m.set(g.tafelId, [g])
    }
    return m
  }, [guests])

  const onverdeeld = React.useMemo(() => guests.filter((g) => !g.tafelId), [guests])

  const naarWereld = React.useCallback((clientX: number, clientY: number): Punt => {
    const rect = svgRef.current?.getBoundingClientRect()
    const v = viewRef.current
    if (!rect) return { x: 0, y: 0 }
    return { x: (clientX - rect.left - v.x) / v.zoom, y: (clientY - rect.top - v.y) / v.zoom }
  }, [])

  const zoomBij = React.useCallback((factor: number, clientX?: number, clientY?: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    setView((v) => {
      const zoom = clamp(v.zoom * factor, MIN_ZOOM, MAX_ZOOM)
      if (!rect || zoom === v.zoom) return { ...v, zoom }
      const px = (clientX ?? rect.left + rect.width / 2) - rect.left
      const py = (clientY ?? rect.top + rect.height / 2) - rect.top
      const wx = (px - v.x) / v.zoom
      const wy = (py - v.y) / v.zoom
      return { zoom, x: px - wx * zoom, y: py - wy * zoom }
    })
  }, [])

  const fit = React.useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const items = positiesRef.current
    if (items.length === 0) {
      setView({ x: rect.width / 2 - 400, y: rect.height / 2 - 300, zoom: 1 })
      return
    }
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const { t, p } of items) {
      const r = tafelStraal(t)
      minX = Math.min(minX, p.x - r)
      minY = Math.min(minY, p.y - r)
      maxX = Math.max(maxX, p.x + r)
      maxY = Math.max(maxY, p.y + r)
    }
    const marge = 60
    const bw = maxX - minX + marge * 2
    const bh = maxY - minY + marge * 2
    const zoom = clamp(Math.min(rect.width / bw, rect.height / bh), MIN_ZOOM, 1.4)
    setView({
      zoom,
      x: rect.width / 2 - ((minX + maxX) / 2) * zoom,
      y: rect.height / 2 - ((minY + maxY) / 2) * zoom,
    })
  }, [])

  // Eerste keer passend in beeld brengen.
  const gefit = React.useRef(false)
  React.useEffect(() => {
    if (gefit.current) return
    gefit.current = true
    const raf = requestAnimationFrame(fit)
    return () => cancelAnimationFrame(raf)
  }, [fit])

  // Wheel: scrollen = pannen, ctrl/cmd+scroll of pinch = zoomen (à la Figma).
  React.useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        zoomBij(Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY)
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomBij])

  // --- Pannen + tafels verslepen (één pointer-statemachine op de svg) -------

  const startTafelDrag = (e: React.PointerEvent, t: Table) => {
    if (e.button !== 0) return
    e.stopPropagation()
    setSelectie(t.id)
    svgRef.current?.focus({ preventScroll: true })
    if (!kanBewerken) return
    const w = naarWereld(e.clientX, e.clientY)
    const p = posVan(t)
    dragRef.current = { type: 'tafel', id: t.id, dx: w.x - p.x, dy: w.y - p.y, moved: false }
    svgRef.current?.setPointerCapture(e.pointerId)
  }

  const startPan = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const v = viewRef.current
    dragRef.current = { type: 'pan', startX: e.clientX, startY: e.clientY, vx: v.x, vy: v.y, moved: false }
    svgRef.current?.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    if (d.type === 'pan') {
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true
      setView((v) => ({ ...v, x: d.vx + dx, y: d.vy + dy }))
    } else {
      const w = naarWereld(e.clientX, e.clientY)
      d.moved = true
      setLiveDrag({ id: d.id, x: snap(w.x - d.dx), y: snap(w.y - d.dy) })
    }
  }

  const onPointerUp = () => {
    const d = dragRef.current
    dragRef.current = null
    if (!d) return
    if (d.type === 'pan') {
      if (!d.moved) setSelectie(null)
      return
    }
    if (d.moved && liveDrag && liveDrag.id === d.id) {
      const { id, x, y } = liveDrag
      setOverrides((prev) => ({ ...prev, [id]: { x, y } }))
      onPatchTable(id, { posX: x, posY: y })
    }
    setLiveDrag(null)
  }

  // --- Toetsenbord: pijlen verplaatsen, Delete verwijdert, Esc deselecteert -

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSelectie(null)
      return
    }
    const t = selectie ? tables.find((x) => x.id === selectie) : undefined
    if (!t || !kanBewerken) return
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      onDeleteTable(t)
      return
    }
    const stap = e.shiftKey ? GRID * 5 : GRID
    const richting: Record<string, Punt> = {
      ArrowUp: { x: 0, y: -stap },
      ArrowDown: { x: 0, y: stap },
      ArrowLeft: { x: -stap, y: 0 },
      ArrowRight: { x: stap, y: 0 },
    }
    const delta = richting[e.key]
    if (!delta) return
    e.preventDefault()
    const p = posVan(t)
    const nieuw = { x: p.x + delta.x, y: p.y + delta.y }
    setOverrides((prev) => ({ ...prev, [t.id]: nieuw }))
    onPatchTable(t.id, { posX: nieuw.x, posY: nieuw.y })
  }

  // --- Gast vanuit het zijpaneel op een tafel slepen -------------------------

  const startGastDrag = (e: React.PointerEvent, gast: Guest) => {
    if (!kanBewerken || e.button !== 0) return
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    setDragGast({ gast, x: e.clientX, y: e.clientY })
  }

  const moveGastDrag = (e: React.PointerEvent) => {
    if (!dragGast) return
    setDragGast({ ...dragGast, x: e.clientX, y: e.clientY })
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      setHoverTafel(null)
      return
    }
    const w = naarWereld(e.clientX, e.clientY)
    const raak = positiesRef.current.find(
      ({ t, p }) => Math.hypot(w.x - p.x, w.y - p.y) <= tafelStraal(t)
    )
    setHoverTafel(raak ? raak.t.id : null)
  }

  const stopGastDrag = () => {
    if (dragGast && hoverTafel) {
      onAssign(dragGast.gast.id, hoverTafel)
      setSelectie(hoverTafel)
    }
    setDragGast(null)
    setHoverTafel(null)
  }

  const geselecteerdeTafel = selectie ? tables.find((t) => t.id === selectie) ?? null : null

  const zichtbareOnverdeeld = React.useMemo(() => {
    const term = zoekGast.trim().toLowerCase()
    if (!term) return onverdeeld
    return onverdeeld.filter((g) =>
      `${g.voornaam} ${g.achternaam}`.toLowerCase().includes(term)
    )
  }, [onverdeeld, zoekGast])

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_19rem]">
      {/* --- Canvas ---------------------------------------------------------- */}
      <div className="relative h-[calc(100dvh-300px)] min-h-[520px] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <svg
          ref={svgRef}
          tabIndex={0}
          role="application"
          aria-label="Plattegrond van de tafelschikking"
          className={cn(
            'h-full w-full touch-none select-none outline-none',
            dragRef.current?.type === 'pan' ? 'cursor-grabbing' : 'cursor-default'
          )}
          onPointerDown={startPan}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <defs>
            <pattern id="raster" width={GRID * 5} height={GRID * 5} patternUnits="userSpaceOnUse">
              <path
                d={`M ${GRID * 5} 0 L 0 0 0 ${GRID * 5}`}
                fill="none"
                className="stroke-foreground/[0.05]"
                strokeWidth={1}
              />
              <circle cx={0} cy={0} r={1.2} className="fill-foreground/10" />
            </pattern>
          </defs>

          <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
            {/* rastervlak ruim rond de inhoud */}
            <rect x={-4000} y={-4000} width={12000} height={12000} fill="url(#raster)" />

            {tables.map((t) => (
              <TafelNode
                key={t.id}
                table={t}
                pos={posVan(t)}
                gasten={gastenPerTafel.get(t.id) ?? []}
                geselecteerd={selectie === t.id}
                dropDoel={hoverTafel === t.id}
                sleepbaar={kanBewerken}
                onPointerDown={(e) => startTafelDrag(e, t)}
              />
            ))}
          </g>
        </svg>

        {/* Zoomknoppen */}
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
          <Button variant="ghost" size="icon" aria-label="Uitzoomen" onClick={() => zoomBij(1 / 1.25)}>
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
            {Math.round(view.zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon" aria-label="Inzoomen" onClick={() => zoomBij(1.25)}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Passend in beeld" onClick={fit}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {kanBewerken ? (
          <div className="absolute right-3 top-3">
            <Button size="sm" onClick={onAddTable}>
              <Plus className="h-4 w-4" /> Tafel
            </Button>
          </div>
        ) : null}

        <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-card/90 px-3 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
          Scroll = verschuiven · {typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl'}+scroll = zoomen · Sleep tafels en gasten
        </p>

        {tables.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <Armchair className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nog geen tafels op de plattegrond.</p>
            {kanBewerken ? (
              <Button onClick={onAddTable}>
                <Plus className="h-4 w-4" /> Eerste tafel toevoegen
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* --- Zijpaneel -------------------------------------------------------- */}
      <aside className="flex max-h-[calc(100dvh-300px)] min-h-[520px] flex-col gap-4">
        {geselecteerdeTafel ? (
          <TafelPaneel
            table={geselecteerdeTafel}
            gasten={gastenPerTafel.get(geselecteerdeTafel.id) ?? []}
            onverdeeld={onverdeeld}
            kanBewerken={kanBewerken}
            onAssign={onAssign}
            onRoteer={() =>
              onPatchTable(geselecteerdeTafel.id, {
                rotatie: ((geselecteerdeTafel.rotatie ?? 0) + 45) % 360,
              })
            }
            onEdit={() => onEditTable(geselecteerdeTafel)}
            onDelete={() => onDeleteTable(geselecteerdeTafel)}
            onSluit={() => setSelectie(null)}
          />
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-3">
            <h2 className="text-sm font-medium text-foreground">
              Onverdeeld{' '}
              <span className="font-normal text-muted-foreground">({onverdeeld.length})</span>
            </h2>
            {onverdeeld.length > 0 ? (
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={zoekGast}
                  onChange={(e) => setZoekGast(e.target.value)}
                  placeholder="Zoek gast…"
                  className="h-8 pl-8 text-sm"
                  aria-label="Zoek onverdeelde gast"
                />
              </div>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {onverdeeld.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Alle gasten zijn ingedeeld. 🎉
              </p>
            ) : zichtbareOnverdeeld.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Geen gasten gevonden.
              </p>
            ) : (
              <ul className="space-y-1">
                {zichtbareOnverdeeld.map((g) => (
                  <li
                    key={g.id}
                    onPointerDown={(e) => startGastDrag(e, g)}
                    onPointerMove={moveGastDrag}
                    onPointerUp={stopGastDrag}
                    className={cn(
                      'flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm text-foreground',
                      kanBewerken && 'cursor-grab touch-none select-none hover:border-border hover:bg-accent',
                      dragGast?.gast.id === g.id && 'opacity-40'
                    )}
                    title={g.dieetwensen || undefined}
                  >
                    {kanBewerken ? (
                      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">
                      {g.voornaam} {g.achternaam}
                      {g.dieetwensen ? <span className="ml-1 text-[10px] opacity-60">🌿</span> : null}
                    </span>
                    {kanBewerken && geselecteerdeTafel ? (
                      <button
                        type="button"
                        aria-label={`${g.voornaam} aan ${geselecteerdeTafel.naam} toevoegen`}
                        title={`Aan ${geselecteerdeTafel.naam} toevoegen`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => onAssign(g.id, geselecteerdeTafel.id)}
                        className="rounded-full p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {kanBewerken && onverdeeld.length > 0 ? (
            <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
              Sleep een gast op een tafel in de plattegrond.
            </p>
          ) : null}
        </div>
      </aside>

      {/* Zwevende "geest" tijdens het slepen van een gast */}
      {dragGast ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-full border border-primary bg-card px-3 py-1 text-sm text-foreground shadow-lg"
          style={{ left: dragGast.x, top: dragGast.y - 8 }}
        >
          {dragGast.gast.voornaam} {dragGast.gast.achternaam}
        </div>
      ) : null}
    </div>
  )
}

// --- Tafel op de plattegrond -------------------------------------------------

function TafelNode({
  table,
  pos,
  gasten,
  geselecteerd,
  dropDoel,
  sleepbaar,
  onPointerDown,
}: {
  table: Table
  pos: Punt
  gasten: Guest[]
  geselecteerd: boolean
  dropDoel: boolean
  sleepbaar: boolean
  onPointerDown: (e: React.PointerEvent) => void
}) {
  const { w, h } = tafelMaat(table)
  const rot = table.rotatie ?? 0
  const stoelen = React.useMemo(
    () => stoelPosities(table).map((p) => roteer(p, rot)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table.vorm, table.capaciteit, rot]
  )
  const vol = gasten.length > table.capaciteit

  const bladKlasse = cn(
    'fill-card transition-[stroke] duration-150',
    dropDoel
      ? 'stroke-emerald-500'
      : geselecteerd
        ? 'stroke-primary'
        : vol
          ? 'stroke-rose-400'
          : 'stroke-foreground/25'
  )
  const bladDikte = dropDoel || geselecteerd ? 3 : 1.5

  return (
    <g
      transform={`translate(${pos.x} ${pos.y})`}
      onPointerDown={onPointerDown}
      className={sleepbaar ? 'cursor-grab' : 'cursor-pointer'}
      style={{ filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.10))' }}
    >
      {/* Zachte aura bij selectie of als drop-doel */}
      {(geselecteerd || dropDoel) && (
        <circle
          r={tafelStraal(table) + 8}
          className={dropDoel ? 'fill-emerald-500/10' : 'fill-primary/5'}
        />
      )}

      <g transform={`rotate(${rot})`}>
        {table.vorm === 'rond' ? (
          <circle r={w / 2} className={bladKlasse} strokeWidth={bladDikte} />
        ) : (
          <rect
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            rx={12}
            className={bladKlasse}
            strokeWidth={bladDikte}
          />
        )}
      </g>

      {/* Stoelen met initialen van de ingedeelde gasten */}
      {stoelen.map((p, i) => {
        const gast = gasten[i]
        return (
          <g key={i} transform={`translate(${p.x} ${p.y})`} className="pointer-events-none">
            <circle
              r={STOEL_R}
              strokeWidth={1.25}
              className={
                gast
                  ? 'fill-primary stroke-primary'
                  : 'fill-background stroke-foreground/20 [stroke-dasharray:3_3]'
              }
            />
            {gast ? (
              <>
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-primary-foreground"
                  fontSize={10}
                  fontWeight={600}
                >
                  {initialen(gast)}
                </text>
                <title>
                  {gast.voornaam} {gast.achternaam}
                  {gast.dieetwensen ? ` · ${gast.dieetwensen}` : ''}
                </title>
              </>
            ) : null}
          </g>
        )
      })}

      {/* Naam en bezetting, altijd horizontaal leesbaar */}
      <text
        textAnchor="middle"
        y={-4}
        fontSize={13}
        fontWeight={600}
        className="pointer-events-none fill-foreground"
      >
        {table.naam}
      </text>
      <text
        textAnchor="middle"
        y={14}
        fontSize={11}
        className={cn('pointer-events-none', vol ? 'fill-rose-500' : 'fill-muted-foreground')}
      >
        {gasten.length}/{table.capaciteit}
      </text>
    </g>
  )
}

// --- Detailpaneel van de geselecteerde tafel ----------------------------------

function TafelPaneel({
  table,
  gasten,
  onverdeeld,
  kanBewerken,
  onAssign,
  onRoteer,
  onEdit,
  onDelete,
  onSluit,
}: {
  table: Table
  gasten: Guest[]
  onverdeeld: Guest[]
  kanBewerken: boolean
  onAssign: (guestId: string, tableId: string | null) => void
  onRoteer: () => void
  onEdit: () => void
  onDelete: () => void
  onSluit: () => void
}) {
  const vol = gasten.length > table.capaciteit
  return (
    <div className="rounded-xl border border-primary/40 bg-card shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b border-border p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{table.naam}</p>
          <p className="text-xs capitalize text-muted-foreground">
            {table.vorm} ·{' '}
            <span className={vol ? 'font-medium text-rose-500' : undefined}>
              {gasten.length}/{table.capaciteit}
            </span>{' '}
            gasten
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          {kanBewerken ? (
            <>
              <Button variant="ghost" size="icon" aria-label="Tafel draaien" onClick={onRoteer}>
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Tafel bewerken" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Tafel verwijderen" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : null}
          <Button variant="ghost" size="icon" aria-label="Paneel sluiten" onClick={onSluit}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-h-56 overflow-y-auto p-2">
        {gasten.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            Nog niemand aan deze tafel.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {gasten.map((g, i) => (
              <li
                key={g.id}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1 text-sm text-foreground',
                  i >= table.capaciteit && 'text-rose-600 dark:text-rose-400'
                )}
              >
                <span className="min-w-0 flex-1 truncate">
                  {g.voornaam} {g.achternaam}
                  {g.dieetwensen ? <span className="ml-1 text-[10px] opacity-60">🌿</span> : null}
                </span>
                {i >= table.capaciteit ? (
                  <span className="text-[10px] uppercase">geen stoel</span>
                ) : null}
                {kanBewerken ? (
                  <button
                    type="button"
                    aria-label={`${g.voornaam} van tafel halen`}
                    onClick={() => onAssign(g.id, null)}
                    className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {kanBewerken && onverdeeld.length > 0 ? (
        <div className="border-t border-border p-2">
          <Select
            aria-label="Gast toevoegen aan tafel"
            value=""
            onChange={(e) => e.target.value && onAssign(e.target.value, table.id)}
            className="h-9 text-xs"
          >
            <option value="">+ Gast toevoegen…</option>
            {onverdeeld.map((g) => (
              <option key={g.id} value={g.id}>
                {g.voornaam} {g.achternaam}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
    </div>
  )
}
