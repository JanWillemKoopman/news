'use client'

import * as React from 'react'
import { Heart } from 'lucide-react'

import {
  Button,
  Card,
  CardContent,
  Field,
  Input,
} from '@/components/bruiloft/ui'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { WeddingInput } from '@/lib/bruiloft/types'

export function WelcomeScreen() {
  const setupWedding = useBruiloftStore((s) => s.setupWedding)
  const [bezig, setBezig] = React.useState(false)

  const [form, setForm] = React.useState({
    partner1Naam: '',
    partner2Naam: '',
    trouwdatum: '',
    locatie: '',
    totaalBudget: '',
    aantalDaggasten: '',
    aantalAvondgasten: '',
  })

  const update = (veld: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setForm((f) => ({ ...f, [veld]: e.target.value }))

  const geldig =
    form.partner1Naam.trim() &&
    form.partner2Naam.trim() &&
    form.trouwdatum &&
    Number(form.totaalBudget) > 0

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!geldig || bezig) return
    setBezig(true)
    const input: WeddingInput = {
      partner1Naam: form.partner1Naam.trim(),
      partner2Naam: form.partner2Naam.trim(),
      trouwdatum: form.trouwdatum,
      locatie: form.locatie.trim(),
      totaalBudget: Number(form.totaalBudget) || 0,
      aantalDaggasten: Number(form.aantalDaggasten) || 0,
      aantalAvondgasten: Number(form.aantalAvondgasten) || 0,
    }
    await setupWedding(input)
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 pb-16 pt-6 md:pt-12">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Heart className="h-8 w-8" />
      </div>
      <h1 className="text-center font-serif text-4xl text-foreground md:text-5xl">
        Welkom bij jullie trouwplan
      </h1>
      <p className="mt-3 max-w-md text-center text-muted-foreground">
        Vertel ons het belangrijkste over jullie dag. We zetten meteen een
        persoonlijke takenlijst voor jullie klaar.
      </p>

      <Card className="mt-8 w-full">
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Naam partner 1" htmlFor="p1">
                <Input
                  id="p1"
                  value={form.partner1Naam}
                  onChange={update('partner1Naam')}
                  placeholder="Bijv. Sanne"
                  required
                />
              </Field>
              <Field label="Naam partner 2" htmlFor="p2">
                <Input
                  id="p2"
                  value={form.partner2Naam}
                  onChange={update('partner2Naam')}
                  placeholder="Bijv. Tom"
                  required
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Trouwdatum" htmlFor="datum">
                <Input
                  id="datum"
                  type="date"
                  value={form.trouwdatum}
                  onChange={update('trouwdatum')}
                  required
                />
              </Field>
              <Field label="Locatie (optioneel)" htmlFor="locatie">
                <Input
                  id="locatie"
                  value={form.locatie}
                  onChange={update('locatie')}
                  placeholder="Bijv. Landgoed De Horst"
                />
              </Field>
            </div>

            <Field label="Totaalbudget (€)" htmlFor="budget">
              <Input
                id="budget"
                type="number"
                min={0}
                value={form.totaalBudget}
                onChange={update('totaalBudget')}
                placeholder="Bijv. 20000"
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Geschat aantal daggasten" htmlFor="dag">
                <Input
                  id="dag"
                  type="number"
                  min={0}
                  value={form.aantalDaggasten}
                  onChange={update('aantalDaggasten')}
                  placeholder="Bijv. 60"
                />
              </Field>
              <Field label="Geschat aantal avondgasten" htmlFor="avond">
                <Input
                  id="avond"
                  type="number"
                  min={0}
                  value={form.aantalAvondgasten}
                  onChange={update('aantalAvondgasten')}
                  placeholder="Bijv. 120"
                />
              </Field>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={bezig}
              disabled={!geldig || bezig}
            >
              {bezig ? 'Bezig met aanmaken…' : 'Start ons trouwplan'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
