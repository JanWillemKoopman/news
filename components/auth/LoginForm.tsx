'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { createClient } from '@/lib/supabase/client'
import { useBruiloftStore } from '@/store/bruiloftStore'

import { Button } from '@/components/bruiloft/ui'
import { PasswordInput } from '@/components/ui/password-input'

import { mapAuthError, safeNext } from './authErrors'

export function LoginForm({
  next,
  error: initialError,
  succes,
}: {
  next?: string
  error?: string
  succes?: string
}) {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const target = safeNext(next)

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(
    initialError ? 'Inloggen mislukt. Probeer het opnieuw.' : null
  )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(mapAuthError(error.message))
      setLoading(false)
      return
    }
    // Gebruiker zonder trouwplan sturen we direct naar stap 2, zodat ze niet
    // eerst de skeleton van het dashboard zien voordat ze worden doorgestuurd.
    const { count } = await supabase
      .from('weddings')
      .select('id', { count: 'exact', head: true })
    const destination = !count || count === 0 ? '/aanmelden' : target
    // Reset store hydration so init() re-runs with the new authenticated session
    // instead of returning early because hydrated=true from a prior logged-out visit.
    useBruiloftStore.setState({ hydrated: false })
    router.push(destination)
    router.refresh()
  }

  const inputCls =
    'w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

  return (
    <div className="relative flex min-h-[100dvh]">
      {/* Left: navy panel */}
      <div className="hidden md:block md:w-[40%] bg-rhino-950" aria-hidden />

      {/* Right: form */}
      <div className="flex w-full flex-col items-center justify-center px-8 py-16 md:w-[60%] md:px-12 lg:px-16">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="font-serif text-[2rem] font-medium leading-tight tracking-tight text-gray-900">
              Welkom terug
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Log in om verder te plannen aan jullie bruiloft.
            </p>
          </div>

          {succes === 'wachtwoord_gewijzigd' && (
            <div className="mb-4 rounded-md border border-emerald-600/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
              Wachtwoord succesvol gewijzigd. Log in met je nieuwe wachtwoord.
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

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                Wachtwoord <span className="text-primary">*</span>
              </label>
              <PasswordInput
                id="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                inputClassName={inputCls}
              />
            </div>

            {error ? (
              <p className="text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" loading={loading} className="w-full">
              Inloggen
            </Button>
          </form>

          <div className="mt-5 space-y-2 text-center text-sm text-gray-500">
            <p>
              <Link href="/wachtwoord-vergeten" className="font-medium text-primary hover:underline">
                Wachtwoord vergeten?
              </Link>
            </p>
            <p>
              Nog geen account?{' '}
              <Link
                href={next ? `/aanmelden?next=${encodeURIComponent(next)}` : '/aanmelden'}
                className="font-medium text-primary hover:underline"
              >
                Maak er een aan
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
