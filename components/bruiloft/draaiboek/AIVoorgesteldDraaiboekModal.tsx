'use client'

import * as React from 'react'
import { Clock, MapPin } from 'lucide-react'

import { buildAIContext } from '@/lib/bruiloft/aiContext'
import { Button, LoadingDots, Modal } from '@/components/bruiloft/ui'
import { capFirst, cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { ScheduleItem, Wedding } from '@/lib/bruiloft/types'
import type { AIDraaiboekSuggestie, AIDraaiboekAdvies } from '@/app/api/ai/draaiboek/route'

interface AIVoorgesteldDraaiboekModalProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  scheduleItems: ScheduleItem[]
  wedding: Wedding
  onConfirm: (items: AIDraaiboekSuggestie[]) => Promise<void>
}

// Unieke sleutel per suggestie (tijd + titel) voor selectie.
function sleutel(s: AIDraaiboekSuggestie): string {
  return `${s.tijd}|${s.titel}`
}

export function AIVoorgesteldDraaiboekModal({
  open,
  onOpenChange,
  scheduleItems,
  wedding,
  onConfirm,
}: AIVoorgesteldDraaiboekModalProps) {
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)
  const guests = useBruiloftStore((s) => s.guests)
  const tasks = useBruiloftStore((s) => s.tasks)
  const websiteContent = useBruiloftStore((s) => s.websiteContent)

  const [advies, setAdvies] = React.useState<AIDraaiboekAdvies | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [busy, setBusy] = React.useState(false)
  const [nextAvailable, setNextAvailable] = React.useState<Date | null>(null)

  React.useEffect(() => {
    if (!open) return
    setSelected(new Set())
    setAdvies(null)
    setError(null)
    setNextAvailable(null)
    setLoading(true)

    const bestaandeItems = scheduleItems.map((s) => `${s.tijd} ${s.titel}`)
    const context = buildAIContext(wedding, tasks, vendors, budgetItems, guests, scheduleItems, websiteContent)

    fetch('/api/ai/draaiboek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, weddingId: wedding.id, bestaandeItems }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (!res.ok && !json.advies) {
          throw new Error(json.error ?? 'Fout bij ophalen suggesties')
        }
        return json
      })
      .then((json: { advies: AIDraaiboekAdvies; cached?: boolean; next_available_at?: string }) => {
        setAdvies(json.advies)
        setNextAvailable(json.next_available_at ? new Date(json.next_available_at) : null)
        // Standaard alles voorgeselecteerd; het paar vinkt af wat niet past.
        setSelected(new Set((json.advies.items ?? []).map(sleutel)))
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'AI tijdelijk niet beschikbaar')
      })
      .finally(() => setLoading(false))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (k: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(k) ? next.delete(k) : next.add(k)
      return next
    })

  const submit = async () => {
    if (!advies || selected.size === 0) return
    const gekozen = advies.items.filter((i) => selected.has(sleutel(i)))
    setBusy(true)
    try {
      await onConfirm(gekozen)
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  const totaal = advies?.items.length ?? 0

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="AI-draaiboek samenstellen"
      description="Een voorgestelde dagindeling op basis van jullie bruiloft."
      className="sm:max-w-2xl"
    >
      {loading ? (
        <div className="flex flex-col items-center gap-4 py-10">
          <span className="text-sm text-muted-foreground">
            AI stelt een dagindeling samen die past bij jullie dag…
          </span>
          <LoadingDots />
        </div>
      ) : error ? (
        <div className="py-6 text-center">
          <p className="text-sm text-rose-600">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => onOpenChange(false)}>
            Sluiten
          </Button>
        </div>
      ) : advies ? (
        <div className="flex flex-col gap-0">
          <p className="mb-1 text-sm text-muted-foreground">{advies.samenvatting}</p>
          {nextAvailable && nextAvailable.getTime() > Date.now() && (
            <p className="mb-3 text-xs text-muted-foreground">
              Dit zijn de resultaten van de vorige AI-generatie. Een nieuwe generatie kan over{' '}
              {Math.ceil((nextAvailable.getTime() - Date.now()) / 60000)} minuten.
            </p>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set(advies.items.map(sleutel)))}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              Alles selecteren
            </button>
            <span className="text-xs text-muted-foreground">·</span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              Niets
            </button>
            <span className="ml-auto text-xs text-muted-foreground">
              {selected.size} van {totaal} geselecteerd
            </span>
          </div>

          <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
            {advies.items.map((item) => {
              const k = sleutel(item)
              const checked = selected.has(k)
              return (
                <label
                  key={k}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:bg-accent/30',
                    checked && 'bg-accent/20'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(k)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-rose-600"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {item.tijd}
                        {item.eindtijd ? `–${item.eindtijd}` : ''}
                      </span>
                      <p className="font-medium leading-snug text-foreground">{item.titel}</p>
                    </div>
                    {item.omschrijving && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.omschrijving}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {item.locatie && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {item.locatie}
                        </span>
                      )}
                      {item.betrokkenen.map((r) => (
                        <span
                          key={r}
                          className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                        >
                          {capFirst(r)}
                        </span>
                      ))}
                    </div>
                    {item.reden && <p className="mt-1 text-xs italic text-rose-500/80">{item.reden}</p>}
                  </div>
                </label>
              )
            })}
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Annuleren
            </Button>
            <Button onClick={submit} disabled={busy || selected.size === 0}>
              {selected.size > 0
                ? `Voeg ${selected.size} ${selected.size === 1 ? 'onderdeel' : 'onderdelen'} toe`
                : 'Niets geselecteerd'}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
