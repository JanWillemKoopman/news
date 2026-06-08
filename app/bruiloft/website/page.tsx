'use client'

import { AlertCircle, Check, Clock, Eye, EyeOff, ExternalLink, Loader2 } from 'lucide-react'
import Link from 'next/link'
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
import { SectieInstellingen } from './components/editors/SectieInstellingen'
import { TekstEditor } from './components/editors/TekstEditor'
import { PaginaSidebar, type SectieSleutel } from './components/PaginaSidebar'
import { PreviewPanel } from './components/PreviewPanel'
import { useDebounceOpslaan } from './components/useDebounceOpslaan'
import { VormgevingTab } from './components/VormgevingTab'
import { RsvpSectie } from './components/RsvpSectie'

type TabId = 'inhoud' | 'vormgeving'

export default function WebsitePage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const websiteContent = useBruiloftStore((s) => s.websiteContent)
  const saveWebsiteContent = useBruiloftStore((s) => s.saveWebsiteContent)
  const uploadSectieFoto = useBruiloftStore((s) => s.uploadSectieFoto)
  const scheduleItems = useBruiloftStore((s) => s.scheduleItems)
  const { toast } = useToast()

  const [tab, setTab] = React.useState<TabId>('inhoud')
  const [activeSectie, setActiveSectie] = React.useState<SectieSleutel>('home')
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const initAttempted = React.useRef(false)

  const debounce = useDebounceOpslaan<WebsiteContentInput>(
    async (patch) => { await saveWebsiteContent(patch) },
    700
  )

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

  if (!websiteContent) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
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

  function getSectieConfig(s: SectieSleutel): SectieConfig {
    return websiteContent!.sectiesConfig[s] ?? { zichtbaar: true, naam: s }
  }

  function onToggleSectie(s: SectieSleutel, zichtbaar: boolean) {
    const huidig = { ...websiteContent!.sectiesConfig }
    huidig[s] = { ...huidig[s], zichtbaar }
    void saveWebsiteContent({ sectiesConfig: huidig })
  }

  function onSaveSectieConfig(s: SectieSleutel, patch: Partial<SectieConfig>) {
    const huidig = { ...websiteContent!.sectiesConfig }
    huidig[s] = { ...(huidig[s] ?? { zichtbaar: true, naam: s }), ...patch }
    void saveWebsiteContent({ sectiesConfig: huidig })
  }

  function onHerorden(nieuweVolgorde: SectieSleutel[]) {
    const huidig = { ...websiteContent!.sectiesConfig }
    nieuweVolgorde.forEach((s, i) => {
      huidig[s] = { ...(huidig[s] ?? { zichtbaar: true, naam: s }), volgorde: i }
    })
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
    <>
    <div className="mx-auto max-w-6xl overflow-x-hidden pb-24 min-h-screen">
      <PageHeader
        titel="Trouwwebsite"
        beschrijving="Beheer de inhoud en vormgeving van jullie persoonlijke trouwwebsite."
        actie={
          <div className="flex items-center gap-3">
            <SaveStatus />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen((v) => !v)}
            >
              {previewOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="hidden sm:inline">{previewOpen ? 'Sluiten' : 'Voorbeeld'}</span>
            </Button>
            {publiekeUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={publiekeUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" /> <span className="hidden sm:inline">Bekijk website</span>
                </a>
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6 flex w-full gap-1 rounded-xl bg-muted p-1 sm:w-fit">
        {(['inhoud', 'vormgeving'] as TabId[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all sm:flex-none ' +
              (tab === t
                ? 'bg-primary text-primary-foreground shadow-sm'
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
            onHerorden={onHerorden}
          />

          <div className="min-w-0 flex-1">
            <Card>
              <CardContent className="p-4 sm:p-6">
                {/* Section header: editable name + toggle for non-home sections */}
                {activeSectie === 'home' ? (
                  <h2 className="mb-4 text-xl text-foreground">Home</h2>
                ) : (
                  <SectieInstellingen
                    config={getSectieConfig(activeSectie)}
                    onSave={(patch) => onSaveSectieConfig(activeSectie, patch)}
                    onUploadFoto={(file) => uploadSectieFoto(activeSectie, file).then(() => undefined)}
                    onVerwijderFoto={() => onSaveSectieConfig(activeSectie, { fotoUrl: undefined })}
                    toonFotoUpload={activeSectie !== 'fotos'}
                  />
                )}

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
                    <Link href="/bruiloft/draaiboek" className="text-primary underline">
                      Draaiboek
                    </Link>
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
                {activeSectie === 'countdown' && (
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Aftelling naar de trouwdag</p>
                      <p className="mt-1">
                        De aftelling wordt automatisch berekend op basis van de trouwdatum
                        {wedding.trouwdatum ? ` (${wedding.trouwdatum})` : ''}.
                        Gebruik de instellingen hierboven om de naam, uitlijning en achtergrondkleur aan te passen.
                      </p>
                    </div>
                  </div>
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

    {previewOpen && (
      <PreviewPanel
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        websiteContent={websiteContent}
        wedding={wedding}
        scheduleItems={scheduleItems}
      />
    )}
    </>
  )
}
