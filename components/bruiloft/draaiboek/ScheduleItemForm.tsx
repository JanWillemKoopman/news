'use client'

import * as React from 'react'

import { Button, ConfirmDialog, Field, Input, MeerDetails, Modal, Textarea } from '@/components/bruiloft/ui'
import { DRAAIBOEK_ROLLEN } from '@/lib/bruiloft/options'
import { capFirst, cn } from '@/lib/utils'
import type { Rol, ScheduleItem, ScheduleItemInput } from '@/lib/bruiloft/types'

type NewScheduleItem = Omit<ScheduleItemInput, 'weddingId'>

interface ScheduleItemFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: ScheduleItem | null
  defaultTijd?: string
  onSubmit: (data: NewScheduleItem) => void
}

function leeg(): NewScheduleItem {
  return { tijd: '', eindtijd: '', titel: '', omschrijving: '', locatie: '', betrokkenen: [] }
}

function vanItem(s: ScheduleItem): NewScheduleItem {
  return {
    tijd: s.tijd,
    eindtijd: s.eindtijd,
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
  defaultTijd,
  onSubmit,
}: ScheduleItemFormProps) {
  const [form, setForm] = React.useState<NewScheduleItem>(leeg)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const baseline = React.useRef<string>(JSON.stringify(leeg()))

  React.useEffect(() => {
    if (open) {
      const start = initial ? vanItem(initial) : { ...leeg(), tijd: defaultTijd ?? '' }
      setForm(start)
      baseline.current = JSON.stringify(start)
      setDetailsOpen(!!initial)
    }
  }, [open, initial, defaultTijd])

  const dirty = JSON.stringify(form) !== baseline.current

  const sluit = (o: boolean) => {
    if (!o && dirty) { setConfirmOpen(true); return }
    onOpenChange(o)
  }

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
    // Eindtijd mag leeg zijn, maar als ingevuld moet het na starttijd vallen.
    if (form.eindtijd && form.eindtijd <= form.tijd) return
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
    <>
    <Modal
      open={open}
      onOpenChange={sluit}
      title={initial ? 'Programmaonderdeel bewerken' : 'Programmaonderdeel toevoegen'}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => sluit(false)}>
            Annuleren
          </Button>
          {!initial ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => verwerk(false)}
              loading={saving}
            >
              Nog een toevoegen
            </Button>
          ) : null}
          <Button type="submit" form="schedule-item-form" className="w-full sm:w-auto" loading={saving}>
            {initial ? 'Opslaan' : 'Toevoegen'}
          </Button>
        </div>
      }
    >
      <form id="schedule-item-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starttijd" htmlFor="tijd">
            <Input
              id="tijd"
              type="time"
              autoFocus
              value={form.tijd}
              onChange={(e) => set('tijd', e.target.value)}
              required
            />
          </Field>
          <Field
            label="Eindtijd"
            htmlFor="eindtijd"
            error={form.eindtijd && form.eindtijd <= form.tijd ? 'Moet na starttijd vallen' : undefined}
          >
            <Input
              id="eindtijd"
              type="time"
              value={form.eindtijd}
              onChange={(e) => set('eindtijd', e.target.value)}
              min={form.tijd || undefined}
            />
          </Field>
        </div>
        <Field label="Titel" htmlFor="titel">
          <Input
            id="titel"
            value={form.titel}
            onChange={(e) => set('titel', e.target.value)}
            placeholder="Bijv. Ceremonie"
            required
          />
        </Field>

        <MeerDetails open={detailsOpen} onToggle={() => setDetailsOpen((v) => !v)}>
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
            <p className="mb-2 text-sm font-medium">Betrokkenen</p>
            <div className="flex flex-wrap gap-2">
              {DRAAIBOEK_ROLLEN.map((rol) => {
                const actief = form.betrokkenen.includes(rol)
                return (
                  <button
                    key={rol}
                    type="button"
                    onClick={() => toggleRol(rol)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      actief
                        ? 'border-transparent bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground hover:bg-accent'
                    )}
                  >
                    {capFirst(rol)}
                  </button>
                )
              })}
            </div>
          </div>
        </MeerDetails>
      </form>
    </Modal>
    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title="Wijzigingen verwerpen?"
      description="Je hebt niet-opgeslagen wijzigingen. Weet je zeker dat je wilt sluiten?"
      bevestigLabel="Verwerpen"
      onConfirm={() => onOpenChange(false)}
    />
    </>
  )
}
