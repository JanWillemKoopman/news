'use client'

import * as React from 'react'
import { ArrowLeft, CalendarHeart, CheckCircle2, Plus } from 'lucide-react'

import { afleidProvincie } from '@/lib/bruiloft/geo'
import { BUDGET_CATEGORIEEN, GASTTYPES, VENDOR_TYPES } from '@/lib/bruiloft/options'
import type { CeremonieType, VoortgangCategorie, VoortgangStatus, WeddingInput } from '@/lib/bruiloft/types'
import { useToast } from '@/components/bruiloft/ui'
import { useBruiloftStore } from '@/store/bruiloftStore'

const BUDGET_PRESETS = [
  { label: '< €10.000', value: 9000 },
  { label: '€10.000 – €15.000', value: 12500 },
  { label: '€15.000 – €25.000', value: 20000 },
  { label: '€25.000 – €40.000', value: 32500 },
  { label: '> €40.000', value: 50000 },
]

const VOORTGANG_ITEMS: { key: VoortgangCategorie; label: string }[] = [
  { key: 'locatie', label: 'Trouwlocatie' },
  { key: 'fotograaf', label: 'Fotograaf' },
  { key: 'catering', label: 'Catering' },
  { key: 'trouwambtenaar', label: 'Trouwambtenaar / Babs' },
  { key: 'trouwkleding', label: 'Trouwkleding' },
  { key: 'dj_of_band', label: 'DJ of band' },
  { key: 'videograaf', label: 'Videograaf' },
  { key: 'bloemist', label: 'Bloemist' },
]

const DEFAULT_GEREGELDE_ZAKEN: Partial<Record<VoortgangCategorie, VoortgangStatus>> =
  Object.fromEntries(VOORTGANG_ITEMS.map(({ key }) => [key, 'te_doen' as VoortgangStatus]))

const CEREMONIE_OPTIES: { value: CeremonieType; label: string }[] = [
  { value: 'gemeentelijk', label: 'Gemeentelijk' },
  { value: 'religieus', label: 'Religieus' },
  { value: 'symbolisch', label: 'Symbolisch' },
]

const inputCls =
  'w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

export function WeddingCreate({ existing }: { existing: boolean }) {
  const cancelNewWedding = useBruiloftStore((s) => s.cancelNewWedding)
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
          <button
            className="mx-auto mt-8 flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            Trouwplan aanmaken
          </button>
        </div>
      </div>
    )
  }

  return (
    <WeddingCreateForm onCancel={existing ? cancelNewWedding : () => setShowForm(false)} />
  )
}

type Step = 'basic' | 'details'

function WeddingCreateForm({ onCancel }: { onCancel: () => void }) {
  const setupWedding = useBruiloftStore((s) => s.setupWedding)
  const { toast } = useToast()

  const [step, setStep] = React.useState<Step>('basic')
  const [partner1, setPartner1] = React.useState('')
  const [partner2, setPartner2] = React.useState('')
  const [trouwdatum, setTrouwdatum] = React.useState('')
  const [noDateYet, setNoDateYet] = React.useState(false)
  const [woonplaats, setWoonplaats] = React.useState('')
  const [budget, setBudget] = React.useState<number | null>(null)
  const [customBudget, setCustomBudget] = React.useState('')
  const [gasten, setGasten] = React.useState('')
  const [ceremonietype, setCeremonietype] = React.useState<CeremonieType | null>(null)
  const [geregeldeZaken, setGeregeldeZaken] = React.useState<
    Partial<Record<VoortgangCategorie, VoortgangStatus>>
  >(DEFAULT_GEREGELDE_ZAKEN)
  const [maakBudget, setMaakBudget] = React.useState(true)
  const [bezig, setBezig] = React.useState(false)

  const canGoNext =
    partner1.trim() !== '' && partner2.trim() !== '' && (noDateYet || trouwdatum !== '')

  // 'Niet nodig' wordt als volwaardige status opgeslagen (i.p.v. de categorie
  // te wissen), zodat de takenvoorstellen en budget-kaartjes de keuze later
  // kunnen respecteren. Nogmaals klikken zet terug op 'Te doen'.
  function setVoortgang(key: VoortgangCategorie, status: VoortgangStatus) {
    setGeregeldeZaken((prev) => ({
      ...prev,
      [key]: status === 'niet_van_toepassing' && prev[key] === 'niet_van_toepassing' ? 'te_doen' : status,
    }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (bezig) return
    setBezig(true)
    const input: WeddingInput = {
      partner1Naam: partner1.trim(),
      partner2Naam: partner2.trim(),
      trouwdatum: noDateYet ? '' : trouwdatum,
      locatie: '',
      woonplaats: woonplaats.trim(),
      provincie: afleidProvincie(woonplaats) ?? '',
      totaalBudget: Math.max(0, customBudget ? Number(customBudget) || 0 : budget ?? 0),
      aantalDaggasten: Math.max(0, Number(gasten) || 0),
      aantalAvondgasten: 0,
      ceremonietype,
      geregeldeZaken,
      takenVoorstellen: { beslist: {}, afgerond: false },
      budgetCategorieen: [...BUDGET_CATEGORIEEN],
      vendorCategorieen: [...VENDOR_TYPES],
      gasttypeCategorieen: [...GASTTYPES],
    }
    try {
      await setupWedding(input, { maakTaken: true, maakBudget })
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

  const naam1 = partner1.trim()
  const naam2 = partner2.trim()
  const begroeting =
    naam1 && naam2 ? `Hoi ${naam1} & ${naam2}!` : naam1 ? `Hoi ${naam1}!` : 'Bijna klaar!'

  return (
    <div className="relative flex min-h-[100dvh]">
      {/* Navy left panel */}
      <div className="hidden md:block md:w-[40%] bg-rhino-950" aria-hidden />

      {/* Right: form content */}
      <div className="flex w-full flex-col md:w-[60%]">
        <div className="px-8 pt-8 md:px-12 md:pt-10">
          <button
            type="button"
            onClick={step === 'details' ? () => setStep('basic') : onCancel}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 'details' ? 'Terug' : 'Annuleren'}
          </button>
        </div>

        <div className="flex flex-1 items-start justify-center overflow-y-auto px-8 py-10 md:px-12 lg:px-16">
          {step === 'basic' ? (
            <div className="w-full max-w-sm">
              <div className="mb-6">
                <h2 className="font-serif text-[1.75rem] font-medium leading-tight tracking-tight text-gray-900">
                  Nieuw trouwplan
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                  Vul jullie namen en de trouwdatum in om te beginnen.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (canGoNext) setStep('details')
                }}
                className="space-y-5"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="wc-p1"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Jouw naam <span className="text-primary">*</span>
                    </label>
                    <input
                      id="wc-p1"
                      type="text"
                      autoFocus
                      autoComplete="given-name"
                      placeholder="Bijv. Sanne"
                      value={partner1}
                      onChange={(e) => setPartner1(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="wc-p2"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Naam van je partner <span className="text-primary">*</span>
                    </label>
                    <input
                      id="wc-p2"
                      type="text"
                      autoComplete="off"
                      placeholder="Bijv. Tom"
                      value={partner2}
                      onChange={(e) => setPartner2(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="wc-datum"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Trouwdatum <span className="text-primary">*</span>
                  </label>
                  <input
                    id="wc-datum"
                    type="date"
                    disabled={noDateYet}
                    value={trouwdatum}
                    onChange={(e) => setTrouwdatum(e.target.value)}
                    className={`${inputCls} disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`}
                  />
                  <label className="mt-2 flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={noDateYet}
                      onChange={(e) => {
                        setNoDateYet(e.target.checked)
                        if (e.target.checked) setTrouwdatum('')
                      }}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-xs text-gray-500">Datum nog niet bekend</span>
                  </label>
                  {noDateYet ? (
                    <p className="mt-1.5 text-xs leading-relaxed text-gray-400">
                      Geen probleem — we plannen dan zonder deadlines en aftelteller. Zodra
                      jullie een datum hebben, rekent alles automatisch mee.
                    </p>
                  ) : null}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!canGoNext}
                    className="flex h-11 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Volgende →
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="w-full max-w-sm">
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                  <p className="text-sm font-medium text-emerald-700">Basisgegevens ingevuld!</p>
                </div>
                <h2 className="font-serif text-[1.75rem] font-medium leading-tight tracking-tight text-gray-900">
                  {begroeting}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                  Vul in wat jullie al weten — alles is later nog aan te passen.
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="wc-woonplaats"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Woonplaats
                  </label>
                  <input
                    id="wc-woonplaats"
                    type="text"
                    autoFocus
                    autoComplete="address-level2"
                    placeholder="Bijv. Utrecht"
                    value={woonplaats}
                    onChange={(e) => setWoonplaats(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label
                    htmlFor="wc-budget"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Budget (€)
                  </label>
                  <input
                    id="wc-budget"
                    type="number"
                    min={0}
                    placeholder="Bijv. 20000"
                    value={customBudget}
                    onChange={(e) => {
                      setCustomBudget(e.target.value)
                      setBudget(null)
                    }}
                    className={inputCls}
                  />
                  <p className="mt-3 mb-2 text-xs font-medium text-gray-500">Of globale schatting</p>
                  <div className="grid grid-cols-2 gap-2">
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
                              : 'border-gray-200 text-gray-500 hover:border-primary/40 hover:bg-gray-50'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="wc-gasten"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Verwacht aantal gasten totaal
                  </label>
                  <input
                    id="wc-gasten"
                    type="number"
                    min={0}
                    placeholder="Bijv. 100"
                    value={gasten}
                    onChange={(e) => setGasten(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <p className="mb-1.5 text-sm font-medium text-gray-700">
                    Wat voor ceremonie wordt het?
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {CEREMONIE_OPTIES.map(({ value, label }) => {
                      const active = ceremonietype === value
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setCeremonietype(active ? null : value)}
                          className={`rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                            active
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-gray-200 text-gray-500 hover:border-primary/40 hover:bg-gray-50'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">
                    Weten jullie het nog niet? Sla deze vraag gewoon over.
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-sm font-medium text-gray-700">
                    Wat hebben jullie al geregeld?
                  </p>
                  <p className="mb-2 text-xs text-gray-500">
                    Pas aan wat afwijkt — de rest staat al op &apos;Te doen&apos;.
                  </p>
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    {VOORTGANG_ITEMS.map(({ key, label }, i) => {
                      const current = geregeldeZaken[key]
                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between px-3 py-2.5 ${i !== 0 ? 'border-t border-gray-100' : ''}`}
                        >
                          <span className="text-sm text-gray-700">{label}</span>
                          <div className="flex gap-1">
                            {(
                              [
                                { status: 'geboekt' as const, label: 'Geboekt' },
                                { status: 'te_doen' as const, label: 'Te doen' },
                                {
                                  status: 'niet_van_toepassing' as const,
                                  label: 'Niet nodig',
                                },
                              ] as const
                            ).map(({ status, label: btnLabel }) => {
                              const isActive = current === status
                              return (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => setVoortgang(key, status)}
                                  className={`flex items-center gap-0.5 rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                                    isActive
                                      ? status === 'geboekt'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : status === 'niet_van_toepassing'
                                          ? 'bg-gray-100 text-gray-500'
                                          : 'bg-gray-100 text-gray-700'
                                      : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                                  }`}
                                >
                                  {isActive && status === 'geboekt' && (
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                  )}
                                  {btnLabel}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      id="wc-budget-kaartjes"
                      type="checkbox"
                      checked={maakBudget}
                      onChange={(e) => setMaakBudget(e.target.checked)}
                      className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div>
                      <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-gray-800">
                        Budget-kaartjes aanmaken
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                          Aanbevolen
                        </span>
                      </span>
                      <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                        We zetten alvast kaartjes klaar met richtbedragen op basis van jullie
                        budget.
                      </p>
                    </div>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={bezig}
                  className="flex h-11 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bezig ? 'Even geduld…' : 'Maak ons trouwplan'}
                </button>

                <p className="text-center text-xs text-gray-400">
                  Alle velden zijn optioneel — je kunt dit later altijd aanpassen.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
