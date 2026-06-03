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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
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
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Geen mail ontvangen? Controleer je spam-map of{' '}
            <Link
              href={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}
              className="font-medium text-primary hover:underline"
            >
              ga terug naar inloggen
            </Link>
            .
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
          <Field label="Wachtwoord" htmlFor="password" required error={undefined}>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
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
