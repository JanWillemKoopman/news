'use client'

import * as React from 'react'

import { Button, Field, Input, Modal, useToast } from '@/components/bruiloft/ui'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { Wedding } from '@/lib/bruiloft/types'

interface WeddingSettingsFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wedding: Wedding
}

export function WeddingSettingsForm({ open, onOpenChange, wedding }: WeddingSettingsFormProps) {
  const updateWedding = useBruiloftStore((s) => s.updateWedding)
  const { toast } = useToast()

  const [form, setForm] = React.useState({
    partner1Naam: '',
    partner2Naam: '',
    trouwdatum: '',
    locatie: '',
    totaalBudget: '',
    aantalDaggasten: '',
    aantalAvondgasten: '',
  })

  React.useEffect(() => {
    if (open) {
      setForm({
        partner1Naam: wedding.partner1Naam,
        partner2Naam: wedding.partner2Naam,
        trouwdatum: wedding.trouwdatum,
        locatie: wedding.locatie,
        totaalBudget: String(wedding.totaalBudget || ''),
        aantalDaggasten: String(wedding.aantalDaggasten || ''),
        aantalAvondgasten: String(wedding.aantalAvondgasten || ''),
      })
    }
  }, [open, wedding])

  const update = (veld: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [veld]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    onOpenChange(false)
    try {
      await updateWedding({
        partner1Naam: form.partner1Naam.trim(),
        partner2Naam: form.partner2Naam.trim(),
        trouwdatum: form.trouwdatum,
        locatie: form.locatie.trim(),
        totaalBudget: Number(form.totaalBudget) || 0,
        aantalDaggasten: Number(form.aantalDaggasten) || 0,
        aantalAvondgasten: Number(form.aantalAvondgasten) || 0,
      })
      toast({ title: 'Gegevens opgeslagen', variant: 'success' })
    } catch {
      toast({ title: 'Opslaan mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Gegevens bewerken"
      description="Pas de basisgegevens van jullie bruiloft aan."
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Naam partner 1" htmlFor="s-p1">
            <Input id="s-p1" value={form.partner1Naam} onChange={update('partner1Naam')} required />
          </Field>
          <Field label="Naam partner 2" htmlFor="s-p2">
            <Input id="s-p2" value={form.partner2Naam} onChange={update('partner2Naam')} required />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Trouwdatum" htmlFor="s-datum">
            <Input id="s-datum" type="date" value={form.trouwdatum} onChange={update('trouwdatum')} required />
          </Field>
          <Field label="Locatie" htmlFor="s-loc">
            <Input id="s-loc" value={form.locatie} onChange={update('locatie')} />
          </Field>
        </div>
        <Field label="Totaalbudget (€)" htmlFor="s-budget">
          <Input
            id="s-budget"
            type="number"
            min={0}
            value={form.totaalBudget}
            onChange={update('totaalBudget')}
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Geschat aantal daggasten" htmlFor="s-dag">
            <Input id="s-dag" type="number" min={0} value={form.aantalDaggasten} onChange={update('aantalDaggasten')} />
          </Field>
          <Field label="Geschat aantal avondgasten" htmlFor="s-avond">
            <Input
              id="s-avond"
              type="number"
              min={0}
              value={form.aantalAvondgasten}
              onChange={update('aantalAvondgasten')}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button type="submit">Opslaan</Button>
        </div>
      </form>
    </Modal>
  )
}
