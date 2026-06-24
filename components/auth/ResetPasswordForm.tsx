'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'
import { ArrowLeft } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

import { PasswordInput } from '@/components/ui/password-input'

import { mapAuthError } from './authErrors'

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = React.useMemo(() => createClient(), [])

  // token_hash + type worden meegegeven via de email template:
  // {{ .SiteURL }}/wachtwoord-resetten?token_hash={{ .TokenHash }}&type=recovery
  // Het token wordt pas verbruikt bij submitten (niet bij het openen van de link).
  const tokenHash = searchParams.get('token_hash')
  const tokenType = searchParams.get('type')

  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('De wachtwoorden komen niet overeen.')
      return
    }
    setLoading(true)
    setError(null)

    if (tokenHash && tokenType) {
      // Verificatie server-side: voorkomt PKCE code-verifier problemen
      // die optreden bij client-side verifyOtp met @supabase/ssr.
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_hash: tokenHash, type: tokenType, password }),
      })
      const json = await res.json()
      if (!res.ok) {
        const msg = json.error ?? ''
        setError(
          msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')
            ? 'Je herstellink is verlopen of al gebruikt. Vraag een nieuwe aan via de wachtwoord vergeten pagina.'
            : mapAuthError(msg),
        )
        setLoading(false)
        return
      }
      setDone(true)
      setLoading(false)
      router.push('/inloggen?succes=wachtwoord_gewijzigd')
      router.refresh()
      return
    }

    // Fallback voor ingelogde gebruikers die wachtwoord wijzigen zonder token.
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(mapAuthError(updateError.message))
      setLoading(false)
      return
    }
    setDone(true)
    setLoading(false)
    router.push('/inloggen?succes=wachtwoord_gewijzigd')
    router.refresh()
  }

  const inputCls =
    'w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

  return (
    <div className="relative flex min-h-screen">
      <Link
        href="/inloggen"
        className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 md:left-6 md:top-6 md:text-white/80 md:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug naar inloggen
      </Link>

      {/* Left: purple panel */}
      <div className="hidden md:block md:w-[40%] bg-[#5B3A8A]" aria-hidden />

      {/* Right: form */}
      <div className="flex w-full flex-col items-center justify-center px-8 py-16 md:w-[60%] md:px-12 lg:px-16">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="font-serif text-[2rem] font-medium leading-tight tracking-tight text-gray-900">
              Nieuw wachtwoord
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Kies een nieuw wachtwoord voor je account.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                Nieuw wachtwoord <span className="text-primary">*</span>
              </label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                inputClassName={inputCls}
              />
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-gray-700">
                Bevestig wachtwoord <span className="text-primary">*</span>
              </label>
              <PasswordInput
                id="confirm"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                inputClassName={inputCls}
              />
            </div>

            {error ? (
              <p className="text-sm font-medium text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading || done}
              className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading || done ? 'Even geduld…' : 'Wachtwoord opslaan'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
