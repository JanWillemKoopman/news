'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react'

import { Button, Modal } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { Task, Wedding } from '@/lib/bruiloft/types'
import type { AITaakSuggestie, AITakenAdvies } from '@/app/api/ai/taken/route'

interface AIVoorgesteldeTakenModalProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  tasks: Task[]
  wedding: Wedding
  onConfirm: (taken: AITaakSuggestie[]) => Promise<void>
}

const PRIORITEIT_STIP: Record<string, string> = {
  hoog: 'bg-rose-500',
  midden: 'bg-amber-400',
  laag: 'bg-slate-300 dark:bg-slate-600',
}

export function AIVoorgesteldeTakenModal({
  open,
  onOpenChange,
  tasks,
  wedding,
  onConfirm,
}: AIVoorgesteldeTakenModalProps) {
  const [advies, setAdvies] = React.useState<AITakenAdvies | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [ingeklapt, setIngeklapt] = React.useState<Set<string>>(new Set())
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setSelected(new Set())
    setIngeklapt(new Set())
    setAdvies(null)
    setError(null)
    setLoading(true)

    fetch('/api/ai/taken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weddingId: wedding.id }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Onbekende fout' }))
          throw new Error(body.error ?? 'Fout bij ophalen suggesties')
        }
        return res.json()
      })
      .then((json: { advies: AITakenAdvies }) => {
        setAdvies(json.advies)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'AI tijdelijk niet beschikbaar')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const secties = React.useMemo(() => {
    if (!advies) return []
    const map = new Map<string, AITaakSuggestie[]>()
    for (const t of advies.taken) {
      const fase = t.fase || 'Overig'
      if (!map.has(fase)) map.set(fase, [])
      map.get(fase)!.push(t)
    }
    return Array.from(map.entries()).map(([fase, taken]) => ({ fase, taken }))
  }, [advies])

  const toggleTaak = (titel: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(titel) ? next.delete(titel) : next.add(titel)
      return next
    })

  const toggleSectie = (fase: string, taken: AITaakSuggestie[]) => {
    const titels = taken.map((t) => t.titel)
    const alleGeselecteerd = titels.every((t) => selected.has(t))
    setSelected((prev) => {
      const next = new Set(prev)
      if (alleGeselecteerd) titels.forEach((t) => next.delete(t))
      else titels.forEach((t) => next.add(t))
      return next
    })
  }

  const toggleIngeklapt = (fase: string) =>
    setIngeklapt((prev) => {
      const next = new Set(prev)
      next.has(fase) ? next.delete(fase) : next.add(fase)
      return next
    })

  const selecteerAlles = () =>
    setSelected(new Set(advies?.taken.map((t) => t.titel) ?? []))
  const selecteerNiets = () => setSelected(new Set())
  const selecteerAanbevolen = () =>
    setSelected(new Set(advies?.taken.filter((t) => t.prioriteit === 'hoog').map((t) => t.titel) ?? []))

  const submit = async () => {
    if (!advies || selected.size === 0) return
    const geselecteerd = advies.taken.filter((t) => selected.has(t.titel))
    setBusy(true)
    try {
      await onConfirm(geselecteerd)
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  const totaalAantal = advies?.taken.length ?? 0

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="AI-suggesties voor taken"
      description="Persoonlijk samengestelde taken op basis van jouw trouwplanning."
      className="sm:max-w-2xl"
    >
      {loading ? (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 animate-pulse text-rose-400" />
            <span className="text-sm text-muted-foreground">
              AI denkt na over taken die aansluiten bij jouw trouwplanning…
            </span>
          </div>
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-300 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-2 w-2 rounded-full bg-rose-400 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-bounce" />
          </div>
        </div>
      ) : error ? (
        <div className="py-6 text-center">
          <p className="text-sm text-rose-600">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => onOpenChange(false)}
          >
            Sluiten
          </Button>
        </div>
      ) : advies ? (
        <div className="flex flex-col gap-0">
          <p className="mb-3 text-sm text-muted-foreground">{advies.samenvatting}</p>

          {/* Globale acties */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selecteerAlles}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              Alles selecteren
            </button>
            <span className="text-xs text-muted-foreground">·</span>
            <button
              type="button"
              onClick={selecteerNiets}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              Niets
            </button>
            <span className="text-xs text-muted-foreground">·</span>
            <button
              type="button"
              onClick={selecteerAanbevolen}
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              Aanbevolen (hoge prioriteit)
            </button>
            <span className="ml-auto text-xs text-muted-foreground">
              {selected.size} van {totaalAantal} geselecteerd
            </span>
          </div>

          {/* Secties */}
          <div className="max-h-[55vh] space-y-1 overflow-y-auto pr-1">
            {secties.map(({ fase, taken }) => {
              const fasetitels = taken.map((t) => t.titel)
              const aantalGeselecteerd = fasetitels.filter((t) => selected.has(t)).length
              const alleGeselecteerd = aantalGeselecteerd === taken.length
              const deelsGeselecteerd = aantalGeselecteerd > 0 && !alleGeselecteerd
              const isIngeklapt = ingeklapt.has(fase)

              return (
                <div key={fase} className="overflow-hidden rounded-lg border border-border">
                  <div className="flex items-center gap-2 bg-rose-50/60 px-3 py-2 dark:bg-rose-950/20">
                    <input
                      type="checkbox"
                      checked={alleGeselecteerd}
                      ref={(el) => {
                        if (el) el.indeterminate = deelsGeselecteerd
                      }}
                      onChange={() => toggleSectie(fase, taken)}
                      className="h-4 w-4 cursor-pointer accent-rose-600"
                      aria-label={`Selecteer alle taken in ${fase}`}
                    />
                    <button
                      type="button"
                      onClick={() => toggleIngeklapt(fase)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <span className="text-sm font-semibold text-foreground">{fase}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {aantalGeselecteerd}/{taken.length}
                      </span>
                      {isIngeklapt ? (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  </div>

                  {!isIngeklapt && (
                    <div className="divide-y divide-border">
                      {taken.map((t) => {
                        const checked = selected.has(t.titel)
                        return (
                          <label
                            key={t.titel}
                            className={cn(
                              'flex cursor-pointer items-start gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-accent/30',
                              checked && 'bg-accent/20'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTaak(t.titel)}
                              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-rose-600"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                                    PRIORITEIT_STIP[t.prioriteit]
                                  )}
                                  title={`Prioriteit: ${t.prioriteit}`}
                                />
                                <p className="font-medium leading-snug text-foreground">
                                  {t.titel}
                                </p>
                                <span className="ml-auto shrink-0 text-xs text-muted-foreground capitalize">
                                  {t.toegewezenAan}
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {t.omschrijving}
                              </p>
                              {t.reden && (
                                <p className="mt-1 text-xs italic text-rose-500/80">{t.reden}</p>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-end gap-3 border-t border-border pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Annuleren
            </Button>
            <Button onClick={submit} disabled={busy || selected.size === 0}>
              {selected.size > 0
                ? `Voeg ${selected.size} ${selected.size === 1 ? 'taak' : 'taken'} toe`
                : 'Niets geselecteerd'}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
