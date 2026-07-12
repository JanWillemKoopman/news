'use client'

import * as React from 'react'
import { Check, Copy, ExternalLink, Link2 } from 'lucide-react'

import { Button, Modal, useToast } from '@/components/bruiloft/ui'
import { buildWhatsappUrl } from '@/lib/bruiloft/whatsapp'
import { useBruiloftStore } from '@/store/bruiloftStore'

interface DraaiboekDeelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Draaiboek delen met ceremoniemeester/leveranciers: één publieke link per
// bruiloft. Delen aan = link bestaat; "Stop met delen" maakt de link per
// direct ongeldig. Zelfde deel-idioom als RsvpDeelModal (linkveld + kopieer +
// WhatsApp), maar zonder e-mailformulier — deze link stuur je aan meerdere
// mensen, niet aan één gast.
export function DraaiboekDeelModal({ open, onOpenChange }: DraaiboekDeelModalProps) {
  const wedding = useBruiloftStore((s) => s.wedding)
  const share = useBruiloftStore((s) => s.draaiboekShare)
  const enableDraaiboekShare = useBruiloftStore((s) => s.enableDraaiboekShare)
  const disableDraaiboekShare = useBruiloftStore((s) => s.disableDraaiboekShare)
  const { toast } = useToast()

  const [origin, setOrigin] = React.useState('')
  React.useEffect(() => { setOrigin(window.location.origin) }, [])

  const [bezig, setBezig] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const link = share && origin ? `${origin}/draaiboek/${share.token}` : null
  const namen = wedding
    ? [wedding.partner1Naam, wedding.partner2Naam].filter(Boolean).join(' & ')
    : ''
  const bericht = link
    ? `Hoi! Hierbij het draaiboek van onze trouwdag${namen ? ` (${namen})` : ''}: ${link}`
    : ''
  const whatsappUrl = link ? buildWhatsappUrl(bericht) : null

  const zetAan = async () => {
    setBezig(true)
    try {
      await enableDraaiboekShare()
    } catch {
      toast({ title: 'Delen aanzetten mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    } finally {
      setBezig(false)
    }
  }

  const zetUit = async () => {
    setBezig(true)
    try {
      await disableDraaiboekShare()
      toast({
        title: 'Delen gestopt',
        description: 'De link werkt niet meer. Delen kan altijd opnieuw — dat geeft een nieuwe link.',
        variant: 'success',
      })
    } catch {
      toast({ title: 'Stoppen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    } finally {
      setBezig(false)
    }
  }

  const copyLink = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast({ title: 'Link gekopieerd', description: 'De draaiboek-link staat nu in je klembord.', variant: 'success' })
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast({ title: 'Kopiëren mislukt', description: 'Geef toegang tot het klembord en probeer opnieuw.', variant: 'error' })
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Draaiboek delen"
      description="Handig voor je ceremoniemeester, fotograaf, DJ of de locatie — zij zien de dagindeling zonder in te loggen."
      className="sm:max-w-md"
    >
      {share ? (
        <div className="space-y-4">
          {link ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
              <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{link}</span>
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

          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-whatsapp px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-whatsapp/90"
            >
              <ExternalLink className="h-4 w-4" />
              Via WhatsApp
            </a>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Iedereen met deze link ziet de meest actuele versie — wijzig je het
            draaiboek, dan zien zij dat vanzelf. De ontvanger kan filteren op
            zijn eigen rol en het schema printen.
          </p>

          <div className="border-t border-border pt-3">
            <Button variant="ghost" size="sm" onClick={zetUit} loading={bezig}>
              Stop met delen
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Je krijgt één link die je via WhatsApp of e-mail doorstuurt. De
            ontvanger heeft geen account nodig en ziet alléén het draaiboek —
            niets anders uit jullie trouwplan. Stoppen kan altijd; de link
            werkt dan direct niet meer.
          </p>
          <Button onClick={zetAan} loading={bezig} className="w-full">
            Zet delen aan
          </Button>
        </div>
      )}
    </Modal>
  )
}
