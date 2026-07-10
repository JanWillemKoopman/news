'use client'

// Site-breed wachtwoord voor de trouwwebsite (fase 3). De schakelaar
// (sitePasswordEnabled) gaat via de normale saveWebsiteContent-laag; het
// wachtwoord zelf gaat altijd via saveSitePassword/fetchSitePassword
// (server-side omkeerbaar versleuteld, zie app/api/trouwen/settings/
// route.ts) — nooit via de directe client-upsert, en nooit automatisch
// meegestuurd bij een ongewijzigd veld (voorkomt dat een leeg/onaangeraakt
// veld per ongeluk het wachtwoord wist).

import { Check, ChevronDown, KeyRound, Loader2 } from 'lucide-react'
import * as React from 'react'

import { Input, useToast } from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import type { WebsiteContent } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

export function SiteWachtwoordInstellingen({ content }: { content: WebsiteContent }) {
  const saveWebsiteContent = useBruiloftStore((s) => s.saveWebsiteContent)
  const saveSitePassword = useBruiloftStore((s) => s.saveSitePassword)
  const fetchSitePassword = useBruiloftStore((s) => s.fetchSitePassword)
  const { toast } = useToast()

  const [open, setOpen] = React.useState(false)
  const [wachtwoord, setWachtwoord] = React.useState('')
  const [opslaan, setOpslaan] = React.useState(false)
  // Huidige (ontsleutelde) wachtwoordwaarde, alleen opgehaald zodra de kaart
  // opengeklapt wordt. huidigWachtwoord is null zolang onbekend, niet
  // ingesteld, óf ingesteld in het oude niet-omkeerbare formaat.
  const [huidigWachtwoord, setHuidigWachtwoord] = React.useState<string | null>(null)
  const [huidigIngesteld, setHuidigIngesteld] = React.useState(false)
  const [wachtwoordGeladen, setWachtwoordGeladen] = React.useState(false)

  React.useEffect(() => {
    if (!open || wachtwoordGeladen) return
    setWachtwoordGeladen(true)
    void fetchSitePassword().then(({ password, isSet }) => {
      setHuidigWachtwoord(password)
      setHuidigIngesteld(isSet)
    })
  }, [open, wachtwoordGeladen, fetchSitePassword])

  async function toggleEnabled() {
    await saveWebsiteContent({ sitePasswordEnabled: !content.sitePasswordEnabled })
  }

  async function wachtwoordOpslaan() {
    setOpslaan(true)
    try {
      const result = await saveSitePassword(wachtwoord)
      setHuidigWachtwoord(result.password)
      setHuidigIngesteld(!!result.password)
      setWachtwoord('')
      toast({
        title: wachtwoord ? 'Wachtwoord ingesteld' : 'Wachtwoord verwijderd',
        variant: 'success',
      })
    } catch {
      toast({ title: 'Opslaan mislukt', variant: 'error' })
    } finally {
      setOpslaan(false)
    }
  }

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/30 sm:px-5"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <KeyRound className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Wachtwoordbeveiliging</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {content.sitePasswordEnabled ? 'Aan — de hele website is beveiligd' : 'Uit — iedereen met de link kan de website zien'}
          </p>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-5 border-t border-border px-4 py-5 sm:px-5 sm:py-6">
          <div className="flex items-center gap-3">
            <button
              role="switch"
              aria-checked={content.sitePasswordEnabled}
              onClick={() => void toggleEnabled()}
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                content.sitePasswordEnabled ? 'bg-primary' : 'bg-input'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200',
                  content.sitePasswordEnabled ? 'left-6' : 'left-1'
                )}
              />
            </button>
            <span className="text-sm text-foreground">
              {content.sitePasswordEnabled ? 'Website is beveiligd' : 'Geen wachtwoord vereist'}
            </span>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Wachtwoord
            </p>
            <p className="mb-2.5 text-xs text-muted-foreground">
              {content.sitePasswordEnabled
                ? 'Stel hier het wachtwoord in dat gasten moeten invoeren. Leeg opslaan verwijdert de beveiliging weer.'
                : 'Zet de schakelaar hierboven aan om een wachtwoord in te stellen.'}
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={wachtwoord}
                onChange={(e) => setWachtwoord(e.target.value)}
                placeholder="Nieuw wachtwoord…"
                className="max-w-xs"
              />
              <button
                type="button"
                onClick={() => void wachtwoordOpslaan()}
                disabled={opslaan}
                className="inline-flex h-10 items-center gap-1.5 rounded-md border border-primary bg-primary/10 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
              >
                {opslaan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Opslaan
              </button>
            </div>
            {huidigWachtwoord && (
              <p className="mt-2.5 text-sm text-foreground">
                Je wachtwoord voor je trouwwebsite is:{' '}
                <span className="font-mono font-semibold">{huidigWachtwoord}</span>
              </p>
            )}
            {!huidigWachtwoord && huidigIngesteld && (
              <p className="mt-2.5 text-xs text-muted-foreground">
                Er staat een wachtwoord ingesteld van vóór deze functie, waardoor de waarde niet
                meer getoond kan worden. Sla hierboven een nieuw wachtwoord op om dit voortaan te
                kunnen zien.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
