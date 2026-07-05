'use client'

// Paginabeheer van de trouwwebsite (website v3, fase 3: multi-page). Toont
// alle pagina's als een rij tabs: kiezen, hernoemen, herordenen (drag & drop,
// zelfde patroon als BlokkenBuilder), tonen/verbergen en verwijderen. De
// Home-pagina (pageSlug === '') is vast en niet te verwijderen of te
// hernoemen naar een ander adres.

import { Check, Eye, EyeOff, GripVertical, Plus, Trash2, X } from 'lucide-react'
import * as React from 'react'

import { Input } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import type { WebsitePage } from '@/lib/bruiloft/websiteBlocks'

// Route-segmenten die al een eigen statische pagina zijn — een gelijknamige
// paginaslug zou nooit bereikbaar zijn (Next.js geeft statische routes
// voorrang boven de catch-all-route van de trouwwebsite).
const GERESERVEERDE_SLUGS = ['cadeaulijst']

function slugify(waarde: string): string {
  return waarde
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function uniekeSlug(basis: string, bestaande: string[]): string {
  let kandidaat = basis || 'pagina'
  let i = 1
  while (bestaande.includes(kandidaat) || GERESERVEERDE_SLUGS.includes(kandidaat)) {
    i += 1
    kandidaat = `${basis || 'pagina'}-${i}`
  }
  return kandidaat
}

interface Props {
  paginas: WebsitePage[]
  actievePaginaId: string | null
  onSelecteer: (id: string) => void
  onToevoegen: (titel: string, pageSlug: string) => void
  onHernoemen: (id: string, titel: string) => void
  onToggleZichtbaar: (id: string, zichtbaar: boolean) => void
  onVerwijderen: (id: string) => void
  onHerorden: (nieuweVolgorde: WebsitePage[]) => void
  onSeoWijzigen: (id: string, patch: { seoTitel?: string; seoOmschrijving?: string }) => void
}

// Kleine debounce voor de SEO-velden: voorkomt een database-schrijf per
// toetsaanslag. Sync't opnieuw zodra de gebruiker van pagina wisselt.
function useGedebouncedVeld(waarde: string, onWijzig: (v: string) => void, vertraging = 500) {
  const [lokaal, setLokaal] = React.useState(waarde)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => setLokaal(waarde), [waarde])
  function onChange(v: string) {
    setLokaal(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onWijzig(v), vertraging)
  }
  return [lokaal, onChange] as const
}

export function PaginaSwitcher({
  paginas,
  actievePaginaId,
  onSelecteer,
  onToevoegen,
  onHernoemen,
  onToggleZichtbaar,
  onVerwijderen,
  onHerorden,
  onSeoWijzigen,
}: Props) {
  const [nieuwOpen, setNieuwOpen] = React.useState(false)
  const [nieuweTitel, setNieuweTitel] = React.useState('')
  const [dragId, setDragId] = React.useState<string | null>(null)
  const [dragOverId, setDragOverId] = React.useState<string | null>(null)

  const geordend = React.useMemo(() => [...paginas].sort((a, b) => a.volgorde - b.volgorde), [paginas])

  function bevestigNieuwePagina() {
    const titel = nieuweTitel.trim()
    if (!titel) {
      setNieuwOpen(false)
      return
    }
    const slug = uniekeSlug(slugify(titel), geordend.map((p) => p.pageSlug))
    onToevoegen(titel, slug)
    setNieuweTitel('')
    setNieuwOpen(false)
  }

  function drop(targetId: string) {
    if (!dragId || dragId === targetId) return
    const van = geordend.findIndex((p) => p.id === dragId)
    const naar = geordend.findIndex((p) => p.id === targetId)
    if (van === -1 || naar === -1) return
    const next = [...geordend]
    const [item] = next.splice(van, 1)
    next.splice(naar, 0, item)
    onHerorden(next)
    setDragId(null)
    setDragOverId(null)
  }

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-foreground">Pagina&apos;s</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {geordend.length} {geordend.length === 1 ? 'pagina' : "pagina's"} — versleep om de volgorde in het menu te wijzigen
        </p>
      </div>

      <ul className="flex flex-wrap items-stretch gap-2 p-3 sm:p-4">
        {geordend.map((p) => {
          const isHome = p.pageSlug === ''
          const actief = p.id === actievePaginaId
          return (
            <li
              key={p.id}
              draggable={!isHome}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', p.id)
                e.dataTransfer.effectAllowed = 'move'
                setDragId(p.id)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                if (p.id !== dragId) setDragOverId(p.id)
              }}
              onDrop={(e) => {
                e.preventDefault()
                drop(p.id)
              }}
              onDragEnd={() => {
                setDragId(null)
                setDragOverId(null)
              }}
              className={cn(
                'flex items-center gap-1 rounded-lg border transition-colors',
                actief ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                dragId === p.id ? 'opacity-40' : '',
                dragOverId === p.id && dragId !== p.id ? 'ring-1 ring-primary/40' : ''
              )}
            >
              {!isHome && (
                <span className="pl-1.5 text-muted-foreground/40">
                  <GripVertical className="h-3.5 w-3.5 cursor-grab" />
                </span>
              )}
              <button
                type="button"
                onClick={() => onSelecteer(p.id)}
                className={cn(
                  'py-1.5 pr-1 text-sm',
                  isHome ? 'pl-3' : 'pl-0.5',
                  actief ? 'font-medium text-primary' : 'text-foreground'
                )}
              >
                {p.titel || 'Naamloos'}
              </button>
              <button
                type="button"
                onClick={() => onToggleZichtbaar(p.id, !p.zichtbaar)}
                className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                title={p.zichtbaar ? 'Verbergen' : 'Zichtbaar maken'}
              >
                {p.zichtbaar ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
              {!isHome && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`"${p.titel || 'Naamloos'}" verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
                      onVerwijderen(p.id)
                    }
                  }}
                  className="rounded p-1.5 pr-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Pagina verwijderen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          )
        })}

        {nieuwOpen ? (
          <li className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 py-1 pl-2.5 pr-1.5">
            <Input
              autoFocus
              value={nieuweTitel}
              onChange={(e) => setNieuweTitel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') bevestigNieuwePagina()
                if (e.key === 'Escape') { setNieuwOpen(false); setNieuweTitel('') }
              }}
              placeholder="Naam van de pagina…"
              className="h-7 w-40 border-none bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
            />
            <button type="button" onClick={bevestigNieuwePagina} className="rounded p-1 text-primary hover:bg-primary/10">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { setNieuwOpen(false); setNieuweTitel('') }}
              className="rounded p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ) : (
          <li>
            <button
              type="button"
              onClick={() => setNieuwOpen(true)}
              className="flex h-full items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" /> Pagina toevoegen
            </button>
          </li>
        )}
      </ul>

      {/* Naam en SEO van de actieve pagina. */}
      {(() => {
        const actief = geordend.find((p) => p.id === actievePaginaId)
        if (!actief) return null
        return (
          <PaginaDetails
            key={actief.id}
            pagina={actief}
            onHernoemen={onHernoemen}
            onSeoWijzigen={onSeoWijzigen}
          />
        )
      })()}
    </div>
  )
}

function PaginaDetails({
  pagina,
  onHernoemen,
  onSeoWijzigen,
}: {
  pagina: WebsitePage
  onHernoemen: (id: string, titel: string) => void
  onSeoWijzigen: (id: string, patch: { seoTitel?: string; seoOmschrijving?: string }) => void
}) {
  const [titel, onTitelChange] = useGedebouncedVeld(pagina.titel, (v) => onHernoemen(pagina.id, v))
  const [seoTitel, onSeoTitelChange] = useGedebouncedVeld(pagina.seoTitel, (v) => onSeoWijzigen(pagina.id, { seoTitel: v }))
  const [seoOmschrijving, onSeoOmschrijvingChange] = useGedebouncedVeld(pagina.seoOmschrijving, (v) =>
    onSeoWijzigen(pagina.id, { seoOmschrijving: v })
  )

  return (
    <div className="space-y-4 border-t border-border px-4 py-4 sm:px-5">
      {/* Home heeft geen los adres (pageSlug ''), dus geen bewerkbare naam die de URL bepaalt. */}
      {pagina.pageSlug !== '' && (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Naam van &quot;{pagina.titel || 'Naamloos'}&quot;
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={titel}
              onChange={(e) => onTitelChange(e.target.value)}
              placeholder="Paginanaam…"
              className="max-w-xs"
            />
            <span className="text-xs text-muted-foreground">/trouwen/…/{pagina.pageSlug}</span>
          </div>
        </div>
      )}

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          SEO &amp; social preview
        </p>
        <p className="mb-2.5 text-xs text-muted-foreground">
          Optioneel: overschrijft de titel/omschrijving die zoekmachines en social media tonen voor deze pagina.
        </p>
        <div className="space-y-2">
          <Input
            value={seoTitel}
            onChange={(e) => onSeoTitelChange(e.target.value)}
            placeholder="Bijv. Jan & Anna trouwen — 12 juni 2027"
          />
          <Input
            value={seoOmschrijving}
            onChange={(e) => onSeoOmschrijvingChange(e.target.value)}
            placeholder="Korte omschrijving voor zoekresultaten en gedeelde links…"
          />
        </div>
      </div>
    </div>
  )
}
