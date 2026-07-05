'use client'

// Trouwwebsite-editor (website v3): blokken + theme-tokens met live preview.
// Bij het eerste bezoek converteert converteerNaarBlokken bestaande content
// (oud vaste-secties-model) eenmalig naar een Home-pagina met blokken.

import { AlertCircle, Check, ExternalLink, Eye, Loader2 } from 'lucide-react'
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
import { PaginaSwitcher } from './components/PaginaSwitcher'
import { RsvpSectie } from './components/RsvpSectie'
import { SiteWachtwoordInstellingen } from './components/SiteWachtwoordInstellingen'
import { ThemaInstellingen } from './components/ThemaInstellingen'
import { WebsiteStatusCard } from './components/WebsiteStatusCard'
import { useDebounceOpslaan } from './components/useDebounceOpslaan'

export default function WebsitePage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const websiteContent = useBruiloftStore((s) => s.websiteContent)
  const websitePages = useBruiloftStore((s) => s.websitePages)
  const scheduleItems = useBruiloftStore((s) => s.scheduleItems)
  const saveWebsiteContent = useBruiloftStore((s) => s.saveWebsiteContent)
  const addWebsitePage = useBruiloftStore((s) => s.addWebsitePage)
  const updateWebsitePage = useBruiloftStore((s) => s.updateWebsitePage)
  const deleteWebsitePage = useBruiloftStore((s) => s.deleteWebsitePage)
  const converteerNaarBlokken = useBruiloftStore((s) => s.converteerNaarBlokken)
  const { toast } = useToast()

  const convertAttempted = React.useRef(false)
  const [mobielPreviewOpen, setMobielPreviewOpen] = React.useState(false)
  // Instellingenkolom inklappen zodat het voorbeeld de volle breedte krijgt.
  const [voorbeeldVolledig, setVoorbeeldVolledig] = React.useState(false)

  const home = websitePages.find((p) => p.pageSlug === '') ?? websitePages[0] ?? null

  // Welke pagina wordt momenteel bewerkt (los van welke het eerst laadt).
  const [actievePaginaId, setActievePaginaId] = React.useState<string | null>(null)
  const huidigePagina = websitePages.find((p) => p.id === actievePaginaId) ?? home

  React.useEffect(() => {
    if (!actievePaginaId && home) setActievePaginaId(home.id)
  }, [actievePaginaId, home])

  // Lokale blokken-staat van de actieve pagina: direct zichtbaar in de
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

  async function onPaginaToevoegen(titel: string, pageSlug: string) {
    const nieuw = await addWebsitePage({
      titel,
      pageSlug,
      volgorde: websitePages.length,
      zichtbaar: true,
      blocks: [],
      seoTitel: '',
      seoOmschrijving: '',
    })
    setActievePaginaId(nieuw.id)
  }

  async function onPaginaVerwijderen(id: string) {
    if (id === actievePaginaId) setActievePaginaId(home.id)
    await deleteWebsitePage(id)
  }

  async function onPaginaHerorden(nieuweVolgorde: typeof websitePages) {
    await Promise.all(nieuweVolgorde.map((p, i) => updateWebsitePage(p.id, { volgorde: i })))
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
          'gap-6',
          voorbeeldVolledig
            ? 'lg:block'
            : 'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(380px,46%)]'
        )}
      >
        {/* Linkerkolom: instellingen + blokken */}
        <div className={cn('min-w-0', voorbeeldVolledig && 'lg:hidden')}>
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

          <PaginaSwitcher
            paginas={websitePages}
            actievePaginaId={huidigePagina.id}
            onSelecteer={setActievePaginaId}
            onToevoegen={onPaginaToevoegen}
            onHernoemen={(id, titel) => void updateWebsitePage(id, { titel })}
            onToggleZichtbaar={(id, zichtbaar) => void updateWebsitePage(id, { zichtbaar })}
            onVerwijderen={onPaginaVerwijderen}
            onHerorden={onPaginaHerorden}
            onSeoWijzigen={(id, patch) => void updateWebsitePage(id, patch)}
          />

          <BlokkenBuilder blocks={blocks} onChange={onBlocksChange} />

          <div className="mt-4">
            <RsvpSectie />
          </div>
        </div>

        {/* Rechterkolom: live preview (desktop) */}
        <div className="hidden lg:block">
          <div className="sticky top-20 h-[calc(100vh-6rem)]">
            <LivePreview
              data={previewData}
              activePageSlug={huidigePagina.pageSlug}
              volledig={voorbeeldVolledig}
              onToggleVolledig={() => setVoorbeeldVolledig(!voorbeeldVolledig)}
            />
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
