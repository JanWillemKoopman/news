'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

export function LoginForm({ next, error: initialError }: { next?: string; error?: string }) {
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
    router.push(target)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Welkom terug</CardTitle>
        <CardDescription>Log in om verder te plannen aan jullie bruiloft.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
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
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
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
            Inloggen
          </Button>
        </form>

        <div className="mt-4 space-y-2 text-center text-sm text-muted-foreground">
          <p>
            <Link href="/wachtwoord-vergeten" className="font-medium text-primary hover:underline">
              Wachtwoord vergeten?
            </Link>
          </p>
          <p>
            Nog geen account?{' '}
            <Link
              href={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}
              className="font-medium text-primary hover:underline"
            >
              Maak er een aan
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
