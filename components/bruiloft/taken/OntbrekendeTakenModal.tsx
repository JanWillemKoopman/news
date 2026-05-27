'use client'

import * as React from 'react'

import { Button, Modal } from '@/components/bruiloft/ui'
import { TEMPLATE_TASKS, type TemplateTask } from '@/lib/bruiloft/templateTasks'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/bruiloft/types'

import { vindOntbrekendeTemplates } from './templateOntbrekend'

interface OntbrekendeTakenModalProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  tasks: Task[]
  onConfirm: (titels: string[]) => Promise<void>
}

export function OntbrekendeTakenModal({
  open,
  onOpenChange,
  tasks,
  onConfirm,
}: OntbrekendeTakenModalProps) {
  const ontbrekend = React.useMemo(
    () => vindOntbrekendeTemplates(tasks, TEMPLATE_TASKS),
    [tasks]
  )
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (open) setSelected(new Set(ontbrekend.map((t) => t.titel)))
  }, [open, ontbrekend])

  const toggle = (titel: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(titel)) next.delete(titel)
      else next.add(titel)
      return next
    })
  }

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
      title="Ontbrekende sjabloontaken toevoegen"
    >
      {ontbrekend.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Alle sjabloontaken staan al in je lijst — nothing to add.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            We vonden {ontbrekend.length} sjabloontaken die nog niet in je lijst staan. Vink aan welke
            je wilt toevoegen.
          </p>
          <div className="max-h-80 space-y-1 overflow-auto rounded-md border border-border p-2">
            {ontbrekend.map((t: TemplateTask) => {
              const checked = selected.has(t.titel)
              return (
                <label
                  key={t.titel}
                  className={cn(
                    'flex cursor-pointer items-start gap-2 rounded p-2 text-sm hover:bg-accent/40',
                    checked && 'bg-accent/30'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(t.titel)}
                    className="mt-1"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{t.titel}</p>
                    <p className="text-xs text-muted-foreground">{t.omschrijving}</p>
                  </div>
                </label>
              )
            })}
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Annuleren
            </Button>
            <Button onClick={submit} disabled={busy || selected.size === 0}>
              {selected.size > 0 ? `Voeg ${selected.size} toe` : 'Niets geselecteerd'}
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
