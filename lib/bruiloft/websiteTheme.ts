// Theme-engine voor de publieke trouwwebsite. Een thema bestaat uit twee
// lagen: (1) deze design-tokens, individueel door het stel aan te passen,
// en (2) het preset-veld, dat de structurele renderer kiest — elk van de
// zes thema's heeft een eigen layout, componentstructuur en bewegingstaal
// (zie components/website/v2/themes/README.md).

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
  cormorant:          'var(--font-serif)',
  playfair:           'var(--font-playfair)',
  lora:               'var(--font-lora)',
  'dancing-script':   'var(--font-dancing)',
  'eb-garamond':      'var(--font-garamond)',
  'great-vibes':      'var(--font-vibes)',
  italiana:           'var(--font-italiana)',
  marcellus:          'var(--font-marcellus)',
  'libre-baskerville':'var(--font-baskerville)',
  'josefin-sans':     'var(--font-josefin)',
  'bodoni-moda':      'var(--font-bodoni)',
  parisienne:         'var(--font-parisienne)',
}

// Fallback font-family-stacks voor contexten zonder de next/font CSS-
// variabelen (bijv. de geïsoleerde editor-preview-iframe, die de eigen
// Google Fonts-stylesheet laadt in plaats van de next/font-build-output).
export const LETTERTYPE_FONT_STACK: Record<WeddingLettertype, string> = {
  cormorant:           '"Cormorant Garamond", serif',
  playfair:            '"Playfair Display", serif',
  lora:                '"Lora", serif',
  'dancing-script':    '"Dancing Script", cursive',
  'eb-garamond':       '"EB Garamond", serif',
  'great-vibes':       '"Great Vibes", cursive',
  italiana:            '"Italiana", serif',
  marcellus:           '"Marcellus", serif',
  'libre-baskerville': '"Libre Baskerville", serif',
  'josefin-sans':      '"Josefin Sans", sans-serif',
  'bodoni-moda':       '"Bodoni Moda", serif',
  parisienne:          '"Parisienne", cursive',
}

// CSS-variabele voor "1% viewporthoogte" die secties met een vh-afhankelijke
// minimumhoogte (bijv. een fullscreen hero) gebruiken i.p.v. de rauwe `vh`-
// eenheid: `calc(var(--wp-vh, 1vh) * 65)`. Op de publieke site is de var niet
// gezet, dus valt dit terug op de echte `1vh` (huidig gedrag, ongewijzigd).
// De editor-preview-iframe zet 'm wél, op een vaste referentiehoogte los van
// de gemeten inhoudshoogte — anders ontstaat een terugkoppelingslus: de
// iframe-hoogte volgt de inhoudshoogte, en vh-secties volgen op hun beurt de
// iframe-hoogte, waardoor een fullscreen hero steeds verder opblaast.
export const PREVIEW_VH_CSS_VAR = '--wp-vh'

// Google Fonts CSS2-URL voor alle 12 lettertypes: gebruikt door de
// lettertype-kiezer (preview) en de editor-preview-iframe.
export const FONT_PREVIEW_URL =
  'https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;500;600;700&family=Cormorant+Garamond:wght@400;700&family=Dancing+Script:wght@400;700&family=EB+Garamond:wght@400;700&family=Great+Vibes&family=Italiana&family=Josefin+Sans:wght@400;500;600;700&family=Libre+Baskerville:wght@400;700&family=Lora:wght@400;700&family=Marcellus&family=Parisienne&family=Playfair+Display:wght@400;700&display=swap'

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
