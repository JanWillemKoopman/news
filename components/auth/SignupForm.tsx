'use client'

import Link from 'next/link'
import * as React from 'react'

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  PasswordHint,
  PasswordInput,
} from '@/components/bruiloft/ui'
import { createClient } from '@/lib/supabase/client'

import { mapAuthError, safeNext } from './authErrors'

export function SignupForm({ next }: { next?: string }) {
  const supabase = React.useMemo(() => createClient(), [])
  const target = safeNext(next)

  const [displayName, setDisplayName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [sent, setSent] = React.useState(false)
  const [resendWacht, setResendWacht] = React.useState(0)
  const [resendStatus, setResendStatus] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (resendWacht <= 0) return
    const timer = setInterval(() => setResendWacht((s) => s - 1), 1000)
    return () => clearInterval(timer)
  }, [resendWacht])

  async function onResend() {
    setResendStatus(null)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`,
      },
    })
    setResendWacht(60)
    setResendStatus(
      error ? mapAuthError(error.message) : 'Bevestigingsmail opnieuw verstuurd.'
    )
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Kies een wachtwoord van minimaal 8 tekens.')
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`,
        data: { display_name: displayName },
      },
    })
    if (error) {
      setError(mapAuthError(error.message))
      setLoading(false)
      return
    }
    setSent(true)
    setResendWacht(60)
    setLoading(false)
  }

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Bevestig je e-mailadres</CardTitle>
          <CardDescription>
            We hebben een bevestigingsmail gestuurd naar <strong>{email}</strong>. Klik op de link in
            die mail om je account te activeren en in te loggen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Geen mail ontvangen? Controleer eerst je spam-map — daar belandt de mail soms in.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={resendWacht > 0}
            onClick={onResend}
          >
            {resendWacht > 0 ? `Opnieuw versturen (${resendWacht}s)` : 'Mail opnieuw versturen'}
          </Button>
          {resendStatus ? (
            <p className="text-center text-sm text-muted-foreground" aria-live="polite">
              {resendStatus}
            </p>
          ) : null}
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
              className="font-medium text-primary hover:underline"
            >
              Terug naar inloggen
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Account aanmaken</CardTitle>
        <CardDescription>Begin met het plannen van jullie bruiloft.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Je naam" htmlFor="name" required>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Field>
          <Field label="E-mailadres" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Wachtwoord" htmlFor="password" required>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              required
              minLength={8}
              aria-invalid={password.length > 0 && password.length < 8 ? true : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordHint password={password} />
          </Field>

          {error ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" loading={loading}>
            Account aanmaken
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Heb je al een account?{' '}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
            className="font-medium text-primary hover:underline"
          >
            Inloggen
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
