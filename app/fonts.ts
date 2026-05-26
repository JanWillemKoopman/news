// Eén plek waar alle whitelisted Google Fonts worden geladen via next/font.
// Elke font krijgt zijn eigen CSS-variabele (--font-XXX). Een wrapper-element
// dat alle classNames opneemt (zie buildFontClassName) zorgt dat al die
// variabelen tegelijk beschikbaar zijn. De ThemeProvider wijst er één toe
// aan --font-serif en --font-sans, zodat het thema schakelbaar is zonder
// nieuwe fetches op runtime.
//
// Belangrijk: next/font moet op module-niveau aangeroepen worden (geen
// dynamische namen, geen function-wrappers). Daarom expliciet één-voor-één.

import {
  Cormorant_Garamond,
  DM_Serif_Display,
  EB_Garamond,
  Inter,
  Libre_Caslon_Text,
  Lora,
  Manrope,
  Nunito,
  Outfit,
  Playfair_Display,
  Source_Sans_3,
  Work_Sans,
} from 'next/font/google'

import type { SansFont, SerifFont } from '@/lib/bruiloft/theme'

// --- Serif ---------------------------------------------------------------
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-cormorant',
  weight: ['400', '500', '600', '700'],
  adjustFontFallback: false,
})
const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700'],
})
const lora = Lora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lora',
  weight: ['400', '500', '600', '700'],
})
const libreCaslon = Libre_Caslon_Text({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-libre-caslon',
  weight: ['400', '700'],
})
const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-eb-garamond',
  weight: ['400', '500', '600', '700'],
})
const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-serif',
  weight: ['400'],
})

// --- Sans ----------------------------------------------------------------
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })
const workSans = Work_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-work-sans' })
const nunito = Nunito({ subsets: ['latin'], display: 'swap', variable: '--font-nunito' })
const outfit = Outfit({ subsets: ['latin'], display: 'swap', variable: '--font-outfit' })
const manrope = Manrope({ subsets: ['latin'], display: 'swap', variable: '--font-manrope' })
const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-sans',
})

// --- Mapping naam -> CSS-var ---------------------------------------------
// De waarden (bv. 'var(--font-cormorant)') gaan rechtstreeks in een inline
// style-block om --font-serif / --font-sans te overschrijven.

export const SERIF_CSS_VAR: Record<SerifFont, string> = {
  'Cormorant Garamond': 'var(--font-cormorant)',
  'Playfair Display': 'var(--font-playfair)',
  Lora: 'var(--font-lora)',
  'Libre Caslon Text': 'var(--font-libre-caslon)',
  'EB Garamond': 'var(--font-eb-garamond)',
  'DM Serif Display': 'var(--font-dm-serif)',
}

export const SANS_CSS_VAR: Record<SansFont, string> = {
  Inter: 'var(--font-inter)',
  'Work Sans': 'var(--font-work-sans)',
  Nunito: 'var(--font-nunito)',
  Outfit: 'var(--font-outfit)',
  Manrope: 'var(--font-manrope)',
  'Source Sans 3': 'var(--font-source-sans)',
}

// className die alle font-variabelen exposed maakt op het element waar je 'm
// op zet. Plak op een wrapper rond alles dat het thema gebruikt.
export const ALL_FONT_VARIABLES = [
  cormorant.variable,
  playfair.variable,
  lora.variable,
  libreCaslon.variable,
  ebGaramond.variable,
  dmSerif.variable,
  inter.variable,
  workSans.variable,
  nunito.variable,
  outfit.variable,
  manrope.variable,
  sourceSans.variable,
].join(' ')
