'use client'

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
  PasswordHint,
  PasswordInput,
} from '@/components/bruiloft/ui'
import { createClient } from '@/lib/supabase/client'

import { mapAuthError } from './authErrors'

export function ResetPasswordForm() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])

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
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(mapAuthError(error.message))
      setLoading(false)
      return
    }
    setDone(true)
    setLoading(false)
    router.push('/bruiloft')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Nieuw wachtwoord</CardTitle>
        <CardDescription>Kies een nieuw wachtwoord voor je account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Nieuw wachtwoord" htmlFor="password" required>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <PasswordHint password={password} />
          </Field>
          <Field
            label="Bevestig wachtwoord"
            htmlFor="confirm"
            required
            error={
              confirm.length > 0 && confirm !== password
                ? 'De wachtwoorden komen niet overeen.'
                : undefined
            }
          >
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              required
              minLength={8}
              aria-invalid={confirm.length > 0 && confirm !== password ? true : undefined}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>

          {error ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" loading={loading || done}>
            Wachtwoord opslaan
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
