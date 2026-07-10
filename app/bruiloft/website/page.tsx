'use client'

// Trouwwebsite-editor (website v3): blokken + theme-tokens met live preview.
// Bij het eerste bezoek converteert converteerNaarBlokken bestaande content
// (oud vaste-secties-model) eenmalig naar een Home-pagina met blokken.

import { AlertCircle, Check, ExternalLink, Eye, Loader2, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import * as React from 'react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { websiteInfo } from '@/components/bruiloft/faqContent'
import { Button, Skeleton, useToast } from '@/components/bruiloft/ui'
import type { PublicWebsiteV2Data } from '@/components/website/v2/PublicWebsiteV2'
import { cn } from '@/lib/utils'
import type { Block, HeroBlock, WebsitePageInput } from '@/lib/bruiloft/websiteBlocks'
import { themeVanLegacy } from '@/lib/bruiloft/websiteTheme'
import { useBruiloftStore } from '@/store/bruiloftStore'

import { BlokkenBuilder } from './components/BlokkenBuilder'
import { LivePreview } from './components/LivePreview'
import { PaginaInstellingen } from './components/PaginaInstellingen'
import { RsvpSectie } from './components/RsvpSectie'
import { SiteWachtwoordInstellingen } from './components/SiteWachtwoordInstellingen'
import { ThemaInstellingen } from './components/ThemaInstellingen'
import { WebsiteStatusCard } from './components/WebsiteStatusCard'
import { useDebounceOpslaan } from './components/useDebounceOpslaan'

// Onthoud de inklap-voorkeur over pagina's en sessies heen (zelfde patroon
// als de blauwe navigatiesidebar, zie components/bruiloft/Sidebar.tsx).
const INSTELLINGEN_INGEKLAPT_KEY = 'bruiloft-website-instellingen-ingeklapt'

export default function WebsitePage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const websiteContent = useBruiloftStore((s) => s.websiteContent)
  const websitePages = useBruiloftStore((s) => s.websitePages)
  const scheduleItems = useBruiloftStore((s) => s.scheduleItems)
  const saveWebsiteContent = useBruiloftStore((s) => s.saveWebsiteContent)
  const updateWebsitePage = useBruiloftStore((s) => s.updateWebsitePage)
  const converteerNaarBlokken = useBruiloftStore((s) => s.converteerNaarBlokken)
  const { toast } = useToast()

  const convertAttempted = React.useRef(false)
  const [mobielPreviewOpen, setMobielPreviewOpen] = React.useState(false)
  // Instellingenkolom inklappen zodat het voorbeeld de volle breedte krijgt.
  // Net als de navigatiesidebar: na mount uit localStorage lezen (SSR
  // rendert altijd uitgeklapt) en de voorkeur daarna onthouden.
  const [voorbeeldVolledig, setVoorbeeldVolledig] = React.useState(false)
  React.useEffect(() => {
    try {
      setVoorbeeldVolledig(localStorage.getItem(INSTELLINGEN_INGEKLAPT_KEY) === '1')
    } catch {
      // localStorage niet beschikbaar — laat uitgeklapt.
    }
  }, [])

  function toggleVoorbeeldVolledig() {
    setVoorbeeldVolledig((huidig) => {
      const volgende = !huidig
      try {
        localStorage.setItem(INSTELLINGEN_INGEKLAPT_KEY, volgende ? '1' : '0')
      } catch {
        // Voorkeur niet kunnen bewaren is geen probleem.
      }
      return volgende
    })
  }

  // De trouwwebsite bestaat altijd uit precies één pagina (Home) — geen
  // paginabeheer of -wissel meer.
  const home = websitePages.find((p) => p.pageSlug === '') ?? websitePages[0] ?? null
  const huidigePagina = home

  // Lokale blokken-staat van de pagina: direct zichtbaar in de
  // preview, debounced opgeslagen.
  const [blocks, setBlocks] = React.useState<Block[] | null>(null)
  const blocksPageIdRef = React.useRef<string | null>(null)

  const debounce = useDebounceOpslaan<Pick<WebsitePageInput, 'blocks'>>(
    async (patch) => {
      if (!huidigePagina) return
      await updateWebsitePage(huidigePagina.id, patch)
    },
    700
  )
  const debounceStatus = debounce.status

  // Eenmalige converter: oud model → Home-pagina met blokken.
  React.useEffect(() => {
    if (wedding && !convertAttempted.current && websitePages.length === 0) {
      convertAttempted.current = true
      void converteerNaarBlokken()
    }
  }, [wedding, websitePages.length, converteerNaarBlokken])

  // Lokale blokken syncen met de store: bij paginawissel altijd, daarna
  // alleen zolang er geen eigen wijzigingen onderweg zijn (anders zou een
  // realtime-echo het typen onderbreken).
  React.useEffect(() => {
    if (!huidigePagina) return
    if (blocksPageIdRef.current !== huidigePagina.id) {
      blocksPageIdRef.current = huidigePagina.id
      setBlocks(huidigePagina.blocks)
      return
    }
    if (debounceStatus === 'idle') setBlocks(huidigePagina.blocks)
  }, [huidigePagina, debounceStatus])

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

  if (!websiteContent || !home || !huidigePagina || !blocks) {
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

  const theme =
    websiteContent.theme ??
    themeVanLegacy(websiteContent.thema, websiteContent.kleurAccent, websiteContent.kopLettertype,
      websiteContent.sectiesConfig['_nav']?.zichtbaar ?? false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const publiekeUrl = websiteContent.slug ? `${origin}/trouwen/${websiteContent.slug}` : null

  function onBlocksChange(next: Block[]) {
    setBlocks(next)
    debounce.stel({ blocks: next })
  }

  // Voor pagina's die niet actief bewerkt worden, gebruiken we de blokken
  // rechtstreeks uit de store; voor de actieve pagina de lokale (nog niet
  // per se opgeslagen) staat, zodat de preview direct meebeweegt met typen.
  const previewData: PublicWebsiteV2Data = {
    wedding: {
      partner1Naam: wedding.partner1Naam,
      partner2Naam: wedding.partner2Naam,
      trouwdatum: wedding.trouwdatum,
      locatie: wedding.locatie,
    },
    theme,
    fallback: {
      thema: websiteContent.thema,
      kleurAccent: websiteContent.kleurAccent,
      kopLettertype: websiteContent.kopLettertype,
    },
    pages: websitePages.map((p) => ({
      id: p.id,
      titel: p.titel,
      pageSlug: p.pageSlug,
      volgorde: p.volgorde,
      blocks: p.id === huidigePagina.id ? blocks : p.blocks,
    })),
    schedule: scheduleItems
      .filter((s) => s.betrokkenen.includes('gasten'))
      .sort((a, b) => a.tijd.localeCompare(b.tijd))
      .map((s) => ({
        tijd: s.tijd,
        eindtijd: s.eindtijd,
        titel: s.titel,
        omschrijving: s.omschrijving,
        locatie: s.locatie,
      })),
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
    <div className="mx-auto min-h-screen max-w-[1800px] overflow-x-hidden pb-24">
      <PageHeader
        titel="Trouwwebsite"
        info={<PageInfoButton {...websiteInfo} />}
        primaryActie={
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

      <div
        className={cn(
          'gap-6 lg:grid',
          voorbeeldVolledig
            ? 'lg:grid-cols-[auto_minmax(0,1fr)]'
            : 'lg:grid-cols-[minmax(0,1fr)_minmax(380px,46%)]'
        )}
      >
        {/* Ingeklapte rail: net als de navigatiesidebar blijft er een smalle
            strook staan met alleen de uitklap-knop. */}
        {voorbeeldVolledig && (
          <div className="hidden lg:flex lg:w-12 lg:shrink-0 lg:flex-col lg:items-center">
            <button
              type="button"
              onClick={toggleVoorbeeldVolledig}
              title="Instellingen tonen"
              className="mt-0.5 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            </button>
          </div>
        )}

        {/* Linkerkolom: instellingen + blokken */}
        <div className={cn('min-w-0', voorbeeldVolledig && 'lg:hidden')}>
          <div className="mb-2 hidden justify-end lg:flex">
            <button
              type="button"
              onClick={toggleVoorbeeldVolledig}
              title="Instellingen inklappen"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PanelLeftClose className="h-4 w-4" />
              Instellingen inklappen
            </button>
          </div>

          <WebsiteStatusCard
            content={websiteContent}
            onTogglePublicatie={() =>
              void saveWebsiteContent({
                websiteGepubliceerd: !websiteContent.websiteGepubliceerd,
              })
            }
            publiekeUrl={publiekeUrl}
            blokken={blocks}
          />

          <ThemaInstellingen
            content={websiteContent}
            theme={theme}
            headerFotoUrl={blocks.find((b): b is HeroBlock => b.type === 'hero')?.fotoUrl}
          />

          <SiteWachtwoordInstellingen content={websiteContent} />

          <PaginaInstellingen
            pagina={huidigePagina}
            onWijzig={(patch) => void updateWebsitePage(huidigePagina.id, patch)}
          />

          <BlokkenBuilder blocks={blocks} onChange={onBlocksChange} />

          <div className="mt-4">
            <RsvpSectie />
          </div>
        </div>

        {/* Rechterkolom: live preview (desktop) */}
        <div className="hidden min-w-0 lg:block">
          <div className="sticky top-20 h-[calc(100vh-6rem)]">
            <LivePreview data={previewData} activePageSlug={huidigePagina.pageSlug} />
          </div>
        </div>
      </div>

      {/* Mobiel: zwevende voorbeeld-knop + overlay */}
      <button
        type="button"
        onClick={() => setMobielPreviewOpen(true)}
        className="fixed bottom-20 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg lg:hidden"
      >
        <Eye className="h-4 w-4" /> Voorbeeld
      </button>
      {mobielPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-background p-2 lg:hidden">
          <LivePreview data={previewData} activePageSlug={huidigePagina.pageSlug} onClose={() => setMobielPreviewOpen(false)} />
        </div>
      )}
    </div>
  )
}
