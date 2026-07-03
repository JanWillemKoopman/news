'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { CheckCircle2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { afleidProvincie } from '@/lib/bruiloft/geo'
import { BUDGET_CATEGORIEEN, VENDOR_TYPES } from '@/lib/bruiloft/options'
import type { VoortgangCategorie, VoortgangStatus, WeddingInput } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'
import { PasswordInput } from '@/components/ui/password-input'

import { mapAuthError, safeNext } from './authErrors'

type Phase = 'account' | 'keuze' | 'wizard'

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

const BUDGET_PRESETS = [
  { label: '< €10.000', value: 9000 },
  { label: '€10.000 – €15.000', value: 12500 },
  { label: '€15.000 – €25.000', value: 20000 },
  { label: '€25.000 – €40.000', value: 32500 },
  { label: '> €40.000', value: 50000 },
]

/* ─── Steps indicator ──────────────────────────────────────────────── */

function StepsBar({ current }: { current: Phase }) {
  const steps = ['Account aanmaken', 'Trouwplan opstellen']
  // 'account' = stap 1 actief; 'keuze'/'wizard' = stap 1 klaar, stap 2 actief
  const stepIndex = current === 'account' ? 0 : 1
  return (
    <div className="flex gap-6 px-8 pt-8 pb-4 md:px-12 md:pt-10">
      {steps.map((label, i) => {
        const active = stepIndex === i
        const completed = stepIndex > i
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <span
              className={`text-[11px] font-semibold uppercase tracking-widest ${
                active || completed ? 'text-primary' : 'text-gray-400'
              }`}
            >
              Stap {i + 1}
            </span>
            <div className={`h-0.5 w-full ${active || completed ? 'bg-primary' : 'bg-gray-200'}`} aria-hidden />
            <span className={`text-xs font-medium ${active ? 'text-gray-900' : completed ? 'text-gray-600' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Email confirmation state ──────────────────────────────────────── */

function ConfirmationState({ email, next }: { email: string; next: string }) {
  return (
    <div className="flex flex-col gap-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <div>
        <h2 className="font-serif text-2xl font-medium text-gray-900">Bevestig je e-mailadres</h2>
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

/* ─── Step 2: wedding setup ─────────────────────────────────────────── */

// Standaard staan alle leverancier-categorieën op 'te_doen'. Gebruikers
// hoeven alleen aan te geven wat al geregeld is of niet van toepassing is.
const DEFAULT_GEREGELDE_ZAKEN: Partial<Record<VoortgangCategorie, VoortgangStatus>> =
  Object.fromEntries(VOORTGANG_ITEMS.map(({ key }) => [key, 'te_doen' as VoortgangStatus]))

function WeddingSetup({
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
  const supabase = React.useMemo(() => createClient(), [])

  const [woonplaats, setWoonplaats] = React.useState('')
  const [budget, setBudget] = React.useState<number | null>(null)
  const [customBudget, setCustomBudget] = React.useState('')
  const [gasten, setGasten] = React.useState('')
  const [geregeldeZaken, setGeregeldeZaken] = React.useState<Partial<Record<VoortgangCategorie, VoortgangStatus>>>(DEFAULT_GEREGELDE_ZAKEN)
  const [nietNodig, setNietNodig] = React.useState<Set<VoortgangCategorie>>(new Set())
  const [maakBudget, setMaakBudget] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function setVoortgang(key: VoortgangCategorie, status: VoortgangStatus | 'niet_van_toepassing') {
    if (status === 'niet_van_toepassing') {
      setNietNodig((prev) => {
        const next = new Set(prev)
        if (next.has(key)) {
          next.delete(key)
        } else {
          next.add(key)
        }
        return next
      })
      setGeregeldeZaken((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    } else {
      setNietNodig((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
      setGeregeldeZaken((prev) => ({ ...prev, [key]: status }))
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)

    // Idempotentie: heeft dit account al een trouwplan (bijv. door dubbel
    // indienen, terugknop of een tweede tab), maak er dan geen tweede aan maar
    // ga naar het dashboard. Een extra plan maak je bewust via "Nieuw
    // trouwplan" in het accountmenu.
    try {
      const { count } = await supabase
        .from('weddings')
        .select('id', { count: 'exact', head: true })
      if (count && count > 0) {
        router.replace('/bruiloft')
        return
      }
    } catch {
      // Telling mislukt (netwerk): ga door en laat setupWedding de fout afhandelen.
    }

    const aantalGasten = Number(gasten) || 0
    const input: WeddingInput = {
      partner1Naam: partner1Naam.trim() || 'Partner 1',
      partner2Naam: partner2Naam.trim() || 'Partner 2',
      trouwdatum: trouwdatum ?? '',
      locatie: '',
      woonplaats: woonplaats.trim(),
      // Provincie automatisch afgeleid uit de woonplaats; later verfijnbaar.
      provincie: afleidProvincie(woonplaats) ?? '',
      totaalBudget: customBudget ? Number(customBudget) || 0 : budget ?? 0,
      aantalDaggasten: aantalGasten,
      aantalAvondgasten: 0,
      ceremonietype: null,
      geregeldeZaken,
      takenVoorstellen: { beslist: {}, afgerond: false },
      budgetCategorieen: [...BUDGET_CATEGORIEEN],
      vendorCategorieen: [...VENDOR_TYPES],
    }
    try {
      await setupWedding(input, { maakTaken: true, maakBudget })
      router.push('/bruiloft')
    } catch {
      setSaving(false)
      setError('Het aanmaken van jullie trouwplan is mislukt. Controleer je verbinding en probeer het opnieuw.')
    }
  }

  const inputCls = 'w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

  const naam1 = partner1Naam.trim()
  const naam2 = partner2Naam.trim()
  const begroeting = naam1 && naam2
    ? `Hoi ${naam1} & ${naam2}!`
    : naam1
      ? `Hoi ${naam1}!`
      : 'Goed bezig!'

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6">
        <h2 className="font-serif text-[1.75rem] font-medium leading-tight tracking-tight text-gray-900">
          {begroeting}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
          Vul in wat jullie al weten — alles is later nog aan te passen.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">

        {/* Woonplaats */}
        <div>
          <label htmlFor="wiz-woonplaats" className="mb-1.5 block text-sm font-medium text-gray-700">
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

        {/* Budget */}
        <div>
          <label htmlFor="wiz-budget" className="mb-1.5 block text-sm font-medium text-gray-700">
            Budget (€)
          </label>
          <input
            id="wiz-budget"
            type="number"
            min={0}
            placeholder="Bijv. 20000"
            value={customBudget}
            onChange={(e) => { setCustomBudget(e.target.value); setBudget(null) }}
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
                  onClick={() => { setBudget(value); setCustomBudget('') }}
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

        {/* Gasten */}
        <div>
          <label htmlFor="wiz-gasten" className="mb-1.5 block text-sm font-medium text-gray-700">
            Verwacht aantal gasten totaal
          </label>
          <input
            id="wiz-gasten"
            type="number"
            min={0}
            placeholder="Bijv. 100"
            value={gasten}
            onChange={(e) => setGasten(e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Leveranciers */}
        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">Wat hebben jullie al geregeld?</p>
          <p className="mb-2 text-xs text-gray-500">Pas aan wat afwijkt — de rest staat al op &apos;Te doen&apos;.</p>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            {VOORTGANG_ITEMS.map(({ key, label }, i) => {
              const current = geregeldeZaken[key]
              const isNietNodig = nietNodig.has(key)
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between px-3 py-2.5 ${i !== 0 ? 'border-t border-gray-100' : ''}`}
                >
                  <span className="text-sm text-gray-700">{label}</span>
                  <div className="flex gap-1">
                    {([
                      { status: 'geboekt' as const, label: 'Geboekt' },
                      { status: 'te_doen' as const, label: 'Te doen' },
                      { status: 'niet_van_toepassing' as const, label: 'Niet nodig' },
                    ]).map(({ status, label: btnLabel }) => {
                      const isActive = status === 'niet_van_toepassing' ? isNietNodig : current === status
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setVoortgang(key, status)}
                          className={`flex items-center gap-0.5 rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                            isActive
                              ? status === 'geboekt'
                                ? 'bg-green-100 text-green-700'
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

        {/* Budget-kaartjes toggle */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              id="wiz-budget-kaartjes"
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
                We zetten alvast kaartjes klaar voor de categorieën die jullie nog moeten regelen.
              </p>
            </div>
          </label>
        </div>

        {error ? (
          <p className="text-sm font-medium text-red-600" role="alert">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="flex h-11 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Even geduld…' : 'Maak ons trouwplan'}
        </button>

        <p className="text-center text-xs text-gray-400">
          Alle velden zijn optioneel — je kunt dit later altijd aanpassen.
        </p>
      </form>
    </div>
  )
}

/* ─── Step "keuze": guided vs. clean ───────────────────────────────── */

function KeuzeStep({
  onGeholpen,
  onLeegBeginnen,
}: {
  onGeholpen: () => void
  onLeegBeginnen: () => Promise<void>
}) {
  const [saving, setSaving] = React.useState(false)

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-hidden />
          <p className="text-sm font-medium text-green-700">Account aangemaakt!</p>
        </div>
        <h2 className="font-serif text-[1.75rem] font-medium leading-tight tracking-tight text-gray-900">
          Hoe willen jullie beginnen?
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
          Kies hoe we jullie trouwplan opzetten.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {/* Optie A: geholpen beginnen (aanbevolen) */}
        <button
          type="button"
          onClick={onGeholpen}
          className="relative w-full rounded-xl border-2 border-primary bg-primary/5 p-5 text-left transition-all hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="absolute right-4 top-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
            Aanbevolen
          </span>
          <p className="pr-24 text-base font-semibold text-gray-900">Geholpen beginnen</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            We stellen samen jullie takenlijst en budget op. Duurt ±2 minuten.
          </p>
          <p className="mt-3 text-sm font-medium text-primary">Ja, help ons →</p>
        </button>

        {/* Optie B: zelf beginnen (leeg account) */}
        <button
          type="button"
          onClick={async () => {
            setSaving(true)
            try {
              await onLeegBeginnen()
            } catch {
              setSaving(false)
            }
          }}
          disabled={saving}
          className="w-full rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <p className="text-base font-semibold text-gray-700">Zelf beginnen</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            Leeg trouwplan. Jullie voegen zelf alles toe wanneer jullie willen.
          </p>
          <p className="mt-3 text-sm font-medium text-gray-400">
            {saving ? 'Even geduld…' : 'Leeg beginnen →'}
          </p>
        </button>
      </div>
    </div>
  )
}

/* ─── Main form ─────────────────────────────────────────────────────── */

export function SignupPageForm({ next, prefillEmail }: { next?: string; prefillEmail?: string }) {
  const supabase = React.useMemo(() => createClient(), [])
  const router = useRouter()
  const target = safeNext(next)
  const setupWedding = useBruiloftStore((s) => s.setupWedding)

  const [email, setEmail] = React.useState(prefillEmail ?? '')
  const [password, setPassword] = React.useState('')
  const [firstName, setFirstName] = React.useState('')
  const [partnerName, setPartnerName] = React.useState('')
  const [weddingDate, setWeddingDate] = React.useState('')
  const [noDateYet, setNoDateYet] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [needsConfirmation, setNeedsConfirmation] = React.useState(false)
  // Ingelogde gebruikers slaan stap 1 (account aanmaken) automatisch over.
  const [phase, setPhase] = React.useState<Phase>('account')

  React.useEffect(() => {
    let active = true
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!active || !user || user.is_anonymous) return
      // Heeft de ingelogde gebruiker al een trouwplan? Dan hoort hij op zijn
      // dashboard, niet in de aanmaak-flow. Een extra plan maak je bewust aan
      // via "Nieuw trouwplan" in het accountmenu.
      const { count } = await supabase
        .from('weddings')
        .select('id', { count: 'exact', head: true })
      if (!active) return
      if (count && count > 0) {
        router.replace('/bruiloft')
      } else {
        // Account bestaat al, maar nog geen trouwplan: direct naar stap 2.
        // Pre-vul namen en datum vanuit de user metadata zodat het formulier
        // niet met lege velden (of generieke fallbacks) opent.
        const meta = user.user_metadata ?? {}
        const savedName = (meta.display_name as string | undefined) ?? ''
        const savedPartner = (meta.partner_name as string | undefined) ?? ''
        const savedDate = (meta.wedding_date as string | undefined) ?? ''
        if (savedName && !firstName) setFirstName(savedName)
        if (savedPartner && !partnerName) setPartnerName(savedPartner)
        if (savedDate && !weddingDate) {
          setWeddingDate(savedDate)
        } else if (!savedDate && !weddingDate) {
          setNoDateYet(true)
        }
        setPhase('keuze')
      }
    })
    return () => {
      active = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, router])

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

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      // Alleen "email not confirmed" toont het bevestigingsscherm; andere
      // fouten (netwerk, Supabase-storing) tonen een normale foutmelding.
      if (signInError.message.toLowerCase().includes('email not confirmed')) {
        setNeedsConfirmation(true)
      } else {
        setError(mapAuthError(signInError.message))
      }
      setLoading(false)
      return
    }

    setLoading(false)
    setPhase('keuze')
  }

  async function onLeegBeginnen() {
    const input: WeddingInput = {
      partner1Naam: firstName.trim() || 'Partner 1',
      partner2Naam: partnerName.trim() || 'Partner 2',
      trouwdatum: noDateYet ? '' : weddingDate || '',
      locatie: '',
      woonplaats: '',
      provincie: '',
      totaalBudget: 0,
      aantalDaggasten: 0,
      aantalAvondgasten: 0,
      ceremonietype: null,
      geregeldeZaken: {},
      takenVoorstellen: { beslist: {}, afgerond: false },
      budgetCategorieen: [...BUDGET_CATEGORIEEN],
      vendorCategorieen: [...VENDOR_TYPES],
    }
    await setupWedding(input, { maakTaken: false, maakBudget: false })
    router.push('/bruiloft')
  }

  return (
    <div className="relative flex min-h-[100dvh]">
      {/* Left: navy panel */}
      <div className="hidden md:block md:w-[40%] bg-rhino-950" aria-hidden />

      {/* Right: steps + form */}
      <div className="flex w-full flex-col md:w-[60%]">
        <StepsBar current={phase} />

        <div className="flex flex-1 items-start justify-center overflow-y-auto px-8 py-10 md:px-12 lg:px-16">
          {phase === 'account' ? (
            <div className="w-full max-w-sm">
              {needsConfirmation ? (
                <ConfirmationState email={email} next={next ?? ''} />
              ) : (
                <>
                  <div className="mb-8">
                    <h1 className="font-serif text-[2rem] font-medium leading-tight tracking-tight text-gray-900">
                      Account aanmaken
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">
                      Je bent bijna klaar om je trouwplan vorm te geven.
                    </p>
                  </div>

                  <form onSubmit={onSubmit} className="space-y-4" noValidate>
                    <div>
                      <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                        E-mailadres <span className="text-primary">*</span>
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

                    <div>
                      <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                        Wachtwoord <span className="text-primary">*</span>
                      </label>
                      <PasswordInput
                        id="password"
                        autoComplete="new-password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        inputClassName="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-gray-700">
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
                        <label htmlFor="partnerName" className="mb-1.5 block text-sm font-medium text-gray-700">
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

                    <div>
                      <label htmlFor="weddingDate" className="mb-1.5 block text-sm font-medium text-gray-700">
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
                          onChange={(e) => { setNoDateYet(e.target.checked); if (e.target.checked) setWeddingDate('') }}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-xs text-gray-500">Datum nog niet bekend</span>
                      </label>
                    </div>

                    {error ? (
                      <p className="text-sm font-medium text-red-600" role="alert">{error}</p>
                    ) : null}

                    <div className="flex items-center gap-3 pt-2">
                      <Link
                        href="/inloggen"
                        className="flex h-10 items-center justify-center rounded-md border border-gray-300 px-5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        Inloggen
                      </Link>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex h-10 flex-1 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? 'Even geduld…' : 'Account aanmaken'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          ) : phase === 'keuze' ? (
            <KeuzeStep
              onGeholpen={() => setPhase('wizard')}
              onLeegBeginnen={onLeegBeginnen}
            />
          ) : (
            <WeddingSetup
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
