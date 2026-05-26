// Het ThemeConfig-contract voor de publieke RSVP-pagina.
//
// Eén plek voor:
//  - de bron-van-waarheid TS-types
//  - de Zod-validatie (gebruikt door zowel de generate-route, de save-route,
//    en client-side preview)
//  - de whitelist van fonts en radii (Gemini mag hier nooit buiten kleuren)
//  - presets die de admin-UI als snelstart aanbiedt
//  - default-thema dat exact overeenkomt met de huidige Riley & Grey-look
//
// Kleuren staan opgeslagen als HSL-tripletten ('339 39% 50%') omdat dat
// het formaat is dat globals.css al gebruikt (`hsl(var(--primary))`). Zo
// kunnen we het thema rechtstreeks in CSS-variabelen pompen.

import { z } from 'zod'

// --- Whitelists -----------------------------------------------------------

export const ALLOWED_SERIF_FONTS = [
  'Cormorant Garamond',
  'Playfair Display',
  'Lora',
  'Libre Caslon Text',
  'EB Garamond',
  'DM Serif Display',
] as const

export const ALLOWED_SANS_FONTS = [
  'Inter',
  'Work Sans',
  'Nunito',
  'Outfit',
  'Manrope',
  'Source Sans 3',
] as const

export const ALLOWED_RADII = ['0', '0.25rem', '0.375rem', '0.5rem', '0.75rem', '1rem'] as const

export type SerifFont = (typeof ALLOWED_SERIF_FONTS)[number]
export type SansFont = (typeof ALLOWED_SANS_FONTS)[number]
export type Radius = (typeof ALLOWED_RADII)[number]

// --- Zod-schema -----------------------------------------------------------

// HSL-triplet zoals 'H S% L%', bv. '339 39% 50%' of '0 0% 100%'.
const HSL_RE = /^\d{1,3}(?:\.\d+)?\s+\d{1,3}(?:\.\d+)?%\s+\d{1,3}(?:\.\d+)?%$/

const hsl = z
  .string()
  .regex(HSL_RE, 'Verwacht HSL-triplet zoals "339 39% 50%"')

export const themeConfigSchema = z.object({
  colors: z.object({
    background: hsl,
    foreground: hsl,
    primary: hsl,
    primary_foreground: hsl,
    muted: hsl,
    muted_foreground: hsl,
    border: hsl,
    accent: hsl,
    header_bg: hsl,
    header_fg: hsl,
  }),
  fonts: z.object({
    serif: z.enum(ALLOWED_SERIF_FONTS),
    sans: z.enum(ALLOWED_SANS_FONTS),
  }),
  radius: z.enum(ALLOWED_RADII),
})

export type ThemeConfig = z.infer<typeof themeConfigSchema>

// --- Default-thema (= huidige Riley & Grey-stijl) -------------------------

export const DEFAULT_THEME: ThemeConfig = {
  colors: {
    background: '0 0% 100%',
    foreground: '215 25% 15%',
    primary: '339 39% 50%',
    primary_foreground: '0 0% 100%',
    muted: '215 16% 96%',
    muted_foreground: '215 14% 42%',
    border: '215 16% 90%',
    accent: '339 38% 96%',
    header_bg: '211 39% 27%',
    header_fg: '0 0% 100%',
  },
  fonts: { serif: 'Cormorant Garamond', sans: 'Inter' },
  radius: '0.375rem',
}

// --- Presets (snelstart-prompts) ------------------------------------------
// Bewust kort + sfeer-rijk; de exacte uitwerking laten we aan Gemini over.

export interface ThemePreset {
  key: string
  label: string
  prompt: string
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    key: 'rustiek-hout',
    label: 'Rustiek hout',
    prompt:
      'Warme aardetinten met een rustieke, houten sfeer. Diepe terracotta-accenten, ' +
      'crèmewit canvas, klassieke serif voor de namen.',
  },
  {
    key: 'modern-minimalist',
    label: 'Modern minimalist',
    prompt:
      'Strak en modern. Bijna-wit canvas, antraciet typografie, één diep zwart accent. ' +
      'Sans-serif door en door, scherpe hoeken.',
  },
  {
    key: 'botanisch-romantisch',
    label: 'Botanisch romantisch',
    prompt:
      'Botanisch en romantisch. Zachte salie-groene tinten, ivoor achtergrond, een ' +
      'elegante serif. Hoeken licht afgerond.',
  },
  {
    key: 'zomerstrand',
    label: 'Zomerstrand',
    prompt:
      'Een zonnige strandbruiloft. Zandkleuren, zachte oceaanblauwe accenten, frisse ' +
      'witte achtergrond. Lichte, luchtige sfeer.',
  },
  {
    key: 'klassiek-elegant',
    label: 'Klassiek elegant',
    prompt:
      'Tijdloze elegantie. Diep marineblauw als hoofdkleur, champagne-accenten, een ' +
      'traditionele serif. Subtiel en chic.',
  },
  {
    key: 'boho-warm',
    label: 'Boho warm',
    prompt:
      'Boho-sfeer met warme oker-, terracotta- en mosterdtinten. Roomwit canvas, ' +
      'speelse maar leesbare typografie, ruime afronding.',
  },
]
