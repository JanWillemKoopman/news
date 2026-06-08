'use client'

import * as React from 'react'

import { Button, Field, Input, Modal, Textarea } from '@/components/bruiloft/ui'
import { DRAAIBOEK_ROLLEN } from '@/lib/bruiloft/options'
import { cn } from '@/lib/utils'
import type { Rol, ScheduleItem, ScheduleItemInput } from '@/lib/bruiloft/types'

type NewScheduleItem = Omit<ScheduleItemInput, 'weddingId'>

interface ScheduleItemFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: ScheduleItem | null
  onSubmit: (data: NewScheduleItem) => void
}

function leeg(): NewScheduleItem {
  return { tijd: '', titel: '', omschrijving: '', locatie: '', betrokkenen: [] }
}

function vanItem(s: ScheduleItem): NewScheduleItem {
  return {
    tijd: s.tijd,
    titel: s.titel,
    omschrijving: s.omschrijving,
    locatie: s.locatie,
    betrokkenen: s.betrokkenen,
  }
}

export function ScheduleItemForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: ScheduleItemFormProps) {
  const [form, setForm] = React.useState<NewScheduleItem>(leeg)
  const [saving, setSaving] = React.useState(false)
  const baseline = React.useRef<string>(JSON.stringify(leeg()))

  React.useEffect(() => {
    if (open) setForm(initial ? vanItem(initial) : leeg())
  }, [open, initial])

  const set = <K extends keyof NewScheduleItem>(key: K, value: NewScheduleItem[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const toggleRol = (rol: Rol) =>
    setForm((f) => ({
      ...f,
      betrokkenen: f.betrokkenen.includes(rol)
        ? f.betrokkenen.filter((r) => r !== rol)
        : [...f.betrokkenen, rol],
    }))

  const verwerk = (closeAfter: boolean) => {
    if (!form.tijd || !form.titel.trim()) return
    if (saving) return
    setSaving(true)
    try {
      onSubmit({ ...form, titel: form.titel.trim() })
      if (closeAfter) {
        onOpenChange(false)
      } else {
        const leegForm = leeg()
        setForm(leegForm)
        baseline.current = JSON.stringify(leegForm)
      }
    } finally {
      setSaving(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    verwerk(true)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'Programmaonderdeel bewerken' : 'Programmaonderdeel toevoegen'}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Tijd" htmlFor="tijd">
            <Input
              id="tijd"
              type="time"
              value={form.tijd}
              onChange={(e) => set('tijd', e.target.value)}
              required
            />
          </Field>
          <Field label="Titel" htmlFor="titel" className="col-span-2">
            <Input
              id="titel"
              value={form.titel}
              onChange={(e) => set('titel', e.target.value)}
              placeholder="Bijv. Ceremonie"
              required
            />
          </Field>
        </div>

        <Field label="Locatie" htmlFor="loc">
          <Input
            id="loc"
            value={form.locatie}
            onChange={(e) => set('locatie', e.target.value)}
            placeholder="Bijv. Tuin / grote zaal"
          />
        </Field>

        <Field label="Omschrijving" htmlFor="oms">
          <Textarea
            id="oms"
            value={form.omschrijving}
            onChange={(e) => set('omschrijving', e.target.value)}
            rows={2}
          />
        </Field>

        <div>
          <p className="mb-2 text-sm font-medium">Betrokkenen (voor filteren en export)</p>
          <div className="flex flex-wrap gap-2">
            {DRAAIBOEK_ROLLEN.map((rol) => {
              const actief = form.betrokkenen.includes(rol)
              return (
                <button
                  key={rol}
                  type="button"
                  onClick={() => toggleRol(rol)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors',
                    actief
                      ? 'border-transparent bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  )}
                >
                  {rol}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          {!initial ? (
            <Button type="button" variant="secondary" onClick={() => verwerk(false)} loading={saving}>
              Nog een toevoegen
            </Button>
          ) : null}
          <Button type="submit" loading={saving}>{initial ? 'Opslaan' : 'Toevoegen'}</Button>
        </div>
      </form>
    </Modal>
  )
}
