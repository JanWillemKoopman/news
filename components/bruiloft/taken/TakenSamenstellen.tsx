'use client'

import * as React from 'react'
import { Check, ListChecks, SkipForward, Sparkles } from 'lucide-react'

import { Button, Modal, Progress, StatusBadge, useToast } from '@/components/bruiloft/ui'
import { formatDatumNL } from '@/lib/bruiloft/format'
import { alleVoorstellen, openVoorstellen } from '@/lib/bruiloft/taken/voorstellen'
import { capFirst } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { TakenVoorstellenState, TaskInput } from '@/lib/bruiloft/types'

interface TakenSamenstellenProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function naarNieuweTaak(t: TaskInput) {
  return {
    titel: t.titel,
    omschrijving: t.omschrijving,
    deadline: t.deadline,
    status: t.status,
    prioriteit: t.prioriteit,
    toegewezenAan: t.toegewezenAan,
    assignees: [],
    subtaken: [],
  }
}

// Kaart-voor-kaart de takenlijst samenstellen: elk sjabloonvoorstel wordt
// apart voorgelegd ("relevant voor jullie?"), met ontsnappingsluiken om de
// rest in één keer toe te voegen of over te slaan. Sluiten = pauzeren; de
// voortgang blijft bewaard en is later te hervatten.
export function TakenSamenstellen({ open, onOpenChange }: TakenSamenstellenProps) {
  const wedding = useBruiloftStore((s) => s.wedding)
  const tasks = useBruiloftStore((s) => s.tasks)
  const addTask = useBruiloftStore((s) => s.addTask)
  const addAITaken = useBruiloftStore((s) => s.addAITaken)
  const updateWedding = useBruiloftStore((s) => s.updateWedding)
  const { toast } = useToast()

  const [bezig, setBezig] = React.useState(false)

  if (!wedding) return null

  const state = wedding.takenVoorstellen

  // Toegevoegde voorstellen verdwijnen uit `alle` (ze bestaan dan als taak);
  // via de beslist-titels blijft de teller toch stabiel op het oorspronkelijke
  // totaal, zodat de voortgang niet verspringt.
  const alle = alleVoorstellen(wedding, tasks)
  const totaal = new Set([...alle.map((t) => t.titel), ...Object.keys(state.beslist)]).size
  const resterend = openVoorstellen(wedding, tasks, state)
  const huidige = resterend[0] ?? null
  const beoordeeld = totaal - resterend.length

  const bewaar = async (next: TakenVoorstellenState) => {
    try {
      await updateWedding({ takenVoorstellen: next })
    } catch {
      toast({ title: 'Opslaan mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  const beslis = async (taak: TaskInput, keuze: 'toegevoegd' | 'overgeslagen') => {
    if (bezig) return
    setBezig(true)
    try {
      if (keuze === 'toegevoegd') {
        await addTask(naarNieuweTaak(taak))
      }
      await bewaar({
        beslist: { ...state.beslist, [taak.titel]: keuze },
        afgerond: resterend.length <= 1 ? true : state.afgerond,
      })
    } catch {
      toast({ title: 'Opslaan mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    } finally {
      setBezig(false)
    }
  }

  const restToevoegen = async () => {
    if (bezig || resterend.length === 0) return
    setBezig(true)
    try {
      await addAITaken(resterend.map(naarNieuweTaak))
      const beslist = { ...state.beslist }
      for (const t of resterend) beslist[t.titel] = 'toegevoegd'
      await bewaar({ beslist, afgerond: true })
      toast({ title: `${resterend.length} taken toegevoegd`, variant: 'success' })
    } catch {
      toast({ title: 'Toevoegen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    } finally {
      setBezig(false)
    }
  }

  const restOverslaan = async () => {
    if (bezig) return
    setBezig(true)
    const beslist = { ...state.beslist }
    for (const t of resterend) beslist[t.titel] = 'overgeslagen'
    await bewaar({ beslist, afgerond: true })
    setBezig(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Takenlijst samenstellen"
      description="Kies per voorstel of het bij jullie bruiloft past — of voeg alles in één keer toe."
    >
      {huidige ? (
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Voorstel {beoordeeld + 1} van {totaal}
              </span>
              <span className="tabular-nums">{beoordeeld} beoordeeld</span>
            </div>
            <Progress value={(beoordeeld / Math.max(1, totaal)) * 100} className="h-1.5" />
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">
                {capFirst(huidige.tijdsblok)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                Prioriteit
                <StatusBadge kind="prioriteit" value={huidige.prioriteit} />
              </span>
              <span>Deadline {formatDatumNL(huidige.deadline)}</span>
            </div>
            <p className="mt-3 font-medium text-foreground">{huidige.titel}</p>
            {huidige.omschrijving ? (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {huidige.omschrijving}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              disabled={bezig}
              onClick={() => beslis(huidige, 'overgeslagen')}
            >
              <SkipForward className="h-4 w-4" /> Overslaan
            </Button>
            <Button loading={bezig} onClick={() => beslis(huidige, 'toegevoegd')}>
              <Check className="h-4 w-4" /> Toevoegen
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
            <button
              type="button"
              disabled={bezig}
              onClick={restToevoegen}
              className="font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
            >
              Voeg alle {resterend.length} resterende toe
            </button>
            <button
              type="button"
              disabled={bezig}
              onClick={restOverslaan}
              className="text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
            >
              Sla de rest over
            </button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Sluiten mag altijd — jullie voortgang blijft bewaard.
          </p>
        </div>
      ) : (
        <div className="space-y-4 py-2 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <ListChecks className="h-6 w-6" />
          </span>
          <div>
            <p className="font-medium text-foreground">Jullie takenlijst staat!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tasks.length > 0
                ? `${tasks.length} ${tasks.length === 1 ? 'taak staat' : 'taken staan'} klaar, verdeeld over de maanden tot de bruiloft.`
                : 'Jullie hebben alle voorstellen overgeslagen — eigen taken toevoegen kan altijd.'}
            </p>
          </div>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Eigen taken toevoegen of voorstellen terughalen kan altijd via “Taak toevoegen”.
          </p>
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Naar de takenlijst
          </Button>
        </div>
      )}
    </Modal>
  )
}
