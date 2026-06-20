'use client'

import * as React from 'react'

import { Button, Field, Input, Modal, Select, eigennaamInputProps, useToast } from '@/components/bruiloft/ui'
import { DateRoller } from '@/components/bruiloft/taken/DateRoller'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { PROVINCIES, afleidProvincie } from '@/lib/bruiloft/geo'
import { directeWijzigingsTip } from '@/lib/bruiloft/instantTip'
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
    woonplaats: '',
    provincie: '',
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
        woonplaats: wedding.woonplaats,
        provincie: wedding.provincie,
        totaalBudget: String(wedding.totaalBudget || ''),
        aantalDaggasten: String(wedding.aantalDaggasten || ''),
        aantalAvondgasten: String(wedding.aantalAvondgasten || ''),
      })
    }
  }, [open, wedding])

  const update = (veld: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [veld]: e.target.value }))

  // Vul de provincie automatisch in bij een herkende woonplaats, zolang de
  // gebruiker nog niets gekozen heeft. Frictieloos, maar altijd overschrijfbaar.
  const updateWoonplaats = (e: React.ChangeEvent<HTMLInputElement>) => {
    const woonplaats = e.target.value
    setForm((f) => {
      const afgeleid = afleidProvincie(woonplaats)
      return { ...f, woonplaats, provincie: f.provincie || afgeleid || '' }
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    onOpenChange(false)
    const nieuwBudget = Number(form.totaalBudget) || 0
    const nieuwDag = Number(form.aantalDaggasten) || 0
    const nieuwAvond = Number(form.aantalAvondgasten) || 0
    try {
      await updateWedding({
        partner1Naam: form.partner1Naam.trim(),
        partner2Naam: form.partner2Naam.trim(),
        trouwdatum: form.trouwdatum,
        locatie: form.locatie.trim(),
        woonplaats: form.woonplaats.trim(),
        provincie: form.provincie,
        totaalBudget: nieuwBudget,
        aantalDaggasten: nieuwDag,
        aantalAvondgasten: nieuwAvond,
      })
      toast({ title: 'Gegevens opgeslagen', variant: 'success' })

      // Directe, regelgebaseerde tip op het beslismoment — geen AI-call (#5).
      const budgetOfGastenGewijzigd =
        nieuwBudget !== wedding.totaalBudget ||
        nieuwDag !== wedding.aantalDaggasten ||
        nieuwAvond !== wedding.aantalAvondgasten
      if (budgetOfGastenGewijzigd) {
        const tip = directeWijzigingsTip({
          ...wedding,
          totaalBudget: nieuwBudget,
          aantalDaggasten: nieuwDag,
          aantalAvondgasten: nieuwAvond,
        })
        if (tip) toast({ title: tip.titel, description: tip.tekst })
      }
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Naam partner 1" htmlFor="s-p1">
            <Input id="s-p1" value={form.partner1Naam} onChange={update('partner1Naam')} required {...eigennaamInputProps} />
          </Field>
          <Field label="Naam partner 2" htmlFor="s-p2">
            <Input id="s-p2" value={form.partner2Naam} onChange={update('partner2Naam')} required {...eigennaamInputProps} />
          </Field>
        </div>
        <Field label="Trouwdatum">
          <DateRoller
            value={form.trouwdatum}
            onChange={(v) => setForm((f) => ({ ...f, trouwdatum: v }))}
          />
        </Field>
        <Field label="Trouwlocatie" htmlFor="s-loc">
          <Input
            id="s-loc"
            value={form.locatie}
            onChange={update('locatie')}
            placeholder="Bijv. Kasteel De Hooge Vuursche"
            {...eigennaamInputProps}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Woonplaats" htmlFor="s-woonplaats">
            <Input
              id="s-woonplaats"
              value={form.woonplaats}
              onChange={updateWoonplaats}
              placeholder="Bijv. Utrecht"
              {...eigennaamInputProps}
            />
          </Field>
          <Field label="Provincie" htmlFor="s-provincie">
            <Select
              id="s-provincie"
              value={form.provincie}
              onChange={(e) => setForm((f) => ({ ...f, provincie: e.target.value }))}
            >
              <option value="">Kies provincie</option>
              {PROVINCIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
