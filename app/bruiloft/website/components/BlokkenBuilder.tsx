'use client'

// Blokken-editor van de trouwwebsite (website v3). Toont de blokken van de
// Home-pagina als accordion: herordenen (drag & drop), tonen/verbergen,
// toevoegen, verwijderen en per blok een inspector met inhouds- en
// weergavevelden. Alle wijzigingen gaan via onChange naar de pagina, die
// ze debounced opslaat en direct doorschuift naar de live preview.

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  CalendarDays,
  Camera,
  ChevronDown,
  Clock,
  Gift,
  GripVertical,
  HelpCircle,
  Image as ImageIcon,
  LayoutTemplate,
  Minus,
  Phone,
  Plus,
  Trash2,
  Type,
} from 'lucide-react'
import * as React from 'react'

import { Button, Input, Textarea } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import type {
  Block,
  BlockLayout,
  BlockType,
  FaqBlock,
  GalerijBlock,
} from '@/lib/bruiloft/websiteBlocks'
import { BLOCK_TYPE_LABELS, TOEVOEGBARE_TYPES, maakBlock, nieuwBlockId } from '@/lib/bruiloft/websiteBlocks'
import { createClient } from '@/lib/supabase/client'
import { uploadWeddingMedia } from '@/lib/supabase/storage'
import { useBruiloftStore } from '@/store/bruiloftStore'

import { FotoUpload } from './FotoUpload'

const BLOCK_ICONS: Record<BlockType, React.ElementType> = {
  hero: ImageIcon,
  tekst: Type,
  tekstFoto: LayoutTemplate,
  programma: CalendarDays,
  countdown: Clock,
  galerij: Camera,
  faq: HelpCircle,
  cadeaulijst: Gift,
  contact: Phone,
  scheiding: Minus,
}

const ACHTERGROND_SWATCHES: { waarde: string; label: string }[] = [
  { waarde: 'transparant', label: 'Standaard' },
  { waarde: '#ffffff', label: 'Wit' },
  { waarde: '#f5f5f0', label: 'Crème' },
  { waarde: '#fdf0f5', label: 'Zachtroze' },
  { waarde: '#f0f7f0', label: 'Zachtgroen' },
  { waarde: '#f0f5fd', label: 'Lichtblauw' },
  { waarde: '#fdf5e8', label: 'Champagne' },
  { waarde: '#2d2d2d', label: 'Donker' },
]

function isDonker(hex: string): boolean {
  if (!hex || hex === 'transparant') return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 < 128
}

function blokNaam(b: Block): string {
  if ('titel' in b && b.titel) return b.titel
  return BLOCK_TYPE_LABELS[b.type]
}

interface Props {
  blocks: Block[]
  onChange: (next: Block[]) => void
}

export function BlokkenBuilder({ blocks, onChange }: Props) {
  const [openBlokId, setOpenBlokId] = React.useState<string | null>(null)
  const [dragId, setDragId] = React.useState<string | null>(null)
  const [dragOverId, setDragOverId] = React.useState<string | null>(null)
  const [toevoegOpen, setToevoegOpen] = React.useState(false)

  function wijzig(id: string, patch: Partial<Block>) {
    onChange(blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)))
  }

  function verwijder(id: string) {
    onChange(blocks.filter((b) => b.id !== id))
    if (openBlokId === id) setOpenBlokId(null)
  }

  function voegToe(type: BlockType) {
    const blok = maakBlock(type)
    onChange([...blocks, blok])
    setToevoegOpen(false)
    setOpenBlokId(blok.id)
  }

  function drop(targetId: string) {
    if (!dragId || dragId === targetId) return
    const heroVast = blocks[0]?.type === 'hero'
    const van = blocks.findIndex((b) => b.id === dragId)
    const naar = blocks.findIndex((b) => b.id === targetId)
    if (van === -1 || naar === -1) return
    // Hero blijft bovenaan: niet verslepen en er niet vóór droppen.
    if (heroVast && (blocks[van].type === 'hero' || naar === 0)) return
    const next = [...blocks]
    const [item] = next.splice(van, 1)
    next.splice(naar, 0, item)
    onChange(next)
    setDragId(null)
    setDragOverId(null)
  }

  const zichtbaarCount = blocks.filter((b) => b.zichtbaar).length

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Blokken</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {zichtbaarCount} van {blocks.length} blokken zichtbaar
          </p>
        </div>
        <p className="hidden text-xs text-muted-foreground sm:block">
          Versleep om volgorde te wijzigen
        </p>
      </div>

      {blocks.map((b, i) => (
        <BlokRij
          key={b.id}
          blok={b}
          isHero={b.type === 'hero'}
          isLast={i === blocks.length - 1 && !toevoegOpen}
          isOpen={openBlokId === b.id}
          isDragging={dragId === b.id}
          isDragOver={dragOverId === b.id && dragId !== b.id}
          onToggleOpen={() => setOpenBlokId(openBlokId === b.id ? null : b.id)}
          onWijzig={(patch) => wijzig(b.id, patch)}
          onVerwijder={() => verwijder(b.id)}
          onDragStart={() => setDragId(b.id)}
          onDragOver={(e) => {
            e.preventDefault()
            if (b.id !== dragId) setDragOverId(b.id)
          }}
          onDrop={() => drop(b.id)}
          onDragEnd={() => {
            setDragId(null)
            setDragOverId(null)
          }}
        />
      ))}

      {/* Blok toevoegen */}
      <div className="border-t border-border px-4 py-3 sm:px-5">
        {toevoegOpen ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Kies een bloktype
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TOEVOEGBARE_TYPES.map((type) => {
                const Icon = BLOCK_ICONS[type]
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => voegToe(type)}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {BLOCK_TYPE_LABELS[type]}
                  </button>
                )
              })}
            </div>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setToevoegOpen(false)}>
              Annuleren
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setToevoegOpen(true)} className="w-full">
            <Plus className="h-4 w-4" /> Blok toevoegen
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Eén blok-rij met inspector ──────────────────────────────────────────────

interface BlokRijProps {
  blok: Block
  isHero: boolean
  isLast: boolean
  isOpen: boolean
  isDragging: boolean
  isDragOver: boolean
  onToggleOpen: () => void
  onWijzig: (patch: Partial<Block>) => void
  onVerwijder: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
}

function BlokRij({
  blok,
  isHero,
  isLast,
  isOpen,
  isDragging,
  isDragOver,
  onToggleOpen,
  onWijzig,
  onVerwijder,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: BlokRijProps) {
  const Icon = BLOCK_ICONS[blok.type]
  const isVerborgen = !blok.zichtbaar

  return (
    <div
      draggable={!isHero}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', blok.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragOver={onDragOver}
      onDrop={(e) => {
        e.preventDefault()
        onDrop()
      }}
      onDragEnd={onDragEnd}
      className={cn(
        !isLast ? 'border-b border-border' : '',
        isDragging ? 'opacity-40' : '',
        isDragOver ? 'bg-primary/5 ring-1 ring-inset ring-primary/30' : ''
      )}
    >
      {/* Rij-header */}
      <div className={cn('flex items-center gap-2.5 px-4 py-3.5 sm:gap-3 sm:px-5', isOpen ? 'bg-muted/20' : '')}>
        <div className="w-5 shrink-0">
          {!isHero && (
            <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground/30 transition-colors hover:text-muted-foreground/70" />
          )}
        </div>

        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
            isOpen ? 'bg-primary/10' : 'bg-muted/60',
            isVerborgen ? 'opacity-40' : ''
          )}
        >
          <Icon className={cn('h-3.5 w-3.5', isOpen ? 'text-primary' : 'text-muted-foreground')} />
        </div>

        <button type="button" onClick={onToggleOpen} className="min-w-0 flex-1 text-left">
          <span className={cn('text-sm font-medium text-foreground transition-opacity', isVerborgen ? 'opacity-40' : '')}>
            {blokNaam(blok)}
          </span>
          <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
            {BLOCK_TYPE_LABELS[blok.type]}
          </span>
        </button>

        {!isHero ? (
          <button
            role="switch"
            aria-checked={blok.zichtbaar}
            onClick={(e) => {
              e.stopPropagation()
              onWijzig({ zichtbaar: !blok.zichtbaar })
            }}
            className={cn(
              'relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              blok.zichtbaar ? 'bg-primary' : 'bg-input'
            )}
            title={blok.zichtbaar ? 'Verbergen' : 'Zichtbaar maken'}
          >
            <span
              className={cn(
                'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200',
                blok.zichtbaar ? 'left-6' : 'left-1'
              )}
            />
          </button>
        ) : (
          <div className="w-12 shrink-0" />
        )}

        <button
          type="button"
          onClick={onToggleOpen}
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={isOpen ? 'Inklappen' : 'Uitklappen'}
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')} />
        </button>
      </div>

      {/* Inspector */}
      {isOpen && (
        <div className="border-t border-border bg-background px-4 py-5 sm:px-5 sm:py-6">
          <BlokInspector blok={blok} onWijzig={onWijzig} />

          {blok.type !== 'hero' && blok.type !== 'scheiding' && (
            <div className="mt-5 border-t border-border pt-5">
              <BlokLayoutVelden
                layout={blok.layout}
                onWijzig={(layout) => onWijzig({ layout })}
              />
            </div>
          )}

          {!isHero && (
            <div className="mt-5 border-t border-border pt-4">
              <Button variant="ghost" size="sm" onClick={onVerwijder} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" /> Blok verwijderen
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Inspector per bloktype ──────────────────────────────────────────────────

function useWeddingUpload() {
  const wedding = useBruiloftStore((s) => s.wedding)
  return React.useCallback(
    async (file: File, subfolder: 'header' | 'gallerij' | 'sectie-fotos') => {
      if (!wedding) throw new Error('Geen actieve bruiloft')
      return uploadWeddingMedia(createClient(), wedding.id, file, subfolder)
    },
    [wedding]
  )
}

function Veld({ label, hulp, children }: { label: string; hulp?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {hulp && <p className="text-xs text-muted-foreground">{hulp}</p>}
      {children}
    </div>
  )
}

function TitelVeld({ waarde, onWijzig }: { waarde: string; onWijzig: (titel: string) => void }) {
  return (
    <Veld label="Bloktitel">
      <Input value={waarde} onChange={(e) => onWijzig(e.target.value)} placeholder="Titel van dit blok…" />
    </Veld>
  )
}

function BlokInspector({ blok, onWijzig }: { blok: Block; onWijzig: (patch: Partial<Block>) => void }) {
  const upload = useWeddingUpload()

  switch (blok.type) {
    case 'hero':
      return (
        <div className="space-y-5">
          <Veld label="Headerfoto" hulp="De grote foto bovenaan jullie trouwwebsite.">
            <FotoUpload
              huidigUrl={blok.fotoUrl}
              onUpload={async (file) => {
                const url = await upload(file, 'header')
                onWijzig({ fotoUrl: url })
              }}
              onVerwijder={blok.fotoUrl ? () => onWijzig({ fotoUrl: '' }) : undefined}
              aanbevolenAfmeting="Aanbevolen: 2400×1600px"
            />
          </Veld>
          {blok.fotoUrl && (
            <Veld label="Donkerte van de foto" hulp="Meer donkerte maakt de namen beter leesbaar.">
              <input
                type="range"
                min={0}
                max={0.8}
                step={0.05}
                value={blok.overlay}
                onChange={(e) => onWijzig({ overlay: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </Veld>
          )}
          <Veld label="Ondertitel" hulp="Optionele regel onder jullie namen.">
            <Input
              value={blok.ondertitel}
              onChange={(e) => onWijzig({ ondertitel: e.target.value })}
              placeholder="Bijv. Wij gaan trouwen!"
            />
          </Veld>
        </div>
      )

    case 'tekst':
      return (
        <div className="space-y-5">
          <TitelVeld waarde={blok.titel} onWijzig={(titel) => onWijzig({ titel })} />
          <Veld label="Tekst">
            <Textarea
              value={blok.tekst}
              onChange={(e) => onWijzig({ tekst: e.target.value })}
              rows={5}
              placeholder="Schrijf hier de inhoud van dit blok…"
            />
          </Veld>
        </div>
      )

    case 'tekstFoto':
      return (
        <div className="space-y-5">
          <TitelVeld waarde={blok.titel} onWijzig={(titel) => onWijzig({ titel })} />
          <Veld label="Tekst">
            <Textarea
              value={blok.tekst}
              onChange={(e) => onWijzig({ tekst: e.target.value })}
              rows={4}
              placeholder="Tekst naast de foto…"
            />
          </Veld>
          <Veld label="Foto">
            <FotoUpload
              huidigUrl={blok.fotoUrl}
              onUpload={async (file) => {
                const url = await upload(file, 'sectie-fotos')
                onWijzig({ fotoUrl: url })
              }}
              onVerwijder={blok.fotoUrl ? () => onWijzig({ fotoUrl: '' }) : undefined}
              label="Foto toevoegen"
            />
          </Veld>
          <Veld label="Fotopositie">
            <div className="flex gap-2">
              {(['links', 'rechts'] as const).map((positie) => (
                <button
                  key={positie}
                  type="button"
                  onClick={() => onWijzig({ fotoPositie: positie })}
                  className={cn(
                    'h-9 rounded-lg border px-4 text-sm capitalize transition-colors',
                    blok.fotoPositie === positie
                      ? 'border-primary bg-primary/10 font-medium text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  {positie}
                </button>
              ))}
            </div>
          </Veld>
        </div>
      )

    case 'programma':
      return (
        <div className="space-y-5">
          <TitelVeld waarde={blok.titel} onWijzig={(titel) => onWijzig({ titel })} />
          <Veld label="Inhoud" hulp="Automatisch: de draaiboek-onderdelen die voor gasten zichtbaar zijn.">
            <div className="flex gap-2">
              {(
                [
                  { val: 'draaiboek', label: 'Uit het draaiboek' },
                  { val: 'eigen', label: 'Eigen tekst' },
                ] as const
              ).map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onWijzig({ bron: val })}
                  className={cn(
                    'h-9 rounded-lg border px-4 text-sm transition-colors',
                    blok.bron === val
                      ? 'border-primary bg-primary/10 font-medium text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </Veld>
          {blok.bron === 'eigen' && (
            <Textarea
              value={blok.eigenTekst}
              onChange={(e) => onWijzig({ eigenTekst: e.target.value })}
              rows={6}
              placeholder="Bijv. 14:00 Ceremonie — 15:00 Receptie — 17:00 Diner…"
            />
          )}
        </div>
      )

    case 'countdown':
      return (
        <div className="space-y-5">
          <TitelVeld waarde={blok.titel} onWijzig={(titel) => onWijzig({ titel })} />
          <Veld label="Aftellingsdatum" hulp="Laat leeg om de trouwdatum te gebruiken.">
            <input
              type="date"
              value={blok.datum}
              onChange={(e) => onWijzig({ datum: e.target.value })}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </Veld>
        </div>
      )

    case 'galerij':
      return <GalerijInspector blok={blok} onWijzig={onWijzig} />

    case 'faq':
      return <FaqInspector blok={blok} onWijzig={onWijzig} />

    case 'cadeaulijst':
      return (
        <div className="space-y-5">
          <TitelVeld waarde={blok.titel} onWijzig={(titel) => onWijzig({ titel })} />
          <Veld
            label="Tekst"
            hulp="Staat jullie cadeaulijst-module aan, dan toont dit blok automatisch een knop naar de cadeaulijst. Deze tekst verschijnt alleen als die module uit staat."
          >
            <Textarea
              value={blok.tekst}
              onChange={(e) => onWijzig({ tekst: e.target.value })}
              rows={3}
              placeholder="Link naar jullie cadeaulijst of aanwijzingen…"
            />
          </Veld>
        </div>
      )

    case 'contact':
      return (
        <div className="space-y-5">
          <TitelVeld waarde={blok.titel} onWijzig={(titel) => onWijzig({ titel })} />
          <Veld label="Contactgegevens" hulp="E-mail of telefoonnummer voor gasten met vragen.">
            <Textarea
              value={blok.tekst}
              onChange={(e) => onWijzig({ tekst: e.target.value })}
              rows={2}
              placeholder="E-mail of telefoonnummer…"
            />
          </Veld>
        </div>
      )

    case 'scheiding':
      return (
        <p className="text-sm text-muted-foreground">
          Een decoratieve scheiding tussen blokken — geen instellingen nodig.
        </p>
      )
  }
}

// ─── Galerij-inspector ───────────────────────────────────────────────────────

function GalerijInspector({ blok, onWijzig }: { blok: GalerijBlock; onWijzig: (patch: Partial<Block>) => void }) {
  const upload = useWeddingUpload()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [bezig, setBezig] = React.useState(false)

  async function verwerkBestanden(bestanden: FileList) {
    setBezig(true)
    try {
      const nieuwe = [...blok.fotos]
      for (const file of Array.from(bestanden)) {
        const url = await upload(file, 'gallerij')
        nieuwe.push({ id: nieuwBlockId(), url, bijschrift: '' })
      }
      onWijzig({ fotos: nieuwe })
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="space-y-5">
      <TitelVeld waarde={blok.titel} onWijzig={(titel) => onWijzig({ titel })} />

      <Veld label="Weergave">
        <div className="flex gap-2">
          {(
            [
              { val: 'raster', label: 'Raster' },
              { val: 'masonry', label: 'Masonry' },
            ] as const
          ).map(({ val, label }) => (
            <button
              key={val}
              type="button"
              onClick={() => onWijzig({ stijl: val })}
              className={cn(
                'h-9 rounded-lg border px-4 text-sm transition-colors',
                blok.stijl === val
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Veld>

      <Veld label="Foto's">
        {blok.fotos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {blok.fotos.map((foto) => (
              <li key={foto.id} className="group relative overflow-hidden rounded-xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto.url} alt={foto.bijschrift || 'Galerijfoto'} className="h-28 w-full object-cover" />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => onWijzig({ fotos: blok.fotos.filter((f) => f.id !== foto.id) })}
                    className="rounded bg-black/60 p-1 text-white hover:bg-destructive"
                    aria-label="Foto verwijderen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={bezig}
          className="mt-2 flex h-20 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        >
          <Plus className="h-5 w-5" />
          <span className="text-sm">{bezig ? 'Bezig met uploaden…' : "Foto's toevoegen"}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void verwerkBestanden(e.target.files)
            e.target.value = ''
          }}
        />
      </Veld>
    </div>
  )
}

// ─── FAQ-inspector ───────────────────────────────────────────────────────────

function FaqInspector({ blok, onWijzig }: { blok: FaqBlock; onWijzig: (patch: Partial<Block>) => void }) {
  function updateItem(id: string, patch: Partial<{ vraag: string; antwoord: string }>) {
    onWijzig({ items: blok.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })
  }

  return (
    <div className="space-y-5">
      <TitelVeld waarde={blok.titel} onWijzig={(titel) => onWijzig({ titel })} />

      {blok.items.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Nog geen vragen toegevoegd.
        </p>
      )}

      <ul className="space-y-3">
        {blok.items.map((item, i) => (
          <li key={item.id} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Vraag {i + 1}</span>
              <button
                onClick={() => onWijzig({ items: blok.items.filter((x) => x.id !== item.id) })}
                className="ml-auto rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Vraag verwijderen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              <Input
                value={item.vraag}
                onChange={(e) => updateItem(item.id, { vraag: e.target.value })}
                placeholder="Bijv. Is er parkeergelegenheid?"
              />
              <Textarea
                value={item.antwoord}
                onChange={(e) => updateItem(item.id, { antwoord: e.target.value })}
                rows={2}
                placeholder="Bijv. Ja, er is gratis parkeren op het terrein."
              />
            </div>
          </li>
        ))}
      </ul>

      <Button
        variant="outline"
        onClick={() => onWijzig({ items: [...blok.items, { id: nieuwBlockId(), vraag: '', antwoord: '' }] })}
        className="w-full"
      >
        <Plus className="h-4 w-4" /> Vraag toevoegen
      </Button>
    </div>
  )
}

// ─── Weergave-instellingen (uitlijning, achtergrond, kopfoto) ────────────────

function BlokLayoutVelden({
  layout,
  onWijzig,
}: {
  layout: BlockLayout | undefined
  onWijzig: (layout: BlockLayout) => void
}) {
  const upload = useWeddingUpload()
  const huidig = layout ?? {}

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Weergave
      </p>

      {/* Uitlijning */}
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Uitlijning tekst</p>
        <div className="flex gap-2">
          {(
            [
              { val: 'links', label: 'Links', Icon: AlignLeft },
              { val: 'midden', label: 'Midden', Icon: AlignCenter },
              { val: 'rechts', label: 'Rechts', Icon: AlignRight },
            ] as const
          ).map(({ val, label, Icon }) => (
            <button
              key={val}
              type="button"
              onClick={() => onWijzig({ ...huidig, uitlijning: val })}
              title={label}
              className={cn(
                'flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors',
                (huidig.uitlijning ?? 'midden') === val
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Achtergrondkleur */}
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Achtergrondkleur</p>
        <div className="flex flex-wrap gap-2">
          {ACHTERGROND_SWATCHES.map((swatch) => {
            const actief = (huidig.achtergrondKleur ?? 'transparant') === swatch.waarde
            return (
              <button
                key={swatch.waarde}
                type="button"
                title={swatch.label}
                onClick={() =>
                  onWijzig({
                    ...huidig,
                    achtergrondKleur: swatch.waarde === 'transparant' ? undefined : swatch.waarde,
                    tekstKleur:
                      swatch.waarde === 'transparant'
                        ? undefined
                        : isDonker(swatch.waarde)
                          ? 'licht'
                          : undefined,
                  })
                }
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg border-2 transition-all hover:scale-110',
                  actief ? 'border-primary ring-1 ring-primary' : 'border-border'
                )}
                style={{
                  background:
                    swatch.waarde === 'transparant'
                      ? 'repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%) 0 0/12px 12px'
                      : swatch.waarde,
                }}
              />
            )
          })}
          <label
            title="Aangepaste kleur"
            className={cn(
              'flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-2 border-border text-[9px] font-bold text-muted-foreground transition-all hover:scale-110 hover:border-primary',
              huidig.achtergrondKleur &&
                !ACHTERGROND_SWATCHES.some((sw) => sw.waarde === huidig.achtergrondKleur)
                ? 'border-primary'
                : ''
            )}
            style={
              huidig.achtergrondKleur &&
              !ACHTERGROND_SWATCHES.some((sw) => sw.waarde === huidig.achtergrondKleur)
                ? { background: huidig.achtergrondKleur }
                : {}
            }
          >
            +
            <input
              type="color"
              className="sr-only"
              value={huidig.achtergrondKleur && huidig.achtergrondKleur !== 'transparant' ? huidig.achtergrondKleur : '#ffffff'}
              onChange={(e) => {
                const kleur = e.target.value
                onWijzig({
                  ...huidig,
                  achtergrondKleur: kleur,
                  tekstKleur: isDonker(kleur) ? 'licht' : undefined,
                })
              }}
            />
          </label>
        </div>
      </div>

      {/* Kopfoto */}
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Blok-afbeelding</p>
        <p className="mb-2.5 text-xs text-muted-foreground/70">
          Een visuele afbeelding als kop boven dit blok.
        </p>
        <FotoUpload
          huidigUrl={huidig.kopFotoUrl ?? ''}
          onUpload={async (file) => {
            const url = await upload(file, 'sectie-fotos')
            onWijzig({ ...huidig, kopFotoUrl: url })
          }}
          onVerwijder={huidig.kopFotoUrl ? () => onWijzig({ ...huidig, kopFotoUrl: undefined }) : undefined}
          label="Afbeelding toevoegen"
          aanbevolenAfmeting="Aanbevolen: 1200×400px"
        />
      </div>
    </div>
  )
}
