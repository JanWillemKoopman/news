'use client'

import { Heart, Mail, X } from 'lucide-react'
import * as React from 'react'

import { Button, Card, CardContent, Field, Input, useToast } from '@/components/bruiloft/ui'
import { createClient } from '@/lib/supabase/client'
import { useBruiloftStore } from '@/store/bruiloftStore'

interface Props {
  // Op het dashboard is dit een wegklikbaar tipkaartje; op de "Samen plannen"-
  // pagina staat het altijd vast (geen kruisje, niet te verbergen).
  dismissible?: boolean
}

// Nodig je partner uit met hun e-mailadres. Ze krijgen een eigen, volwaardig
// account met volledige toegang. Verbergt zichzelf zodra de partner meeplant.
export function PartnerUitnodigen({ dismissible = true }: Props) {
  const wedding = useBruiloftStore((s) => s.wedding)
  const role = useBruiloftStore((s) => s.role)
  const { toast } = useToast()
  const supabase = React.useMemo(() => createClient(), [])

  const [memberCount, setMemberCount] = React.useState<number | null>(null)
  const [dismissed, setDismissed] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  React.useEffect(() => {
    if (!wedding) return
    if (dismissible) {
      setDismissed(localStorage.getItem(`partner-invite-dismissed:${wedding.id}`) === '1')
    }
    let active = true
    void supabase.rpc('list_wedding_members', { p_wedding: wedding.id }).then(({ data }) => {
      if (active) setMemberCount(Array.isArray(data) ? data.length : 0)
    })
    return () => {
      active = false
    }
  }, [supabase, wedding, dismissible])

  if (!wedding || role !== 'owner') return null
  // Verberg zodra de partner al meeplant of (op het dashboard) weggeklikt is.
  if (memberCount === null || memberCount > 1 || sent) return null
  if (dismissible && dismissed) return null

  function dismiss() {
    if (wedding) localStorage.setItem(`partner-invite-dismissed:${wedding.id}`, '1')
    setDismissed(true)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    try {
      const res = await fetch('/api/partner/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingId: wedding!.id, email: email.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Uitnodigen mislukt', description: json.error, variant: 'error' })
        return
      }
      setSent(true)
      toast({
        title: 'Partner uitgenodigd',
        description: json.emailSent
          ? `${email.trim()} ontvangt een e-mail om een wachtwoord in te stellen en mee te plannen.`
          : 'Je partner is toegevoegd, maar de e-mail kon niet verzonden worden. Probeer het later opnieuw.',
      })
    } catch {
      toast({ title: 'Uitnodigen mislukt', description: 'Probeer het later opnieuw.', variant: 'error' })
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="mb-8 border-rose-200 bg-rose-50/40">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Heart className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">Plan samen met je partner</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Nodig je partner uit met hun e-mailadres. Ze stellen zelf een wachtwoord in en krijgen
                volledige toegang om samen aan jullie trouwplan te werken.
              </p>
            </div>
          </div>
          {dismissible ? (
            <Button variant="ghost" size="icon" aria-label="Niet nu" onClick={dismiss}>
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="E-mailadres van je partner" htmlFor="partner-email" className="flex-1">
            <Input
              id="partner-email"
              type="email"
              required
              placeholder="partner@voorbeeld.nl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Button type="submit" loading={sending}>
            <Mail className="h-4 w-4" />
            Uitnodiging versturen
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
