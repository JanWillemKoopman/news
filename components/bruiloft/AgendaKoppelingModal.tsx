'use client'

import * as React from 'react'
import { Check, Copy, ExternalLink, Link2 } from 'lucide-react'

import { Button, Modal, useToast } from '@/components/bruiloft/ui'
import { useBruiloftStore } from '@/store/bruiloftStore'

interface AgendaKoppelingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Agenda-koppeling (ICS-abonnement): zet de trouwdag, leveranciersafspraken,
// taak-deadlines en betaaltermijnen in de eigen agenda van het bruidspaar.
// Zelfde aan/uit-idioom als DraaiboekDeelModal; de link is een abonnement,
// dus wijzigingen in de app verschijnen vanzelf in de agenda.
export function AgendaKoppelingModal({ open, onOpenChange }: AgendaKoppelingModalProps) {
  const share = useBruiloftStore((s) => s.agendaShare)
  const enableAgendaShare = useBruiloftStore((s) => s.enableAgendaShare)
  const disableAgendaShare = useBruiloftStore((s) => s.disableAgendaShare)
  const { toast } = useToast()

  const [origin, setOrigin] = React.useState('')
  React.useEffect(() => { setOrigin(window.location.origin) }, [])

  const [bezig, setBezig] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const httpsUrl = share && origin ? `${origin}/api/agenda/${share.token}.ics` : null
  // webcal:// opent op iPhone/Mac (en in Outlook) direct het abonneer-scherm.
  const webcalUrl = httpsUrl ? httpsUrl.replace(/^https?:\/\//, 'webcal://') : null
  const googleUrl = webcalUrl
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`
    : null

  const zetAan = async () => {
    setBezig(true)
    try {
      await enableAgendaShare()
    } catch {
      toast({ title: 'Koppeling aanzetten mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    } finally {
      setBezig(false)
    }
  }

  const zetUit = async () => {
    setBezig(true)
    try {
      await disableAgendaShare()
      toast({
        title: 'Koppeling gestopt',
        description: 'De agenda ontvangt geen updates meer. Opnieuw koppelen geeft een nieuwe link.',
        variant: 'success',
      })
    } catch {
      toast({ title: 'Stoppen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    } finally {
      setBezig(false)
    }
  }

  const copyLink = async () => {
    if (!httpsUrl) return
    try {
      await navigator.clipboard.writeText(httpsUrl)
      setCopied(true)
      toast({ title: 'Link gekopieerd', description: 'Plak hem in je agenda-app bij "abonneren via URL".', variant: 'success' })
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast({ title: 'Kopiëren mislukt', description: 'Geef toegang tot het klembord en probeer opnieuw.', variant: 'error' })
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Zet jullie planning in je agenda"
      description="De trouwdag, afspraken met leveranciers, taak-deadlines en betaaltermijnen — automatisch actueel in Google Agenda, Apple Agenda of Outlook."
      className="sm:max-w-md"
    >
      {share ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {googleUrl ? (
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <ExternalLink className="h-4 w-4" /> Google Agenda
              </a>
            ) : null}
            {webcalUrl ? (
              <a
                href={webcalUrl}
                className="flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <ExternalLink className="h-4 w-4" /> Apple / Outlook
              </a>
            ) : null}
          </div>

          {httpsUrl ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
              <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{httpsUrl}</span>
              <button
                type="button"
                onClick={copyLink}
                className="shrink-0 rounded p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Kopieer link"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Wijzig je iets in de app, dan volgt je agenda vanzelf — al kan dat
            bij agenda-apps een paar uur duren. De link werkt ook voor de
            agenda van je partner.
          </p>

          <div className="border-t border-border pt-3">
            <Button variant="ghost" size="sm" onClick={zetUit} loading={bezig}>
              Stop de koppeling
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Je krijgt een persoonlijke agenda-link om je op te abonneren. Alles
            blijft automatisch actueel, en stoppen kan altijd — de link werkt
            dan direct niet meer.
          </p>
          <Button onClick={zetAan} loading={bezig} className="w-full">
            Zet de agenda-koppeling aan
          </Button>
        </div>
      )}
    </Modal>
  )
}
