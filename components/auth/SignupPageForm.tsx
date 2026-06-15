'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, MapPin, Users, Wallet } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import type { CeremonieType, VoortgangCategorie, VoortgangStatus, WeddingInput } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { mapAuthError, safeNext } from './authErrors'

/* ─── Wizard constants ──────────────────────────────────────────── */

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

const CEREMONIE_OPTIES: { value: CeremonieType; label: string; omschrijving: string }[] = [
  { value: 'gemeentelijk', label: 'Gemeentelijk', omschrijving: 'Stadhuis of buitenlocatie met trouwambtenaar' },
  { value: 'religieus', label: 'Religieus', omschrijving: 'Kerk, moskee of andere gebedsruimte' },
  { value: 'symbolisch', label: 'Symbolisch', omschrijving: 'Zonder wettige binding, puur ceremonieel' },
]

const BUDGET_PRESETS = [
  { label: '< €10.000', value: 9000 },
  { label: '€10.000 – €15.000', value: 12500 },
  { label: '€15.000 – €25.000', value: 20000 },
  { label: '€25.000 – €40.000', value: 32500 },
  { label: '> €40.000', value: 50000 },
]

type WizardSubStep = 'woonplaats' | 'budget' | 'gasten' | 'voortgang'
const WIZARD_SUB_STEPS: WizardSubStep[] = ['woonplaats', 'budget', 'gasten', 'voortgang']

/* ─── Steps indicator ──────────────────────────────────────────── */

function StepItem({
  number,
  label,
  active,
  completed,
}: {
  number: number
  label: string
  active: boolean
  completed: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <span
        className={`text-[11px] font-semibold uppercase tracking-widest ${
          active || completed ? 'text-primary' : 'text-gray-400'
        }`}
      >
        Stap {number}
      </span>
      <div
        className={`h-0.5 w-full ${active || completed ? 'bg-primary' : 'bg-gray-200'}`}
        aria-hidden
      />
      <span
        className={`text-xs font-medium ${
          active ? 'text-gray-900' : completed ? 'text-gray-600' : 'text-gray-400'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

function StepsBar({ current }: { current: 1 | 2 }) {
  const steps: { label: string }[] = [
    { label: 'Profiel aanmaken' },
    { label: 'Trouwplan opstellen' },
  ]

  return (
    <div className="flex items-stretch gap-6 px-8 pt-8 pb-4 md:px-12 md:pt-10">
      {steps.map((s, i) => (
        <div key={i} className="flex-1">
          <StepItem
            number={i + 1}
            label={s.label}
            active={current === i + 1}
            completed={current > i + 1}
          />
        </div>
      ))}
    </div>
  )
}

/* ─── Email confirmed state ─────────────────────────────────────── */

function ConfirmationState({ email, next }: { email: string; next: string }) {
  return (
    <div className="flex flex-col gap-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <svg
          className="h-8 w-8 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <div>
        <h2 className="font-serif text-2xl font-medium text-gray-900">
          Bevestig je e-mailadres
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          We hebben een bevestigingslink gestuurd naar{' '}
          <strong className="text-gray-700">{email}</strong>.
          Klik op de link om je account te activeren.
        </p>
      </div>
      <p className="text-sm text-gray-400">
        Geen mail ontvangen?{' '}
        <Link
          href={next ? `/inloggen?next=${encodeURIComponent(next)}` : '/inloggen'}
          className="font-medium text-primary hover:underline"
        >
          Terug naar inloggen
        </Link>
      </p>
    </div>
  )
}

/* ─── Profile wizard (step 2) ───────────────────────────────────── */

function ProfileWizard({
  partner1Naam,
  partner2Naam,
  trouwdatum,
}: {
  partner1Naam: string
  partner2Naam: string
  trouwdatum: string | null
}) {
  const setupWedding = useBruiloftStore((s) => s.setupWedding)
  const router = useRouter()

  const [subStep, setSubStep] = React.useState<WizardSubStep>('woonplaats')
  const [woonplaats, setWoonplaats] = React.useState('')
  const [budget, setBudget] = React.useState<number | null>(null)
  const [customBudget, setCustomBudget] = React.useState('')
  const [daggasten, setDaggasten] = React.useState('')
  const [avondgasten, setAvondgasten] = React.useState('')
  const [ceremonietype, setCeremonietype] = React.useState<CeremonieType | null>(null)
  const [geregeldeZaken, setGeregeldeZaken] = React.useState<
    Partial<Record<VoortgangCategorie, VoortgangStatus>>
  >({})
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const subStepIndex = WIZARD_SUB_STEPS.indexOf(subStep)
  const isLastSubStep = subStep === 'voortgang'

  function setVoortgang(key: VoortgangCategorie, status: VoortgangStatus) {
    setGeregeldeZaken((prev) => {
      if (prev[key] === status) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: status }
    })
  }

  function prevSubStep() {
    if (subStep === 'budget') setSubStep('woonplaats')
    else if (subStep === 'gasten') setSubStep('budget')
    else if (subStep === 'voortgang') setSubStep('gasten')
  }

  function nextSubStep() {
    if (subStep === 'woonplaats') setSubStep('budget')
    else if (subStep === 'budget') setSubStep('gasten')
    else if (subStep === 'gasten') setSubStep('voortgang')
    else finish()
  }

  async function finish() {
    if (saving) return
    setSaving(true)
    setError(null)
    const input: WeddingInput = {
      partner1Naam: partner1Naam.trim() || 'Partner 1',
      partner2Naam: partner2Naam.trim() || 'Partner 2',
      trouwdatum: trouwdatum ?? '',
      locatie: '',
      woonplaats: woonplaats.trim(),
      totaalBudget: customBudget ? Number(customBudget) || 0 : budget ?? 0,
      aantalDaggasten: Number(daggasten) || 0,
      aantalAvondgasten: Number(avondgasten) || 0,
      ceremonietype,
      geregeldeZaken,
      takenVoorstellen: { beslist: {}, afgerond: false },
    }
    try {
      await setupWedding(input)
      router.push('/bruiloft')
    } catch {
      setSaving(false)
      setError('Het aanmaken van jullie trouwplan is mislukt. Controleer je verbinding en probeer het opnieuw.')
    }
  }

  const inputCls =
    'w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

  return (
    <div className="w-full max-w-sm">
      {/* Sub-step progress dots */}
      <div className="mb-8 flex items-center gap-2">
        {WIZARD_SUB_STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i <= subStepIndex ? 'flex-1 bg-primary' : 'w-6 bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Woonplaats */}
      {subStep === 'woonplaats' && (
        <div>
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="h-5 w-5" />
          </div>
          <h2 className="font-serif text-2xl font-medium text-gray-900">
            Waar wonen jullie?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            We gebruiken dit voor gepersonaliseerde aanbevelingen in jullie buurt. Je kunt dit later altijd aanpassen.
          </p>
          <div className="mt-6">
            <label htmlFor="wiz-woonplaats" className="mb-1.5 block text-xs font-medium text-gray-700">
              Woonplaats
            </label>
            <input
              id="wiz-woonplaats"
              type="text"
              autoFocus
              autoComplete="address-level2"
              placeholder="Bijv. Utrecht"
              value={woonplaats}
              onChange={(e) => setWoonplaats(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      )}

      {/* Budget */}
      {subStep === 'budget' && (
        <div>
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <h2 className="font-serif text-2xl font-medium text-gray-900">
            Wat is jullie globale budget?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            Geen zorgen — dit kun je later altijd aanpassen.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2">
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
                  className={`rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all ${
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
          <div className="mt-3">
            <label htmlFor="wiz-budget" className="mb-1.5 block text-xs font-medium text-gray-700">
              Of voer een bedrag in (€)
            </label>
            <input
              id="wiz-budget"
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
          </div>
        </div>
      )}

      {/* Gasten */}
      {subStep === 'gasten' && (
        <div>
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="font-serif text-2xl font-medium text-gray-900">
            Hoeveel gasten verwachten jullie?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            Een schatting is genoeg — je kunt dit later makkelijk aanpassen.
          </p>
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="wiz-daggasten" className="mb-1.5 block text-xs font-medium text-gray-700">
                Aantal daggasten
              </label>
              <input
                id="wiz-daggasten"
                type="number"
                min={0}
                autoFocus
                placeholder="Bijv. 80"
                value={daggasten}
                onChange={(e) => setDaggasten(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="wiz-avondgasten" className="mb-1.5 block text-xs font-medium text-gray-700">
                Aantal avondgasten
              </label>
              <input
                id="wiz-avondgasten"
                type="number"
                min={0}
                placeholder="Bijv. 40"
                value={avondgasten}
                onChange={(e) => setAvondgasten(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>
      )}

      {/* Voortgang */}
      {subStep === 'voortgang' && (
        <div>
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
          <h2 className="font-serif text-2xl font-medium text-gray-900">
            Wat hebben jullie al geregeld?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            Dit helpt ons jullie takenlijst te personaliseren. Sla gerust over als je het nog niet weet.
          </p>

          {/* Ceremony type */}
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Type ceremonie
            </p>
            <div className="grid grid-cols-3 gap-2">
              {CEREMONIE_OPTIES.map(({ value, label, omschrijving }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCeremonietype(ceremonietype === value ? null : value)}
                  className={`rounded-xl border-2 px-2 py-2.5 text-left transition-all ${
                    ceremonietype === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 text-gray-500 hover:border-primary/40 hover:bg-gray-50'
                  }`}
                >
                  <span className="block text-xs font-semibold">{label}</span>
                  <span className="mt-0.5 block text-[10px] leading-snug opacity-70">{omschrijving}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Vendors checklist */}
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Leveranciers
            </p>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              {VOORTGANG_ITEMS.map(({ key, label }, i) => {
                const current = geregeldeZaken[key]
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between px-3 py-2.5 ${i !== 0 ? 'border-t border-gray-100' : ''}`}
                  >
                    <span className="text-xs font-medium text-gray-700">{label}</span>
                    <div className="flex gap-1">
                      {(
                        [
                          { status: 'geboekt' as VoortgangStatus, label: 'Geboekt' },
                          { status: 'bezig' as VoortgangStatus, label: 'Bezig' },
                          { status: 'te_doen' as VoortgangStatus, label: 'Te doen' },
                        ] as const
                      ).map(({ status, label: btnLabel }) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setVoortgang(key, status)}
                          className={`flex items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium transition-all ${
                            current === status
                              ? status === 'geboekt'
                                ? 'bg-green-100 text-green-700'
                                : status === 'bezig'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-700'
                              : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                          }`}
                        >
                          {current === status && status === 'geboekt' && (
                            <CheckCircle2 className="h-2.5 w-2.5" />
                          )}
                          {btnLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error ? (
        <p className="mt-4 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {/* Navigation */}
      <div className="mt-8 flex items-center gap-3">
        {subStepIndex > 0 && (
          <button
            type="button"
            onClick={prevSubStep}
            disabled={saving}
            className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            <ArrowLeft className="h-4 w-4" />
            Vorige
          </button>
        )}

        {!isLastSubStep && (
          <button
            type="button"
            onClick={nextSubStep}
            disabled={saving}
            className="h-10 flex-1 rounded-md border border-gray-200 px-4 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            Overslaan
          </button>
        )}

        <button
          type="button"
          onClick={isLastSubStep ? finish : nextSubStep}
          disabled={saving}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            'Even geduld…'
          ) : isLastSubStep ? (
            'Maak ons trouwplan'
          ) : (
            <>
              Volgende
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      {/* Step counter */}
      <p className="mt-4 text-center text-xs text-gray-400">
        Vraag {subStepIndex + 1} van {WIZARD_SUB_STEPS.length}
      </p>
    </div>
  )
}

/* ─── Main form ─────────────────────────────────────────────────── */

export function SignupPageForm({ next, prefillEmail }: { next?: string; prefillEmail?: string }) {
  const supabase = React.useMemo(() => createClient(), [])
  const router = useRouter()
  const target = safeNext(next)

  const [email, setEmail] = React.useState(prefillEmail ?? '')
  const [password, setPassword] = React.useState('')
  const [firstName, setFirstName] = React.useState('')
  const [partnerName, setPartnerName] = React.useState('')
  const [weddingDate, setWeddingDate] = React.useState('')
  const [noDateYet, setNoDateYet] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [needsConfirmation, setNeedsConfirmation] = React.useState(false)
  const [phase, setPhase] = React.useState<1 | 2>(1)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`,
        data: {
          display_name: firstName,
          partner_name: partnerName,
          wedding_date: noDateYet ? null : weddingDate || null,
        },
      },
    })

    if (signUpError) {
      setError(mapAuthError(signUpError.message))
      setLoading(false)
      return
    }

    // Probeer direct in te loggen zodat de gebruiker meteen verder kan.
    // Dit werkt wanneer e-mailbevestiging uitgeschakeld is in Supabase.
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      // E-mailbevestiging is vereist — toon de bevestigingsstap.
      setNeedsConfirmation(true)
      setLoading(false)
      return
    }

    // Gelukt: ga door naar stap 2 (trouwplan opstellen) in hetzelfde scherm.
    setLoading(false)
    setPhase(2)
  }

  return (
    <div className="flex min-h-screen">
      {/* Left: purple placeholder — will be replaced with an image */}
      <div
        className="hidden md:block md:w-[40%] bg-[#5B3A8A]"
        aria-hidden
      />

      {/* Right: steps + form */}
      <div className="flex w-full flex-col md:w-[60%]">
        <StepsBar current={phase} />

        <div className="flex flex-1 items-center justify-center px-8 py-10 md:px-12 lg:px-16">
          {phase === 1 ? (
            <div className="w-full max-w-sm">
              {needsConfirmation ? (
                <ConfirmationState email={email} next={next ?? ''} />
              ) : (
                <>
                  {/* Header */}
                  <div className="mb-8">
                    <h1 className="font-serif text-[2rem] font-medium leading-tight tracking-tight text-gray-900">
                      Profiel aanmaken
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">
                      Je bent bijna klaar om je trouwplan vorm te geven.
                      Vul je gegevens in en maak de mooiste dag van jullie leven onvergetelijk.
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={onSubmit} className="space-y-4" noValidate>
                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-gray-700">
                        Jouw e-mailadres <span className="text-primary">*</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-gray-700">
                        Wachtwoord <span className="text-primary">*</span>
                      </label>
                      <input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    {/* First names — side by side */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="firstName" className="mb-1.5 block text-xs font-medium text-gray-700">
                          Jouw voornaam <span className="text-primary">*</span>
                        </label>
                        <input
                          id="firstName"
                          type="text"
                          autoComplete="given-name"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label htmlFor="partnerName" className="mb-1.5 block text-xs font-medium text-gray-700">
                          Partner voornaam
                        </label>
                        <input
                          id="partnerName"
                          type="text"
                          autoComplete="off"
                          value={partnerName}
                          onChange={(e) => setPartnerName(e.target.value)}
                          className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    {/* Wedding date */}
                    <div>
                      <label htmlFor="weddingDate" className="mb-1.5 block text-xs font-medium text-gray-700">
                        Trouwdatum
                      </label>
                      <input
                        id="weddingDate"
                        type="date"
                        disabled={noDateYet}
                        value={weddingDate}
                        onChange={(e) => setWeddingDate(e.target.value)}
                        className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                      />
                      <label className="mt-2 flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={noDateYet}
                          onChange={(e) => {
                            setNoDateYet(e.target.checked)
                            if (e.target.checked) setWeddingDate('')
                          }}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-xs text-gray-500">Datum nog niet bekend</span>
                      </label>
                    </div>

                    {/* Error */}
                    {error ? (
                      <p className="text-sm font-medium text-red-600" role="alert">
                        {error}
                      </p>
                    ) : null}

                    {/* Buttons */}
                    <div className="flex items-center gap-3 pt-2">
                      <Link
                        href="/inloggen"
                        className="flex h-10 items-center justify-center rounded-md border border-gray-300 px-5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        Terug
                      </Link>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex h-10 flex-1 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? 'Even geduld…' : 'Maak mijn wedding planner aan'}
                      </button>
                    </div>
                  </form>

                  {/* Login link */}
                  <p className="mt-6 text-center text-xs text-gray-400">
                    Heb je al een account?{' '}
                    <Link
                      href={next ? `/inloggen?next=${encodeURIComponent(next)}` : '/inloggen'}
                      className="font-medium text-primary hover:underline"
                    >
                      Inloggen
                    </Link>
                  </p>
                </>
              )}
            </div>
          ) : (
            <ProfileWizard
              partner1Naam={firstName}
              partner2Naam={partnerName}
              trouwdatum={noDateYet ? null : weddingDate || null}
            />
          )}
        </div>
      </div>
    </div>
  )
}
