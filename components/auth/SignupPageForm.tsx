'use client'

import Link from 'next/link'
import * as React from 'react'

import { createClient } from '@/lib/supabase/client'

import { mapAuthError, safeNext } from './authErrors'

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
          href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
          className="font-medium text-primary hover:underline"
        >
          Terug naar inloggen
        </Link>
      </p>
    </div>
  )
}

/* ─── Main form ─────────────────────────────────────────────────── */

export function SignupPageForm({ next, prefillEmail }: { next?: string; prefillEmail?: string }) {
  const supabase = React.useMemo(() => createClient(), [])
  const target = safeNext(next)

  const [email, setEmail] = React.useState(prefillEmail ?? '')
  const [password, setPassword] = React.useState('')
  const [firstName, setFirstName] = React.useState('')
  const [partnerName, setPartnerName] = React.useState('')
  const [weddingDate, setWeddingDate] = React.useState('')
  const [noDateYet, setNoDateYet] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [sent, setSent] = React.useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
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

    if (error) {
      setError(mapAuthError(error.message))
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen">
      {/* Left: purple placeholder — will be replaced with an image */}
      <div
        className="hidden md:block md:w-1/2 lg:w-[55%] bg-[#5B3A8A]"
        aria-hidden
      />

      {/* Right: steps + form */}
      <div className="flex w-full flex-col md:w-1/2 lg:w-[45%]">
        <StepsBar current={1} />

        <div className="flex flex-1 items-center justify-center px-8 py-10 md:px-12 lg:px-16">
          <div className="w-full max-w-sm">
            {sent ? (
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
                      href="/login"
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
                    href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
                    className="font-medium text-primary hover:underline"
                  >
                    Inloggen
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
