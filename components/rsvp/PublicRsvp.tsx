'use client'

import * as React from 'react'

import { THEME_RENDERERS } from '@/components/website/v2/themes'
import type { RenderContext } from '@/components/website/v2/themes/types'
import type { RsvpBlock, TekstBlock } from '@/lib/bruiloft/websiteBlocks'
import { themeCssVars, themeVanLegacy, type ThemeTokens } from '@/lib/bruiloft/websiteTheme'
import type { RsvpStatus, WeddingLettertype, WeddingThema } from '@/lib/bruiloft/types'

export interface PublicWeddingData {
  wedding: {
    partner1Naam: string
    partner2Naam: string
    trouwdatum: string | null
    locatie: string
  }
  content: {
    welkomsttekst: string
    headerFotoUrl: string
    headerOverlay: number
  } | null
  theme: ThemeTokens | null
  fallback: {
    thema: WeddingThema
    kleurAccent: string
    kopLettertype: WeddingLettertype
  }
  website: {
    slug: string | null
    gepubliceerd: boolean
  }
  guest: {
    voornaam: string
    achternaam: string
    rsvpStatus: RsvpStatus
    dieetwensen: string
    heeftPartner: boolean
    partnerNaam: string
    aantalKinderen: number
    rsvpSubmittedAt: string | null
  }
}

export function PublicRsvp({ token, data }: { token: string; data: PublicWeddingData }) {
  const { wedding, content, website, guest } = data

  // De gast is al geïdentificeerd via het rsvp_token; als de website
  // wachtwoord-beveiligd is, ontgrendelt dat token 'm meteen ook voor de
  // koppeling naar de trouwwebsite hieronder — de gast hoeft nooit een
  // wachtwoord in te typen (dat wachtwoord staat sowieso alleen als
  // onomkeerbare hash opgeslagen).
  React.useEffect(() => {
    fetch('/api/rsvp/auto-unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).catch(() => {
      // Best-effort: mislukt ontgrendelen betekent hooguit dat de gast
      // straks alsnog het wachtwoordscherm van de trouwwebsite ziet.
    })
  }, [token])

  const theme = data.theme ?? themeVanLegacy(data.fallback.thema, data.fallback.kleurAccent, data.fallback.kopLettertype)
  const renderer = THEME_RENDERERS[theme.preset] ?? THEME_RENDERERS.klassiek

  const ctx: RenderContext = {
    theme,
    wedding,
    schedule: [],
    rsvpVooringevuld: {
      token,
      gast: {
        voornaam: guest.voornaam,
        achternaam: guest.achternaam,
        rsvpStatus: guest.rsvpStatus,
        dieetwensen: guest.dieetwensen,
        heeftPartner: guest.heeftPartner,
        partnerNaam: guest.partnerNaam,
        aantalKinderen: guest.aantalKinderen,
      },
    },
  }

  const heroBlock = {
    id: 'hero',
    type: 'hero' as const,
    zichtbaar: true,
    variant: 'fullscreen' as const,
    fotoUrl: content?.headerFotoUrl ?? '',
    overlay: content?.headerOverlay ?? 0.35,
    ondertitel: '',
  }

  // Uitsluitend introtekst + formulier — geen programma, dresscode,
  // cadeaulijst e.d.: dat hoort bij de volledige trouwwebsite, niet bij
  // deze ene persoonlijke uitnodiging.
  const contentBlocks: (TekstBlock | RsvpBlock)[] = []
  if (content?.welkomsttekst.trim()) {
    contentBlocks.push({
      id: 'welkom',
      type: 'tekst',
      zichtbaar: true,
      titel: '',
      tekst: content.welkomsttekst,
    })
  }
  contentBlocks.push({
    id: 'rsvp',
    type: 'rsvp',
    zichtbaar: true,
    titel: '',
    introTekst: '',
  })

  return (
    <div
      style={{
        ...themeCssVars(theme),
        background: 'var(--site-bg)',
        color: 'var(--site-text)',
        fontFamily: renderer.bodyFont,
        overflowX: 'clip',
      }}
    >
      <style>{renderer.css}</style>
      <renderer.Hero block={heroBlock} ctx={ctx} />
      <main>
        {contentBlocks.map((block, i) => (
          <renderer.Section
            key={block.id}
            block={block}
            ctx={ctx}
            nummer={i + 1}
            totaal={contentBlocks.length}
            eerste={i === 0}
            laatste={i === contentBlocks.length - 1}
          >
            <renderer.Content block={block} ctx={ctx} nummer={i + 1} />
          </renderer.Section>
        ))}
      </main>

      {website.gepubliceerd && website.slug ? (
        <div className="px-4 pb-6 text-center">
          <a
            href={`/trouwen/${website.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
            style={{ color: 'hsl(var(--primary))', fontFamily: 'var(--heading-font)' }}
          >
            Bekijk onze trouwwebsite →
          </a>
        </div>
      ) : null}

      <renderer.Footer ctx={ctx} />
    </div>
  )
}
