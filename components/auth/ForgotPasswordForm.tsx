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

import { mapAuthError } from './authErrors'

export function ForgotPasswordForm() {
  const supabase = React.useMemo(() => createClient(), [])

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

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Check je inbox</CardTitle>
          <CardDescription>
            Als er een account bestaat voor <strong>{email}</strong>, ontvang je een mail met een link
            om een nieuw wachtwoord in te stellen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/inloggen" className="text-sm font-medium text-primary hover:underline">
            Terug naar inloggen
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Wachtwoord vergeten</CardTitle>
        <CardDescription>
          Vul je e-mailadres in en we sturen je een link om een nieuw wachtwoord in te stellen.
        </CardDescription>
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

          {error ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" loading={loading}>
            Stuur herstellink
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/inloggen" className="font-medium text-primary hover:underline">
            Terug naar inloggen
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
