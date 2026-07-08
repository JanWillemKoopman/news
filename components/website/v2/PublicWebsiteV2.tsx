'use client'

// Publieke trouwwebsite v4: één orkestrator, zes structurele
// thema-renderers. Waar de zes templates eerder alleen token-presets waren
// (kleur/lettertype/hoeken) op één gedeelde markup, kiest theme.preset nu
// een volledig eigen renderer per thema — met eigen layoutstructuur, eigen
// componentgedrag en een eigen bewegingstaal. Zie themes/README.md voor de
// archetypes; de tokens (kleuren, lettertype, hoeken, ornament) blijven
// daarbinnen per stel aanpasbaar.
//
// Deze component behoudt bewust het bestaande contract: dezelfde props en
// data-vorm (get_public_website_v2), dezelfde zichtbaarheidsregels, dezelfde
// anchor-id's (#b-<blokId>) en hetzelfde RSVP-API-gedrag (themes/shared.tsx).

import * as React from 'react'

import type { WeddingLettertype, WeddingThema } from '@/lib/bruiloft/types'
import type { Block, HeroBlock } from '@/lib/bruiloft/websiteBlocks'
import { heeftInhoud } from '@/lib/bruiloft/websiteBlocks'
import {
  HOEK_RADIUS,
  LETTERTYPE_CSS_VAR,
  hexNaarHsl,
  themeVanLegacy,
  type ThemeTokens,
} from '@/lib/bruiloft/websiteTheme'

import { THEME_RENDERERS } from './themes'
import type { ContentBlock, NavItem, RegistryMeta, RenderContext, ScheduleRegel, TokenGast } from './themes/types'

// Types die extern (route, editor) geïmporteerd worden, her-geëxporteerd
// zodat bestaande imports blijven werken.
export type { RegistryMeta, ScheduleRegel, TokenGast } from './themes/types'

// ─── Datavorm van get_public_website_v2 ──────────────────────────────────────

export interface PublicPage {
  id: string
  titel: string
  pageSlug: string
  volgorde: number
  blocks: Block[]
  // Fase 4: optionele SEO/OG-overrides, alleen gebruikt door generateMetadata
  // in de publieke route — de renderer zelf leest dit niet.
  seoTitel?: string
  seoOmschrijving?: string
}

export interface PublicWebsiteV2Data {
  wedding: {
    partner1Naam: string
    partner2Naam: string
    trouwdatum: string | null
    locatie: string
  }
  theme: ThemeTokens | null
  fallback: {
    thema: WeddingThema
    kleurAccent: string
    kopLettertype: WeddingLettertype
  }
  pages: PublicPage[]
  schedule: ScheduleRegel[]
}

// ─── Theme → CSS-variabelen ──────────────────────────────────────────────────

function themeCssVars(theme: ThemeTokens): React.CSSProperties {
  return {
    '--primary': hexNaarHsl(theme.kleuren.accent),
    '--primary-foreground': '0 0% 100%',
    '--site-bg': theme.kleuren.achtergrond,
    '--site-card': theme.kleuren.kaart,
    '--site-text': theme.kleuren.tekst,
    '--site-muted': theme.kleuren.gedempt,
    '--site-radius': HOEK_RADIUS[theme.hoeken],
    '--heading-font': LETTERTYPE_CSS_VAR[theme.kopLettertype],
  } as React.CSSProperties
}

// ─── Hoofdcomponent ──────────────────────────────────────────────────────────

export function PublicWebsiteV2({
  data,
  registry,
  slug,
  activePageSlug = '',
  basisPad,
  tokenGast,
}: {
  data: PublicWebsiteV2Data
  registry?: RegistryMeta | null
  slug?: string
  activePageSlug?: string
  // Voorvoegsel voor pagina-navigatielinks bij meerdere pagina's. Standaard
  // de publieke route (/trouwen/{slug}); de persoonlijke RSVP-link
  // (app/rsvp/[token]/...) geeft hier '/rsvp/{token}' door zodat een gast
  // tussen pagina's blijft navigeren binnen zijn eigen gepersonaliseerde
  // weergave. Cadeaulijst-links blijven altijd slug-based (die pagina is
  // niet gast-specifiek).
  basisPad?: string
  // Aanwezig wanneer de bezoeker via een persoonlijke /rsvp/[token]-link
  // binnenkwam: het RSVP-blok slaat dan de zoekstap over en start meteen
  // gepersonaliseerd. Zie themes/shared.tsx (useRsvpFormulier).
  tokenGast?: TokenGast | null
}) {
  const theme =
    data.theme ??
    themeVanLegacy(data.fallback.thema, data.fallback.kleurAccent, data.fallback.kopLettertype)

  const renderer = THEME_RENDERERS[theme.preset] ?? THEME_RENDERERS.klassiek

  // get_public_website_v2 filtert al op zichtbare pagina's; data.pages bevat
  // dus alleen pagina's die publiek getoond mogen worden.
  const pagina =
    data.pages.find((p) => p.pageSlug === activePageSlug) ?? data.pages[0]

  const ctx: RenderContext = { theme, wedding: data.wedding, schedule: data.schedule, registry, slug, tokenGast }
  const pad = basisPad ?? `/trouwen/${slug}`

  const zichtbaar = (pagina?.blocks ?? []).filter((b) => {
    if (!b.zichtbaar) return false
    if (b.type === 'hero') return true
    // Cadeaulijst-blok toont altijd zodra de cadeaulijst-module aanstaat.
    if (b.type === 'cadeaulijst') return registry?.enabled || heeftInhoud(b)
    if (b.type === 'countdown') return !!(b.datum || data.wedding.trouwdatum)
    if (b.type === 'programma') return b.bron === 'eigen' ? b.eigenTekst.trim().length > 0 : data.schedule.length > 0
    return heeftInhoud(b)
  })

  const hero = zichtbaar.find((b): b is HeroBlock => b.type === 'hero')
  const rest = zichtbaar.filter((b): b is ContentBlock => b.type !== 'hero')

  // Nummering exclusief scheidingen: katernnummers (The Editor) en
  // pariteit-afwisselingen (Le Jardin, Het Landgoed, De Tuin) blijven zo
  // kloppend in élke blokvolgorde.
  const genummerd = rest.filter((b) => b.type !== 'scheiding')
  const nummerVan = new Map(genummerd.map((b, i) => [b.id, i + 1]))

  // Meerdere pagina's: navigeer tussen pagina's. Eén pagina: navigeer met
  // anchors naar de blokken binnen die pagina.
  const navItems: NavItem[] =
    data.pages.length > 1
      ? data.pages.map((p) => ({
          key: p.id,
          label: p.titel || 'Home',
          href: p.pageSlug ? `${pad}/${p.pageSlug}` : pad,
          actief: p.pageSlug === (pagina?.pageSlug ?? activePageSlug),
        }))
      : rest
          .filter((b) => b.type !== 'scheiding' && b.type !== 'cadeaulijst')
          .filter((b) => 'titel' in b && b.titel)
          .map((b) => ({ key: b.id, label: 'titel' in b ? b.titel : '', href: `#b-${b.id}` }))

  return (
    <div
      style={{
        ...themeCssVars(theme),
        background: 'var(--site-bg)',
        color: 'var(--site-text)',
        fontFamily: renderer.bodyFont,
        // Decoratie (taken, marquee, meanderende blokken) mag nooit
        // horizontale scroll veroorzaken; clip breekt position:sticky niet.
        overflowX: 'clip',
      }}
    >
      <style>{renderer.css}</style>
      {theme.navZichtbaar && <renderer.Nav items={navItems} ctx={ctx} />}
      {hero && <renderer.Hero block={hero} ctx={ctx} />}
      <main>
        {rest.map((b) => {
          const nummer = nummerVan.get(b.id) ?? 0
          return (
            <renderer.Section
              key={b.id}
              block={b}
              ctx={ctx}
              nummer={nummer}
              totaal={genummerd.length}
              eerste={nummer === 1}
              laatste={nummer === genummerd.length}
            >
              <renderer.Content block={b} ctx={ctx} nummer={nummer} />
            </renderer.Section>
          )
        })}
      </main>
      <renderer.Footer ctx={ctx} />
    </div>
  )
}
