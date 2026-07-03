'use client'

import * as React from 'react'
import { ChevronDown, ChevronRight, Star } from 'lucide-react'

import { Button, Modal } from '@/components/bruiloft/ui'
import { toegewezenAanLabel } from '@/lib/bruiloft/options'
import {
  TEMPLATE_FASE_VOLGORDE,
  TEMPLATE_TASKS,
  type TemplateFase,
  type TemplateTask,
} from '@/lib/bruiloft/templateTasks'
import { cn } from '@/lib/utils'
import type { Task, Wedding } from '@/lib/bruiloft/types'

import { vindOntbrekendeTemplates } from './templateOntbrekend'

interface OntbrekendeTakenModalProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  tasks: Task[]
  wedding: Wedding
  onConfirm: (titels: string[]) => Promise<void>
}

const PRIORITEIT_STIP: Record<string, string> = {
  hoog: 'bg-rose-500',
  midden: 'bg-amber-400',
  laag: 'bg-slate-300 dark:bg-slate-600',
}

export function OntbrekendeTakenModal({
  open,
  onOpenChange,
  tasks,
  wedding,
  onConfirm,
}: OntbrekendeTakenModalProps) {
  const ontbrekend = React.useMemo(
    () => vindOntbrekendeTemplates(tasks, TEMPLATE_TASKS),
    [tasks]
  )

  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [ingeklapt, setIngeklapt] = React.useState<Set<TemplateFase>>(new Set())
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setSelected(new Set())
      setIngeklapt(new Set())
    }
  }, [open])

  // Groepeer ontbrekende taken per fase in de juiste volgorde.
  const secties = React.useMemo(() => {
    const map = new Map<TemplateFase, TemplateTask[]>()
    for (const fase of TEMPLATE_FASE_VOLGORDE) map.set(fase, [])
    for (const t of ontbrekend) map.get(t.fase)?.push(t)
    return TEMPLATE_FASE_VOLGORDE
      .map((fase) => ({ fase, taken: map.get(fase) ?? [] }))
      .filter((s) => s.taken.length > 0)
  }, [ontbrekend])

  const toggleTaak = (titel: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(titel) ? next.delete(titel) : next.add(titel)
      return next
    })

  const toggleSectie = (fase: TemplateFase, taken: TemplateTask[]) => {
    const titels = taken.map((t) => t.titel)
    const alleGeselecteerd = titels.every((t) => selected.has(t))
    setSelected((prev) => {
      const next = new Set(prev)
      if (alleGeselecteerd) titels.forEach((t) => next.delete(t))
      else titels.forEach((t) => next.add(t))
      return next
    })
  }

  const toggleIngeklapt = (fase: TemplateFase) =>
    setIngeklapt((prev) => {
      const next = new Set(prev)
      next.has(fase) ? next.delete(fase) : next.add(fase)
      return next
    })

  const selecteerAlles = () => setSelected(new Set(ontbrekend.map((t) => t.titel)))
  const selecteerNiets = () => setSelected(new Set())
  const selecteerAanbevolen = () =>
    setSelected(new Set(ontbrekend.filter((t) => t.prioriteit === 'hoog').map((t) => t.titel)))

  const submit = async () => {
    if (selected.size === 0) return
    setBusy(true)
    try {
      await onConfirm(Array.from(selected))
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Sjabloontaken toevoegen"
      description="Kies welke taken je wilt toevoegen. Gesorteerd van vroeg naar laat."
      className="sm:max-w-2xl"
    >
      {ontbrekend.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Alle sjabloontaken staan al in je lijst.
        </p>
      ) : (
        <div className="flex flex-col gap-0">
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
              className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              <Star className="h-3 w-3" /> Aanbevolen
            </button>
            <span className="ml-auto text-xs text-muted-foreground">
              {selected.size} van {ontbrekend.length} geselecteerd
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
                  {/* Sectieheader */}
                  <div className="flex items-center gap-2 bg-rose-50/60 px-3 py-2 dark:bg-rose-950/20">
                    <input
                      type="checkbox"
                      checked={alleGeselecteerd}
                      ref={(el) => { if (el) el.indeterminate = deelsGeselecteerd }}
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
                      {isIngeklapt
                        ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      }
                    </button>
                  </div>

                  {/* Taakrijen */}
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
                                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                  {toegewezenAanLabel(t.toegewezenAan, wedding.partner1Naam, wedding.partner2Naam)}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {t.omschrijving}
                              </p>
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
              {selected.size > 0 ? `Voeg ${selected.size} ${selected.size === 1 ? 'taak' : 'taken'} toe` : 'Niets geselecteerd'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
