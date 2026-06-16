'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import * as React from 'react'

import { createClient } from '@/lib/supabase/client'

import { mapAuthError } from './authErrors'

export function ForgotPasswordForm() {
  const supabase = React.useMemo(() => createClient(), [])
  const searchParams = useSearchParams()
  const linkVerlopen = searchParams.get('error') === 'link_verlopen'

  const [email, setEmail] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [sent, setSent] = React.useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/wachtwoord-resetten`,
    })
    if (error) {
      setError(mapAuthError(error.message))
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  const inputCls =
    'w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

  return (
    <div className="relative flex min-h-[100dvh]">
      {/* Left: purple panel */}
      <div className="hidden md:block md:w-[40%] bg-[#5B3A8A]" aria-hidden />

      {/* Right: form */}
      <div className="flex w-full flex-col items-center justify-center px-8 py-16 md:w-[60%] md:px-12 lg:px-16">
        <div className="w-full max-w-sm">
          {sent ? (
            <>
              <div className="mb-6 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <svg
                  className="h-8 w-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="text-center">
                <h1 className="font-serif text-[2rem] font-medium leading-tight tracking-tight text-gray-900">
                  Check je inbox
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Als er een account bestaat voor{' '}
                  <strong className="text-gray-700">{email}</strong>, ontvang je een mail met een
                  link om een nieuw wachtwoord in te stellen.
                </p>
                <p className="mt-6 text-sm">
                  <Link href="/inloggen" className="font-medium text-primary hover:underline">
                    Terug naar inloggen
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="font-serif text-[2rem] font-medium leading-tight tracking-tight text-gray-900">
                  Wachtwoord vergeten
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Vul je e-mailadres in en we sturen je een link om een nieuw wachtwoord in te
                  stellen.
                </p>
              </div>

              {linkVerlopen && (
                <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Je herstelLink is verlopen of al gebruikt. Vraag hieronder een nieuwe aan.
                </div>
              )}

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
                    className={inputCls}
                  />
                </div>

                {error ? (
                  <p className="text-sm font-medium text-red-600" role="alert">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Even geduld…' : 'Stuur herstellink'}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-gray-500">
                <Link href="/inloggen" className="font-medium text-primary hover:underline">
                  Terug naar inloggen
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
