'use client'

import * as React from 'react'
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'

import { mapAuthError } from '@/components/auth/authErrors'
import { Button, Field, Input, Modal } from '@/components/bruiloft/ui'
import { useBruiloftStore } from '@/store/bruiloftStore'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClaimAccountModal({ open, onOpenChange }: Props) {
  const claimAccount = useBruiloftStore((s) => s.claimAccount)
  const wedding = useBruiloftStore((s) => s.wedding)
  const guests = useBruiloftStore((s) => s.guests)
  const tasks = useBruiloftStore((s) => s.tasks)
  const vendors = useBruiloftStore((s) => s.vendors)
  const budgetItems = useBruiloftStore((s) => s.budgetItems)

  const [displayName, setDisplayName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [sent, setSent] = React.useState(false)

  const ingevuld =
    guests.length + vendors.length + budgetItems.length + tasks.filter((t) => t.status === 'klaar').length

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      await claimAccount({
        email: email.trim(),
        password,
        displayName: displayName.trim() || email.split('@')[0],
      })
      setSent(true)
    } catch (err) {
      setError(mapAuthError(err instanceof Error ? err.message : ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={sent ? 'Bevestig je e-mailadres' : 'Sla jullie trouwplan op'}
      description={
        sent
          ? undefined
          : 'Maak gratis een account zodat jullie plan veilig bewaard blijft — ook op andere apparaten en om samen te werken.'
      }
    >
      {sent ? (
        <div className="py-2 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="text-muted-foreground">
            We hebben een bevestigingsmail gestuurd naar <strong className="text-foreground">{email}</strong>.
            Klik op de link om jullie account te activeren. Tot die tijd blijft alles gewoon bewaard op dit apparaat.
          </p>
          <Button className="mt-6 w-full" onClick={() => onOpenChange(false)}>
            Verder met plannen
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {ingevuld > 0 ? (
            <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
              <p className="text-sm font-medium text-foreground">
                Jullie plan bevat al {ingevuld} {ingevuld === 1 ? 'item' : 'items'}.
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Registreer nu zodat je dit niet kwijtraakt.</p>
            </div>
          ) : null}

          <Field label="Je naam" htmlFor="claim-name">
            <Input
              id="claim-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={wedding?.partner1Naam || 'Bijv. Sanne'}
              autoComplete="name"
            />
          </Field>
          <Field label="E-mailadres" htmlFor="claim-email" required>
            <Input
              id="claim-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jullie@email.nl"
              autoComplete="email"
              required
            />
          </Field>
          <Field label="Wachtwoord" htmlFor="claim-password" required>
            <Input
              id="claim-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </Field>

          {error ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" loading={loading} disabled={!email.trim() || password.length < 6}>
            Account aanmaken
            <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Geen spam. Jullie gegevens blijven privé.
          </p>
        </form>
      )}
    </Modal>
  )
}
