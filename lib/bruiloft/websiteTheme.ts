// Theme-engine voor de publieke trouwwebsite (website v3, zie
// trouwwebsite-roadmap.md). Een thema is data (design-tokens), geen code:
// de zes oude templates zijn hier presets van geworden, en elk token is
// daarna individueel door het stel aan te passen.

import type { WeddingLettertype, WeddingThema } from './types'

export type OrnamentStijl = 'geen' | 'diamant' | 'blad' | 'ster'
// kaart = secties in omkaderde kaarten; accentlijn = open met een
// accentkleurige lijn per sectie; open = alleen typografie en witruimte.
export type KaartStijl = 'kaart' | 'accentlijn' | 'open'
export type HoekStijl = 'scherp' | 'zacht' | 'rond'
export type NavStijl = 'licht' | 'donker' | 'accent'

export interface ThemeKleuren {
  accent: string      // hoofdkleur (koppen, lijnen, knoppen)
  achtergrond: string // paginakleur
  kaart: string       // sectie-/kaartachtergrond
  tekst: string
  gedempt: string     // secundaire tekst
}

export interface ThemeTokens {
  // Preset waar dit thema van afstamt (voor de editor-UI; rendering
  // gebruikt uitsluitend de tokens zelf).
  preset: WeddingThema
  kopLettertype: WeddingLettertype
  kopCursief: boolean
  kleuren: ThemeKleuren
  hoeken: HoekStijl
  kaartStijl: KaartStijl
  ornament: OrnamentStijl
  navZichtbaar: boolean
  navStijl: NavStijl
}

// CSS-variabelen per lettertype; geladen in app/trouwen/layout.tsx via next/font.
export const LETTERTYPE_CSS_VAR: Record<WeddingLettertype, string> = {
  cormorant:        'var(--font-serif)',
  playfair:         'var(--font-playfair)',
  lora:             'var(--font-lora)',
  'dancing-script': 'var(--font-dancing)',
  'eb-garamond':    'var(--font-garamond)',
  'great-vibes':    'var(--font-vibes)',
}

const BASIS_TEKST = '#262626'
const BASIS_GEDEMPT = '#6b7280'

export const THEME_PRESETS: Record<WeddingThema, ThemeTokens> = {
  // The Atelier — tijdloos, ornamenteel, gecentreerd.
  klassiek: {
    preset: 'klassiek',
    kopLettertype: 'cormorant',
    kopCursief: false,
    kleuren: { accent: '#a78ba8', achtergrond: '#ffffff', kaart: '#ffffff', tekst: BASIS_TEKST, gedempt: BASIS_GEDEMPT },
    hoeken: 'zacht',
    kaartStijl: 'kaart',
    ornament: 'diamant',
    navZichtbaar: false,
    navStijl: 'licht',
  },
  // The Editor — editoriaal, scherp, genummerde koppen.
  modern: {
    preset: 'modern',
    kopLettertype: 'playfair',
    kopCursief: false,
    kleuren: { accent: '#1c1c2e', achtergrond: '#ffffff', kaart: '#ffffff', tekst: BASIS_TEKST, gedempt: BASIS_GEDEMPT },
    hoeken: 'scherp',
    kaartStijl: 'open',
    ornament: 'geen',
    navZichtbaar: false,
    navStijl: 'licht',
  },
  // Le Jardin — warm blush, rond, dromerig.
  romantisch: {
    preset: 'romantisch',
    kopLettertype: 'dancing-script',
    kopCursief: true,
    kleuren: { accent: '#c2829a', achtergrond: '#faf7f4', kaart: '#f2ede9', tekst: BASIS_TEKST, gedempt: BASIS_GEDEMPT },
    hoeken: 'rond',
    kaartStijl: 'kaart',
    ornament: 'blad',
    navZichtbaar: false,
    navStijl: 'licht',
  },
  // Het Landgoed — warm organisch, linnen, accentlijnen.
  rustiek: {
    preset: 'rustiek',
    kopLettertype: 'lora',
    kopCursief: false,
    kleuren: { accent: '#8b6341', achtergrond: '#ffffff', kaart: '#f4f1ec', tekst: BASIS_TEKST, gedempt: BASIS_GEDEMPT },
    hoeken: 'scherp',
    kaartStijl: 'accentlijn',
    ornament: 'geen',
    navZichtbaar: false,
    navStijl: 'donker',
  },
  // Studio — radicaal minimalistisch, alleen type en witruimte.
  minimalistisch: {
    preset: 'minimalistisch',
    kopLettertype: 'eb-garamond',
    kopCursief: false,
    kleuren: { accent: '#1a1a1a', achtergrond: '#ffffff', kaart: '#ffffff', tekst: BASIS_TEKST, gedempt: BASIS_GEDEMPT },
    hoeken: 'scherp',
    kaartStijl: 'open',
    ornament: 'geen',
    navZichtbaar: false,
    navStijl: 'licht',
  },
  // De Tuin — weelderig groen, botanische ornamenten.
  botanisch: {
    preset: 'botanisch',
    kopLettertype: 'great-vibes',
    kopCursief: false,
    kleuren: { accent: '#2d5a27', achtergrond: '#f6f9f7', kaart: '#ffffff', tekst: BASIS_TEKST, gedempt: BASIS_GEDEMPT },
    hoeken: 'zacht',
    kaartStijl: 'accentlijn',
    ornament: 'blad',
    navZichtbaar: false,
    navStijl: 'accent',
  },
}

export function themeVanPreset(thema: WeddingThema): ThemeTokens {
  const p = THEME_PRESETS[thema] ?? THEME_PRESETS.klassiek
  return { ...p, kleuren: { ...p.kleuren } }
}

// Afleiding voor sites zonder expliciete theme-tokens: start bij de preset
// van het oude thema en neem de losse legacy-keuzes (accentkleur,
// lettertype, nav-toggle) over.
export function themeVanLegacy(
  thema: WeddingThema,
  kleurAccent: string,
  kopLettertype: WeddingLettertype,
  navZichtbaar = false
): ThemeTokens {
  const basis = themeVanPreset(thema)
  return {
    ...basis,
    kopLettertype: kopLettertype ?? basis.kopLettertype,
    kleuren: { ...basis.kleuren, accent: kleurAccent || basis.kleuren.accent },
    navZichtbaar,
  }
}

export const ORNAMENT_TEKEN: Record<Exclude<OrnamentStijl, 'geen'>, string> = {
  diamant: '◆',
  blad: '❧',
  ster: '✦',
}

export const HOEK_RADIUS: Record<HoekStijl, string> = {
  scherp: '0px',
  zacht: '14px',
  rond: '26px',
}

export function hexNaarHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}
