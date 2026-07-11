'use client'

import * as React from 'react'
import { Check, Copy, ExternalLink, Link2 } from 'lucide-react'

import { Button, Modal, useToast } from '@/components/bruiloft/ui'
import { buildWhatsappUrl } from '@/lib/bruiloft/whatsapp'
import { useBruiloftStore } from '@/store/bruiloftStore'

interface AdressenVerzamelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Adressen verzamelen via één deel-link: genodigden vullen op /adres/[token]
// zelf hun adres in, dat direct op de gastenlijst landt (gematcht op naam of
// als nieuwe gast). Zelfde aan/uit-idioom als DraaiboekDeelModal.
export function AdressenVerzamelModal({ open, onOpenChange }: AdressenVerzamelModalProps) {
  const wedding = useBruiloftStore((s) => s.wedding)
  const share = useBruiloftStore((s) => s.adresShare)
  const enableAdresShare = useBruiloftStore((s) => s.enableAdresShare)
  const disableAdresShare = useBruiloftStore((s) => s.disableAdresShare)
  const { toast } = useToast()

  const [origin, setOrigin] = React.useState('')
  React.useEffect(() => { setOrigin(window.location.origin) }, [])

  const [bezig, setBezig] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const link = share && origin ? `${origin}/adres/${share.token}` : null
  const namen = wedding
    ? [wedding.partner1Naam, wedding.partner2Naam].filter(Boolean).join(' & ')
    : ''
  const bericht = link
    ? `Hoi! Wij gaan trouwen 🎉 Geef je adres door voor de uitnodiging via deze link: ${link}${namen ? ` — ${namen}` : ''}`
    : ''
  const whatsappUrl = link ? buildWhatsappUrl(bericht) : null

  const zetAan = async () => {
    setBezig(true)
    try {
      await enableAdresShare()
    } catch {
      toast({ title: 'Link aanzetten mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    } finally {
      setBezig(false)
    }
  }

  const zetUit = async () => {
    setBezig(true)
    try {
      await disableAdresShare()
      toast({
        title: 'Link gestopt',
        description: 'De adreslink werkt niet meer. Opnieuw aanzetten geeft een nieuwe link.',
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
      toast({ title: 'Link gekopieerd', description: 'De adreslink staat nu in je klembord.', variant: 'success' })
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast({ title: 'Kopiëren mislukt', description: 'Geef toegang tot het klembord en probeer opnieuw.', variant: 'error' })
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Adressen verzamelen"
      description="Stuur één link rond (bijvoorbeeld in de familie-app) — iedereen vult zelf zijn adres in en het verschijnt vanzelf op jullie gastenlijst."
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
            Kennen we de naam al, dan wordt het adres bij die gast ingevuld;
            anders komt er een nieuwe gast op de lijst met de notitie dat het
            adres via deze link is doorgegeven.
          </p>

          <div className="border-t border-border pt-3">
            <Button variant="ghost" size="sm" onClick={zetUit} loading={bezig}>
              Stop met verzamelen
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Handig voor de (papieren) uitnodigingen en save-the-dates: geen
            adressen meer naversturen of overtypen. Stoppen kan altijd — de
            link werkt dan direct niet meer.
          </p>
          <Button onClick={zetAan} loading={bezig} className="w-full">
            Zet de adreslink aan
          </Button>
        </div>
      )}
    </Modal>
  )
}
