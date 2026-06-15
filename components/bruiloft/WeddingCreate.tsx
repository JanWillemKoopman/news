'use client'

import * as React from 'react'
import { ArrowLeft, ArrowRight, CalendarHeart, Heart, Plus } from 'lucide-react'

import { Button, Field, Input, MeerDetails, eigennaamInputProps, useToast } from '@/components/bruiloft/ui'
import type { WeddingInput } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

const BUDGET_PRESETS = [
  { label: '< €10.000', value: 9000 },
  { label: '€10.000 – €15.000', value: 12500 },
  { label: '€15.000 – €25.000', value: 20000 },
  { label: '€25.000 – €40.000', value: 32500 },
  { label: '> €40.000', value: 50000 },
]

// Aanmaak-scherm voor een trouwplan. Vervangt de oude takeover-wizard: eerst
// een rustige lege staat met één knop, daarna een compact formulier (namen +
// datum verplicht, rest optioneel). Account aanmaken gebeurt vooraf op
// /aanmelden; hier hoeft dat niet meer.
export function WeddingCreate({ existing }: { existing: boolean }) {
  const cancelNewWedding = useBruiloftStore((s) => s.cancelNewWedding)
  // Voor een extra plan (vanuit het accountmenu) tonen we meteen het formulier;
  // voor de eerste keer eerst de lege staat met uitleg.
  const [showForm, setShowForm] = React.useState(existing)

  if (!showForm) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarHeart className="h-7 w-7" />
          </span>
          <h1 className="mt-6 font-serif text-3xl text-foreground">Je hebt nog geen trouwplan</h1>
          <p className="mt-2 text-muted-foreground">
            Maak in een paar tellen een trouwplan aan. We zetten meteen een
            persoonlijke takenlijst en aftelteller voor jullie klaar.
          </p>
          <Button className="mt-8" size="lg" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Trouwplan aanmaken
          </Button>
        </div>
      </div>
    )
  }

  return (
    <WeddingCreateForm
      onCancel={existing ? cancelNewWedding : () => setShowForm(false)}
      cancelLabel={existing ? 'Annuleren' : 'Terug'}
    />
  )
}

function WeddingCreateForm({
  onCancel,
  cancelLabel,
}: {
  onCancel: () => void
  cancelLabel: string
}) {
  const setupWedding = useBruiloftStore((s) => s.setupWedding)
  const { toast } = useToast()

  const [partner1, setPartner1] = React.useState('')
  const [partner2, setPartner2] = React.useState('')
  const [trouwdatum, setTrouwdatum] = React.useState('')
  const [woonplaats, setWoonplaats] = React.useState('')
  const [budget, setBudget] = React.useState<number | null>(null)
  const [customBudget, setCustomBudget] = React.useState('')
  const [daggasten, setDaggasten] = React.useState('')
  const [avondgasten, setAvondgasten] = React.useState('')
  const [meer, setMeer] = React.useState(false)
  const [bezig, setBezig] = React.useState(false)

  const canSubmit =
    partner1.trim() !== '' && partner2.trim() !== '' && trouwdatum !== '' && !bezig

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBezig(true)
    const input: WeddingInput = {
      partner1Naam: partner1.trim(),
      partner2Naam: partner2.trim(),
      trouwdatum,
      locatie: '',
      woonplaats: woonplaats.trim(),
      totaalBudget: customBudget ? Number(customBudget) || 0 : budget ?? 0,
      aantalDaggasten: Number(daggasten) || 0,
      aantalAvondgasten: Number(avondgasten) || 0,
      ceremonietype: null,
      geregeldeZaken: {},
      takenVoorstellen: { beslist: {}, afgerond: false },
    }
    try {
      await setupWedding(input)
    } catch {
      setBezig(false)
      toast({
        title: 'Aanmaken mislukt',
        description:
          'We konden jullie trouwplan niet aanmaken. Controleer je verbinding en probeer het opnieuw.',
        variant: 'error',
      })
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {cancelLabel}
        </button>
        <span className="flex items-center gap-2 font-serif text-base text-foreground">
          <Heart className="h-4 w-4 text-primary" />
          Ons Trouwplan
        </span>
        <div className="w-16" />
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <form onSubmit={onSubmit} className="w-full max-w-lg">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CalendarHeart className="h-6 w-6" />
          </div>
          <h2 className="font-serif text-3xl text-foreground">Nieuw trouwplan</h2>
          <p className="mt-2 text-muted-foreground">
            Vul jullie namen en de trouwdatum in. De rest stel je later rustig samen.
          </p>

          <div className="mt-8 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Jouw naam" htmlFor="wc-p1" required>
                <Input
                  id="wc-p1"
                  value={partner1}
                  onChange={(e) => setPartner1(e.target.value)}
                  placeholder="Bijv. Sanne"
                  autoFocus
                  {...eigennaamInputProps}
                />
              </Field>
              <Field label="Naam van je partner" htmlFor="wc-p2" required>
                <Input
                  id="wc-p2"
                  value={partner2}
                  onChange={(e) => setPartner2(e.target.value)}
                  placeholder="Bijv. Tom"
                  {...eigennaamInputProps}
                />
              </Field>
            </div>

            <Field label="Trouwdatum" htmlFor="wc-datum" required>
              <Input
                id="wc-datum"
                type="date"
                value={trouwdatum}
                onChange={(e) => setTrouwdatum(e.target.value)}
              />
            </Field>

            <MeerDetails open={meer} onToggle={() => setMeer((v) => !v)}>
              <Field label="Woonplaats" htmlFor="wc-woonplaats">
                <Input
                  id="wc-woonplaats"
                  value={woonplaats}
                  onChange={(e) => setWoonplaats(e.target.value)}
                  placeholder="Bijv. Utrecht"
                  {...eigennaamInputProps}
                />
              </Field>

              <div>
                <p className="mb-1.5 block text-sm font-medium text-foreground">Globaal budget</p>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {BUDGET_PRESETS.map(({ label, value }) => {
                    const active = budget === value && !customBudget
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          setBudget(value)
                          setCustomBudget('')
                        }}
                        className={`rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-accent'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <Field label="Of voer een bedrag in (€)" htmlFor="wc-budget">
                <Input
                  id="wc-budget"
                  type="number"
                  min={0}
                  value={customBudget}
                  onChange={(e) => {
                    setCustomBudget(e.target.value)
                    setBudget(null)
                  }}
                  placeholder="Bijv. 20000"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Aantal daggasten" htmlFor="wc-daggasten">
                  <Input
                    id="wc-daggasten"
                    type="number"
                    min={0}
                    value={daggasten}
                    onChange={(e) => setDaggasten(e.target.value)}
                    placeholder="Bijv. 80"
                  />
                </Field>
                <Field label="Aantal avondgasten" htmlFor="wc-avondgasten">
                  <Input
                    id="wc-avondgasten"
                    type="number"
                    min={0}
                    value={avondgasten}
                    onChange={(e) => setAvondgasten(e.target.value)}
                    placeholder="Bijv. 40"
                  />
                </Field>
              </div>
            </MeerDetails>
          </div>

          <div className="mt-8 flex justify-end">
            <Button type="submit" disabled={!canSubmit} loading={bezig} size="lg">
              Maak ons trouwplan
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
