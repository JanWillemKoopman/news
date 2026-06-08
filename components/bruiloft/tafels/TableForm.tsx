'use client'

import * as React from 'react'

import { Button, ConfirmDialog, Field, Input, Modal, Select } from '@/components/bruiloft/ui'
import { TAFEL_VORMEN } from '@/lib/bruiloft/options'
import type { Table, TableInput } from '@/lib/bruiloft/types'

type NewTable = Omit<TableInput, 'weddingId'>

interface TableFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Table | null
  onSubmit: (data: NewTable) => void
}

function leeg(): NewTable {
  return { naam: '', vorm: 'rond', capaciteit: 8 }
}

export function TableForm({ open, onOpenChange, initial, onSubmit }: TableFormProps) {
  const [form, setForm] = React.useState<NewTable>(leeg)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const baseline = React.useRef<string>(JSON.stringify(leeg()))

  React.useEffect(() => {
    if (open) {
      const start = initial
        ? { naam: initial.naam, vorm: initial.vorm, capaciteit: initial.capaciteit }
        : leeg()
      setForm(start)
      baseline.current = JSON.stringify(start)
    }
  }, [open, initial])

  const dirty = JSON.stringify(form) !== baseline.current

  const sluit = (o: boolean) => {
    if (!o && dirty) { setConfirmOpen(true); return }
    onOpenChange(o)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.naam.trim()) return
    onSubmit({ ...form, naam: form.naam.trim(), capaciteit: Number(form.capaciteit) || 0 })
    onOpenChange(false)
  }

  return (
    <>
    <Modal open={open} onOpenChange={sluit} title={initial ? 'Tafel bewerken' : 'Tafel toevoegen'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Naam" htmlFor="naam">
          <Input
            id="naam"
            autoFocus
            value={form.naam}
            onChange={(e) => setForm((f) => ({ ...f, naam: e.target.value }))}
            placeholder="Bijv. Tafel 1 / Familie"
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vorm" htmlFor="vorm">
            <Select
              id="vorm"
              value={form.vorm}
              onChange={(e) => setForm((f) => ({ ...f, vorm: e.target.value as NewTable['vorm'] }))}
            >
              {TAFEL_VORMEN.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Capaciteit" htmlFor="cap">
            <Input
              id="cap"
              type="number"
              min={1}
              value={form.capaciteit || ''}
              onChange={(e) => setForm((f) => ({ ...f, capaciteit: Number(e.target.value) || 0 }))}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => sluit(false)}>
            Annuleren
          </Button>
          <Button type="submit">{initial ? 'Opslaan' : 'Toevoegen'}</Button>
        </div>
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
