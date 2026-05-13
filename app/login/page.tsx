'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Mail, Lock, Loader2, UserRound } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useChatStore } from '@/store/chatStore'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-cream-200">
          <Loader2 size={20} className="animate-spin text-ink-400" />
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  )
}

function LoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const initialMode: Mode = params.get('mode') === 'signup' ? 'signup' : 'signin'

  const [mode, setMode] = useState<Mode>(initialMode)
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (!email || !password) {
      setError('Vul je e-mailadres en wachtwoord in.')
      return
    }
    if (mode === 'signup') {
      if (!firstName.trim()) {
        setError('Vul je voornaam in.')
        return
      }
      if (password.length < 8) {
        setError('Kies een wachtwoord van minimaal 8 tekens.')
        return
      }
      if (password !== confirm) {
        setError('De wachtwoorden komen niet overeen.')
        return
      }
    }

    setBusy(true)
    const supabase = createSupabaseBrowserClient()
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/profile`,
            data: { first_name: firstName.trim() },
          },
        })
        if (error) throw error
        if (data.session) {
          router.push('/profile')
          router.refresh()
        } else {
          setInfo('Check je inbox — we hebben een bevestigingsmail naar je gestuurd.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        useChatStore.getState().resetSession()
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Er ging iets mis. Probeer het opnieuw.'
      setError(translateError(message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-12 bg-cream-200 overflow-y-auto">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-7 h-7 rounded-lg bg-ink-900/8 border border-ink-900/15 flex items-center justify-center">
            <BrandLogo size={14} className="text-ink-900" />
          </div>
          <span className="text-[11px] font-medium text-ink-500 uppercase tracking-[0.18em]">
            Marketing Sessie
          </span>
        </div>

        <h1 className="font-serif font-medium text-3xl sm:text-4xl text-ink-900 tracking-tight leading-[1.1] text-center">
          {mode === 'signin' ? 'Welkom' : 'Maak een account'}
        </h1>
        <p className="text-ink-500 mt-3 text-base leading-relaxed text-center">
          {mode === 'signin'
            ? 'Log in of maak een account aan om alle functionaliteiten van deze app te ontgrendelen.'
            : 'Bewaar klantprofielen en sessies zodat het bureau je elke vraag meteen kent.'}
        </p>

        <div className="mt-8 inline-flex w-full p-1 rounded-full border border-cream-500 bg-cream-100">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={[
              'flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              mode === 'signin'
                ? 'bg-cream-50 text-ink-900 shadow-sm'
                : 'text-ink-500 hover:text-ink-700',
            ].join(' ')}
          >
            Inloggen
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={[
              'flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              mode === 'signup'
                ? 'bg-cream-50 text-ink-900 shadow-sm'
                : 'text-ink-500 hover:text-ink-700',
            ].join(' ')}
          >
            Account aanmaken
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === 'signup' && (
            <Field
              id="firstName"
              type="text"
              label="Voornaam"
              value={firstName}
              onChange={setFirstName}
              icon={<UserRound size={16} className="text-ink-400" />}
              placeholder="Jouw voornaam"
              autoComplete="given-name"
            />
          )}
          <Field
            id="email"
            type="email"
            label="E-mailadres"
            value={email}
            onChange={setEmail}
            icon={<Mail size={16} className="text-ink-400" />}
            placeholder="naam@bedrijf.nl"
            autoComplete="email"
          />
          <Field
            id="password"
            type="password"
            label="Wachtwoord"
            value={password}
            onChange={setPassword}
            icon={<Lock size={16} className="text-ink-400" />}
            placeholder={mode === 'signup' ? 'Minimaal 8 tekens' : '••••••••'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
          {mode === 'signup' && (
            <Field
              id="confirm"
              type="password"
              label="Bevestig wachtwoord"
              value={confirm}
              onChange={setConfirm}
              icon={<Lock size={16} className="text-ink-400" />}
              placeholder="Herhaal je wachtwoord"
              autoComplete="new-password"
            />
          )}

          {error && (
            <p className="text-sm text-clay-700 bg-clay-100/60 border border-clay-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-ink-700 bg-cream-100 border border-cream-500 rounded-lg px-3 py-2">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className={[
              'w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all duration-200',
              busy
                ? 'bg-cream-400 text-ink-400 cursor-not-allowed'
                : 'bg-clay-500 hover:bg-clay-600 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5',
            ].join(' ')}
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {!busy && <ArrowRight size={15} />}
            {mode === 'signin' ? 'Inloggen' : 'Account aanmaken'}
          </button>
        </form>

      </div>
    </div>
  )
}

function Field({
  id,
  type,
  label,
  value,
  onChange,
  icon,
  placeholder,
  autoComplete,
}: {
  id: string
  type: string
  label: string
  value: string
  onChange: (v: string) => void
  icon: React.ReactNode
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[11px] font-medium text-ink-500 uppercase tracking-[0.15em] mb-2"
      >
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-cream-50 border border-cream-500 focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 outline-none rounded-xl pl-10 pr-4 py-3 text-base text-ink-900 placeholder:text-ink-400 transition-all"
        />
      </div>
    </div>
  )
}

function translateError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login')) return 'E-mailadres of wachtwoord klopt niet.'
  if (m.includes('user already registered'))
    return 'Er bestaat al een account met dit e-mailadres. Log in.'
  if (m.includes('email not confirmed'))
    return 'Bevestig eerst je e-mail via de link die we je hebben gestuurd.'
  if (m.includes('password should be at least'))
    return 'Wachtwoord moet minimaal 8 tekens zijn.'
  return message
}
