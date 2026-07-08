// Contract tussen de orkestrator (PublicWebsiteV2) en de zes
// thema-renderers. Elk thema levert zijn eigen markup voor navigatie,
// hero, sectie-omhulsel, blok-inhoud en footer — plus een css-string met
// de eigen bewegingstaal (keyframes, hover-/focus-states). Zie README.md
// in deze map voor de archetypes.

import type * as React from 'react'

import type { RsvpStatus } from '@/lib/bruiloft/types'
import type { Block, HeroBlock } from '@/lib/bruiloft/websiteBlocks'
import type { ThemeTokens } from '@/lib/bruiloft/websiteTheme'

export interface ScheduleRegel {
  tijd: string
  eindtijd: string
  titel: string
  omschrijving: string
  locatie: string
}

export interface RegistryMeta {
  enabled: boolean
  passwordRequired: boolean
  introText: string
}

export interface WeddingInfo {
  partner1Naam: string
  partner2Naam: string
  trouwdatum: string | null
  locatie: string
}

// Een via naam-zoeken óf via een persoonlijke RSVP-token herkende gast —
// zelfde vorm in beide gevallen, zie themes/shared.tsx (useRsvpFormulier).
export interface GevondenGast {
  voornaam: string
  achternaam: string
  rsvpStatus: RsvpStatus
  dieetwensen: string
  heeftPartner: boolean
  partnerNaam: string
  aantalKinderen: number
}

// Aanwezig wanneer de bezoeker via een persoonlijke /rsvp/[token]-link
// binnenkwam: het RSVP-blok slaat dan de zoekstap over en start meteen
// gepersonaliseerd, bevestigend via die token i.p.v. naam-matching.
export interface TokenGast {
  token: string
  gast: GevondenGast
}

export interface RenderContext {
  theme: ThemeTokens
  wedding: WeddingInfo
  schedule: ScheduleRegel[]
  registry?: RegistryMeta | null
  slug?: string
  tokenGast?: TokenGast | null
}

// Alle blokken behalve de hero — de hero heeft een eigen renderer.
export type ContentBlock = Exclude<Block, HeroBlock>

export interface NavItem {
  key: string
  label: string
  href: string
  actief?: boolean
}

export interface NavProps {
  items: NavItem[]
  ctx: RenderContext
}

export interface HeroProps {
  block: HeroBlock
  ctx: RenderContext
}

export interface SectionProps {
  block: ContentBlock
  ctx: RenderContext
  // 1-gebaseerde positie exclusief scheiding-blokken; 0 voor scheidingen.
  // Gebruikt voor katernnummers (The Editor) en pariteit-afwisselingen
  // (Le Jardin, Het Landgoed) die in élke blokvolgorde moeten kloppen.
  nummer: number
  totaal: number
  eerste: boolean
  laatste: boolean
  children: React.ReactNode
}

export interface ContentProps {
  block: ContentBlock
  ctx: RenderContext
  nummer: number
}

export interface FooterProps {
  ctx: RenderContext
}

export interface ThemeRenderer {
  // Thema-specifieke css (keyframes, veld-/knopklassen). Wordt één keer in
  // de paginaroot geïnjecteerd; klassen zijn per thema geprefixt (at-, ed-,
  // ja-, rs-, st-, tu-) zodat ze nooit botsen.
  css: string
  // Broodtekst-lettertype (css font-family-waarde). Koppen blijven de
  // gebruikers-token (--heading-font) volgen.
  bodyFont: string
  Nav: React.ComponentType<NavProps>
  Hero: React.ComponentType<HeroProps>
  Section: React.ComponentType<SectionProps>
  Content: React.ComponentType<ContentProps>
  Footer: React.ComponentType<FooterProps>
}
