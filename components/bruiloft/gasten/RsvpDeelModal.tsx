'use client'

import * as React from 'react'
import { Check, Copy, ExternalLink, Link2, Mail } from 'lucide-react'

import { Button, Field, Input, Modal, useToast } from '@/components/bruiloft/ui'
import { buildWhatsappUrl } from '@/lib/bruiloft/whatsapp'
import type { Guest } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

interface RsvpDeelModalProps {
  guest: Guest | null
  onOpenChange: (open: boolean) => void
  weddingId: string
}

export function RsvpDeelModal({ guest, onOpenChange, weddingId }: RsvpDeelModalProps) {
  const updateGuest = useBruiloftStore((s) => s.updateGuest)
  const { toast } = useToast()

  const [origin, setOrigin] = React.useState('')
  React.useEffect(() => { setOrigin(window.location.origin) }, [])

  const [copied, setCopied] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [zetStatus, setZetStatus] = React.useState(true)
  const [statusGezet, setStatusGezet] = React.useState(false)

  React.useEffect(() => {
    if (guest) {
      setEmail(guest.email || '')
      setCopied(false)
      setStatusGezet(false)
      setZetStatus(true)
    }
  }, [guest])

  const kanStatusZetten = guest?.rsvpStatus === 'nog niet uitgenodigd'
  const link = guest?.rsvpCode && origin ? `${origin}/rsvp/${guest.rsvpCode}` : null
  const bericht = guest && link ? `Hoi ${guest.voornaam}, vul je RSVP in via deze link: ${link}` : ''
  const whatsappUrl = link ? buildWhatsappUrl(bericht, guest?.telefoon) : null

  const markeerUitgenodigdIndienNodig = async () => {
    if (!guest || !kanStatusZetten || !zetStatus || statusGezet) return
    setStatusGezet(true)
    try {
      await updateGuest(guest.id, { rsvpStatus: 'uitgenodigd' })
    } catch {
      // niet-blokkerend: de link is al gedeeld, alleen de statusupdate mislukte
    }
  }

  const copyLink = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast({ title: 'Link gekopieerd', description: 'De RSVP-link staat nu in je klembord.', variant: 'success' })
      void markeerUitgenodigdIndienNodig()
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast({ title: 'Kopiëren mislukt', description: 'Geef toegang tot het klembord en probeer opnieuw.', variant: 'error' })
    }
  }

  const sendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guest) return
    setSending(true)
    try {
      const res = await fetch('/api/email/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId: guest.id, email: email.trim(), weddingId }),
      })
      const json = await res.json().catch(() => ({}))
      if (json.emailSent) {
        toast({ title: 'Uitnodiging verstuurd', description: `Verzonden naar ${email.trim()}.`, variant: 'success' })
        void markeerUitgenodigdIndienNodig()
      } else {
        toast({ title: 'Verzenden mislukt', description: 'Kon de e-mail niet verzenden. Kopieer de link handmatig.', variant: 'error' })
      }
    } catch {
      toast({ title: 'Verzenden mislukt', description: 'Netwerkfout. Probeer het opnieuw.', variant: 'error' })
    }
    setSending(false)
  }

  return (
    <Modal
      open={guest !== null}
      onOpenChange={(o) => { if (!o) onOpenChange(false) }}
      title="Uitnodiging versturen"
      description={guest ? `Stuur de persoonlijke link van ${guest.voornaam} ${guest.achternaam} via WhatsApp, e-mail, of kopieer hem.` : undefined}
      className="sm:max-w-md"
    >
      <div className="space-y-4">
        {link ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-muted-foreground font-mono text-xs">{link}</span>
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 rounded p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Kopieer link"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        ) : null}

        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void markeerUitgenodigdIndienNodig()}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-whatsapp px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-whatsapp/90"
          >
            <ExternalLink className="h-4 w-4" />
            Via WhatsApp
          </a>
        ) : null}

        <form onSubmit={sendEmail} className="space-y-2 border-t border-border pt-4">
          <Field label="Of stuur per e-mail" htmlFor="rsvp-email">
            <Input
              id="rsvp-email"
              type="email"
              autoComplete="email"
              required
              placeholder="naam@voorbeeld.nl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Button type="submit" variant="outline" className="w-full" disabled={sending}>
            <Mail className="h-4 w-4" />
            {sending ? 'Bezig…' : 'Versturen'}
          </Button>
        </form>

        {kanStatusZetten && !statusGezet ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={zetStatus}
              onChange={(e) => setZetStatus(e.target.checked)}
              className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
            />
            Zet status ook op &apos;Uitgenodigd&apos;
          </label>
        ) : null}
        {statusGezet ? (
          <p className="text-xs text-muted-foreground">✓ Status bijgewerkt naar &apos;Uitgenodigd&apos;</p>
        ) : null}
      </div>
    </Modal>
  )
}
