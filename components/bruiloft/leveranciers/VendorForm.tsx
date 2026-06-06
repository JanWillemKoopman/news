'use client'

import * as React from 'react'

import {
  Button,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
  eigennaamInputProps,
} from '@/components/bruiloft/ui'
import { VENDOR_STATUSSEN, VENDOR_TYPES } from '@/lib/bruiloft/options'
import type { BudgetItem, Vendor, VendorInput } from '@/lib/bruiloft/types'

type NewVendor = Omit<VendorInput, 'weddingId'>

interface VendorFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Vendor | null
  budgetItems: BudgetItem[]
  onSubmit: (data: NewVendor) => void | Promise<void>
}

function leeg(): NewVendor {
  return {
    naam: '',
    type: 'locatie',
    status: 'te bezoeken',
    contactpersoon: '',
    telefoon: '',
    email: '',
    website: '',
    geoffreerdBedrag: 0,
    notitie: '',
    budgetItemId: undefined,
  }
}

function vanVendor(v: Vendor): NewVendor {
  return {
    naam: v.naam,
    type: v.type,
    status: v.status,
    contactpersoon: v.contactpersoon,
    telefoon: v.telefoon,
    email: v.email,
    website: v.website,
    geoffreerdBedrag: v.geoffreerdBedrag,
    notitie: v.notitie,
    budgetItemId: v.budgetItemId,
  }
}

export function VendorForm({
  open,
  onOpenChange,
  initial,
  budgetItems,
  onSubmit,
}: VendorFormProps) {
  const [form, setForm] = React.useState<NewVendor>(leeg)
  const [naamFout, setNaamFout] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setForm(initial ? vanVendor(initial) : leeg())
      setNaamFout(false)
    }
  }, [open, initial])

  const set = <K extends keyof NewVendor>(key: K, value: NewVendor[K]) => {
    if (key === 'naam' && naamFout) setNaamFout(false)
    setForm((f) => ({ ...f, [key]: value }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.naam.trim()) {
      setNaamFout(true)
      return
    }
    setSaving(true)
    try {
      await Promise.resolve(onSubmit({
        ...form,
        naam: form.naam.trim(),
        geoffreerdBedrag: Number(form.geoffreerdBedrag) || 0,
      }))
    } finally {
      setSaving(false)
    }
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'Leverancier bewerken' : 'Leverancier toevoegen'}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Naam"
          htmlFor="naam"
          required
          error={naamFout ? 'Vul een naam in' : undefined}
        >
          <Input
            id="naam"
            autoFocus
            value={form.naam}
            aria-invalid={naamFout || undefined}
            onChange={(e) => set('naam', e.target.value)}
            {...eigennaamInputProps}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" htmlFor="type">
            <Select
              id="type"
              value={form.type}
              onChange={(e) => set('type', e.target.value as NewVendor['type'])}
            >
              {VENDOR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="status">
            <Select
              id="status"
              value={form.status}
              onChange={(e) => set('status', e.target.value as NewVendor['status'])}
            >
              {VENDOR_STATUSSEN.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Contactpersoon" htmlFor="cp">
            <Input
              id="cp"
              value={form.contactpersoon}
              onChange={(e) => set('contactpersoon', e.target.value)}
              {...eigennaamInputProps}
            />
          </Field>
          <Field label="Telefoon" htmlFor="tel">
            <Input id="tel" type="tel" autoComplete="tel" value={form.telefoon} onChange={(e) => set('telefoon', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="E-mail" htmlFor="mail">
            <Input
              id="mail"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
          </Field>
          <Field label="Website" htmlFor="web">
            <Input id="web" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={form.website} onChange={(e) => set('website', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Offerteprijs (€)" htmlFor="bedrag">
            <Input
              id="bedrag"
              type="number"
              min={0}
              step="0.01"
              value={form.geoffreerdBedrag || ''}
              onChange={(e) => set('geoffreerdBedrag', Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Gekoppeld budgetitem" htmlFor="bud">
            <Select
              id="bud"
              value={form.budgetItemId ?? ''}
              onChange={(e) => set('budgetItemId', e.target.value || undefined)}
            >
              <option value="">Geen</option>
              {budgetItems.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.omschrijving || b.categorie}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Notitie" htmlFor="not">
          <Textarea
            id="not"
            value={form.notitie}
            onChange={(e) => set('notitie', e.target.value)}
            rows={3}
            placeholder="Offertedetails, indrukken, afspraken…"
          />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button type="submit" loading={saving}>{initial ? 'Opslaan' : 'Toevoegen'}</Button>
        </div>
      </form>
    </Modal>
  )
}
