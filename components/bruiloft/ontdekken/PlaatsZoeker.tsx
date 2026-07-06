'use client'

import * as React from 'react'
import { Loader2, MapPin, X } from 'lucide-react'

import { Input } from '@/components/bruiloft/ui'
import type { ZoekPlaats } from '@/lib/bruiloft/discovery/types'
import { cn } from '@/lib/utils'

// Autocomplete voor Nederlandse woonplaatsen (PDOK Locatieserver via onze
// eigen /api/ontdekken/plaatsen-proxy). Dekt óók kleine kernen en gehuchten
// (Haghorst, Baarschot, ...) en herstelt typefouten. Bij selectie leveren we
// de plaats mét coördinaten op, waarmee de zoek-API in een straal eromheen
// zoekt.

interface Suggestie {
  id: string
  naam: string
  context: string
}

// Mini-cache per sessie: dezelfde tussenstanden ("die", "dies") worden bij
// heen-en-weer typen niet opnieuw opgevraagd.
const suggestieCache = new Map<string, Suggestie[]>()

interface PlaatsZoekerProps {
  value: ZoekPlaats | null
  onChange: (plaats: ZoekPlaats | null) => void
  // 'balk' = compacte variant voor de sticky zoekbalk; 'hero' = grote
  // variant voor de overzichtspagina.
  variant?: 'balk' | 'hero'
  className?: string
  inputId?: string
}

export function PlaatsZoeker({
  value,
  onChange,
  variant = 'balk',
  className,
  inputId,
}: PlaatsZoekerProps) {
  const [tekst, setTekst] = React.useState(value?.naam ?? '')
  const [suggesties, setSuggesties] = React.useState<Suggestie[]>([])
  const [open, setOpen] = React.useState(false)
  const [actief, setActief] = React.useState(-1)
  const [laden, setLaden] = React.useState(false)

  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const verzoekTeller = React.useRef(0)

  // Extern gewijzigde waarde (bijv. stille prefill met de profiel-woonplaats)
  // in het veld tonen.
  React.useEffect(() => {
    setTekst(value?.naam ?? '')
  }, [value])

  // Suggesties ophalen met debounce; verouderde antwoorden negeren.
  React.useEffect(() => {
    const term = tekst.trim()
    if (!open || term.length < 2 || term === value?.naam) {
      setSuggesties([])
      setLaden(false)
      return
    }
    const cached = suggestieCache.get(term.toLowerCase())
    if (cached) {
      setSuggesties(cached)
      setActief(-1)
      return
    }
    setLaden(true)
    const verzoek = ++verzoekTeller.current
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ontdekken/plaatsen?q=${encodeURIComponent(term)}`)
        if (!res.ok) throw new Error('mislukt')
        const data = (await res.json()) as { suggesties?: Suggestie[] }
        if (verzoek !== verzoekTeller.current) return
        const lijst = data.suggesties ?? []
        suggestieCache.set(term.toLowerCase(), lijst)
        setSuggesties(lijst)
        setActief(-1)
      } catch {
        if (verzoek === verzoekTeller.current) setSuggesties([])
      } finally {
        if (verzoek === verzoekTeller.current) setLaden(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [tekst, open, value])

  // Buiten klikken sluit de lijst en herstelt het veld naar de keuze.
  React.useEffect(() => {
    if (!open) return
    const sluit = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setTekst(value?.naam ?? '')
      }
    }
    document.addEventListener('mousedown', sluit)
    return () => document.removeEventListener('mousedown', sluit)
  }, [open, value])

  async function kies(suggestie: Suggestie) {
    setOpen(false)
    setTekst(suggestie.naam)
    try {
      const res = await fetch(`/api/ontdekken/plaatsen?id=${encodeURIComponent(suggestie.id)}`)
      if (!res.ok) throw new Error('mislukt')
      const { plaats } = (await res.json()) as { plaats?: ZoekPlaats }
      if (plaats) onChange(plaats)
    } catch {
      // Coördinaten niet op te halen: keuze niet doorvoeren, veld herstellen.
      setTekst(value?.naam ?? '')
    }
  }

  function wis() {
    onChange(null)
    setTekst('')
    setSuggesties([])
    inputRef.current?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggesties.length === 0) {
      if (e.key === 'Escape') {
        setOpen(false)
        setTekst(value?.naam ?? '')
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActief((i) => (i + 1) % suggesties.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActief((i) => (i <= 0 ? suggesties.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      kies(suggesties[actief >= 0 ? actief : 0])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setTekst(value?.naam ?? '')
    }
  }

  const hero = variant === 'hero'
  const lijstId = React.useId()

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <MapPin
        className={cn(
          'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground',
          hero ? 'h-5 w-5' : 'h-4 w-4'
        )}
      />
      <Input
        ref={inputRef}
        id={inputId}
        role="combobox"
        aria-expanded={open && suggesties.length > 0}
        aria-controls={lijstId}
        aria-autocomplete="list"
        aria-label="Zoek op plaatsnaam"
        autoComplete="off"
        value={tekst}
        placeholder="Zoek op plaatsnaam…"
        onChange={(e) => {
          setTekst(e.target.value)
          setOpen(true)
        }}
        onFocus={(e) => {
          setOpen(true)
          e.target.select()
        }}
        onKeyDown={onKeyDown}
        className={cn('bg-background pl-9 pr-9', hero && 'h-12 pl-10 text-base')}
      />
      {laden ? (
        <Loader2
          className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-hidden
        />
      ) : value ? (
        <button
          type="button"
          onClick={wis}
          aria-label="Plaats wissen"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {open && (suggesties.length > 0 || (tekst.trim().length >= 2 && !laden && tekst.trim() !== value?.naam)) ? (
        <ul
          id={lijstId}
          role="listbox"
          aria-label="Plaatssuggesties"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg"
        >
          {suggesties.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">
              Geen plaatsen gevonden — controleer de spelling.
            </li>
          ) : (
            suggesties.map((s, i) => (
              <li key={s.id} role="option" aria-selected={i === actief}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => kies(s)}
                  onMouseEnter={() => setActief(i)}
                  className={cn(
                    'flex w-full items-baseline gap-2 px-3 py-2.5 text-left text-sm transition-colors',
                    i === actief ? 'bg-accent/60 text-foreground' : 'text-foreground hover:bg-accent/40'
                  )}
                >
                  <span className="font-medium">{s.naam}</span>
                  {s.context ? (
                    <span className="truncate text-xs text-muted-foreground">{s.context}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
