'use client'

import * as React from 'react'
import { Check, Copy, ExternalLink, Link2 } from 'lucide-react'

import { useBruiloftStore } from '@/store/bruiloftStore'
import { Button, Modal } from '@/components/bruiloft/ui'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
}

export function RegistryDeelModal({ open, onOpenChange }: Props) {
  const websiteContent = useBruiloftStore((s) => s.websiteContent)
  const registrySettings = useBruiloftStore((s) => s.registrySettings)

  const [copied, setCopied] = React.useState(false)

  const slug = websiteContent?.slug
  const isEnabled = registrySettings?.isEnabled ?? false

  const registryUrl = slug
    ? `${(process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')}/trouwen/${slug}/cadeaulijst`
    : null

  const whatsappUrl = registryUrl
    ? `https://wa.me/?text=${encodeURIComponent(`Bekijk onze cadeaulijst: ${registryUrl}`)}`
    : null

  const copyLink = async () => {
    if (!registryUrl) return
    await navigator.clipboard.writeText(registryUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Cadeaulijst delen"
      description="Deel de link naar jullie cadeaulijst met gasten."
      className="sm:max-w-md"
    >
      <div className="space-y-4">
        {!isEnabled && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            De cadeaulijst is momenteel niet zichtbaar voor gasten. Zet hem aan via <strong>Instellingen</strong>.
          </div>
        )}

        {registryUrl ? (
          <>
            {/* URL display + copy */}
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
              <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-muted-foreground font-mono text-xs">{registryUrl}</span>
              <button
                onClick={copyLink}
                className="shrink-0 rounded p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Kopieer link"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={copyLink} className="w-full">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Gekopieerd!' : 'Kopieer link'}
              </Button>

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-md border border-transparent bg-whatsapp px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-whatsapp/90"
                >
                  <ExternalLink className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
            </div>

            {/* Password notice */}
            {registrySettings?.password && (
              <p className="text-xs text-muted-foreground">
                Wachtwoord vereist: <strong className="text-foreground">{registrySettings.password}</strong>
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Stel eerst een slug in voor jullie trouwwebsite om een deelbare link te genereren.
          </p>
        )}
      </div>
    </Modal>
  )
}
