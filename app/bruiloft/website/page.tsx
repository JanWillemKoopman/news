'use client'

import { AlertCircle, Check, ExternalLink, Loader2 } from 'lucide-react'
import * as React from 'react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { Button, Skeleton, useToast } from '@/components/bruiloft/ui'
import type { SectieConfig, WebsiteContentInput } from '@/lib/bruiloft/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

import { OntwerpInstellingen } from './components/OntwerpInstellingen'
import { SectieAccordionLijst } from './components/SectieAccordionLijst'
import { useDebounceOpslaan } from './components/useDebounceOpslaan'
import { WebsiteStatusCard } from './components/WebsiteStatusCard'
import type { SectieSleutel } from './components/PaginaSidebar'

export default function WebsitePage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const websiteContent = useBruiloftStore((s) => s.websiteContent)
  const saveWebsiteContent = useBruiloftStore((s) => s.saveWebsiteContent)
  const { toast } = useToast()

  const initAttempted = React.useRef(false)

  const debounce = useDebounceOpslaan<WebsiteContentInput>(
    async (patch) => {
      await saveWebsiteContent(patch)
    },
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
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const publiekeUrl = websiteContent.slug ? `${origin}/trouwen/${websiteContent.slug}` : null

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

  const SaveStatus = () =>
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
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Opslaan…
          </>
        ) : debounce.status === 'saved' ? (
          <>
            <Check className="h-4 w-4 text-emerald-600" /> Opgeslagen
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4" /> Niet opgeslagen
          </>
        )}
      </span>
    )

  return (
    <div className="mx-auto max-w-6xl overflow-x-hidden pb-24 min-h-screen">
        <PageHeader
          titel="Trouwwebsite"
          beschrijving="Beheer de inhoud en het ontwerp van jullie persoonlijke trouwwebsite."
          actie={
            <div className="flex items-center gap-3">
              <SaveStatus />
              {publiekeUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={publiekeUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    <span>Bekijk website</span>
                  </a>
                </Button>
              )}
            </div>
          }
        />

        {/* 1. Status + publish toggle + URL */}
        <WebsiteStatusCard
          content={websiteContent}
          onTogglePublicatie={() =>
            void saveWebsiteContent({
              websiteGepubliceerd: !websiteContent.websiteGepubliceerd,
            })
          }
          publiekeUrl={publiekeUrl}
        />

        {/* 2. Design settings (template, color, font, URL) */}
        <OntwerpInstellingen content={websiteContent} />

        {/* 3. Section accordion (content + layout settings) */}
        <SectieAccordionLijst
          websiteContent={websiteContent}
          wedding={wedding}
          debounce={debounce}
          onToggleSectie={onToggleSectie}
          onSaveSectieConfig={onSaveSectieConfig}
          onHerorden={onHerorden}
        />
    </div>
  )
}
