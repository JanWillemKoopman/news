'use client'

import * as React from 'react'

import { buildAIContext } from '@/lib/bruiloft/aiContext'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { AIAdvies } from '@/app/api/ai/advice/route'

// Gedeelde AI-advieslaag: één Gemini-call (via /api/ai/advice, met DB-cache en
// rate-limiting) voedt alle plekken in de app — het dashboardpaneel, de
// contextuele insight-kaarten op modulepagina's en de AI-coach. Componenten
// filteren client-side wat voor hun plek relevant is; er komen dus geen extra
// AI-calls bij per oppervlak.

// Sessiecache: voorkomt onnodige server-roundtrips bij navigatie binnen
// dezelfde tab. De DB-cache in api/ai/advice handelt persistente caching af.
const adviesCache = new Map<string, { data: AIAdvies[]; fetchedAt: number; updatedAt?: string }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 uur

// Lopende verzoeken per bruiloft: meerdere componenten (topbalk-badge, paneel,
// insight-kaarten) mounten de hook tegelijk; zij delen één fetch in plaats van
// elk een eigen AI-call af te vuren.
const inflight = new Map<string, Promise<{ data: AIAdvies[]; updatedAt?: string }>>()

// ── Weggeklikte adviezen ─────────────────────────────────────────────────────
// Een advies dat de gebruiker op één plek wegklikt, verdwijnt overal (kaarten,
// coach én dashboardpaneel). Persistent in localStorage per bruiloft; een
// custom event houdt alle gemounte componenten in sync.

const DISMISS_EVENT = 'otp-ai-advies-weggeklikt'
const MAX_WEGGEKLIKT = 50

function dismissStorageKey(weddingId: string) {
  return `otp:ai-advies-weggeklikt:${weddingId}`
}

// Sleutel op sectie+titel zodat hetzelfde advies na een verversing met
// identieke inhoud weggeklikt blijft, maar nieuw geformuleerd advies weer toont.
export function adviesKey(a: AIAdvies): string {
  return `${a.sectie}|${a.titel}`
}

function leesWeggeklikt(weddingId: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(dismissStorageKey(weddingId))
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function schrijfWeggeklikt(weddingId: string, keys: Set<string>) {
  try {
    window.localStorage.setItem(
      dismissStorageKey(weddingId),
      JSON.stringify(Array.from(keys).slice(-MAX_WEGGEKLIKT))
    )
  } catch {
    // localStorage vol of geblokkeerd — dismissal geldt dan alleen in-memory.
  }
  window.dispatchEvent(new CustomEvent(DISMISS_EVENT))
}

function useWeggeklikt(weddingId: string | null) {
  const [weggeklikt, setWeggeklikt] = React.useState<Set<string>>(() =>
    weddingId ? leesWeggeklikt(weddingId) : new Set()
  )

  React.useEffect(() => {
    if (!weddingId) return
    const sync = () => setWeggeklikt(leesWeggeklikt(weddingId))
    sync()
    window.addEventListener(DISMISS_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(DISMISS_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [weddingId])

  const klikWeg = React.useCallback(
    (advies: AIAdvies) => {
      if (!weddingId) return
      const next = new Set(leesWeggeklikt(weddingId))
      next.add(adviesKey(advies))
      schrijfWeggeklikt(weddingId, next)
    },
    [weddingId]
  )

  return { weggeklikt, klikWeg }
}

// ── Versheidslabel ───────────────────────────────────────────────────────────

export function geledenLabel(iso?: string): string {
  if (!iso) return 'zojuist'
  const verschil = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(verschil) || verschil < 0) return 'zojuist'
  const min = Math.floor(verschil / 60000)
  if (min < 1) return 'zojuist'
  if (min < 60) return `${min} min geleden`
  const uur = Math.floor(min / 60)
  if (uur < 24) return `${uur} uur geleden`
  const dag = Math.floor(uur / 24)
  return dag === 1 ? 'gisteren' : `${dag} dagen geleden`
}

// ── Hoofdhook ────────────────────────────────────────────────────────────────

const URGENTIE_VOLGORDE: Record<AIAdvies['urgentie'], number> = {
  kritiek: 0,
  binnenkort: 1,
  normaal: 2,
}

export interface UseAIAdviesResult {
  /** Alle adviezen, inclusief weggeklikte. */
  advies: AIAdvies[] | null
  /** Adviezen die de gebruiker nog niet heeft weggeklikt, gesorteerd op urgentie. */
  zichtbaar: AIAdvies[]
  loading: boolean
  error: string | null
  updatedAt?: string
  refresh: () => void
  klikWeg: (advies: AIAdvies) => void
}

export function useAIAdvies(): UseAIAdviesResult {
  const wedding = useBruiloftStore((s) => s.wedding)
  const tasks = useBruiloftStore((s) => s.tasks)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const guests = useBruiloftStore((s) => s.guests)
  const scheduleItems = useBruiloftStore((s) => s.scheduleItems)
  const weddingId = wedding?.id ?? null

  const { weggeklikt, klikWeg } = useWeggeklikt(weddingId)

  const [advies, setAdvies] = React.useState<AIAdvies[] | null>(() => {
    if (!weddingId) return null
    const cached = adviesCache.get(weddingId)
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.data
    return null
  })
  const [updatedAt, setUpdatedAt] = React.useState<string | undefined>(() => {
    if (!weddingId) return undefined
    const cached = adviesCache.get(weddingId)
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.updatedAt
    return undefined
  })
  // Start direct in loading-staat als er nog geen cache is, zodat er geen
  // flits van een lege kaart is voordat de useEffect de fetch triggert.
  const [loading, setLoading] = React.useState(() => {
    if (!weddingId) return false
    const cached = adviesCache.get(weddingId)
    return !(cached && Date.now() - cached.fetchedAt < CACHE_TTL)
  })
  const [error, setError] = React.useState<string | null>(null)

  const fetchAdvies = React.useCallback(
    async (forceRefresh = false) => {
      if (!wedding || !weddingId) return
      const cached = adviesCache.get(weddingId)
      if (!forceRefresh && cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
        setAdvies(cached.data)
        setUpdatedAt(cached.updatedAt)
        return
      }

      setLoading(true)
      setError(null)

      try {
        let lopend = inflight.get(weddingId)
        if (!lopend || forceRefresh) {
          const context = buildAIContext(wedding, tasks, vendors, budgetItems, guests, scheduleItems)
          lopend = (async () => {
            const res = await window.fetch('/api/ai/advice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ context, weddingId, force: forceRefresh }),
            })
            if (!res.ok) throw new Error(await res.text())
            const json = await res.json()
            if (!(json.advies?.length > 0)) throw new Error('Leeg antwoord van AI')
            // Oudere cache-rijen missen het type-veld; normaliseer naar 'actie'.
            const genormaliseerd: AIAdvies[] = json.advies.map((a: AIAdvies) => ({
              ...a,
              type: a.type ?? 'actie',
            }))
            adviesCache.set(weddingId, {
              data: genormaliseerd,
              fetchedAt: Date.now(),
              updatedAt: json.updatedAt,
            })
            return { data: genormaliseerd, updatedAt: json.updatedAt as string | undefined }
          })()
          const metOpruiming = lopend.finally(() => {
            if (inflight.get(weddingId) === metOpruiming) inflight.delete(weddingId)
          })
          inflight.set(weddingId, metOpruiming)
          lopend = metOpruiming
        }
        const { data, updatedAt: bijgewerkt } = await lopend
        setAdvies(data)
        setUpdatedAt(bijgewerkt)
      } catch (err) {
        console.warn('[useAIAdvies] Fetch mislukt, fallback naar rule-based guidance:', err)
        setError('AI tijdelijk niet beschikbaar')
      } finally {
        setLoading(false)
      }
    },
    [wedding, weddingId, tasks, vendors, budgetItems, guests, scheduleItems]
  )

  React.useEffect(() => {
    if (!weddingId) return
    const cached = adviesCache.get(weddingId)
    if (!cached || Date.now() - cached.fetchedAt >= CACHE_TTL) {
      fetchAdvies(false)
    }
  }, [weddingId, fetchAdvies])

  const zichtbaar = React.useMemo(() => {
    if (!advies) return []
    return advies
      .filter((a) => !weggeklikt.has(adviesKey(a)))
      .slice()
      .sort((a, b) => URGENTIE_VOLGORDE[a.urgentie] - URGENTIE_VOLGORDE[b.urgentie])
  }, [advies, weggeklikt])

  return {
    advies,
    zichtbaar,
    loading,
    error,
    updatedAt,
    refresh: () => fetchAdvies(true),
    klikWeg,
  }
}
