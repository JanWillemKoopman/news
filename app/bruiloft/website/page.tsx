'use client'

import { AlertCircle, Check, ExternalLink, Loader2 } from 'lucide-react'
import * as React from 'react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import {
  Button,
  Card,
  CardContent,
  Skeleton,
  useToast,
} from '@/components/bruiloft/ui'
import type { SectieConfig, WebsiteContentInput } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

import { FaqEditor } from './components/editors/FaqEditor'
import { FotoGalerijEditor } from './components/editors/FotoGalerijEditor'
import { HomeEditor } from './components/editors/HomeEditor'
import { TekstEditor } from './components/editors/TekstEditor'
import { PaginaSidebar, type SectieSleutel } from './components/PaginaSidebar'
import { useDebounceOpslaan } from './components/useDebounceOpslaan'
import { VormgevingTab } from './components/VormgevingTab'
import { RsvpSectie } from './components/RsvpSectie'

type TabId = 'inhoud' | 'vormgeving'

export default function WebsitePage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const websiteContent = useBruiloftStore((s) => s.websiteContent)
  const saveWebsiteContent = useBruiloftStore((s) => s.saveWebsiteContent)
  const { toast } = useToast()

  const [tab, setTab] = React.useState<TabId>('inhoud')
  const [activeSectie, setActiveSectie] = React.useState<SectieSleutel>('home')
  const initAttempted = React.useRef(false)

  const debounce = useDebounceOpslaan<WebsiteContentInput>(
    async (patch) => {
      await saveWebsiteContent(patch)
    },
    700
  )

  // Maak automatisch een lege websiteContent-rij aan als die nog niet bestaat.
  // Happens for brand new weddings that haven't configured a website yet.
  React.useEffect(() => {
    if (wedding && !websiteContent && !initAttempted.current) {
      initAttempted.current = true
      void saveWebsiteContent({})
    }
  }, [wedding, websiteContent, saveWebsiteContent])

  React.useEffect(() => {
    if (debounce.status === 'error') {
      toast({
        title: 'Opslaan mislukt',
        description: 'Controleer je internetverbinding en probeer het opnieuw.',
        variant: 'error',
      })
    }
  }, [debounce.status, toast])

  if (!wedding) return null

  // Toon skeleton terwijl websiteContent nog aangemaakt/geladen wordt
  if (!websiteContent) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-32 shrink-0" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg sm:w-48" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const publiekeUrl = websiteContent.slug ? `${origin}/trouwen/${websiteContent.slug}` : null

  function onToggleSectie(s: SectieSleutel, zichtbaar: boolean) {
    const huidig: Record<string, SectieConfig> = { ...websiteContent!.sectiesConfig }
    huidig[s] = { ...huidig[s], zichtbaar }
    void saveWebsiteContent({ sectiesConfig: huidig })
  }

  const SaveStatus = () => (
    debounce.status === 'idle' ? null : (
      <span
        className={
          'inline-flex items-center gap-1.5 text-sm ' +
          (debounce.status === 'error' ? 'text-destructive' : 'text-muted-foreground')
        }
        role="status"
        aria-live="polite"
      >
        {debounce.status === 'saving' ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Opslaan…</>
        ) : debounce.status === 'saved' ? (
          <><Check className="h-4 w-4 text-emerald-600" /> Opgeslagen</>
        ) : (
          <><AlertCircle className="h-4 w-4" /> Niet opgeslagen</>
        )}
      </span>
    )
  )

  return (
    <div className="mx-auto w-full max-w-5xl overflow-x-hidden">
      <PageHeader
        titel="Trouwwebsite"
        beschrijving="Beheer de inhoud en vormgeving van jullie persoonlijke trouwwebsite."
        actie={
          <div className="flex items-center gap-3">
            <SaveStatus />
            {publiekeUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={publiekeUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> Bekijk website
                </a>
              </Button>
            )}
          </div>
        }
      />

      {/* Tab-knoppen: full-width op mobiel, auto-breedte op grotere schermen */}
      <div className="mb-6 flex w-full gap-1 rounded-lg bg-muted/40 p-1 sm:w-fit">
        {(['inhoud', 'vormgeving'] as TabId[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all sm:flex-none ' +
              (tab === t
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            {t === 'inhoud' ? 'Inhoud' : 'Vormgeving'}
          </button>
        ))}
      </div>

      {tab === 'inhoud' ? (
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <PaginaSidebar
            sectiesConfig={websiteContent.sectiesConfig}
            actief={activeSectie}
            onSelecteer={setActiveSectie}
            onToggle={onToggleSectie}
          />

          <div className="min-w-0 flex-1">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <h2 className="mb-4 font-serif text-xl text-foreground">
                  {activeSectie === 'home' ? 'Home' : websiteContent.sectiesConfig[activeSectie]?.naam ?? activeSectie}
                </h2>

                {activeSectie === 'home' && (
                  <HomeEditor
                    welkomsttekst={websiteContent.welkomsttekst}
                    headerFotoUrl={websiteContent.headerFotoUrl}
                    debounce={debounce}
                  />
                )}
                {activeSectie === 'programma' && (
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                    Het programma beheer je via{' '}
                    <a href="/bruiloft/draaiboek" className="text-primary underline">
                      Draaiboek
                    </a>
                    . Programma-items die voor gasten zichtbaar zijn worden automatisch op de website getoond.
                  </div>
                )}
                {activeSectie === 'dresscode' && (
                  <TekstEditor
                    veld="dresscode"
                    label="Dresscode"
                    waarde={websiteContent.dresscode}
                    debounce={debounce}
                    placeholder="Bijv. Formeel, feestelijk casual…"
                    toelichting="Omschrijf de gewenste kledingstijl voor jullie gasten."
                  />
                )}
                {activeSectie === 'cadeaulijst' && (
                  <TekstEditor
                    veld="cadeaulijst"
                    label="Cadeaulijst"
                    waarde={websiteContent.cadeaulijst}
                    debounce={debounce}
                    placeholder="Link naar jullie cadeaulijst of aanwijzingen…"
                    toelichting="Deel een link naar jullie online cadeaulijst of geef instructies."
                  />
                )}
                {activeSectie === 'hotels' && (
                  <TekstEditor
                    veld="hotels"
                    label="Overnachten"
                    waarde={websiteContent.hotels}
                    debounce={debounce}
                    placeholder="Suggesties voor hotels of B&B's in de buurt…"
                    toelichting="Help gasten die van ver komen met overnachtingsopties."
                  />
                )}
                {activeSectie === 'routebeschrijving' && (
                  <TekstEditor
                    veld="routebeschrijving"
                    label="Route"
                    waarde={websiteContent.routebeschrijving}
                    debounce={debounce}
                    placeholder="Adres, routebeschrijving of parkeertips…"
                    toelichting="Geef gasten uitleg over hoe ze de locatie bereiken."
                  />
                )}
                {activeSectie === 'contact' && (
                  <TekstEditor
                    veld="contact"
                    label="Contact"
                    waarde={websiteContent.contact}
                    debounce={debounce}
                    meerdereRegels={false}
                    placeholder="E-mail of telefoonnummer voor vragen…"
                    toelichting="Contactgegevens voor gasten met vragen."
                  />
                )}
                {activeSectie === 'faq' && (
                  <FaqEditor faq={websiteContent.faq} />
                )}
                {activeSectie === 'fotos' && (
                  <FotoGalerijEditor />
                )}
              </CardContent>
            </Card>

            {activeSectie === 'home' && (
              <div className="mt-4 sm:mt-6">
                <RsvpSectie />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-xl">
          <VormgevingTab content={websiteContent} />
        </div>
      )}
    </div>
  )
}
